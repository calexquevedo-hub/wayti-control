import { Router } from "express";
import { ImapFlow } from "imapflow";

import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { EmailIntegrationConfigModel } from "../models/EmailIntegrationConfig";

const router = Router();

router.get("/", requireAuth, checkPermission("settings", "manage"), async (_req, res) => {
  let config = await EmailIntegrationConfigModel.findOne();
  if (!config) {
    config = await EmailIntegrationConfigModel.create({});
  }
  return res.json({
    id: config.id,
    enabled: config.enabled,
    provider: config.provider ?? "Gmail",
    emailAddress: config.emailAddress,
    imapHost: config.imapHost,
    imapPort: config.imapPort,
    imapTls: config.imapTls,
    mailbox: config.mailbox,
    pollingIntervalMin: config.pollingIntervalMin,
    defaultQueue: config.defaultQueue,
    defaultStatus: config.defaultStatus,
    defaultImpact: config.defaultImpact,
    defaultUrgency: config.defaultUrgency,
    defaultSystem: config.defaultSystem,
    defaultCategory: config.defaultCategory,
    defaultExternalOwnerId: config.defaultExternalOwnerId,
    hasPassword: Boolean(config.appPassword),
  });
});

router.put("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  try {
    const payload = req.body as Record<string, any>;
    let config = await EmailIntegrationConfigModel.findOne();
    if (!config) {
      config = await EmailIntegrationConfigModel.create({});
    }
 
    const update: Record<string, unknown> = {
      enabled: payload.enabled ?? config.enabled,
      provider: payload.provider ?? config.provider,
      emailAddress: payload.emailAddress ?? config.emailAddress,
      imapHost: payload.imapHost ?? config.imapHost,
      imapPort: payload.imapPort ?? config.imapPort,
      imapTls: payload.imapTls ?? config.imapTls,
      mailbox: payload.mailbox ?? config.mailbox,
      pollingIntervalMin: payload.pollingIntervalMin ?? config.pollingIntervalMin,
      defaultQueue: payload.defaultQueue ?? config.defaultQueue,
      defaultStatus: payload.defaultStatus ?? config.defaultStatus,
      defaultImpact: payload.defaultImpact ?? config.defaultImpact,
      defaultUrgency: payload.defaultUrgency ?? config.defaultUrgency,
      defaultSystem: payload.defaultSystem ?? config.defaultSystem,
      defaultCategory: payload.defaultCategory ?? config.defaultCategory,
    };
 
    // Tratar o ID do dono externo (não pode ser string vazia para o Mongoose)
    if (payload.defaultExternalOwnerId && typeof payload.defaultExternalOwnerId === "string" && payload.defaultExternalOwnerId.trim()) {
      update.defaultExternalOwnerId = payload.defaultExternalOwnerId.trim();
    } else {
      update.defaultExternalOwnerId = null;
    }
 
    if (typeof payload.appPassword === "string" && payload.appPassword.trim()) {
      update.appPassword = payload.appPassword.trim();
    }
 
    const updated = await EmailIntegrationConfigModel.findByIdAndUpdate(config.id, update, {
      new: true,
    });
 
    return res.json({
      id: updated?.id,
      enabled: updated?.enabled,
      provider: updated?.provider ?? "Gmail",
      emailAddress: updated?.emailAddress,
      imapHost: updated?.imapHost,
      imapPort: updated?.imapPort,
      imapTls: updated?.imapTls,
      mailbox: updated?.mailbox,
      pollingIntervalMin: updated?.pollingIntervalMin,
      defaultQueue: updated?.defaultQueue,
      defaultStatus: updated?.defaultStatus,
      defaultImpact: updated?.defaultImpact,
      defaultUrgency: updated?.defaultUrgency,
      defaultSystem: updated?.defaultSystem,
      defaultCategory: updated?.defaultCategory,
      defaultExternalOwnerId: updated?.defaultExternalOwnerId,
      hasPassword: Boolean(updated?.appPassword),
    });
  } catch (error: any) {
    console.error("Erro ao atualizar integração IMAP:", error);
    return res.status(500).json({ message: error?.message || "Erro interno ao salvar configuração." });
  }
});

router.post("/test", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
  try {
    const config = await EmailIntegrationConfigModel.findOne();
    if (!config?.emailAddress || !config.appPassword) {
      return res.status(400).json({ message: "Informe e-mail e senha de aplicativo." });
    }
    const client = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: config.imapTls,
      auth: {
        user: config.emailAddress,
        pass: config.appPassword,
      },
      logger: false,
    });
 
    await client.connect();
    await client.mailboxOpen(config.mailbox || "INBOX");
    await client.logout();
    return res.json({ ok: true });
  } catch (error: any) {
    console.error("Falha ao testar IMAP:", error);
    let detailedMessage = error?.message || "Verifique as credenciais";
    
    // Tenta ser mais específico se for erro de autenticação
    if (detailedMessage.toLowerCase().includes("authenticate") || detailedMessage.toLowerCase().includes("invalid user")) {
      detailedMessage = "Falha na autenticação. Verifique seu e-mail e tenha certeza de estar usando uma Senha de Aplicativo (e não a senha comum) se o MFA estiver ativo.";
    }

    return res.status(400).json({ ok: false, message: `Falha ao conectar no IMAP: ${detailedMessage}` });
  }
});

export default router;
