import express from "express";
import {
  getAppLogs,
  searchLogs,
  getLogStats,
  deleteLog,
  clearOldLogs,
  exportLogs,
} from "../controllers/appLog.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  next();
};

// All routes require authentication and admin role
router.use(protectRoute);
router.use(isAdmin);

router.get("/", getAppLogs);
router.get("/search", searchLogs);
router.get("/stats", getLogStats);
router.get("/export", exportLogs);
router.delete("/:id", deleteLog);
router.post("/clear-old", clearOldLogs);

export default router;
