import { Router } from "express";

import { DemandModel } from "../models/Demand";
import { ContactLogModel } from "../models/ContactLog";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";

const router = Router();
const ALLOWED_DEMAND_STATUSES = new Set([
  "Backlog",
  "Esta semana",
  "Em execução",
  "Aguardando terceiros",
  "Concluído",
  "Cancelado",
]);

router.get("/", requireAuth, checkPermission("demands", "view"), async (req, res) => {
  const { status, priority, epic, responsible, externalOwnerId, overdue, nextFrom, nextTo } =
    req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (epic) filter.epic = epic;
  if (responsible) filter.responsible = responsible;
  if (externalOwnerId) filter.externalOwnerId = externalOwnerId;

  if (nextFrom || nextTo) {
    filter.nextFollowUpAt = {};
    if (nextFrom) filter.nextFollowUpAt = { ...(filter.nextFollowUpAt as object), $gte: new Date(nextFrom) };
    if (nextTo) filter.nextFollowUpAt = { ...(filter.nextFollowUpAt as object), $lte: new Date(nextTo) };
  }

  if (overdue === "true") {
    filter.status = "Aguardando terceiros";
    filter.nextFollowUpAt = { $lte: new Date() };
  }

  const demands = await DemandModel.find(filter).sort({ updatedAt: -1 });
  return res.json(demands);
});

router.post("/", requireAuth, checkPermission("demands", "create"), async (req, res) => {
  const actor = res.locals.user?.email ?? "system";
  const now = new Date();
  const sponsor =
    typeof req.body.sponsor === "string" && req.body.sponsor.trim()
      ? req.body.sponsor.trim()
      : "Não definido";
  const demand = await DemandModel.create({
    ...req.body,
    sponsor,
    lastUpdate: req.body.lastUpdate ? new Date(req.body.lastUpdate) : new Date(),
    audits: [
      {
        at: now,
        action: "created",
        actor,
        notes: "Demanda criada.",
      },
    ],
  });
  return res.status(201).json(demand);
});

router.patch("/:id", requireAuth, checkPermission("demands", "edit"), async (req, res) => {
  const actor = res.locals.user?.email ?? "system";
  const now = new Date();
  const current = await DemandModel.findById(req.params.id);
  if (!current) {
    return res.status(404).json({ message: "Demanda nao encontrada" });
  }

  const payload = { ...req.body } as Record<string, unknown>;
  if (payload.nextFollowUpAt) payload.nextFollowUpAt = new Date(payload.nextFollowUpAt as string);
  if (payload.lastContactAt) payload.lastContactAt = new Date(payload.lastContactAt as string);
  if (payload.lastUpdate) payload.lastUpdate = new Date(payload.lastUpdate as string);
  if (Array.isArray(payload.tasks)) {
    const total = payload.tasks.length;
    const completed = payload.tasks.filter((task: any) => task?.isCompleted).length;
    payload.progress = total ? Math.round((completed / total) * 100) : 0;
  }

  const audits = current.audits ?? [];
  const trackFields = [
    "name",
    "type",
    "category",
    "status",
    "priority",
    "impact",
    "epic",
    "responsible",
    "externalOwnerId",
    "sponsor",
    "budget",
    "spent",
    "progress",
    "approver",
    "approvalStatus",
    "approvalNotes",
    "approvalStages",
    "approvalSlaDays",
    "financialMonthly",
    "financialOneOff",
    "executiveSummary",
    "notes",
    "tasks",
    "escalateTo",
    "nextFollowUpAt",
  ];
  trackFields.forEach((field) => {
    if (field in payload && String(current.get(field)) !== String(payload[field])) {
      audits.push({
        at: now,
        action: "updated",
        actor,
        field,
        before: String(current.get(field)),
        after: String(payload[field]),
      });
    }
  });

  if ("followUps" in payload) {
    audits.push({
      at: now,
      action: "followups",
      actor,
      notes: "Follow-ups atualizados.",
    });
  }
  if ("tasks" in payload) {
    audits.push({
      at: now,
      action: "tasks",
      actor,
      notes: "Checklist de tarefas atualizado.",
    });
  }

  const demand = await DemandModel.findByIdAndUpdate(
    req.params.id,
    { ...payload, audits },
    { new: true }
  );
  return res.json(demand);
});

