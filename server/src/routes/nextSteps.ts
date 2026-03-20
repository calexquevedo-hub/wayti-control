import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { NextStepItemModel } from "../models/NextStepItem";

const router = Router();

router.get("/", requireAuth, checkPermission("reports", "view"), async (req, res) => {
  const { sprintId, epicValue } = req.query;
  const filter: any = {};
  if (sprintId) filter.linkedSprintId = sprintId;
  if (epicValue) filter.linkedEpicValue = epicValue;
  
  const items = await NextStepItemModel.find(filter).sort({ order: 1 });
  res.json(items);
});

router.post("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const item = await NextStepItemModel.create(req.body);
  res.status(201).json(item);
});

router.patch("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const item = await NextStepItemModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) return res.status(404).json({ message: "Item não encontrado" });
  res.json(item);
});

router.delete("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const item = await NextStepItemModel.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Item não encontrado" });
  res.json({ ok: true });
});

export default router;
