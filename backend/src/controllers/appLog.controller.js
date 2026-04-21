import AppLog from "../models/appLog.model.js";
import User from "../models/user.model.js";

export const getAppLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, severity, startDate, endDate, userId } =
      req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (userId) filter.userId = userId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await AppLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "fullName email");

    const total = await AppLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ success: false, message: "Error fetching logs" });
  }
};

export const searchLogs = async (req, res) => {
  try {
    const { query, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    if (!query) {
      return res.status(400).json({ success: false, message: "Query required" });
    }

    const logs = await AppLog.find({
      $or: [
        { message: { $regex: query, $options: "i" } },
        { userEmail: { $regex: query, $options: "i" } },
        { endpoint: { $regex: query, $options: "i" } },
        { "metadata.error": { $regex: query, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "fullName email");

    const total = await AppLog.countDocuments({
      $or: [
        { message: { $regex: query, $options: "i" } },
        { userEmail: { $regex: query, $options: "i" } },
        { endpoint: { $regex: query, $options: "i" } },
        { "metadata.error": { $regex: query, $options: "i" } },
      ],
    });

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error searching logs:", error);
    res.status(500).json({ success: false, message: "Error searching logs" });
  }
};

export const getLogStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await AppLog.find({ createdAt: { $gte: startDate } });

    // Count by type
    const countByType = {};
    logs.forEach((log) => {
      countByType[log.type] = (countByType[log.type] || 0) + 1;
    });

    // Count by severity
    const countBySeverity = {};
    logs.forEach((log) => {
      countBySeverity[log.severity] = (countBySeverity[log.severity] || 0) + 1;
    });

    // Count errors by date
    const errorsByDate = {};
    logs
      .filter((log) => log.severity === "error" || log.severity === "critical")
      .forEach((log) => {
        const date = log.createdAt.toISOString().split("T")[0];
        errorsByDate[date] = (errorsByDate[date] || 0) + 1;
      });

    // Error rate
    const totalLogs = logs.length;
    const errorLogs = logs.filter(
      (log) => log.severity === "error" || log.severity === "critical"
    ).length;
    const errorRate = totalLogs > 0 ? ((errorLogs / totalLogs) * 100).toFixed(2) : 0;

    // Top errors
    const errorMessages = {};
    logs
      .filter((log) => log.severity === "error" || log.severity === "critical")
      .forEach((log) => {
        errorMessages[log.message] =
          (errorMessages[log.message] || 0) + 1;
      });

    const topErrors = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    // Most active users
    const userActivity = {};
    logs
      .filter((log) => log.userId)
      .forEach((log) => {
        const userId = String(log.userId);
        userActivity[userId] = (userActivity[userId] || 0) + 1;
      });

    const topUsers = Object.entries(userActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      stats: {
        totalLogs,
        errorLogs,
        errorRate,
        countByType,
        countBySeverity,
        errorsByDate,
        topErrors,
        topUsers,
        period: `Last ${days} days`,
      },
    });
  } catch (error) {
    console.error("Error getting log stats:", error);
    res.status(500).json({ success: false, message: "Error getting statistics" });
  }
};

export const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AppLog.findByIdAndDelete(id);

    if (!log) {
      return res.status(404).json({ success: false, message: "Log not found" });
    }

    res.status(200).json({ success: true, message: "Log deleted successfully" });
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({ success: false, message: "Error deleting log" });
  }
};

export const clearOldLogs = async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await AppLog.deleteMany({ createdAt: { $lt: cutoffDate } });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} logs older than ${daysOld} days`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing old logs:", error);
    res.status(500).json({ success: false, message: "Error clearing logs" });
  }
};

export const exportLogs = async (req, res) => {
  try {
    const { type, severity, startDate, endDate } = req.query;

    let filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await AppLog.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "fullName email");

    // Convert to CSV
    const csv = convertToCSV(logs);

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", 'attachment; filename="logs.csv"');
    res.send(csv);
  } catch (error) {
    console.error("Error exporting logs:", error);
    res.status(500).json({ success: false, message: "Error exporting logs" });
  }
};

const convertToCSV = (logs) => {
  const headers = [
    "Date",
    "Type",
    "Severity",
    "Message",
    "User",
    "Email",
    "Endpoint",
    "Status Code",
    "Duration (ms)",
  ];
  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.type,
    log.severity,
    log.message,
    log.userId?.fullName || "",
    log.userEmail || "",
    log.endpoint || "",
    log.statusCode || "",
    log.duration || "",
  ]);

  let csv = headers.map((h) => `"${h}"`).join(",") + "\n";
  csv += rows
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csv;
};
