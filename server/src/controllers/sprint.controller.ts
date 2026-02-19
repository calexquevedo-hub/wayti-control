import type { Request, Response } from "express";

import { SprintModel } from "../models/Sprint";
import { DemandModel } from "../models/Demand";

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export const getSprints = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: "Planned" | "Active" | "Closed" };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const sprints = await SprintModel.find(filter).sort({ startDate: -1 });
    return res.json(sprints);
  } catch {
    return res.status(500).json({ message: "Erro ao buscar sprints." });
  }
};

export const getCurrentSprint = async (_req: Request, res: Response) => {
  try {
    const now = new Date();

    const activeByStatus = await SprintModel.findOne({ status: "Active" }).sort({ startDate: -1 });
    if (activeByStatus) return res.json(activeByStatus);

    const activeByDate = await SprintModel.findOne({
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ startDate: -1 });
    if (activeByDate) return res.json(activeByDate);

    const planned = await SprintModel.findOne({ status: "Planned" }).sort({ startDate: 1 });
    return res.json(planned || null);
  } catch {
    return res.status(500).json({ message: "Erro ao buscar sprint atual." });
  }
};

export const createSprint = async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, status } = req.body as {
      name?: string;
      startDate?: string;
      endDate?: string;
      status?: "Planned" | "Active" | "Closed";
    };

    if (!name?.trim()) {
      return res.status(400).json({ message: "Nome da sprint é obrigatório." });
    }

    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: "Datas de início e fim são obrigatórias." });
    }

    if (parsedEnd < parsedStart) {
      return res.status(400).json({ message: "Data final não pode ser menor que a data inicial." });
    }

    const nextStatus = status ?? "Planned";
    if (nextStatus === "Active") {
      await SprintModel.updateMany({ status: "Active" }, { status: "Closed" });
    }

    const created = await SprintModel.create({
      name: name.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      status: nextStatus,
    });

    return res.status(201).json(created);
  } catch {
    return res.status(500).json({ message: "Erro ao criar sprint." });
  }
};

export const updateSprint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, status } = req.body as {
      name?: string;
      startDate?: string;
      endDate?: string;
      status?: "Planned" | "Active" | "Closed";
    };

    const payload: Record<string, unknown> = {};

    if (typeof name === "string") {
      if (!name.trim()) {
        return res.status(400).json({ message: "Nome da sprint é obrigatório." });
      }
      payload.name = name.trim();
    }

    if (startDate) {
      const parsedStart = parseDate(startDate);
      if (!parsedStart) return res.status(400).json({ message: "Data inicial inválida." });
      payload.startDate = parsedStart;
    }

    if (endDate) {
      const parsedEnd = parseDate(endDate);
      if (!parsedEnd) return res.status(400).json({ message: "Data final inválida." });
      payload.endDate = parsedEnd;
    }

    if (status) {
      payload.status = status;
      if (status === "Active") {
        await SprintModel.updateMany({ _id: { $ne: id }, status: "Active" }, { status: "Closed" });
      }
    }

    const updated = await SprintModel.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Sprint não encontrada." });
    }

    return res.json(updated);
  } catch {
    return res.status(500).json({ message: "Erro ao atualizar sprint." });
  }
};

export const deleteSprint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await SprintModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Sprint não encontrada." });
    }

    await DemandModel.updateMany({ sprintId: id }, { $set: { sprintId: null } });

    return res.json({ message: "Sprint deletada com sucesso." });
  } catch {
    return res.status(500).json({ message: "Erro ao deletar sprint." });
  }
};
