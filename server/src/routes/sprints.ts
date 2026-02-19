import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import {
  createSprint,
  deleteSprint,
  getCurrentSprint,
  getSprints,
  updateSprint,
} from "../controllers/sprint.controller";

const router = Router();

router.get("/", requireAuth, checkPermission("demands", "view"), getSprints);
router.get("/current", requireAuth, checkPermission("demands", "view"), getCurrentSprint);
router.post("/", requireAuth, checkPermission("demands", "edit"), createSprint);
router.patch("/:id", requireAuth, checkPermission("demands", "edit"), updateSprint);
router.delete("/:id", requireAuth, checkPermission("demands", "edit"), deleteSprint);

export default router;
