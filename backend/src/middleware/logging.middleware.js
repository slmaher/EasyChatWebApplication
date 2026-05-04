import Logger from "../lib/logger.js";

const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress
  );
};

// Error logging middleware
export const errorLoggingMiddleware = async (err, req, res, next) => {
  const clientIP = getClientIP(req);
  const userAgent = req.headers["user-agent"];
  const endpoint = `${req.method} ${req.path}`;
  const statusCode = err.statusCode || res.statusCode || 500;

  // Determine error type
  let errorType = "server_error";
  if (statusCode === 400) errorType = "validation_error";
  if (statusCode === 401) errorType = "auth_failed";
  if (statusCode === 403) errorType = "permission_denied";

  await Logger.logError(
    errorType,
    err.message || "An error occurred",
    err.stack,
    req.user?._id,
    endpoint,
    statusCode,
    {
      errorName: err.name,
      method: req.method,
    },
    clientIP,
  );

  next(err);
};

// API call logging middleware
export const apiLoggingMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.headers["user-agent"];
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Only log certain endpoints to avoid overwhelming logs
    if (shouldLogEndpoint(req.path, req.method)) {
      const error = statusCode >= 400 ? `Error ${statusCode}` : null;

      Logger.logAPICall(
        req.path,
        req.method,
        statusCode,
        duration,
        req.user?._id,
        clientIP,
        userAgent,
        error,
      ).catch((err) => console.error("Logging error:", err));
    }

    originalSend.call(this, data);
  };

  next();
};

const shouldLogEndpoint = (path, method) => {
  // Skip logging for health checks and static files
  if (path === "/" || path.includes("/static") || path.includes(".js")) {
    return false;
  }
  return true;
};
