import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth";
import { checkPermission } from "../middleware/permissionMiddleware";
import { VaultItemModel } from "../models/VaultItem";
import { VaultAuditModel } from "../models/VaultAudit";
import { decryptSecret, encryptSecret } from "../config/vault";
import { UserModel } from "../models/User";
const router = Router();
function buildAudit(req, recordId, action) {
    const user = req.res?.locals?.user;
    return {
        recordId,
        action,
        actorEmail: user?.email ?? "unknown",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        at: new Date(),
    };
}
router.get("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    const { search, tag, externalOwnerId } = req.query;
    const filter = { deletedAt: { $exists: false } };
    if (externalOwnerId)
        filter.externalOwnerId = externalOwnerId;
    if (tag)
        filter.tags = tag;
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { url: { $regex: search, $options: "i" } },
            { tags: { $regex: search, $options: "i" } },
        ];
    }
    const items = await VaultItemModel.find(filter).sort({ updatedAt: -1 });
    return res.json(items.map((item) => item.toJSON()));
});
router.get("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    const item = await VaultItemModel.findById(req.params.id);
    if (!item || item.deletedAt) {
        return res.status(404).json({ message: "Registro não encontrado." });
    }
    let notes = undefined;
    try {
        if (item.notesEnc && item.notesIv && item.notesTag) {
            notes = decryptSecret({ iv: item.notesIv, data: item.notesEnc, tag: item.notesTag });
        }
    }
    catch {
        return res.status(500).json({ message: "Falha ao descriptografar notas." });
    }
    return res.json({
        id: item.id,
        title: item.title,
        username: item.username,
        url: item.url,
        tags: item.tags ?? [],
        externalOwnerId: item.externalOwnerId,
        lastRotatedAt: item.lastRotatedAt,
        rotationPeriodDays: item.rotationPeriodDays,
        notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    });
});
router.post("/", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    const payload = req.body;
    if (!payload.title || !payload.username || !payload.password) {
        return res.status(400).json({ message: "title, username e password são obrigatórios." });
    }
    let encrypted;
    let notesEnc = null;
    try {
        encrypted = encryptSecret(String(payload.password));
        notesEnc = payload.notes ? encryptSecret(String(payload.notes)) : null;
    }
    catch {
        return res.status(500).json({ message: "Falha ao criptografar segredo." });
    }
    const created = await VaultItemModel.create({
        title: payload.title,
        username: payload.username,
        url: payload.url,
        tags: payload.tags ?? [],
        externalOwnerId: payload.externalOwnerId,
        passwordEnc: encrypted.data,
        passwordIv: encrypted.iv,
        passwordTag: encrypted.tag,
        notesEnc: notesEnc?.data,
        notesIv: notesEnc?.iv,
        notesTag: notesEnc?.tag,
        lastRotatedAt: payload.lastRotatedAt,
        rotationPeriodDays: payload.rotationPeriodDays,
    });
    await VaultAuditModel.create(buildAudit(req, created.id, "CREATE"));
    return res.status(201).json(created.toJSON());
});
router.patch("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    const payload = req.body;
    const current = await VaultItemModel.findById(req.params.id);
    if (!current || current.deletedAt) {
        return res.status(404).json({ message: "Registro não encontrado." });
    }
    const update = {
        title: payload.title ?? current.title,
        username: payload.username ?? current.username,
        url: payload.url ?? current.url,
        tags: payload.tags ?? current.tags,
        externalOwnerId: payload.externalOwnerId ?? current.externalOwnerId,
        lastRotatedAt: payload.lastRotatedAt ?? current.lastRotatedAt,
        rotationPeriodDays: payload.rotationPeriodDays ?? current.rotationPeriodDays,
    };
    try {
        if (typeof payload.password === "string" && payload.password) {
            const encrypted = encryptSecret(payload.password);
            update.passwordEnc = encrypted.data;
            update.passwordIv = encrypted.iv;
            update.passwordTag = encrypted.tag;
            update.lastRotatedAt = new Date();
        }
        if (typeof payload.notes === "string") {
            const enc = payload.notes ? encryptSecret(payload.notes) : null;
            update.notesEnc = enc?.data;
            update.notesIv = enc?.iv;
            update.notesTag = enc?.tag;
        }
    }
    catch {
        return res.status(500).json({ message: "Falha ao criptografar segredo." });
    }
    const updated = await VaultItemModel.findByIdAndUpdate(req.params.id, update, { new: true });
    await VaultAuditModel.create(buildAudit(req, req.params.id, "UPDATE"));
    return res.json(updated?.toJSON());
});
router.delete("/:id", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    const current = await VaultItemModel.findById(req.params.id);
    if (!current || current.deletedAt) {
        return res.status(404).json({ message: "Registro não encontrado." });
    }
    await VaultItemModel.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    await VaultAuditModel.create(buildAudit(req, req.params.id, "DELETE"));
    return res.json({ ok: true });
});
router.post("/:id/secret", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    const { action } = req.body;
    const auditAction = action === "COPY_SECRET" ? "COPY_SECRET" : "VIEW_SECRET";
    const item = await VaultItemModel.findById(req.params.id);
    if (!item || item.deletedAt) {
        return res.status(404).json({ message: "Registro não encontrado." });
    }
    let password;
    try {
        password = decryptSecret({
            iv: item.passwordIv,
            data: item.passwordEnc,
            tag: item.passwordTag,
        });
    }
    catch {
        return res.status(500).json({ message: "Falha ao descriptografar segredo." });
    }
    await VaultAuditModel.create(buildAudit(req, req.params.id, auditAction));
    return res.json({ password });
});
router.post("/reauth", requireAuth, checkPermission("settings", "manage"), async (req, res) => {
    const { password } = req.body;
    const user = res.locals.user;
    if (!password) {
        return res.status(400).json({ message: "Senha obrigatória." });
    }
    const record = await UserModel.findOne({ email: user.email });
    if (!record) {
        return res.status(401).json({ message: "Usuário inválido." });
    }
    const ok = await bcrypt.compare(password, record.passwordHash);
    if (!ok) {
        return res.status(401).json({ message: "Senha inválida." });
    }
    return res.json({ ok: true, at: new Date().toISOString() });
});
export default router;
