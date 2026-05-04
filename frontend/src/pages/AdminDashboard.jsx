import { useEffect, useState } from "react";
import { useAdminStore } from "../store/useAdminStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"];
const SEVERITY_COLORS = {
  info: "#3b82f6",
  warning: "#f59e0b",
  error: "#ef4444",
  critical: "#dc2626",
};

export default function AdminDashboard() {
  const {
    logs,
    stats,
    loading,
    error,
    filters,
    pagination,
    getLogs,
    searchLogs,
    getStats,
    deleteLog,
    clearOldLogs,
    exportLogs,
    setFilters,
    clearFilters,
    setPage,
  } = useAdminStore();

  const { authUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("logs");
  const [selectedDays, setSelectedDays] = useState(30);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearOldModal, setShowClearOldModal] = useState(false);
  const [daysToDelete, setDaysToDelete] = useState(90);

  useEffect(() => {
    if (authUser?.role === "admin") {
      getLogs({}, 1);
      getStats(30);
    }
  }, [authUser]);

  if (!authUser || authUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="text-gray-500 mt-2">
            Only admins can access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchLogs(searchQuery, 1);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({ [filterName]: value || null });
    getLogs({ ...filters, [filterName]: value || null }, 1);
  };

  const handleExport = () => {
    exportLogs(filters);
  };

  const handleClearOldLogs = async () => {
    const result = await clearOldLogs(daysToDelete);
    if (result?.success) {
      setShowClearOldModal(false);
      getLogs(filters, pagination.page);
      alert(`Deleted ${result.deletedCount} old logs`);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-500">
            Application logs, errors, and statistics
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered mb-6">
          <button
            className={`tab ${activeTab === "logs" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            📋 Logs
          </button>
          <button
            className={`tab ${activeTab === "stats" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            📊 Statistics
          </button>
          <button
            className={`tab ${activeTab === "tools" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("tools")}
          >
            🛠️ Tools
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="form-control">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search logs by message, email, endpoint..."
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  Search
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSearchQuery("");
                    clearFilters();
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select
                className="select select-bordered"
                value={filters.type || ""}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              >
                <option value="">All Types</option>
                <option value="user_login">User Login</option>
                <option value="user_logout">User Logout</option>
                <option value="user_signup">User Sign Up</option>
                <option value="message_sent">Message Sent</option>
                <option value="auth_failed">Auth Failed</option>
                <option value="api_error">API Error</option>
                <option value="server_error">Server Error</option>
                <option value="security_event">Security Event</option>
              </select>

              <select
                className="select select-bordered"
                value={filters.severity || ""}
                onChange={(e) => handleFilterChange("severity", e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>

              <input
                type="date"
                className="input input-bordered"
                value={filters.startDate || ""}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />

              <input
                type="date"
                className="input input-bordered"
                value={filters.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />

              <button
                className="btn btn-outline"
                onClick={handleExport}
                disabled={loading}
              >
                📥 Export CSV
              </button>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto bg-base-200 rounded-lg">
              {loading ? (
                <div className="flex justify-center p-8">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : logs.length > 0 ? (
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Message</th>
                      <th>User</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="hover">
                        <td className="text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="text-xs">{log.type}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: SEVERITY_COLORS[log.severity],
                              color: "white",
                            }}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="text-xs max-w-xs truncate">
                          {log.message}
                        </td>
                        <td className="text-xs">
                          {log.userId?.fullName || log.userEmail || "-"}
                        </td>
                        <td>
                          <button
                            className="btn btn-xs btn-error"
                            onClick={() => deleteLog(log._id)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No logs found
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() => setPage(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    setPage(Math.min(pagination.pages, pagination.page + 1))
                  }
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Total logs: {pagination.total}
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Days Selector */}
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  className={`btn btn-sm ${
                    selectedDays === days ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => {
                    setSelectedDays(days);
                    getStats(days);
                  }}
                >
                  Last {days} days
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center p-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : stats ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">Total Logs</div>
                    <div className="stat-value text-primary">
                      {stats.totalLogs}
                    </div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">Errors</div>
                    <div className="stat-value text-error">
                      {stats.errorLogs}
                    </div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">Error Rate</div>
                    <div className="stat-value text-warning">
                      {stats.errorRate}%
                    </div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">Period</div>
                    <div className="stat-value text-lg text-info">
                      {stats.period}
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Severity Distribution */}
                  <div className="bg-base-200 p-4 rounded-lg">
                    <h3 className="font-bold mb-4">Severity Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stats.countBySeverity).map(
                            ([name, value]) => ({ name, value }),
                          )}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(stats.countBySeverity).map(
                            (_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index]}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Log Types */}
                  <div className="bg-base-200 p-4 rounded-lg">
                    <h3 className="font-bold mb-4">Top Log Types</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(stats.countByType)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 8)
                          .map(([name, value]) => ({ name, value }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Errors by Date */}
                  {Object.keys(stats.errorsByDate).length > 0 && (
                    <div className="bg-base-200 p-4 rounded-lg lg:col-span-2">
                      <h3 className="font-bold mb-4">Errors Over Time</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={Object.entries(stats.errorsByDate)
                            .sort(([dateA], [dateB]) =>
                              dateA.localeCompare(dateB),
                            )
                            .map(([date, count]) => ({ date, count }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#ef4444"
                            name="Errors"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Top Errors */}
                {stats.topErrors.length > 0 && (
                  <div className="bg-base-200 p-4 rounded-lg">
                    <h3 className="font-bold mb-4">Top Errors</h3>
                    <div className="space-y-2">
                      {stats.topErrors.map((error, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-base-100 rounded"
                        >
                          <span className="text-sm truncate">
                            {error.message}
                          </span>
                          <span className="badge badge-error">
                            {error.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 p-8">
                No statistics available
              </div>
            )}
          </div>
        )}

        {/* TOOLS TAB */}
        {activeTab === "tools" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Clear Old Logs */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title">🧹 Clear Old Logs</h2>
                  <p className="text-sm text-gray-500">
                    Delete logs older than a specified number of days
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-warning"
                      onClick={() => setShowClearOldModal(true)}
                    >
                      Clear Old Logs
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Logs */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title">📥 Export Logs</h2>
                  <p className="text-sm text-gray-500">
                    Download logs as CSV file with current filters
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <button className="btn btn-primary" onClick={handleExport}>
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Log Stats */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title">📊 Log Statistics</h2>
                  <p className="text-sm text-gray-500">
                    View detailed statistics and analytics
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-info"
                      onClick={() => setActiveTab("stats")}
                    >
                      View Stats
                    </button>
                  </div>
                </div>
              </div>

              {/* Refresh */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title">🔄 Refresh Data</h2>
                  <p className="text-sm text-gray-500">
                    Reload logs and statistics from server
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        getLogs(filters, pagination.page);
                        getStats(selectedDays);
                      }}
                      disabled={loading}
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="alert alert-info">
              <span>
                ℹ️ These tools help you manage your application logs. Use them
                carefully to maintain optimal database performance.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Clear Old Logs Modal */}
      {showClearOldModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Clear Old Logs</h3>
            <p className="py-4">Delete all logs older than:</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Number of days</span>
              </label>
              <input
                type="number"
                min="1"
                value={daysToDelete}
                onChange={(e) => setDaysToDelete(parseInt(e.target.value))}
                className="input input-bordered"
              />
              <label className="label">
                <span className="label-text-alt">
                  Logs older than {daysToDelete} days will be deleted
                </span>
              </label>
            </div>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setShowClearOldModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleClearOldLogs}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowClearOldModal(false)}
          ></div>
        </div>
      )}
    </div>
  );
}
