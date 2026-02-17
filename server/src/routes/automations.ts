import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { AutomationRuleModel } from "../models/AutomationRule";

const router = Router();

router.get("/", requireAuth, checkPermission("settings", "manage"), async (_req, res) => {
  const rules = await AutomationRuleModel.find().sort({ createdAt: -1 });
  return res.json(rules);
});

router.post("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const payload = req.body as Record<string, unknown>;
  if (!payload.title || !payload.trigger) {
    return res.status(400).json({ message: "title e trigger são obrigatórios." });
  }
  const created = await AutomationRuleModel.create(payload);
  return res.status(201).json(created);
});

router.patch("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const updated = await AutomationRuleModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) {
    return res.status(404).json({ message: "Regra não encontrada." });
  }
  return res.json(updated);
});

router.delete("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const removed = await AutomationRuleModel.findByIdAndDelete(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: "Regra não encontrada." });
  }
  return res.json({ ok: true });
});

export default router;
