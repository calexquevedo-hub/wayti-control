import { AutomationRuleModel } from "../models/AutomationRule";
import { TicketModel } from "../models/Ticket";
import { buildMailer } from "../config/mailer";
import { SystemParamsModel } from "../models/SystemParams";

type Trigger = "TicketCreated" | "TicketUpdated";

function toComparable(value: any) {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return String(value).toLowerCase();
}

function applyTemplate(input: string, ticket: any) {
  return input
    .split("{{ticket_code}}").join(ticket.code ?? "")
    .split("{{ticket_subject}}").join(ticket.subject ?? "")
    .split("{{ticket_status}}").join(ticket.status ?? "")
    .split("{{ticket_priority}}").join(ticket.priority ?? "")
    .split("{{ticket_queue}}").join(ticket.queue ?? "")
    .split("{{ticket_assignee}}").join(ticket.assignee ?? "");
}

async function sendEmail(payload: { to: string; subject: string; text: string }) {
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
  const from = params.fromName ? `${params.fromName} <${fromEmail}>` : fromEmail;
  const transporter = await buildMailer();
  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}

export const runAutomations = async (trigger: Trigger, ticket: any) => {
  const rules = await AutomationRuleModel.find({ trigger, isActive: true });

  for (const rule of rules) {
    let match = true;

    for (const cond of rule.conditions) {
      const ticketValue = toComparable(ticket[cond.field]);
      const ruleValue = toComparable(cond.value);

      switch (cond.operator) {
        case "equals":
          if (ticketValue !== ruleValue) match = false;
          break;
        case "not_equals":
          if (ticketValue === ruleValue) match = false;
          break;
        case "contains":
          if (!String(ticketValue).includes(String(ruleValue))) match = false;
          break;
        case "greater_than":
          if (Number(ticketValue) <= Number(ruleValue)) match = false;
          break;
        default:
          match = false;
      }
      if (!match) break;
    }

    if (!match) continue;

    await executeActions(rule.actions, ticket);
  }
};

async function executeActions(actions: any[], ticket: any) {
  const systemUser = "Sistema (Automacao)";
  const log = async (message: string) => {
    await TicketModel.findByIdAndUpdate(ticket._id, {
      $push: {
        comments: {
          at: new Date(),
          author: systemUser,
          message,
        },
      },
    });
  };
  for (const action of actions) {
    try {
      if (action.type === "SendEmail") {
        const subject = applyTemplate(String(action.params?.subject ?? ""), ticket);
        const body = applyTemplate(String(action.params?.body ?? ""), ticket);
        const to = applyTemplate(String(action.params?.to ?? ""), ticket);
        if (to) {
          await sendEmail({ to, subject, text: body });
          await log(`Email de automacao enviado para: ${to}`);
        }
      }

      if (action.type === "UpdateTicket") {
        const params = action.params ?? {};
        const field = action.params?.field;
        const value = action.params?.value;
        if (field && value !== undefined) {
          await TicketModel.findByIdAndUpdate(ticket._id, { [field]: value });
          await log(`Automacao aplicou: ${field} alterado para '${value}'.`);
        } else {
          await TicketModel.findByIdAndUpdate(ticket._id, params);
          await log("Automacao aplicou atualizacao no ticket.");
        }
      }

      if (action.type === "AssignAgent") {
        const assignee = action.params?.agentEmail ?? action.params?.assignee;
        if (assignee) {
          await TicketModel.findByIdAndUpdate(ticket._id, { assignee });
          await log(`Atribuicao automatica para: ${assignee}.`);
        }
      }
    } catch (error) {
      console.error(`Error executing automation action ${action.type}`, error);
    }
  }
}
