import type { Request, Response } from "express";

import { DemandModel } from "../models/Demand";
import { SprintModel } from "../models/Sprint";

type SprintStatusColor = "green" | "yellow" | "purple" | "gray";

const CLOSED_STATUSES = new Set(["Concluído", "Cancelado"]);

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function demandTitle(demand: any) {
  return normalizeText(demand.titulo) || normalizeText(demand.name) || "Sem título";
}

function demandEpic(demand: any) {
  return normalizeText(demand.epico) || normalizeText(demand.epic);
}

function demandResponsible(demand: any) {
  return normalizeText(demand.responsavel) || normalizeText(demand.responsible) || "Não definido";
}

function demandPriority(demand: any) {
  return normalizeText(demand.prioridade) || normalizeText(demand.priority);
}

function isOpenDemand(demand: any) {
  if (demand?.deletedAt) return false;
  if (demand?.isArchived) return false;
  const status = normalizeText(demand?.status);
  return !CLOSED_STATUSES.has(status);
}

function isOverdue(demand: any, now: Date) {
  if (!demand?.prazo) return false;
  const prazo = new Date(demand.prazo);
  if (Number.isNaN(prazo.getTime())) return false;
  return prazo.getTime() < now.getTime();
}

function calcDaysLeft(endDate: Date, now: Date) {
  const diff = endDate.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusColor(status: string, allClosedDone: boolean): SprintStatusColor {
  if (status === "Active") return "purple";
  if (status === "Planned") return "gray";
  if (status === "Closed") return allClosedDone ? "green" : "yellow";
  return "gray";
}

export const getDashboardData = async (_req: Request, res: Response) => {
  try {
    const now = new Date();

    const [demands, activeSprint, sprints] = await Promise.all([
      DemandModel.find({ deletedAt: { $exists: false } }).lean(),
      SprintModel.findOne({ status: "Active" }).sort({ startDate: -1 }).lean(),
      SprintModel.find().sort({ startDate: 1 }).lean(),
    ]);

    const openDemands = demands.filter(isOpenDemand);
    const deliveredDemands = demands.filter((item: any) => normalizeText(item.status) === "Concluído");

    const openEpicSet = new Set<string>();
    for (const demand of openDemands) {
      const epic = demandEpic(demand);
      if (epic) openEpicSet.add(epic);
    }

    const epicGroups = new Map<string, any[]>();
    for (const demand of openDemands) {
      const epic = demandEpic(demand);
      if (!epic) continue;
      const list = epicGroups.get(epic) ?? [];
      list.push(demand);
      epicGroups.set(epic, list);
    }

    const epicsHealth = Array.from(epicGroups.entries()).map(([epicName, items]) => {
      const riskCount = items.filter((item) => demandPriority(item) === "P0" || isOverdue(item, now)).length;
      const riskRatio = items.length > 0 ? riskCount / items.length : 0;

      return {
        epicName,
        activeDeliverables: items.map((item) => demandTitle(item)),
        healthStatus: riskRatio > 0.3 ? "Crítico" : "Em andamento",
      };
    });

    let currentSprintData: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      daysLeft: number;
      carryover: number;
      newScope: number;
      activeTasks: Array<{
        id: string;
        name: string;
        epico: string;
        responsible: string;
        dependencia: string;
      }>;
    } | null = null;

    if (activeSprint) {
      const sprintId = String(activeSprint._id);
      const sprintStart = new Date(activeSprint.startDate);
      const sprintEnd = new Date(activeSprint.endDate);

      const sprintDemands = demands.filter((item: any) => String(item.sprintId ?? "") === sprintId);
      const carryover = sprintDemands.filter((item: any) => {
        const createdAt = new Date(item.createdAt);
        if (Number.isNaN(createdAt.getTime())) return false;
        return createdAt.getTime() < sprintStart.getTime();
      }).length;

      const newScope = sprintDemands.filter((item: any) => {
        const createdAt = new Date(item.createdAt);
        if (Number.isNaN(createdAt.getTime())) return false;
        return createdAt.getTime() >= sprintStart.getTime();
      }).length;

      const activeTasks = sprintDemands
        .filter(isOpenDemand)
        .map((item: any) => ({
          id: String(item._id),
          name: demandTitle(item),
          epico: demandEpic(item) || "Sem épico",
          responsible: demandResponsible(item),
          dependencia: normalizeText(item.dependencia),
        }));

      currentSprintData = {
        id: sprintId,
        name: normalizeText(activeSprint.name),
        startDate: sprintStart,
        endDate: sprintEnd,
        daysLeft: calcDaysLeft(sprintEnd, now),
        carryover,
        newScope,
        activeTasks,
      };
    }

    const sprintTaskMap = new Map<string, any[]>();
    for (const demand of demands) {
      const sprintId = demand?.sprintId ? String(demand.sprintId) : "";
      if (!sprintId) continue;
      const list = sprintTaskMap.get(sprintId) ?? [];
      list.push(demand);
      sprintTaskMap.set(sprintId, list);
    }

    const sprintHistory = sprints.map((sprint: any) => {
      const sprintId = String(sprint._id);
      const tasks = sprintTaskMap.get(sprintId) ?? [];
      const allClosedDone = tasks.every((item) => normalizeText(item.status) === "Concluído");

      return {
        id: sprintId,
        name: normalizeText(sprint.name),
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        taskCount: tasks.length,
        statusColor: statusColor(normalizeText(sprint.status), allClosedDone),
      };
    });

    return res.json({
      executive: {
        totalEpicsActive: openEpicSet.size,
        totalOpenTasks: openDemands.length,
        totalDeliveredTasks: deliveredDemands.length,
        epicsHealth,
      },
      currentSprint: currentSprintData,
      sprintHistory,
    });
  } catch {
    return res.status(500).json({ message: "Erro ao carregar dashboard." });
  }
};
