import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { EmailIntegrationConfigModel } from "../models/EmailIntegrationConfig";
import { InboundEmailModel } from "../models/InboundEmail";
import { CounterModel } from "../models/Counter";
import { TicketModel } from "../models/Ticket";
import { SystemParamsModel } from "../models/SystemParams";

const QUEUES = ["TI Interna", "Fornecedor"] as const;
const IMPACT = ["Baixo", "Médio", "Alto"] as const;
const URGENCY = ["Baixa", "Média", "Alta"] as const;

let running = false;
let timer: NodeJS.Timeout | null = null;

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

function calcSlaDueAt(
  priority: string,
  openedAt: Date,
  policies?: { urgentHours?: number; highHours?: number; mediumHours?: number; lowHours?: number }
) {
  const base = new Date(openedAt);
  const urgent = policies?.urgentHours ?? 8;
  const high = policies?.highHours ?? 48;
  const medium = policies?.mediumHours ?? 120;
  const low = policies?.lowHours ?? 240;
  if (priority === "P0") return new Date(base.getTime() + urgent * 60 * 60 * 1000);
  if (priority === "P1") return new Date(base.getTime() + high * 60 * 60 * 1000);
  if (priority === "P2") return new Date(base.getTime() + medium * 60 * 60 * 1000);
  return new Date(base.getTime() + low * 60 * 60 * 1000);
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

function normalizeSubject(subject: string) {
  return subject.replace(/^(re:|fw:|fwd:)\s*/gi, "").trim().toLowerCase();
}

function buildThreadKey(subject: string, from: string) {
  return `${normalizeSubject(subject)}|${from.toLowerCase()}`;
}

function hashMessageFallback(subject: string, from: string, date: Date) {
  return crypto.createHash("sha1").update(`${subject}|${from}|${date.toISOString()}`).digest("hex");
}

function safeName(value: string) {
  return value.replace(/[^\w.\-]/g, "_");
}

async function saveAttachments(messageId: string, attachments: any[]) {
  if (!attachments || attachments.length === 0) return [];
  const dir = path.join(process.cwd(), "uploads", "email-attachments", safeName(messageId));
  await fs.mkdir(dir, { recursive: true });
  const saved = [];
  for (let i = 0; i < attachments.length; i += 1) {
    const attachment = attachments[i];
    const filename = attachment.filename ? safeName(attachment.filename) : `anexo-${i + 1}`;
    const unique = `${Date.now()}-${i}-${filename}`;
    const target = path.join(dir, unique);
    await fs.writeFile(target, attachment.content);
    saved.push({
      filename: attachment.filename || filename,
      contentType: attachment.contentType,
      size: attachment.size || attachment.content?.length || 0,
      path: target,
    });
  }
  return saved;
}

async function pollOnce() {
  const config = await EmailIntegrationConfigModel.findOne();
  if (!config?.enabled) return;
  if (!config.emailAddress || !config.appPassword) return;

  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapTls,
    auth: {
      user: config.emailAddress,
      pass: config.appPassword,
    },
  });

  await client.connect();

  try {
    await client.mailboxOpen(config.mailbox || "INBOX");
    const since = config.lastCheckedAt
      ? new Date(config.lastCheckedAt)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await client.search({ since });
    const uids = Array.isArray(result) ? result : [];
    if (!uids.length) {
      config.lastCheckedAt = new Date();
      await config.save();
      return;
    }

    for await (const msg of client.fetch(uids, { envelope: true, source: true })) {
      const parsed = await simpleParser(msg.source);
      const subject = parsed.subject || "(sem assunto)";
      const fromAddress = parsed.from?.value?.[0]?.address || "desconhecido";
      const receivedAt = parsed.date ? new Date(parsed.date) : new Date();
      const messageId = parsed.messageId || msg.envelope?.messageId || hashMessageFallback(subject, fromAddress, receivedAt);
      const threadKey = buildThreadKey(subject, fromAddress);
      const snippet = (parsed.text || parsed.html || "").toString().slice(0, 500);
      const attachments = await saveAttachments(messageId, parsed.attachments || []);

      const existing = await InboundEmailModel.findOne({ messageId });
      if (existing) {
        await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
        continue;
      }

      const lastThread = await InboundEmailModel.findOne({ threadKey }).sort({ createdAt: -1 });
      if (lastThread) {
        await TicketModel.findByIdAndUpdate(lastThread.ticketId, {
          $push: {
            comments: {
              at: new Date(),
              author: fromAddress,
              message: `Email recebido: ${subject}\n\n${snippet}`,
            },
          },
        });
        await InboundEmailModel.create({
          messageId,
          threadKey,
          from: fromAddress,
          subject,
          receivedAt,
          ticketId: lastThread.ticketId,
          rawSnippet: snippet,
          textBody: parsed.text || "",
          htmlBody: parsed.html || "",
          headers: Object.fromEntries(parsed.headers ?? []),
          attachments,
        });
        await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
        continue;
      }

      const impact = IMPACT.includes(config.defaultImpact as any) ? config.defaultImpact : "Médio";
      const urgency = URGENCY.includes(config.defaultUrgency as any) ? config.defaultUrgency : "Média";
      let queue = QUEUES.includes(config.defaultQueue as any) ? config.defaultQueue : "TI Interna";
      let externalOwnerId = config.defaultExternalOwnerId;

      if (queue === "Fornecedor" && !externalOwnerId) {
        queue = "TI Interna";
        externalOwnerId = undefined;
      }

      const policies = await SystemParamsModel.findOne();
      const priority = calcPriority(impact, urgency);
      const openedAt = receivedAt;
      const slaDueAt = calcSlaDueAt(priority, openedAt, policies?.slaPolicies ?? undefined);

      const code = await nextTicketCode();
      const created = await TicketModel.create({
        code,
        queue,
        status: config.defaultStatus || "Novo",
        externalOwnerId,
        system: config.defaultSystem || "Email",
        category: config.defaultCategory || "Suporte",
        impact,
        urgency,
        priority,
        subject,
        description: parsed.text || parsed.html || "",
        openedAt,
        slaDueAt,
        comments: [
          {
            at: new Date(),
            author: fromAddress,
            message: `Email recebido: ${subject}\n\n${snippet}`,
          },
        ],
      });

      await InboundEmailModel.create({
        messageId,
        threadKey,
        from: fromAddress,
        subject,
        receivedAt,
        ticketId: created.id,
        rawSnippet: snippet,
        textBody: parsed.text || "",
        htmlBody: parsed.html || "",
        headers: Object.fromEntries(parsed.headers ?? []),
        attachments,
      });

      await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
    }

    config.lastCheckedAt = new Date();
    await config.save();
  } finally {
    await client.logout().catch(() => undefined);
  }
}

async function scheduleNext() {
  if (timer) clearTimeout(timer);
  const config = await EmailIntegrationConfigModel.findOne();
  const intervalMin = Math.max(1, config?.pollingIntervalMin ?? 5);
  timer = setTimeout(async () => {
    if (running) return scheduleNext();
    running = true;
    try {
      await pollOnce();
    } catch (error) {
      console.error("Email poller falhou:", error);
    } finally {
      running = false;
      await scheduleNext();
    }
  }, intervalMin * 60 * 1000);
}

export async function startEmailPolling() {
  await scheduleNext();
}
