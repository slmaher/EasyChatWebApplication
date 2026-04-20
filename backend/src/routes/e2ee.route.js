import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { consumePreKey, getPreKeyBundle, registerDeviceKeys } from "../controllers/e2ee.controller.js";

const router = express.Router();

router.post("/register-device", protectRoute, registerDeviceKeys);
router.get("/prekey-bundle/:userId", protectRoute, getPreKeyBundle);
router.post("/consume-prekey", protectRoute, consumePreKey);

export default router;
