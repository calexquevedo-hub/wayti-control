import { Request, Response } from "express";
import mongoose from "mongoose";

import { DOMAIN_TYPES, DomainItemModel } from "../models/DomainItem";

type DomainType = (typeof DOMAIN_TYPES)[number];

function isDomainType(value: string): value is DomainType {
  return DOMAIN_TYPES.includes(value as DomainType);
}

export const getDomainItems = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (!isDomainType(type)) {
      return res.status(400).json({ message: "Tipo de domínio inválido." });
    }
    const items = await DomainItemModel.find({ type, active: true }).sort({ label: 1 });
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

    const created = await DomainItemModel.create({
      type,
      label: label.trim(),
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

    const updated = await DomainItemModel.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Item não encontrado." });
    }
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: "Erro ao remover item de domínio." });
  }
};
