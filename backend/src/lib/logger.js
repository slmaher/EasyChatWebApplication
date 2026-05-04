import AppLog from "../models/appLog.model.js";

class Logger {
  static async log({
    type = "other",
    severity = "info",
    message,
    userId = null,
    userEmail = null,
    action = null,
    metadata = {},
    ipAddress = null,
    userAgent = null,
    endpoint = null,
    statusCode = null,
    errorStack = null,
    duration = null,
  }) {
    try {
      await AppLog.create({
        type,
        severity,
        message,
        userId,
        userEmail,
        action,
        metadata,
        ipAddress,
        userAgent,
        endpoint,
        statusCode,
        errorStack,
        duration,
      });
    } catch (error) {
      console.error("Error logging to database:", error);
    }
  }

  static async logAuthEvent(
    type,
    userId,
    userEmail,
    success,
    ipAddress,
    userAgent,
    metadata = {},
  ) {
    const severity = success ? "info" : "warning";
    const message = `Authentication ${type}: ${userEmail || userId}`;
    await this.log({
      type,
      severity,
      message,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      metadata: { success, ...metadata },
      action: type,
    });
  }

  static async logUserAction(
    type,
    userId,
    action,
    metadata = {},
    ipAddress = null,
    userAgent = null,
  ) {
    const severity = "info";
    const message = `User action: ${action}`;
    await this.log({
      type,
      severity,
      message,
      userId,
      action,
      metadata,
      ipAddress,
      userAgent,
    });
  }

  static async logError(
    type,
    message,
    errorStack = null,
    userId = null,
    endpoint = null,
    statusCode = 500,
    metadata = {},
    ipAddress = null,
  ) {
    const severity = statusCode >= 500 ? "critical" : "error";
    await this.log({
      type,
      severity,
      message,
      errorStack: errorStack?.toString(),
      userId,
      endpoint,
      statusCode,
      metadata,
      ipAddress,
    });
  }

  static async logAPICall(
    endpoint,
    method,
    statusCode,
    duration,
    userId = null,
    ipAddress = null,
    userAgent = null,
    error = null,
  ) {
    const type = statusCode >= 400 ? "api_error" : "other";
    const severity = statusCode >= 500 ? "error" : "info";
    const message = `${method} ${endpoint} - ${statusCode}`;
    await this.log({
      type,
      severity,
      message,
      endpoint,
      statusCode,
      duration,
      userId,
      ipAddress,
      userAgent,
      metadata: { method, error },
      action: method,
    });
  }

  static async logMessageEvent(type, userId, messageId, metadata = {}) {
    const message = `Message event: ${type}`;
    await this.log({
      type,
      severity: "info",
      message,
      userId,
      action: type,
      metadata: { messageId, ...metadata },
    });
  }

  static async logGroupEvent(type, userId, groupId, metadata = {}) {
    const message = `Group event: ${type}`;
    await this.log({
      type,
      severity: "info",
      message,
      userId,
      action: type,
      metadata: { groupId, ...metadata },
    });
  }

  static async logSecurityEvent(
    type,
    severity,
    message,
    userId = null,
    metadata = {},
    ipAddress = null,
  ) {
    await this.log({
      type: "security_event",
      severity,
      message,
      userId,
      ipAddress,
      metadata: { eventType: type, ...metadata },
      action: type,
    });
  }
}

export default Logger;
