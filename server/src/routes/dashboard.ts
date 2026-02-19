import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { getDashboardData } from "../controllers/dashboard.controller";

const router = Router();

router.get("/", requireAuth, checkPermission("demands", "view"), getDashboardData);

export default router;
