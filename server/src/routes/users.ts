import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { UserModel } from "../models/User";
import { ProfileModel } from "../models/Profile";
import { buildMailer } from "../config/mailer";
import { SystemParamsModel } from "../models/SystemParams";

const router = Router();

function extractErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    return "E-mail já está em uso.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

router.get("/", requireAuth, checkPermission("users", "view"), async (_req, res) => {
  const users = await UserModel.find().populate("profile").sort({ createdAt: -1 });
  return res.json(users.map((u) => u.toJSON()));
});

router.post("/", requireAuth, checkPermission("users", "manage"), async (req, res) => {
  try {
    const payload = req.body as { email: string; name: string; profileId: string };
    if (!payload.email || !payload.name || !payload.profileId) {
      return res.status(400).json({ message: "email, name e profileId são obrigatórios." });
    }
    if (!mongoose.Types.ObjectId.isValid(payload.profileId)) {
      return res.status(400).json({ message: "Perfil inválido." });
    }

    const profile = await ProfileModel.findById(payload.profileId);
    if (!profile) {
      return res.status(400).json({ message: "Perfil inválido." });
    }

    const email = payload.email.toLowerCase().trim();
    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "E-mail já está em uso." });
    }

    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const user = await UserModel.create({
      email,
      name: payload.name.trim(),
      profile: payload.profileId,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      isActive: true,
      mustChangePassword: true,
    });
    const created = await UserModel.findById(user.id).populate("profile");
    return res.status(201).json({ user: created?.toJSON(), tempPassword });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return res.status(500).json({ message: extractErrorMessage(error, "Falha ao criar usuário.") });
  }
});

router.patch("/:id", requireAuth, checkPermission("users", "manage"), async (req, res) => {
  const payload = req.body as { name?: string; profileId?: string; isActive?: boolean };
  if (payload.profileId) {
    const profile = await ProfileModel.findById(payload.profileId);
    if (!profile) {
      return res.status(400).json({ message: "Perfil inválido." });
    }
  }
  const updated = await UserModel.findByIdAndUpdate(
    req.params.id,
    {
      name: payload.name,
      profile: payload.profileId,
      isActive: payload.isActive,
    },
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }
  const populated = await UserModel.findById(updated.id).populate("profile");
  return res.json(populated?.toJSON());
});

router.post(
  "/:id/reset-password",
  requireAuth,
  checkPermission("users", "manage"),
  async (req, res) => {
    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const updated = await UserModel.findByIdAndUpdate(
      req.params.id,
      {
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
      },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    const populated = await UserModel.findById(updated.id).populate("profile");
    return res.json({ user: populated?.toJSON(), tempPassword });
  }
);

router.post("/me/request-email-change", requireAuth, async (req, res) => {
  const { newEmail } = req.body as { newEmail: string };
  if (!newEmail) {
    return res.status(400).json({ message: "Novo e-mail obrigatório." });
  }
  const normalized = newEmail.toLowerCase();
  const exists = await UserModel.findOne({ email: normalized });
  if (exists) {
    return res.status(400).json({ message: "E-mail já está em uso." });
  }
  const user = res.locals.user as { id: string; email: string };
  const record = await UserModel.findById(user.id);
  if (!record) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  record.pendingEmail = normalized;
  record.emailChangeCodeHash = await bcrypt.hash(code, 10);
  record.emailChangeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await record.save();

  const transport = await buildMailer();
  const params = await SystemParamsModel.findOne();
  const fromName = params?.fromName || "WayTI Control";
  const fromEmail = params?.fromEmail || record.email;
  await transport.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: normalized,
    subject: "Código de verificação - WayTI Control",
    text: `Seu código de verificação é ${code}. Ele expira em 10 minutos.`,
  });

  return res.json({ ok: true });
});

router.post("/me/verify-email-change", requireAuth, async (req, res) => {
  const { code } = req.body as { code: string };
  if (!code) {
    return res.status(400).json({ message: "Código obrigatório." });
  }
  const user = res.locals.user as { id: string };
  const record = await UserModel.findById(user.id);
  if (!record || !record.pendingEmail) {
    return res.status(400).json({ message: "Nenhuma alteração pendente." });
  }
  if (!record.emailChangeExpiresAt || record.emailChangeExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: "Código expirado." });
  }
  const ok = await bcrypt.compare(code, record.emailChangeCodeHash ?? "");
  if (!ok) {
    return res.status(400).json({ message: "Código inválido." });
  }
  record.email = record.pendingEmail;
  record.pendingEmail = undefined;
  record.emailChangeCodeHash = undefined;
  record.emailChangeExpiresAt = undefined;
  await record.save();
  return res.json({ ok: true, email: record.email });
});

router.get("/me", requireAuth, async (_req, res) => {
  const user = res.locals.user as { id: string };
  const record = await UserModel.findById(user.id).populate("profile");
  if (!record) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }
  return res.json(record.toJSON());
});

router.patch("/me", requireAuth, async (req, res) => {
  const payload = req.body as {
    name?: string;
    locale?: string;
    theme?: "light" | "dark";
    notificationPrefs?: { email?: boolean; slack?: boolean };
  };
  const user = res.locals.user as { id: string };
  const update: Record<string, unknown> = {};
  if (typeof payload.name === "string") update.name = payload.name;
  if (typeof payload.locale === "string") update.locale = payload.locale;
  if (payload.theme === "light" || payload.theme === "dark") update.theme = payload.theme;
  if (payload.notificationPrefs) {
    update.notificationPrefs = {
      email: payload.notificationPrefs.email ?? true,
      slack: payload.notificationPrefs.slack ?? true,
    };
  }
  const record = await UserModel.findByIdAndUpdate(user.id, update, { new: true });
  if (!record) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }
  return res.json(record.toJSON());
});

export default router;
