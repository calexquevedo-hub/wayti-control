import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { SystemParamsModel } from "../models/SystemParams";
import { encryptSecret } from "../config/vault";
const router = Router();
router.get("/", requireAuth, checkPermission("settings", "manage"), async (_req, res) => {
    let params = await SystemParamsModel.findOne();
    if (!params) {
        params = await SystemParamsModel.create({});
    }
    return res.json({
        id: params.id,
        mailProvider: params.mailProvider,
        fromName: params.fromName,
        fromEmail: params.fromEmail,
        gmailUser: params.gmailUser,
        hasGmailPassword: Boolean(params.gmailAppPasswordEnc),
        hasSendGridKey: Boolean(params.sendGridApiKeyEnc),
        office365User: params.office365User,
        hasOffice365Password: Boolean(params.office365PassEnc),
        sesRegion: params.sesRegion,
        sesSmtpUser: params.sesSmtpUser,
        hasSesPassword: Boolean(params.sesSmtpPassEnc),
        mailgunDomain: params.mailgunDomain,
        hasMailgunKey: Boolean(params.mailgunApiKeyEnc),
        smtpHost: params.smtpHost,
        smtpPort: params.smtpPort,
        smtpSecure: params.smtpSecure,
        smtpUser: params.smtpUser,
        hasSmtpPassword: Boolean(params.smtpPassEnc),
        slaWarningMinutes: params.slaWarningMinutes ?? 120,
        slaPolicies: params.slaPolicies,
        emailSignature: params.emailSignature ?? "",
        cannedResponses: params.cannedResponses ?? [],
    });
});
router.put("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    let params = await SystemParamsModel.findOne();
    if (!params) {
        params = await SystemParamsModel.create({});
    }
    const payload = req.body;
    const update = {
        mailProvider: payload.mailProvider ?? params.mailProvider,
        fromName: payload.fromName ?? params.fromName,
        fromEmail: payload.fromEmail ?? params.fromEmail,
        gmailUser: payload.gmailUser ?? params.gmailUser,
        office365User: payload.office365User ?? params.office365User,
        sesRegion: payload.sesRegion ?? params.sesRegion,
        sesSmtpUser: payload.sesSmtpUser ?? params.sesSmtpUser,
        mailgunDomain: payload.mailgunDomain ?? params.mailgunDomain,
        smtpHost: payload.smtpHost ?? params.smtpHost,
        smtpPort: payload.smtpPort ?? params.smtpPort,
        smtpSecure: payload.smtpSecure ?? params.smtpSecure,
        smtpUser: payload.smtpUser ?? params.smtpUser,
        slaWarningMinutes: payload.slaWarningMinutes ?? params.slaWarningMinutes ?? 120,
        slaPolicies: payload.slaPolicies ?? params.slaPolicies,
        emailSignature: payload.emailSignature ?? params.emailSignature ?? "",
        cannedResponses: Array.isArray(payload.cannedResponses)
            ? payload.cannedResponses
            : params.cannedResponses,
    };
    if (typeof payload.gmailAppPassword === "string" && payload.gmailAppPassword.trim()) {
        const enc = encryptSecret(payload.gmailAppPassword.trim());
        update.gmailAppPasswordEnc = enc.data;
        update.gmailAppPasswordIv = enc.iv;
        update.gmailAppPasswordTag = enc.tag;
    }
    if (typeof payload.sendGridApiKey === "string" && payload.sendGridApiKey.trim()) {
        const enc = encryptSecret(payload.sendGridApiKey.trim());
        update.sendGridApiKeyEnc = enc.data;
        update.sendGridApiKeyIv = enc.iv;
        update.sendGridApiKeyTag = enc.tag;
    }
    if (typeof payload.office365Pass === "string" && payload.office365Pass.trim()) {
        const enc = encryptSecret(payload.office365Pass.trim());
        update.office365PassEnc = enc.data;
        update.office365PassIv = enc.iv;
        update.office365PassTag = enc.tag;
    }
    if (typeof payload.sesSmtpPass === "string" && payload.sesSmtpPass.trim()) {
        const enc = encryptSecret(payload.sesSmtpPass.trim());
        update.sesSmtpPassEnc = enc.data;
        update.sesSmtpPassIv = enc.iv;
        update.sesSmtpPassTag = enc.tag;
    }
    if (typeof payload.mailgunApiKey === "string" && payload.mailgunApiKey.trim()) {
        const enc = encryptSecret(payload.mailgunApiKey.trim());
        update.mailgunApiKeyEnc = enc.data;
        update.mailgunApiKeyIv = enc.iv;
        update.mailgunApiKeyTag = enc.tag;
    }
    if (typeof payload.smtpPass === "string" && payload.smtpPass.trim()) {
        const enc = encryptSecret(payload.smtpPass.trim());
        update.smtpPassEnc = enc.data;
        update.smtpPassIv = enc.iv;
        update.smtpPassTag = enc.tag;
    }
    const updated = await SystemParamsModel.findByIdAndUpdate(params.id, update, { new: true });
    return res.json({
        id: updated?.id,
        mailProvider: updated?.mailProvider,
        fromName: updated?.fromName,
        fromEmail: updated?.fromEmail,
        gmailUser: updated?.gmailUser,
        hasGmailPassword: Boolean(updated?.gmailAppPasswordEnc),
        hasSendGridKey: Boolean(updated?.sendGridApiKeyEnc),
        office365User: updated?.office365User,
        hasOffice365Password: Boolean(updated?.office365PassEnc),
        sesRegion: updated?.sesRegion,
        sesSmtpUser: updated?.sesSmtpUser,
        hasSesPassword: Boolean(updated?.sesSmtpPassEnc),
        mailgunDomain: updated?.mailgunDomain,
        hasMailgunKey: Boolean(updated?.mailgunApiKeyEnc),
        smtpHost: updated?.smtpHost,
        smtpPort: updated?.smtpPort,
        smtpSecure: updated?.smtpSecure,
        smtpUser: updated?.smtpUser,
        hasSmtpPassword: Boolean(updated?.smtpPassEnc),
        slaWarningMinutes: updated?.slaWarningMinutes ?? 120,
        slaPolicies: updated?.slaPolicies,
        emailSignature: updated?.emailSignature ?? "",
        cannedResponses: updated?.cannedResponses ?? [],
    });
});
export default router;
