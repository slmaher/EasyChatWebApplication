import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  addGroupMembers,
  createGroup,
  getGroupAuditEvents,
  getGroupMessages,
  getMyGroups,
  removeGroupMember,
  sendGroupMessage,
  updateGroupMemberRole,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getMyGroups);
router.post("/:groupId/members", protectRoute, addGroupMembers);
router.delete("/:groupId/members/:memberId", protectRoute, removeGroupMember);
router.patch(
  "/:groupId/members/:memberId/role",
  protectRoute,
  updateGroupMemberRole,
);
router.get("/:groupId/audit-events", protectRoute, getGroupAuditEvents);
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/messages", protectRoute, sendGroupMessage);

export default router;