router.patch("/:id/move", requireAuth, checkPermission("demands", "edit"), async (req, res) => {
  const actor = res.locals.user?.email ?? "system";
  const { status, index } = req.body as { status?: string; index?: number };

  if (!status || !ALLOWED_DEMAND_STATUSES.has(status)) {
    return res.status(400).json({ message: "Status inválido para movimentação." });
  }

  const current = await DemandModel.findById(req.params.id);
  if (!current) {
    return res.status(404).json({ message: "Demanda nao encontrada" });
  }

  const updatePayload: Record<string, unknown> = {
    status,
    lastUpdate: new Date(),
    audits: [
      ...(current.audits ?? []),
      {
        at: new Date(),
        action: "moved",
        actor,
        field: "status",
        before: String(current.status),
        after: status,
        notes: "Movimentação de card no Kanban.",
      },
    ],
  };

  if (typeof index === "number" && Number.isFinite(index)) {
    updatePayload.posicao = index;
  }

  const moved = await DemandModel.findByIdAndUpdate(req.params.id, updatePayload, {
    new: true,
  });
  return res.json(moved);
});

router.post("/:id/contact", requireAuth, checkPermission("demands", "edit"), async (req, res) => {
  const actor = res.locals.user?.email ?? "system";
  const { channel, summary, nextFollowUpAt } = req.body as {
    channel: string;
    summary: string;
    nextFollowUpAt?: string;
  };

  const contact = await ContactLogModel.create({
    demandId: req.params.id,
    at: new Date(),
    channel,
    summary,
    nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
  });

  const updates: Record<string, unknown> = {
    lastContactAt: contact.at,
    lastUpdate: new Date(),
  };
  if (nextFollowUpAt) {
    updates.nextFollowUpAt = new Date(nextFollowUpAt);
  }

  const audits = [
    {
      at: new Date(),
      action: "contact",
      actor,
      notes: `Contato registrado via ${channel}.`,
    },
  ];

  await DemandModel.findByIdAndUpdate(req.params.id, {
    $set: updates,
    $push: { audits: { $each: audits } },
  });

  return res.status(201).json(contact);
});

router.get("/:id/contacts", requireAuth, async (req, res) => {
  const contacts = await ContactLogModel.find({ demandId: req.params.id }).sort({ at: -1 });
  return res.json(contacts);
});

router.post("/:id/comment", requireAuth, checkPermission("demands", "edit"), async (req, res) => {
  const actor = res.locals.user?.email ?? "system";
  const { message } = req.body as { message?: string };

  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Comentário é obrigatório." });
  }

  const comment = {
    at: new Date(),
    author: actor,
    message: message.trim(),
  };

  const demand = await DemandModel.findByIdAndUpdate(
    req.params.id,
    {
      $push: { comments: comment, audits: { at: new Date(), action: "comment", actor } },
      $set: { lastUpdate: new Date() },
    },
    { new: true }
  );

  if (!demand) {
    return res.status(404).json({ message: "Demanda não encontrada." });
  }

  return res.status(201).json(demand);
});

router.post("/:id/escalate", requireAuth, checkPermission("demands", "edit"), async (req, res) => {
  const actor = res.locals.user?.email ?? "system";
  const { escalateTo } = req.body as { escalateTo: string };

  const demand = await DemandModel.findByIdAndUpdate(
    req.params.id,
    {
      escalateTo,
      $push: {
        audits: {
          at: new Date(),
          action: "escalated",
          actor,
          notes: `Escalado para ${escalateTo}.`,
        },
      },
    },
    { new: true }
  );

  return res.json(demand);
});

router.delete("/:id", requireAuth, checkPermission("demands", "delete"), async (req, res) => {
  const { reason } = req.body as { reason?: string };
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Motivo da exclusão é obrigatório." });
  }
  const actor = res.locals.user?.email ?? "system";
  const demand = await DemandModel.findById(req.params.id);
  if (!demand) {
    return res.status(404).json({ message: "Demanda não encontrada." });
  }
  const audits = [
    ...(demand.audits ?? []),
    {
      at: new Date(),
      action: "deleted",
      actor,
      notes: reason.trim(),
    },
  ];
  await DemandModel.findByIdAndUpdate(req.params.id, {
    deletedAt: new Date(),
    status: "Cancelado",
    audits,
  });
  return res.json({ ok: true });
});

router.get("/suggest", requireAuth, async (req, res) => {
  const { priority } = req.query as { priority?: string };
  const base = new Date();
  const days = priority === "P0" ? 2 : priority === "P1" ? 5 : priority === "P2" ? 10 : 20;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return res.json({ nextFollowUpAt: next });
});

export default router;
