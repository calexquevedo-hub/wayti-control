import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { CounterModel } from "../models/Counter";
import { TicketModel } from "../models/Ticket";
import { ServiceCatalogModel } from "../models/ServiceCatalog";
import { InboundEmailModel } from "../models/InboundEmail";
import { OutboundEmailModel } from "../models/OutboundEmail";
import { UserModel } from "../models/User";
import fs from "fs";
import path from "path";
import { buildMailer } from "../config/mailer";
import { SystemParamsModel } from "../models/SystemParams";
import { runAutomations } from "../services/automation";

const router = Router();
const upload = multer({ dest: "uploads/outbound-attachments" });

const QUEUES = ["TI Interna", "Fornecedor"] as const;
const STATUSES = [
  "Novo",
  "Triagem",
  "Em atendimento",
  "Aguardando fornecedor",
  "Aguardando solicitante",
  "Aguardando aprovação",
  "Resolvido",
  "Fechado",
  "Cancelado",
] as const;

const IMPACT = ["Baixo", "Médio", "Alto"] as const;
const URGENCY = ["Baixa", "Média", "Alta"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

function calcPriority(impact: string, urgency: string) {
  const highImpact = impact === "Alto";
  const medImpact = impact === "Médio";
  const highUrg = urgency === "Alta";
  const medUrg = urgency === "Média";

  if (highImpact && highUrg) return "P0";
  if ((highImpact && medUrg) || (medImpact && highUrg)) return "P1";
  if ((highImpact && !highUrg && !medUrg) || (medImpact && medUrg) || (!highImpact && !medImpact && highUrg))
    return "P2";
  return "P3";
}

function impactUrgencyFromPriority(priority: string) {
  if (priority === "P0") return { impact: "Alto", urgency: "Alta" };
  if (priority === "P1") return { impact: "Alto", urgency: "Média" };
  if (priority === "P2") return { impact: "Médio", urgency: "Média" };
  return { impact: "Baixo", urgency: "Baixa" };
}

function calcSlaDueAt(
  priority: string,
  openedAt: Date,
  policies?: { urgentHours?: number; highHours?: number; mediumHours?: number; lowHours?: number }
) {
  const now = new Date(openedAt);
  const urgent = policies?.urgentHours ?? 8;
  const high = policies?.highHours ?? 48;
  const medium = policies?.mediumHours ?? 120;
  const low = policies?.lowHours ?? 240;
  if (priority === "P0") return new Date(now.getTime() + urgent * 60 * 60 * 1000);
  if (priority === "P1") return new Date(now.getTime() + high * 60 * 60 * 1000);
  if (priority === "P2") return new Date(now.getTime() + medium * 60 * 60 * 1000);
  return new Date(now.getTime() + low * 60 * 60 * 1000);
}

function canApproveTicket(args: {
  userId?: string;
  isAdmin?: boolean;
  isAgent?: boolean;
  approverRole?: string | null;
  approverId?: string | null;
}) {
  if (!args.userId) return false;
  if (args.approverId) return args.approverId === args.userId;
  if (args.approverRole) {
    return args.approverRole === (args.isAdmin ? "Admin" : args.isAgent ? "Agent" : undefined);
  }
  return args.isAdmin || args.isAgent;
}

function isPortalUser(profile?: any) {
  if (!profile?.permissions) return false;
  const perms = profile.permissions;
  return (
    perms.tickets?.view &&
    perms.tickets?.create &&
    !perms.tickets?.edit &&
    !perms.tickets?.delete &&
    !perms.settings?.manage
  );
}

function canAccessTicket(ticket: any, userId?: string) {
  if (!ticket) return false;
  if (!userId) return false;
  if (!ticket.requesterId) return false;
  return ticket.requesterId.toString() === userId;
}

async function notifyApprovers({
  service,
  ticket,
  requester,
}: {
  service: any;
  ticket: any;
  requester: string;
}) {
  const params = await SystemParamsModel.findOne();
  if (!params) return;
  const fromEmail =
    params.fromEmail ||
    params.gmailUser ||
    params.office365User ||
    params.smtpUser ||
    params.sesSmtpUser ||
    "";
  if (!fromEmail) return;

  const recipients: string[] = [];
  if (service.specificApproverId) {
    const user = await UserModel.findById(service.specificApproverId);
    if (user?.email) recipients.push(user.email);
  } else if (service.approverRole) {
    const users = await UserModel.find({ role: service.approverRole, isActive: true });
    users.forEach((user) => {
      if (user.email) recipients.push(user.email);
    });
  }
  if (recipients.length === 0) return;

  const from = params.fromName ? `${params.fromName} <${fromEmail}>` : fromEmail;
  const subject = `Aprovação pendente: ${ticket.subject} (${ticket.code})`;
  const body = `O usuário ${requester} solicitou o serviço "${service.title}".\n\nChamado: ${ticket.code}\nStatus: ${ticket.status}\n\nAcesse o WayTI Control para aprovar ou rejeitar.`;

  try {
    const transporter = await buildMailer();
    await transporter.sendMail({
      from,
      to: recipients.join(","),
      subject,
      text: body,
    });
  } catch {
    // silencia falha de notificação para não bloquear o fluxo
  }
}

async function nextTicketCode() {
  const year = new Date().getFullYear();
  const counter = await CounterModel.findOneAndUpdate(
    { name: `ticket-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = String(counter.seq).padStart(6, "0");
  return `CH-${year}-${seq}`;
}

router.get("/", requireAuth, checkPermission("tickets", "view"), async (req, res) => {
  const { system, status, demandId, relatedAssetId } = req.query as Record<string, string | undefined>;
  const { queue, overdue, unlinked } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  const userId = res.locals.user?.id as string | undefined;
  if (isPortalUser(res.locals.user?.profile) && userId) {
    filter.requesterId = userId;
  }
  if (system) filter.system = system;
  if (status) filter.status = status;
  if (demandId) filter.demandId = demandId;
  if (relatedAssetId) filter.relatedAssetId = relatedAssetId;
  if (queue) filter.queue = queue;
  if (unlinked === "true") filter.demandId = null;

  let tickets = await TicketModel.find(filter).sort({ updatedAt: -1 });
  if (overdue === "true") {
    tickets = tickets.filter((ticket: any) => ticket.isSlaOverdue);
  }
  return res.json(tickets);
});

router.post("/", requireAuth, checkPermission("tickets", "create"), async (req, res) => {
  const userId = res.locals.user?.id as string | undefined;
  const userEmail = res.locals.user?.email as string | undefined;
  const payload = req.body as Record<string, unknown>;
  const queue = String(payload.queue ?? "");
  let status = String(payload.status ?? "Novo");
  let impact = String(payload.impact ?? "");
  let urgency = String(payload.urgency ?? "");
  let serviceDefaults: { priority?: string; slaHours?: number; category?: string } | null = null;
  let approvalMeta: {
    approvalStatus?: string;
    approvalRequestedAt?: Date;
    approvalApproverRole?: string;
    approvalApproverId?: string;
  } = {};
  let serviceInfo: any = null;
  if (payload.serviceId) {
    const service = await ServiceCatalogModel.findById(payload.serviceId);
    if (service) {
      serviceInfo = service;
      serviceDefaults = {
        priority: service.defaultPriority,
        slaHours: service.defaultSLA,
        category: service.category,
      };
      const mapped = impactUrgencyFromPriority(service.defaultPriority);
      impact = mapped.impact;
      urgency = mapped.urgency;
      if (!payload.category) {
        payload.category = service.category;
      }
      if (service.requiresApproval) {
        status = "Aguardando aprovação";
        approvalMeta = {
          approvalStatus: "Pending",
          approvalRequestedAt: new Date(),
          approvalApproverRole: service.approverRole ?? undefined,
          approvalApproverId: service.specificApproverId?.toString(),
        };
      }
    }
  }

  if (!QUEUES.includes(queue as any)) {
    return res.status(400).json({ message: "Fila inválida." });
  }
  if (!STATUSES.includes(status as any)) {
    return res.status(400).json({ message: "Status inválido." });
  }
  if (!IMPACT.includes(impact as any) || !URGENCY.includes(urgency as any)) {
    return res.status(400).json({ message: "Impacto/urgência inválidos." });
  }

  const params = await SystemParamsModel.findOne();
  const priority = serviceDefaults?.priority ?? calcPriority(impact, urgency);
  const openedAt = payload.openedAt ? new Date(payload.openedAt as string) : new Date();
  const slaDueAt =
    status === "Aguardando aprovação"
      ? null
      : serviceDefaults?.slaHours
      ? new Date(openedAt.getTime() + serviceDefaults.slaHours * 60 * 60 * 1000)
      : calcSlaDueAt(priority, openedAt, params?.slaPolicies ?? undefined);

  if (queue === "Fornecedor" || status === "Aguardando fornecedor") {
    if (!payload.externalOwnerId) {
      return res.status(400).json({ message: "externalOwnerId obrigatório para fornecedor." });
    }
  }

  const code = await nextTicketCode();
  const created = await TicketModel.create({
    ...payload,
    requesterId: payload.requesterId ?? userId,
    requesterEmail: payload.requesterEmail ?? userEmail,
    channel: payload.channel ?? "Manual",
    code,
    priority,
    openedAt,
    slaDueAt,
    impact,
    urgency,
    approvalStatus: approvalMeta.approvalStatus ?? "NotRequired",
    approvalRequestedAt: approvalMeta.approvalRequestedAt,
    approvalApproverRole: approvalMeta.approvalApproverRole,
    approvalApproverId: approvalMeta.approvalApproverId,
    comments: approvalMeta.approvalStatus === "Pending" ? [
      {
        at: new Date(),
        author: res.locals.user?.email ?? "system",
        message: `Solicitação enviada para aprovação.`,
      },
    ] : payload.comments,
  });

  if (serviceInfo?.requiresApproval) {
    const requester = res.locals.user?.email ?? "solicitante";
    await notifyApprovers({ service: serviceInfo, ticket: created, requester });
  }

  runAutomations("TicketCreated", created).catch(console.error);
  return res.status(201).json(created);
});

router.patch("/:id", requireAuth, checkPermission("tickets", "edit"), async (req, res) => {
  if (isPortalUser(res.locals.user?.profile)) {
    return res.status(403).json({ message: "Ação restrita para solicitantes." });
  }
  const payload = req.body as Record<string, unknown>;
  const current = await TicketModel.findById(req.params.id);
  if (!current) {
    return res.status(404).json({ message: "Ticket não encontrado." });
  }

  const nextStatus = String(payload.status ?? current.status);
  const nextQueue = String(payload.queue ?? current.queue);
  const nextImpact = String(payload.impact ?? current.impact);
  const nextUrgency = String(payload.urgency ?? current.urgency);
  const nextPriority = PRIORITIES.includes(payload.priority as any)
    ? String(payload.priority)
    : calcPriority(nextImpact, nextUrgency);

  if (!STATUSES.includes(nextStatus as any)) {
    return res.status(400).json({ message: "Status inválido." });
  }
  if (!QUEUES.includes(nextQueue as any)) {
    return res.status(400).json({ message: "Fila inválida." });
  }
  if (current.status === "Aguardando aprovação" && nextStatus !== "Aguardando aprovação") {
    return res.status(400).json({ message: "Ticket aguardando aprovação não pode avançar sem decisão." });
  }

  // sair de triagem exige campos mínimos
  if (current.status === "Triagem" && nextStatus !== "Triagem") {
    const required = ["system", "category", "impact", "urgency", "queue"];
    for (const field of required) {
      const value = payload[field] ?? (current as any)[field];
      if (!value) {
        return res.status(400).json({ message: `Campo obrigatório: ${field}` });
      }
    }
  }

  if (nextQueue === "Fornecedor" || nextStatus === "Aguardando fornecedor") {
    const ext = payload.externalOwnerId ?? current.externalOwnerId;
    if (!ext) {
      return res.status(400).json({ message: "externalOwnerId obrigatório para fornecedor." });
    }
  }

  if (nextStatus === "Resolvido") {
    const notes = payload.resolutionNotes ?? current.resolutionNotes;
    if (!notes) {
      return res.status(400).json({ message: "resolutionNotes obrigatório ao resolver." });
    }
    payload.resolvedAt = payload.resolvedAt ?? new Date();
  }

  if (nextStatus === "Fechado") {
    payload.closedAt = payload.closedAt ?? new Date();
  }

  payload.priority = nextPriority;
  const params = await SystemParamsModel.findOne();
  payload.slaDueAt =
    nextStatus === "Aguardando aprovação"
      ? null
      : calcSlaDueAt(nextPriority, current.openedAt, params?.slaPolicies ?? undefined);

  const update: Record<string, unknown> = { ...payload };
  if (payload.status && payload.status !== current.status) {
    const actor = (res.locals.user?.email ?? "system") as string;
    update.$push = {
      comments: {
        at: new Date(),
        author: actor,
        message: `Status alterado: ${current.status} → ${payload.status}`,
      },
    };
  }

  const updated = await TicketModel.findByIdAndUpdate(req.params.id, update, { new: true });
  if (updated) {
    runAutomations("TicketUpdated", updated).catch(console.error);
  }
  return res.json(updated);
});

router.post("/:id/approve", requireAuth, checkPermission("tickets", "edit"), async (req, res) => {
  if (isPortalUser(res.locals.user?.profile)) {
    return res.status(403).json({ message: "Ação restrita para solicitantes." });
  }
  const ticket = await TicketModel.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket não encontrado." });
  }
  if (ticket.status !== "Aguardando aprovação") {
    return res.status(400).json({ message: "Ticket não está aguardando aprovação." });
  }

  const service = ticket.serviceId ? await ServiceCatalogModel.findById(ticket.serviceId) : null;
  const user = res.locals.user;
  const profile = user?.profile;
  const isAdmin = !!profile?.permissions?.settings?.manage;
  const isAgent = !isAdmin && !!profile?.permissions?.tickets?.edit;
  const allowed = canApproveTicket({
    userId: user?.id,
    isAdmin,
    isAgent,
    approverRole: service?.approverRole ?? ticket.approvalApproverRole ?? undefined,
    approverId: service?.specificApproverId?.toString() ?? ticket.approvalApproverId?.toString() ?? undefined,
  });
  if (!allowed) {
    return res.status(403).json({ message: "Apenas aprovadores podem concluir esta ação." });
  }

  const params = await SystemParamsModel.findOne();
  const slaDueAt = calcSlaDueAt(ticket.priority, ticket.openedAt, params?.slaPolicies ?? undefined);
  const update: Record<string, unknown> = {
    status: "Novo",
    slaDueAt,
    approvalStatus: "Approved",
    approvalDecidedAt: new Date(),
    approvalDecidedBy: user?.email ?? "system",
  };
  if (service?.autoAssignTo && !ticket.assignee) {
    update.assignee = service.autoAssignTo;
  }
  update.$push = {
    comments: {
      at: new Date(),
      author: user?.email ?? "system",
      message: "Aprovação concedida.",
    },
  };
  const updated = await TicketModel.findByIdAndUpdate(ticket.id, update, { new: true });
  return res.json(updated);
});

router.post("/:id/reject", requireAuth, checkPermission("tickets", "edit"), async (req, res) => {
  if (isPortalUser(res.locals.user?.profile)) {
    return res.status(403).json({ message: "Ação restrita para solicitantes." });
  }
  const { reason } = req.body as { reason?: string };
  if (!reason?.trim()) {
    return res.status(400).json({ message: "Motivo é obrigatório." });
  }
  const ticket = await TicketModel.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket não encontrado." });
  }
  if (ticket.status !== "Aguardando aprovação") {
    return res.status(400).json({ message: "Ticket não está aguardando aprovação." });
  }
  const service = ticket.serviceId ? await ServiceCatalogModel.findById(ticket.serviceId) : null;
  const user = res.locals.user;
  const profile = user?.profile;
  const isAdmin = !!profile?.permissions?.settings?.manage;
  const isAgent = !isAdmin && !!profile?.permissions?.tickets?.edit;
  const allowed = canApproveTicket({
    userId: user?.id,
    isAdmin,
    isAgent,
    approverRole: service?.approverRole ?? ticket.approvalApproverRole ?? undefined,
    approverId: service?.specificApproverId?.toString() ?? ticket.approvalApproverId?.toString() ?? undefined,
  });
  if (!allowed) {
    return res.status(403).json({ message: "Apenas aprovadores podem concluir esta ação." });
  }

  const update: Record<string, unknown> = {
    status: "Cancelado",
    approvalStatus: "Rejected",
    approvalDecidedAt: new Date(),
    approvalDecidedBy: user?.email ?? "system",
    approvalReason: reason.trim(),
  };
  update.$push = {
    comments: {
      at: new Date(),
      author: user?.email ?? "system",
      message: `Aprovação rejeitada. Motivo: ${reason.trim()}`,
    },
  };
  const updated = await TicketModel.findByIdAndUpdate(ticket.id, update, { new: true });
  return res.json(updated);
});

router.post("/:id/comment", requireAuth, checkPermission("tickets", "edit"), async (req, res) => {
  const userId = res.locals.user?.id as string | undefined;
  const { message, author } = req.body as { message: string; author: string };
  if (!message || !author) {
    return res.status(400).json({ message: "message e author são obrigatórios." });
  }
  if (isPortalUser(res.locals.user?.profile)) {
    const ticket = await TicketModel.findById(req.params.id);
    if (!canAccessTicket(ticket, userId)) {
      return res.status(403).json({ message: "Acesso restrito." });
    }
  }
  const updated = await TicketModel.findByIdAndUpdate(
    req.params.id,
    { $push: { comments: { at: new Date(), author, message } } },
    { new: true }
  );
  return res.json(updated);
});

router.post("/:id/link-demand", requireAuth, checkPermission("tickets", "edit"), async (req, res) => {
  if (isPortalUser(res.locals.user?.profile)) {
    return res.status(403).json({ message: "Ação restrita para solicitantes." });
  }
  const { demandId } = req.body as { demandId: string };
  if (!demandId) {
    return res.status(400).json({ message: "demandId obrigatório." });
  }
  const updated = await TicketModel.findByIdAndUpdate(
    req.params.id,
    { demandId },
    { new: true }
  );
  return res.json(updated);
});

router.delete("/:id", requireAuth, checkPermission("tickets", "delete"), async (req, res) => {
  const profile = res.locals.user?.profile;
  if (!profile?.permissions?.tickets?.delete) {
    return res.status(403).json({ message: "Ação permitida apenas para administradores." });
  }
  const removed = await TicketModel.findByIdAndDelete(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: "Ticket não encontrado." });
  }
  return res.json({ ok: true });
});

router.get("/:id/emails", requireAuth, checkPermission("tickets", "view"), async (req, res) => {
  if (isPortalUser(res.locals.user?.profile)) {
    return res.status(403).json({ message: "Ação restrita para solicitantes." });
  }
  const ticketId = req.params.id;
  const inbound = await InboundEmailModel.find({ ticketId }).sort({ receivedAt: -1 });
  const outbound = await OutboundEmailModel.find({ ticketId }).sort({ sentAt: -1 });
  const items = [
    ...inbound.map((item) => ({
      id: item.id,
      type: "inbound",
      subject: item.subject,
      from: item.from,
      to: undefined,
      at: item.receivedAt,
      snippet: item.rawSnippet,
      textBody: item.textBody,
      htmlBody: item.htmlBody,
      headers: item.headers,
      attachments: item.attachments?.map((att: any, index: number) => ({
        index,
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
      })),
      status: "received",
    })),
    ...outbound.map((item) => ({
      id: item.id,
      type: "outbound",
      subject: item.subject,
      from: item.from,
      to: item.to,
      cc: item.cc,
      bcc: item.bcc,
      at: item.sentAt,
      snippet: item.bodySnippet,
      textBody: item.bodyText,
      htmlBody: item.bodyHtml,
      headers: item.headers,
      attachments: item.attachments?.map((att: any, index: number) => ({
        index,
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
      })),
      status: item.status,
      error: item.errorMessage,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const lastInbound = inbound[0];
  return res.json({
    items,
    lastInboundFrom: lastInbound?.from ?? null,
  });
});

router.get(
  "/:id/emails/:emailId/attachment/:index",
  requireAuth,
  checkPermission("tickets", "view"),
  async (req, res) => {
    if (isPortalUser(res.locals.user?.profile)) {
      return res.status(403).json({ message: "Ação restrita para solicitantes." });
    }
    const { emailId, index } = req.params;
    const inbound = await InboundEmailModel.findById(emailId);
    const outbound = inbound ? null : await OutboundEmailModel.findById(emailId);
    const email = inbound ?? outbound;
    if (!email) {
      return res.status(404).json({ message: "Email não encontrado." });
    }
    const idx = Number(index);
    const attachment = (email as any).attachments?.[idx];
    if (!attachment?.path || !fs.existsSync(attachment.path)) {
      return res.status(404).json({ message: "Anexo não encontrado." });
    }
    const filename = attachment.filename || "anexo";
    return res.download(attachment.path, filename);
  }
);

router.post(
  "/:id/email",
  requireAuth,
  checkPermission("tickets", "edit"),
  upload.array("files"),
  async (req, res) => {
    if (isPortalUser(res.locals.user?.profile)) {
      return res.status(403).json({ message: "Ação restrita para solicitantes." });
    }
    const { to, subject, body, cc, bcc, statusAfter } = req.body as {
      to?: string;
      subject?: string;
      body?: string;
      cc?: string;
      bcc?: string;
      statusAfter?: string;
    };
    const files = ((req as any).files ?? []) as Express.Multer.File[];
  if (!to || !subject || !body) {
    return res.status(400).json({ message: "to, subject e body são obrigatórios." });
  }
  const ticket = await TicketModel.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket não encontrado." });
  }

  const params = await SystemParamsModel.findOne();
  if (!params) {
    return res.status(400).json({ message: "Parâmetros de e-mail não configurados." });
  }
  const fromEmail =
    params.fromEmail ||
    params.gmailUser ||
    params.office365User ||
    params.smtpUser ||
    params.sesSmtpUser ||
    "";
  if (!fromEmail) {
    return res.status(400).json({ message: "E-mail remetente não configurado." });
  }
  const from = params.fromName ? `${params.fromName} <${fromEmail}>` : fromEmail;

  try {
    const transporter = await buildMailer();
    const signature = params.emailSignature?.trim();
    const bodyWithSignature = signature ? `${body}\n\n${signature}` : body;
    const info = await transporter.sendMail({
      from,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text: bodyWithSignature,
      attachments: files.map((file) => ({
        filename: file.originalname,
        path: file.path,
        contentType: file.mimetype,
      })),
    });

    await OutboundEmailModel.create({
      ticketId: ticket.id,
      from,
      to,
      cc,
      bcc,
      subject,
      bodySnippet: bodyWithSignature.slice(0, 500),
      bodyText: bodyWithSignature,
      headers: info?.envelope ? { envelope: info.envelope } : undefined,
      messageId: info.messageId,
      response: info.response,
      attachments: files.map((file) => ({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        path: file.path,
      })),
      sentAt: new Date(),
      status: "sent",
    });

    const commentEntries = [
      {
        at: new Date(),
        author: res.locals.user?.email ?? "system",
        message: `Email enviado para ${to}: ${subject}`,
      },
    ];
    const update: Record<string, unknown> = {
      $push: { comments: { $each: commentEntries } },
    };
    if (statusAfter && STATUSES.includes(statusAfter as any)) {
      update.status = statusAfter;
      commentEntries.push({
        at: new Date(),
        author: res.locals.user?.email ?? "system",
        message: `Status alterado: ${ticket.status} → ${statusAfter}`,
      });
    }
    await TicketModel.findByIdAndUpdate(ticket.id, update);

    return res.json({ ok: true });
  } catch (error: any) {
    await OutboundEmailModel.create({
      ticketId: ticket.id,
      from,
      to,
      cc,
      bcc,
      subject,
      bodySnippet: body.slice(0, 500),
      bodyText: body,
      sentAt: new Date(),
      status: "failed",
      errorMessage: error?.message ?? "Falha ao enviar.",
    });
    return res.status(500).json({ message: "Falha ao enviar e-mail." });
  }
});

export default router;
