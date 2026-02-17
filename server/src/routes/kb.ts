import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { KnowledgeArticleModel } from "../models/KnowledgeArticle";

const router = Router();

router.get("/", requireAuth, checkPermission("tickets", "view"), async (_req, res) => {
  const articles = await KnowledgeArticleModel.find()
    .populate({ path: "relatedServiceId", select: "title category" })
    .sort({ views: -1 });
  return res.json(articles);
});

router.post("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const payload = req.body as Record<string, unknown>;
  if (!payload.title || !payload.body) {
    return res.status(400).json({ message: "title e body são obrigatórios." });
  }
  const created = await KnowledgeArticleModel.create(payload);
  return res.status(201).json(created);
});

router.patch("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  const updated = await KnowledgeArticleModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate({ path: "relatedServiceId", select: "title category" });
  if (!updated) {
    return res.status(404).json({ message: "Artigo não encontrado." });
  }
  return res.json(updated);
});

router.post("/:id/view", requireAuth, checkPermission("tickets", "view"), async (req, res) => {
  const updated = await KnowledgeArticleModel.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ message: "Artigo não encontrado." });
  }
  return res.json({ ok: true, views: updated.views });
});

export default router;
