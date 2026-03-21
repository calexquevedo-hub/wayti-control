import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { DemandModel } from "../models/Demand";
import { TicketModel } from "../models/Ticket";
import { SystemParamsModel } from "../models/SystemParams";

const router = Router();

router.get("/summary", requireAuth, checkPermission("reports", "view"), async (_req, res) => {
  const demands = await DemandModel.find({ deletedAt: { $exists: false } }).lean();
  const totalBudget = demands.reduce((sum, d: any) => sum + (d.budget ?? 0), 0);
  const totalSpent = demands.reduce((sum, d: any) => sum + (d.spent ?? 0), 0);
  const riskCount = demands.filter((d: any) => d.category === "Risco/Impedimento").length;
  const onTimePercentage = demands.length
    ? Math.round(
        (demands.filter((d: any) => (d.progress ?? 0) >= 70).length / demands.length) * 100
      )
    : 0;

  return res.json({
    totalBudget,
    totalSpent,
    riskCount,
    onTimePercentage,
  });
});

router.get("/executive", requireAuth, checkPermission("reports", "view"), async (_req, res) => {
  const demands = await DemandModel.find({ deletedAt: { $exists: false } }).lean({ virtuals: true });
  const statusCounts = demands.reduce<Record<string, number>>((acc, demand: any) => {
    acc[demand.status] = (acc[demand.status] ?? 0) + 1;
    return acc;
  }, {});

  const p0AndOverdue = demands.filter(
    (demand: any) => demand.priority === "P0" || demand.isOverdue
  );

  const totalMonthly = demands.reduce((sum, demand: any) => sum + (demand.financialMonthly ?? 0), 0);
  const totalOneOff = demands.reduce((sum, demand: any) => sum + (demand.financialOneOff ?? 0), 0);

  const agingBuckets = {
    "0-7": 0,
    "8-14": 0,
    "15-30": 0,
    "30+": 0,
  };

  demands.forEach((demand: any) => {
    const days = demand.agingDays ?? 0;
    if (days <= 7) agingBuckets["0-7"] += 1;
    else if (days <= 14) agingBuckets["8-14"] += 1;
    else if (days <= 30) agingBuckets["15-30"] += 1;
    else agingBuckets["30+"] += 1;
  });

  const topWaiting = demands
    .filter((demand: any) => demand.status === "Aguardando terceiros")
    .sort((a: any, b: any) => String(a.priority ?? "P3").localeCompare(String(b.priority ?? "P3")))
    .slice(0, 10);

  return res.json({
    statusCounts,
    p0AndOverdue,
    totalMonthly,
    totalOneOff,
    agingBuckets,
    topWaiting,
  });
});

