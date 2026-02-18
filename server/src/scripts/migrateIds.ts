import mongoose from "mongoose";

import { env } from "../config/env";
import { CounterModel } from "../models/Counter";
import { DemandModel } from "../models/Demand";

async function run() {
  await mongoose.connect(env.mongoUri);

  const demands = await DemandModel.find({}).sort({ createdAt: 1, _id: 1 });

  let nextId = 1;
  for (const demand of demands) {
    demand.set("sequentialId", nextId);
    await demand.save();
    nextId += 1;
  }

  await CounterModel.findOneAndUpdate(
    { name: "demands" },
    { $set: { seq: Math.max(0, nextId - 1) } },
    { upsert: true }
  );

  await mongoose.disconnect();
  console.log(`Migracao concluida. ${demands.length} demandas atualizadas.`);
}

run().catch((error) => {
  console.error("Falha na migracao de IDs", error);
  process.exit(1);
});
