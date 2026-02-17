import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env";
import authRoutes from "./routes/auth";
import demandRoutes from "./routes/demands";
import externalPartyRoutes from "./routes/externalParties";
import reportRoutes from "./routes/reports";
import ticketRoutes from "./routes/tickets";
import assetRoutes from "./routes/assets";
import contractRoutes from "./routes/contracts";
import serviceRoutes from "./routes/services";
import kbRoutes from "./routes/kb";
import automationRoutes from "./routes/automations";
import emailIntegrationRoutes from "./routes/emailIntegration";
import vaultRoutes from "./routes/vault";
import userRoutes from "./routes/users";
import systemParamsRoutes from "./routes/systemParams";
import profileRoutes from "./routes/profiles";
import { UserModel } from "./models/User";
import { ProfileModel } from "./models/Profile";
import { startEmailPolling } from "./config/emailPoller";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/demands", demandRoutes);
app.use("/external-parties", externalPartyRoutes);
app.use("/reports", reportRoutes);
app.use("/tickets", ticketRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/demands", demandRoutes);
app.use("/api/external-parties", externalPartyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/kb", kbRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/email-integration", emailIntegrationRoutes);
app.use("/api/vault", vaultRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/system-params", systemParamsRoutes);

// --- CONFIGURAÇÃO DE PRODUÇÃO ---
const clientDistPath =
  process.env.CLIENT_DIST_PATH || path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  return res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      console.error("Erro ao servir index.html:", err);
      res.status(500).send("Erro ao carregar aplicação (build do frontend não encontrado).");
    }
  });
});
// --- FIM DA CONFIGURAÇÃO ---

async function ensureSystemProfiles() {
  const count = await ProfileModel.countDocuments();
  if (count > 0) return;
  await ProfileModel.insertMany([
    {
      name: "Administrador",
      description: "Acesso total ao sistema",
      isSystem: true,
      permissions: {
        tickets: { view: true, create: true, edit: true, delete: true },
        demands: { view: true, create: true, edit: true, delete: true },
        assets: { view: true, create: true, edit: true, delete: true },
        contracts: { view: true, create: true, edit: true, delete: true },
        users: { view: true, manage: true },
        reports: { view: true },
        settings: { manage: true },
      },
    },
    {
      name: "Técnico",
      description: "Gestão de tickets e ativos",
      isSystem: true,
      permissions: {
        tickets: { view: true, create: true, edit: true, delete: false },
        demands: { view: true, create: true, edit: true, delete: false },
        assets: { view: true, create: true, edit: true, delete: false },
        contracts: { view: true, create: false, edit: false, delete: false },
        users: { view: true, manage: false },
        reports: { view: true },
        settings: { manage: false },
      },
    },
    {
      name: "Solicitante",
      description: "Acesso apenas ao Portal e seus chamados",
      isSystem: true,
      permissions: {
        tickets: { view: true, create: true, edit: false, delete: false },
        demands: { view: false, create: false, edit: false, delete: false },
        assets: { view: false, create: false, edit: false, delete: false },
        contracts: { view: false, create: false, edit: false, delete: false },
        users: { view: false, manage: false },
        reports: { view: false },
        settings: { manage: false },
      },
    },
  ]);
}

async function ensureAdminUser() {
  const adminProfile = await ProfileModel.findOne({ name: "Administrador" });
  if (!adminProfile) return;
  const existing = await UserModel.findOne({ email: "admin@admin.com" });
  const passwordHash = await bcrypt.hash("admin123", 10);
  if (!existing) {
    await UserModel.create({
      email: "admin@admin.com",
      name: "Administrador",
      passwordHash,
      profile: adminProfile.id,
      isActive: true,
      mustChangePassword: true,
    });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (!existing.name) updates.name = "Administrador";
  if (!existing.profile) updates.profile = adminProfile.id;
  if (typeof existing.isActive !== "boolean") updates.isActive = true;
  if (typeof existing.mustChangePassword !== "boolean") updates.mustChangePassword = true;
  if (Object.keys(updates).length) {
    await UserModel.findByIdAndUpdate(existing.id, updates);
  }
}

async function migrateUsersToProfiles() {
  const adminProfile = await ProfileModel.findOne({ name: "Administrador" });
  const techProfile = await ProfileModel.findOne({ name: "Técnico" });
  const requesterProfile = await ProfileModel.findOne({ name: "Solicitante" });
  if (!adminProfile || !techProfile || !requesterProfile) return;

  const users = await UserModel.find({
    $or: [{ profile: { $exists: false } }, { profile: null }],
  });

  for (const user of users) {
    const oldRole = user.get("role");
    let targetProfileId = requesterProfile.id;
    if (oldRole === "Admin") targetProfileId = adminProfile.id;
    if (oldRole === "Agent") targetProfileId = techProfile.id;
    user.set("profile", targetProfileId);
    user.set("role", undefined);
    await user.save();
  }
}

async function start() {
  await mongoose.connect(env.mongoUri);
  await ensureSystemProfiles();
  await migrateUsersToProfiles();
  await ensureAdminUser();
  await startEmailPolling();
  app.listen(env.port, () => {
    console.log(`API on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar API", error);
  process.exit(1);
});
