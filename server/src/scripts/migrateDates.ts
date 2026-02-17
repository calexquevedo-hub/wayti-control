import mongoose from "mongoose";

import { env } from "../config/env";
import { DemandModel } from "../models/Demand";

function toDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function normalizeStatus(value: unknown) {
  const status = String(value ?? "");
  switch (status) {
    case "planejado":
      return "Backlog";
    case "em-andamento":
      return "Em execução";
    case "risco":
      return "Aguardando terceiros";
    case "concluido":
      return "Concluído";
    default:
      return status || "Backlog";
  }
}

async function run() {
  await mongoose.connect(env.mongoUri);

  const demands = await DemandModel.find();
  for (const demand of demands) {
    const updates: Record<string, unknown> = {};

    const lastUpdate = toDate(demand.lastUpdate);
    if (lastUpdate) updates.lastUpdate = lastUpdate;

    if (Array.isArray(demand.followUps)) {
      updates.followUps = demand.followUps.map((item: any) => ({
        ...item,
        dueDate: toDate(item.dueDate) ?? new Date(),
      }));
    }

    if (Array.isArray(demand.audits)) {
      updates.audits = demand.audits.map((audit: any) => ({
        ...audit,
        at: toDate(audit.at) ?? new Date(),
      }));
    }

    updates.category = demand.category ?? "Comunicado/Follow-up";
    updates.priority = demand.priority ?? "P2";
    updates.impact = demand.impact ?? "Médio";
    updates.epic = demand.epic ?? "Outros";
    updates.responsible = demand.responsible ?? "Alexandre Quevedo";
    updates.status = normalizeStatus(demand.status);

    await DemandModel.findByIdAndUpdate(demand.id, updates);
  }

  await mongoose.disconnect();
  console.log("Migracao concluida.");
}

run().catch((error) => {
  console.error("Falha na migracao", error);
  process.exit(1);
});
