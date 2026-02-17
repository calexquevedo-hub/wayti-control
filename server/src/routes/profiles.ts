import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import {
  createProfile,
  deleteProfile,
  getProfiles,
  updateProfile,
} from "../controllers/profileController";

const router = Router();

router.use(requireAuth);
router.use(checkPermission("settings", "manage"));

router.get("/", getProfiles);
router.post("/", createProfile);
router.patch("/:id", updateProfile);
router.delete("/:id", deleteProfile);

export default router;
