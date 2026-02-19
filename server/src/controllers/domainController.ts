import { Request, Response } from "express";
import mongoose from "mongoose";

import { DOMAIN_TYPES, DomainItemModel } from "../models/DomainItem";
import { DemandModel } from "../models/Demand";

type DomainType = (typeof DOMAIN_TYPES)[number];

function isDomainType(value: string): value is DomainType {
  return DOMAIN_TYPES.includes(value as DomainType);
}

export const getDomainItems = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const includeInactive = req.query.includeInactive === "true";
    if (!isDomainType(type)) {
      return res.status(400).json({ message: "Tipo de domínio inválido." });
    }
    const filter: Record<string, unknown> = { type };
    if (!includeInactive) filter.active = true;
    const items = await DomainItemModel.find(filter).sort({ active: -1, label: 1 });
    return res.json(items);
  } catch {
    return res.status(500).json({ message: "Erro ao buscar itens de domínio." });
  }
};

export const createDomainItem = async (req: Request, res: Response) => {
  try {
    const { type, label, color } = req.body as {
      type?: string;
      label?: string;
      color?: string;
    };

    if (!type || !isDomainType(type)) {
      return res.status(400).json({ message: "Tipo inválido." });
    }
    if (!label || !label.trim()) {
      return res.status(400).json({ message: "Informe o nome do item." });
    }

    const normalizedLabel = label.trim();

    const existingByLabel = await DomainItemModel.findOne({
      type,
      label: new RegExp(`^${normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    if (existingByLabel) {
      if (existingByLabel.active) {
        return res.status(409).json({ message: "Item já existe neste domínio." });
      }

      existingByLabel.active = true;
      existingByLabel.label = normalizedLabel;
      existingByLabel.color = color?.trim() || undefined;
      await existingByLabel.save();
      return res.json(existingByLabel);
    }

    const created = await DomainItemModel.create({
      type,
      label: normalizedLabel,
      color: color?.trim() || undefined,
      active: true,
    });
    return res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Item já existe neste domínio." });
    }
    return res.status(500).json({ message: "Erro ao criar item de domínio." });
  }
};

export const deleteDomainItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const item = await DomainItemModel.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item não encontrado." });
    }

    const usageQuery =
      item.type === "CATEGORY"
        ? {
            deletedAt: { $exists: false },
            $or: [{ category: item.label }, { categoria: item.label }, { category: item.value }, { categoria: item.value }],
          }
        : {
            deletedAt: { $exists: false },
            $or: [{ epic: item.label }, { epico: item.label }, { epic: item.value }, { epico: item.value }],
          };

    const linkedDemands = await DemandModel.countDocuments(usageQuery);
    if (linkedDemands > 0) {
      return res.status(409).json({
        message: `Não é possível excluir. Existem ${linkedDemands} demanda(s) usando este item.`,
      });
    }

    item.active = false;
    await item.save();
    return res.json({ ok: true, message: "Item removido." });
  } catch {
    return res.status(500).json({ message: "Erro ao remover item de domínio." });
  }
};

export const updateDomainItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, color } = req.body as { label?: string; color?: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }
    if (!label || !label.trim()) {
      return res.status(400).json({ message: "Informe o nome do item." });
    }

    const item = await DomainItemModel.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item não encontrado." });
    }

    item.label = label.trim();
    item.color = color?.trim() || undefined;
    await item.save();
    return res.json(item);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Já existe item com este nome neste domínio." });
    }
    return res.status(500).json({ message: "Erro ao atualizar item de domínio." });
  }
};
