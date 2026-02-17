import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { ServiceCatalogModel } from "../models/ServiceCatalog";

const router = Router();

router.get("/", requireAuth, checkPermission("tickets", "view"), async (_req, res) => {
  const services = await ServiceCatalogModel.find().sort({ category: 1, title: 1 });
  return res.json(services);
});

router.post("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const payload = req.body as Record<string, unknown>;
  if (!payload.title || !payload.category) {
    return res.status(400).json({ message: "title e category são obrigatórios." });
  }
  const created = await ServiceCatalogModel.create(payload);
  return res.status(201).json(created);
});

router.patch("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const updated = await ServiceCatalogModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) {
    return res.status(404).json({ message: "Serviço não encontrado." });
  }
  return res.json(updated);
});

export default router;
