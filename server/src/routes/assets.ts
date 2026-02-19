import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import {
  checkinAsset,
  checkoutAsset,
  createAsset,
  deleteAsset,
  getAssetById,
  getAssetHistory,
  getAssets,
  retireAsset,
  updateAsset,
  generateTermPdf,
  uploadSignedTerm,
} from "../controllers/asset.controller";
import { uploadSignedTermMiddleware } from "../middleware/upload";

const router = Router();

router.get("/", requireAuth, checkPermission("assets", "view"), getAssets);
router.get(
  "/assignments/:assignmentId/term",
  requireAuth,
  checkPermission("assets", "view"),
  generateTermPdf
);
router.post(
  "/assignments/:assignmentId/upload",
  requireAuth,
  checkPermission("assets", "edit"),
  uploadSignedTermMiddleware.single("file"),
  uploadSignedTerm
);
router.get("/:id", requireAuth, checkPermission("assets", "view"), getAssetById);
router.get("/:id/history", requireAuth, checkPermission("assets", "view"), getAssetHistory);

router.post("/", requireAuth, checkPermission("assets", "create"), createAsset);
router.patch("/:id", requireAuth, checkPermission("assets", "edit"), updateAsset);

router.post("/checkout", requireAuth, checkPermission("assets", "edit"), checkoutAsset);
router.post("/checkin", requireAuth, checkPermission("assets", "edit"), checkinAsset);
router.post("/retire", requireAuth, checkPermission("assets", "edit"), retireAsset);

router.delete("/:id", requireAuth, checkPermission("assets", "delete"), deleteAsset);

export default router;
