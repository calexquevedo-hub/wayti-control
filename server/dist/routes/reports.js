import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { DemandModel } from "../models/Demand";
import { TicketModel } from "../models/Ticket";
import { SystemParamsModel } from "../models/SystemParams";
const router = Router();
router.get("/summary", requireAuth, checkPermission("reports", "view"), async (_req, res) => {
    const demands = await DemandModel.find({ deletedAt: { $exists: false } }).lean();
    const totalBudget = demands.reduce((sum, d) => sum + (d.budget ?? 0), 0);
    const totalSpent = demands.reduce((sum, d) => sum + (d.spent ?? 0), 0);
    const riskCount = demands.filter((d) => d.category === "Risco/Impedimento").length;
    const onTimePercentage = demands.length
        ? Math.round((demands.filter((d) => (d.progress ?? 0) >= 70).length / demands.length) * 100)
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
    const statusCounts = demands.reduce((acc, demand) => {
        acc[demand.status] = (acc[demand.status] ?? 0) + 1;
        return acc;
    }, {});
    const p0AndOverdue = demands.filter((demand) => demand.priority === "P0" || demand.isOverdue);
    const totalMonthly = demands.reduce((sum, demand) => sum + (demand.financialMonthly ?? 0), 0);
    const totalOneOff = demands.reduce((sum, demand) => sum + (demand.financialOneOff ?? 0), 0);
    const agingBuckets = {
        "0-7": 0,
        "8-14": 0,
        "15-30": 0,
        "30+": 0,
    };
    demands.forEach((demand) => {
        const days = demand.agingDays ?? 0;
        if (days <= 7)
            agingBuckets["0-7"] += 1;
        else if (days <= 14)
            agingBuckets["8-14"] += 1;
        else if (days <= 30)
            agingBuckets["15-30"] += 1;
        else
            agingBuckets["30+"] += 1;
    });
    const topWaiting = demands
        .filter((demand) => demand.status === "Aguardando terceiros")
        .sort((a, b) => String(a.priority ?? "P3").localeCompare(String(b.priority ?? "P3")))
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
    const calcSlaDueAt = (priority, openedAt) => {
        const base = new Date(openedAt);
        const urgent = params?.slaPolicies?.urgentHours ?? 8;
        const high = params?.slaPolicies?.highHours ?? 48;
        const medium = params?.slaPolicies?.mediumHours ?? 120;
        const low = params?.slaPolicies?.lowHours ?? 240;
        if (priority === "P0")
            return new Date(base.getTime() + urgent * 60 * 60 * 1000);
        if (priority === "P1")
            return new Date(base.getTime() + high * 60 * 60 * 1000);
        if (priority === "P2")
            return new Date(base.getTime() + medium * 60 * 60 * 1000);
        return new Date(base.getTime() + low * 60 * 60 * 1000);
    };
    const enriched = tickets
        .map((ticket) => {
        const slaDueAt = ticket.slaDueAt ?? calcSlaDueAt(ticket.priority, new Date(ticket.openedAt));
        const isSlaOverdue = slaDueAt
            ? slaDueAt.getTime() < now && !["Fechado", "Cancelado"].includes(ticket.status)
            : false;
        return { ...ticket, slaDueAt, isSlaOverdue };
    })
        .filter((ticket) => ticket.demandId);
    const sorted = enriched.sort((a, b) => {
        const overdue = Number(Boolean(b.isSlaOverdue)) - Number(Boolean(a.isSlaOverdue));
        if (overdue !== 0)
            return overdue;
        return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
    });
    const top = sorted.slice(0, 10);
    const overdueCount = enriched.filter((item) => item.isSlaOverdue).length;
    const statusCounts = enriched.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
        return acc;
    }, {});
    const overdueByQueue = enriched.reduce((acc, ticket) => {
        if (!ticket.isSlaOverdue)
            return acc;
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
    enriched.forEach((ticket) => {
        const days = Math.floor((Date.now() - new Date(ticket.openedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 7)
            agingBuckets["0-7"] += 1;
        else if (days <= 14)
            agingBuckets["8-14"] += 1;
        else if (days <= 30)
            agingBuckets["15-30"] += 1;
        else
            agingBuckets["30+"] += 1;
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
    const calcSlaDueAt = (priority, openedAt) => {
        const base = new Date(openedAt);
        const urgent = params?.slaPolicies?.urgentHours ?? 8;
        const high = params?.slaPolicies?.highHours ?? 48;
        const medium = params?.slaPolicies?.mediumHours ?? 120;
        const low = params?.slaPolicies?.lowHours ?? 240;
        if (priority === "P0")
            return new Date(base.getTime() + urgent * 60 * 60 * 1000);
        if (priority === "P1")
            return new Date(base.getTime() + high * 60 * 60 * 1000);
        if (priority === "P2")
            return new Date(base.getTime() + medium * 60 * 60 * 1000);
        return new Date(base.getTime() + low * 60 * 60 * 1000);
    };
    const enriched = tickets.map((ticket) => {
        const openedAt = new Date(ticket.openedAt);
        const slaDueAt = ticket.slaDueAt ?? calcSlaDueAt(ticket.priority, openedAt);
        const isOverdue = slaDueAt ? slaDueAt.getTime() < now : false;
        const isWarning = slaDueAt ? slaDueAt.getTime() >= now && slaDueAt.getTime() <= now + warnMinutes * 60 * 1000 : false;
        const isRisk48h = slaDueAt ? slaDueAt.getTime() >= now && slaDueAt.getTime() <= now + 48 * 60 * 60 * 1000 : false;
        const ageDays = Math.floor((now - openedAt.getTime()) / (1000 * 60 * 60 * 24));
        return { ...ticket, slaDueAt, isOverdue, isWarning, isRisk48h, ageDays };
    });
    const totals = {
        open: enriched.length,
        overdue: enriched.filter((t) => t.isOverdue).length,
        warning: enriched.filter((t) => t.isWarning).length,
        risk48h: enriched.filter((t) => t.isRisk48h).length,
    };
    const byQueue = enriched.reduce((acc, ticket) => {
        const key = ticket.queue ?? "N/A";
        if (!acc[key])
            acc[key] = { open: 0, overdue: 0, warning: 0 };
        acc[key].open += 1;
        if (ticket.isOverdue)
            acc[key].overdue += 1;
        if (ticket.isWarning)
            acc[key].warning += 1;
        return acc;
    }, {});
    const byAssignee = enriched.reduce((acc, ticket) => {
        const key = ticket.assignee ?? "Não atribuído";
        if (!acc[key])
            acc[key] = { open: 0, overdue: 0, warning: 0 };
        acc[key].open += 1;
        if (ticket.isOverdue)
            acc[key].overdue += 1;
        if (ticket.isWarning)
            acc[key].warning += 1;
        return acc;
    }, {});
    const agingBuckets = {
        "0-7": 0,
        "8-14": 0,
        "15-30": 0,
        "30+": 0,
    };
    enriched.forEach((ticket) => {
        const days = ticket.ageDays ?? 0;
        if (days <= 7)
            agingBuckets["0-7"] += 1;
        else if (days <= 14)
            agingBuckets["8-14"] += 1;
        else if (days <= 30)
            agingBuckets["15-30"] += 1;
        else
            agingBuckets["30+"] += 1;
    });
    return res.json({
        warnMinutes,
        totals,
        byQueue,
        byAssignee,
        agingBuckets,
    });
});
export default router;
