import { Router } from "express";

import { SprintModel } from "../models/Sprint";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";

const router = Router();

router.get("/", requireAuth, checkPermission("demands", "view"), async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};

  if (status) filter.status = status;

  const sprints = await SprintModel.find(filter).sort({ startDate: -1 });
  return res.json(sprints);
});

router.get("/current", requireAuth, checkPermission("demands", "view"), async (_req, res) => {
  const now = new Date();

  const activeByStatus = await SprintModel.findOne({ status: "Active" }).sort({ startDate: -1 });
  if (activeByStatus) return res.json(activeByStatus);

  const activeByDate = await SprintModel.findOne({
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ startDate: -1 });
  if (activeByDate) return res.json(activeByDate);

  const planned = await SprintModel.findOne({ status: "Planned" }).sort({ startDate: 1 });
  if (planned) return res.json(planned);

  return res.status(404).json({ message: "Nenhuma sprint ativa encontrada." });
});

export default router;
