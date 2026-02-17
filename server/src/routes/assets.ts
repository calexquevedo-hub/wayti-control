import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { AssetModel } from "../models/Asset";
import { UserModel } from "../models/User";

const router = Router();

router.get("/", requireAuth, checkPermission("assets", "view"), async (req, res) => {
  const { search, status, type, assignedTo } = req.query as Record<string, string | undefined>;
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ tag: regex }, { name: regex }, { serialNumber: regex }];
  }

  const assets = await AssetModel.find(filter)
    .populate({ path: "assignedTo", select: "name email" })
    .sort({ updatedAt: -1 });
  return res.json(assets);
});

router.get("/:id", requireAuth, checkPermission("assets", "view"), async (req, res) => {
  const asset = await AssetModel.findById(req.params.id).populate({
    path: "assignedTo",
    select: "name email",
  });
  if (!asset) {
    return res.status(404).json({ message: "Ativo não encontrado." });
  }
  return res.json(asset);
});

router.post("/", requireAuth, checkPermission("assets", "create"), async (req, res) => {
  const payload = req.body as Record<string, any>;
  if (!payload.tag || !payload.name || !payload.type) {
    return res.status(400).json({ message: "tag, name e type são obrigatórios." });
  }

  const existing = await AssetModel.findOne({ tag: payload.tag });
  if (existing) {
    return res.status(400).json({ message: "Tag de patrimônio já existe." });
  }

  const history = [];
  if (payload.assignedTo) {
    const user = await UserModel.findById(payload.assignedTo);
    history.push({
      at: new Date(),
      userId: payload.assignedTo,
      userName: user?.name ?? undefined,
      notes: "Atribuição inicial",
    });
  }

  const created = await AssetModel.create({
    ...payload,
    assignmentHistory: history,
  });
  const populated = await created.populate({ path: "assignedTo", select: "name email" });
  return res.status(201).json(populated);
});

router.patch("/:id", requireAuth, checkPermission("assets", "edit"), async (req, res) => {
  const payload = req.body as Record<string, any>;
  const asset = await AssetModel.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ message: "Ativo não encontrado." });
  }

  const update: Record<string, any> = { ...payload };
  if (payload.tag && payload.tag !== asset.tag) {
    const exists = await AssetModel.findOne({ tag: payload.tag });
    if (exists) {
      return res.status(400).json({ message: "Tag de patrimônio já existe." });
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "assignedTo")) {
    const user = payload.assignedTo ? await UserModel.findById(payload.assignedTo) : null;
    update.$push = {
      assignmentHistory: {
        at: new Date(),
        userId: payload.assignedTo || undefined,
        userName: user?.name ?? undefined,
        notes: payload.assignedTo ? "Transferência" : "Desvinculado",
      },
    };
  }

  const updated = await AssetModel.findByIdAndUpdate(req.params.id, update, {
    new: true,
  }).populate({ path: "assignedTo", select: "name email" });
  return res.json(updated);
});

export default router;