router.get("/executive-tickets", requireAuth, checkPermission("reports", "view"), async (_req, res) => {
  const params = await SystemParamsModel.findOne();
  const tickets = await TicketModel.find({
    demandId: { $ne: null },
    status: { $nin: ["Fechado", "Cancelado"] },
  })
    .populate({
      path: "demandId",
      match: { priority: "P0" },
      select: "name priority impact epic status nextFollowUpAt",
    })
    .lean();

  const now = Date.now();
  const calcSlaDueAt = (priority: string, openedAt: Date) => {
    const base = new Date(openedAt);
    const urgent = params?.slaPolicies?.urgentHours ?? 8;
    const high = params?.slaPolicies?.highHours ?? 48;
    const medium = params?.slaPolicies?.mediumHours ?? 120;
    const low = params?.slaPolicies?.lowHours ?? 240;
    if (priority === "P0") return new Date(base.getTime() + urgent * 60 * 60 * 1000);
    if (priority === "P1") return new Date(base.getTime() + high * 60 * 60 * 1000);
    if (priority === "P2") return new Date(base.getTime() + medium * 60 * 60 * 1000);
    return new Date(base.getTime() + low * 60 * 60 * 1000);
  };
  const enriched = tickets
    .map((ticket: any) => {
      const slaDueAt = ticket.slaDueAt ?? calcSlaDueAt(ticket.priority, new Date(ticket.openedAt));
      const isSlaOverdue = slaDueAt
        ? slaDueAt.getTime() < now && !["Fechado", "Cancelado"].includes(ticket.status)
        : false;
      return { ...ticket, slaDueAt, isSlaOverdue };
    })
    .filter((ticket: any) => ticket.demandId);

  const sorted = enriched.sort((a: any, b: any) => {
    const overdue = Number(Boolean(b.isSlaOverdue)) - Number(Boolean(a.isSlaOverdue));
    if (overdue !== 0) return overdue;
    return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
  });

  const top = sorted.slice(0, 10);
  const overdueCount = enriched.filter((item: any) => item.isSlaOverdue).length;
  const statusCounts = enriched.reduce<Record<string, number>>((acc, ticket: any) => {
    acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
    return acc;
  }, {});
  const overdueByQueue = enriched.reduce<Record<string, number>>((acc, ticket: any) => {
    if (!ticket.isSlaOverdue) return acc;
    const key = ticket.queue ?? "N/A";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const agingBuckets = {
    "0-7": 0,
    "8-14": 0,
    "15-30": 0,
    "30+": 0,
  };
  enriched.forEach((ticket: any) => {
    const days = Math.floor((Date.now() - new Date(ticket.openedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) agingBuckets["0-7"] += 1;
    else if (days <= 14) agingBuckets["8-14"] += 1;
    else if (days <= 30) agingBuckets["15-30"] += 1;
    else agingBuckets["30+"] += 1;
  });

  return res.json({
    total: enriched.length,
    overdueCount,
    statusCounts,
    overdueByQueue,
    agingBuckets,
    tickets: top,
  });
});

router.get("/sla-tickets", requireAuth, checkPermission("reports", "view"), async (_req, res) => {
  const params = await SystemParamsModel.findOne();
  const warnMinutes = params?.slaWarningMinutes ?? 120;

  const tickets = await TicketModel.find({
    status: { $nin: ["Fechado", "Cancelado"] },
  }).lean({ virtuals: true });

  const now = Date.now();
  const calcSlaDueAt = (priority: string, openedAt: Date) => {
    const base = new Date(openedAt);
    const urgent = params?.slaPolicies?.urgentHours ?? 8;
    const high = params?.slaPolicies?.highHours ?? 48;
    const medium = params?.slaPolicies?.mediumHours ?? 120;
    const low = params?.slaPolicies?.lowHours ?? 240;
    if (priority === "P0") return new Date(base.getTime() + urgent * 60 * 60 * 1000);
    if (priority === "P1") return new Date(base.getTime() + high * 60 * 60 * 1000);
    if (priority === "P2") return new Date(base.getTime() + medium * 60 * 60 * 1000);
    return new Date(base.getTime() + low * 60 * 60 * 1000);
  };

  const enriched = tickets.map((ticket: any) => {
    const openedAt = new Date(ticket.openedAt);
    const slaDueAt = ticket.slaDueAt ?? calcSlaDueAt(ticket.priority, openedAt);
    const isOverdue = slaDueAt ? slaDueAt.getTime() < now : false;
    const isWarning =
      slaDueAt ? slaDueAt.getTime() >= now && slaDueAt.getTime() <= now + warnMinutes * 60 * 1000 : false;
    const isRisk48h =
      slaDueAt ? slaDueAt.getTime() >= now && slaDueAt.getTime() <= now + 48 * 60 * 60 * 1000 : false;
    const ageDays = Math.floor((now - openedAt.getTime()) / (1000 * 60 * 60 * 24));
    return { ...ticket, slaDueAt, isOverdue, isWarning, isRisk48h, ageDays };
  });

  const totals = {
    open: enriched.length,
    overdue: enriched.filter((t: any) => t.isOverdue).length,
    warning: enriched.filter((t: any) => t.isWarning).length,
    risk48h: enriched.filter((t: any) => t.isRisk48h).length,
  };

  const byQueue = enriched.reduce<Record<string, any>>((acc, ticket: any) => {
    const key = ticket.queue ?? "N/A";
    if (!acc[key]) acc[key] = { open: 0, overdue: 0, warning: 0 };
    acc[key].open += 1;
    if (ticket.isOverdue) acc[key].overdue += 1;
    if (ticket.isWarning) acc[key].warning += 1;
    return acc;
  }, {});

  const byAssignee = enriched.reduce<Record<string, any>>((acc, ticket: any) => {
    const key = ticket.assignee ?? "Não atribuído";
    if (!acc[key]) acc[key] = { open: 0, overdue: 0, warning: 0 };
    acc[key].open += 1;
    if (ticket.isOverdue) acc[key].overdue += 1;
    if (ticket.isWarning) acc[key].warning += 1;
    return acc;
  }, {});

  const agingBuckets = {
    "0-7": 0,
    "8-14": 0,
    "15-30": 0,
    "30+": 0,
  };
  enriched.forEach((ticket: any) => {
    const days = ticket.ageDays ?? 0;
    if (days <= 7) agingBuckets["0-7"] += 1;
    else if (days <= 14) agingBuckets["8-14"] += 1;
    else if (days <= 30) agingBuckets["15-30"] += 1;
    else agingBuckets["30+"] += 1;
  });

  return res.json({
    warnMinutes,
    totals,
    byQueue,
    byAssignee,
    agingBuckets,
  });
});

import { SprintModel } from "../models/Sprint";
import { DomainItemModel } from "../models/DomainItem";
import { RiskItemModel } from "../models/RiskItem";
import { NextStepItemModel } from "../models/NextStepItem";
import { SprintCloseoutModel } from "../models/SprintCloseout";

router.get("/gerencial", requireAuth, checkPermission("reports", "view"), async (req, res) => {
  const { sprintId, from, to } = req.query as Record<string, string | undefined>;
  
  // 1. Capa e Contexto
  const sprint = sprintId ? await SprintModel.findById(sprintId) : await SprintModel.findOne({ status: "Active" }).sort({ startDate: -1 });
  const closeout = sprint ? await SprintCloseoutModel.findOne({ sprintId: sprint._id }) : null;

  const coverInfo = {
    title: "Relatório Gerencial de Projetos de TI",
    organization: "Integra Soluções",
    sprintName: sprint?.name ?? "N/A",
    period: sprint ? `${new Date(sprint.startDate).toLocaleDateString("pt-BR")} a ${new Date(sprint.endDate).toLocaleDateString("pt-BR")}` : "N/A",
    status: sprint?.status === "Active" ? "Em andamento" : sprint?.status === "Closed" ? "Concluída" : "Planejada",
    generatedAt: new Date().toLocaleString("pt-BR"),
  };

  // 2. Visão Executiva (Slide 2) - Dados DA SPRINT
  const sprintIdFilter = sprint?._id;
  const sprintDemands = sprintIdFilter ? await DemandModel.find({ sprintId: sprintIdFilter, deletedAt: { $exists: false } }).lean() : [];
  const allEpicsInSprint = Array.from(new Set(sprintDemands.map(d => d.epico || d.epic).filter(Boolean)));
  const allEpics = await DomainItemModel.find({ 
    type: "EPIC", 
    $or: [{ label: { $in: allEpicsInSprint } }, { value: { $in: allEpicsInSprint } }] 
  }).lean();
  
  const executiveSummary = {
    totalEpics: allEpics.length,
    activeSprint: coverInfo.sprintName,
    openTasks: sprintDemands.filter((d: any) => d.status !== "Concluído" && d.status !== "Cancelado").length,
    deliveries: sprintDemands.filter((d: any) => d.status === "Concluído").length,
    carryoverRate: closeout?.carryoverRate ?? 0,
    criticalCarryover: closeout?.carryoverCriticalCount ?? 0,
    epicTable: allEpics.map((epic: any) => {
      const epicDemands = sprintDemands.filter((d: any) => d.epico === epic.label || d.epic === epic.value);
      return {
        area: epic.area || "N/A",
        label: epic.label,
        activeDeliverables: epicDemands.filter((d: any) => d.status !== "Concluído").length,
        currentSprint: sprint?.name || "N/A",
        status: epicDemands.some((d: any) => d.priority === "P0" || d.isOverdue) ? "Crítico" : "Em andamento"
      };
    })
  };

  // 3. Histórico de Sprints (Slide 3) - Mantém histórico global para contexto
  const lastSprints = await SprintModel.find().sort({ startDate: -1 }).limit(4).lean();
  const sprintHistory = await Promise.all(lastSprints.map(async (s: any) => {
    const sDemands = await DemandModel.find({ sprintId: s._id }).select("status progress").lean();
    return {
      name: s.name,
      period: `${new Date(s.startDate).toLocaleDateString("pt-BR")} - ${new Date(s.endDate).toLocaleDateString("pt-BR")}`,
      taskCount: sDemands.length,
      status: s.status === "Active" ? "Em andamento" : s.status === "Closed" ? "Concluída" : "Futura"
    };
  }));

  // 4. Resumo da Sprint e Detalhamento (Slides 4, 5, 6)
  // sprintDemands já carregado no início do handler
  
  const sprintSummary = {
    name: sprint?.name,
    dates: coverInfo.period,
    status: coverInfo.status,
    carryoverFromLast: sprintDemands.filter((d: any) => d.isCarryover).length,
    carryoverRate: closeout?.carryoverRate ?? 0,
    carryoverCriticalCount: closeout?.carryoverCriticalCount ?? 0,
    newTasks: sprintDemands.filter((d: any) => new Date(d.createdAt) >= (sprint?.startDate || new Date(0))).length,
    totalOpen: sprintDemands.filter((d: any) => d.status !== "Concluído").length,
    daysRemaining: sprint ? Math.max(0, Math.ceil((new Date(sprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
    endDate: sprint ? new Date(sprint.endDate).toLocaleDateString("pt-BR") : "N/A",
    tasks: sprintDemands.map((d: any) => ({
      id: d.sequentialId,
      title: d.titulo || d.name,
      epic: d.epico || d.epic,
      responsible: d.responsavel || d.responsible,
      category: d.categoria || d.category,
      done: d.status === "Concluído",
      isCarryover: !!d.isCarryover,
      carryoverCount: d.carryoverCount || 0,
      gate: d.gateStatus || d.dependencia || "N/A"
    }))
  };

  // Agrupamento por Épico para o Gráfico
  const tasksByEpicMap: Record<string, number> = {};
  sprintDemands.forEach((d: any) => {
    const key = d.epico || d.epic || "Outros";
    tasksByEpicMap[key] = (tasksByEpicMap[key] || 0) + 1;
  });
  const tasksByEpic = Object.entries(tasksByEpicMap).map(([name, count]) => ({
    name,
    count,
    percentage: sprintDemands.length ? Math.round((count / sprintDemands.length) * 100) : 0
  }));

  // 5. Riscos e Próximos Passos (Slides 7, 8)
  const risks = await RiskItemModel.find({ 
    $or: [
      { linkedSprintId: sprint?._id },
      { linkedSprintId: { $exists: false } },
      { linkedSprintId: null }
    ],
    status: { $ne: "Resolvido" }
  }).sort({ severity: 1 }).lean();

  const nextSteps = await NextStepItemModel.find({
    $or: [
      { linkedSprintId: sprint?._id },
      { linkedSprintId: { $exists: false } },
      { linkedSprintId: null }
    ]
  }).sort({ order: 1 }).lean();

  return res.json({
    coverInfo,
    executiveSummary,
    sprintHistory: sprintHistory.reverse(),
    sprintSummary,
    tasksByEpic,
    risks,
    nextSteps
  });
});

export default router;
