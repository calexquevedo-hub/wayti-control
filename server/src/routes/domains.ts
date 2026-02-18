import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import {
  createDomainItem,
  deleteDomainItem,
  getDomainItems,
} from "../controllers/domainController";

const router = Router();

router.get("/:type", requireAuth, checkPermission("demands", "view"), getDomainItems);
router.post("/", requireAuth, checkPermission("settings", "manage"), createDomainItem);
router.delete("/:id", requireAuth, checkPermission("settings", "manage"), deleteDomainItem);

export default router;
