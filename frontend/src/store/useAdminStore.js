import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";

export const useAdminStore = create((set, get) => ({
  logs: [],
  stats: null,
  loading: false,
  error: null,
  filters: {
    type: null,
    severity: null,
    startDate: null,
    endDate: null,
    userId: null,
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  },

  getLogs: async (filters = {}, page = 1) => {
    set({ loading: true, error: null });
    try {
      const params = {
        page,
        limit: get().pagination.limit,
        ...filters,
      };

      const response = await axiosInstance.get("/logs", { params });

      set({
        logs: response.data.logs,
        pagination: response.data.pagination,
        filters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to fetch logs",
        loading: false,
      });
    }
  },

  searchLogs: async (query, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get("/logs/search", {
        params: {
          query,
          page,
          limit: get().pagination.limit,
        },
      });

      set({
        logs: response.data.logs,
        pagination: response.data.pagination,
        loading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to search logs",
        loading: false,
      });
    }
  },

  getStats: async (days = 30) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get("/logs/stats", {
        params: { days },
      });

      set({
        stats: response.data.stats,
        loading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to fetch statistics",
        loading: false,
      });
    }
  },

  deleteLog: async (logId) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`/logs/${logId}`);

      set((state) => ({
        logs: state.logs.filter((log) => log._id !== logId),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to delete log",
        loading: false,
      });
    }
  },

  clearOldLogs: async (daysOld = 90) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post("/logs/clear-old", { daysOld });

      set({
        loading: false,
        error: null,
      });

      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to clear logs",
        loading: false,
      });
    }
  },

  exportLogs: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get("/logs/export", {
        params: filters,
        responseType: "blob",
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);

      set({ loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to export logs",
        loading: false,
      });
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        type: null,
        severity: null,
        startDate: null,
        endDate: null,
        userId: null,
      },
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      logs: [],
    });
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
  },
}));
