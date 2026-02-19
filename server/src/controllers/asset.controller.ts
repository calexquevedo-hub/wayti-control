import type { Request, Response } from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import path from "path";

import { AssetModel, ASSET_STATUSES } from "../models/Asset";
import { AssetAssignmentModel } from "../models/AssetAssignment";

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR");
}

export const getAssetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const asset = await AssetModel.findById(id).populate({
      path: "currentAssignment",
      populate: { path: "user", select: "name email" },
    });
    if (!asset) {
      return res.status(404).json({ message: "Ativo não encontrado." });
    }
    return res.json(asset);
  } catch {
    return res.status(500).json({ message: "Erro ao buscar ativo." });
  }
};

export const createAsset = async (req: Request, res: Response) => {
  try {
    const {
      name,
      assetTag,
      serialNumber,
      type,
      status,
      condition,
      manufacturer,
      modelName,
      purchaseDate,
      warrantyEnd,
      value,
      notes,
    } = req.body as Record<string, string | number | undefined>;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "name é obrigatório." });
    }
    if (!type || !String(type).trim()) {
      return res.status(400).json({ message: "type é obrigatório." });
    }

    const created = await AssetModel.create({
      name: String(name).trim(),
      assetTag: assetTag ? String(assetTag).trim() : undefined,
      serialNumber: serialNumber ? String(serialNumber).trim() : undefined,
      type: String(type),
      status: status ? String(status) : undefined,
      condition: condition ? String(condition) : undefined,
      manufacturer: manufacturer ? String(manufacturer).trim() : undefined,
      modelName: modelName ? String(modelName).trim() : undefined,
      purchaseDate: parseDate(purchaseDate ? String(purchaseDate) : undefined),
      warrantyEnd: parseDate(warrantyEnd ? String(warrantyEnd) : undefined),
      value: typeof value === "number" ? value : value ? Number(value) : undefined,
      notes: notes ? String(notes).trim() : undefined,
    });

    return res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "assetTag ou serialNumber já existe." });
    }
    return res.status(500).json({ message: "Erro ao criar ativo." });
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const payload = { ...req.body } as Record<string, unknown>;
    if (payload.purchaseDate) payload.purchaseDate = parseDate(String(payload.purchaseDate));
    if (payload.warrantyEnd) payload.warrantyEnd = parseDate(String(payload.warrantyEnd));
    if (payload.value !== undefined && payload.value !== null && payload.value !== "") {
      payload.value = Number(payload.value);
    }

    const updated = await AssetModel.findByIdAndUpdate(id, payload, { new: true }).populate({
      path: "currentAssignment",
      populate: { path: "user", select: "name email" },
    });

    if (!updated) {
      return res.status(404).json({ message: "Ativo não encontrado." });
    }
    return res.json(updated);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "assetTag ou serialNumber já existe." });
    }
    return res.status(500).json({ message: "Erro ao atualizar ativo." });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }
    const deleted = await AssetModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Ativo não encontrado." });
    }
    await AssetAssignmentModel.deleteMany({ asset: deleted._id });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: "Erro ao excluir ativo." });
  }
};

export const getAssets = async (req: Request, res: Response) => {
  try {
    const { search, status, type } = req.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = {};

    if (status && ASSET_STATUSES.includes(status as (typeof ASSET_STATUSES)[number])) {
      filter.status = status;
    }
    if (type) filter.type = type;
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { assetTag: regex }, { serialNumber: regex }, { modelName: regex }];
    }

    const assets = await AssetModel.find(filter)
      .populate({
        path: "currentAssignment",
        populate: { path: "user", select: "name email" },
      })
      .sort({ updatedAt: -1 });

    return res.json(assets);
  } catch {
    return res.status(500).json({ message: "Erro ao buscar ativos." });
  }
};

export const getAssetHistory = async (req: Request, res: Response) => {
  try {
    const assetId = req.params.assetId || req.params.id;
    if (!isValidObjectId(assetId)) {
      return res.status(400).json({ message: "assetId inválido." });
    }

    const history = await AssetAssignmentModel.find({ asset: assetId })
      .populate({ path: "user", select: "name email" })
      .sort({ checkoutDate: -1, createdAt: -1 });

    return res.json(history);
  } catch {
    return res.status(500).json({ message: "Erro ao buscar histórico do ativo." });
  }
};

export const checkoutAsset = async (req: Request, res: Response) => {
  try {
    const { assetId, userId, cpf, name, condition, expectedReturnDate, notes } = req.body as {
      assetId?: string;
      userId?: string;
      cpf?: string;
      name?: string;
      condition?: string;
      expectedReturnDate?: string;
      notes?: string;
    };

    if (!isValidObjectId(assetId)) {
      return res.status(400).json({ message: "assetId inválido." });
    }
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "userId inválido." });
    }
    if (!cpf?.trim() || !name?.trim()) {
      return res.status(400).json({ message: "name e cpf são obrigatórios para custódia." });
    }
    if (!condition?.trim()) {
      return res.status(400).json({ message: "condition é obrigatório." });
    }

    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Ativo não encontrado." });
    }
    if (asset.status !== "Available") {
      return res.status(400).json({ message: "Ativo não está disponível para checkout." });
    }

    const assignment = await AssetAssignmentModel.create({
      asset: asset._id,
      user: userId,
      snapshot: {
        name: name.trim(),
        cpf: cpf.trim(),
      },
      checkoutDate: new Date(),
      checkoutCondition: condition.trim(),
      expectedReturnDate: parseDate(expectedReturnDate),
      status: "Active",
      notes: notes?.trim() || undefined,
    });

    asset.status = "In Use";
    asset.currentAssignment = assignment._id as mongoose.Types.ObjectId;
    asset.condition = condition as any;
    await asset.save();

    const populated = await AssetModel.findById(asset._id).populate({
      path: "currentAssignment",
      populate: { path: "user", select: "name email" },
    });

    return res.status(201).json({
      asset: populated,
      assignment,
    });
  } catch {
    return res.status(500).json({ message: "Erro ao realizar checkout do ativo." });
  }
};

export const checkinAsset = async (req: Request, res: Response) => {
  try {
    const { assetId, returnCondition, notes } = req.body as {
      assetId?: string;
      returnCondition?: string;
      notes?: string;
    };

    if (!isValidObjectId(assetId)) {
      return res.status(400).json({ message: "assetId inválido." });
    }
    if (!returnCondition?.trim()) {
      return res.status(400).json({ message: "returnCondition é obrigatório." });
    }

    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Ativo não encontrado." });
    }

    const assignment = await AssetAssignmentModel.findOne({
      asset: asset._id,
      status: "Active",
      checkinDate: null,
    }).sort({ checkoutDate: -1 });

    if (!assignment) {
      return res.status(400).json({ message: "Não existe custódia ativa para este ativo." });
    }

    assignment.checkinDate = new Date();
    assignment.checkinCondition = returnCondition.trim();
    assignment.status = "Returned";
    if (notes?.trim()) {
      assignment.notes = assignment.notes
        ? `${assignment.notes}\n${notes.trim()}`
        : notes.trim();
    }
    await assignment.save();

    asset.status = "Available";
    asset.currentAssignment = null;
    asset.condition = returnCondition as any;
    await asset.save();

    return res.json({
      asset,
      assignment,
    });
  } catch {
    return res.status(500).json({ message: "Erro ao realizar checkin do ativo." });
  }
};

export const retireAsset = async (req: Request, res: Response) => {
  try {
    const { assetId, reason } = req.body as { assetId?: string; reason?: string };

    if (!isValidObjectId(assetId)) {
      return res.status(400).json({ message: "assetId inválido." });
    }
    if (!reason?.trim()) {
      return res.status(400).json({ message: "O motivo do descarte (reason) é obrigatório." });
    }

    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Ativo não encontrado." });
    }

    if (asset.currentAssignment) {
      return res.status(400).json({ message: "Faça o check-in (devolução) do ativo antes de dar baixa." });
    }

    if (asset.status === "Retired") {
      return res.status(400).json({ message: "Este ativo já foi baixado." });
    }

    asset.status = "Retired";
    (asset as any).retireDate = new Date();
    (asset as any).retireReason = reason.trim();
    await asset.save();

    return res.json(asset);
  } catch {
    return res.status(500).json({ message: "Erro ao dar baixa no ativo." });
  }
};

export const generateTermPdf = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    if (!isValidObjectId(assignmentId)) {
      return res.status(400).json({ message: "assignmentId inválido." });
    }

    const assignment = await AssetAssignmentModel.findById(assignmentId).populate("asset");
    if (!assignment) {
      return res.status(404).json({ message: "Termo não encontrado." });
    }

    const assetDoc = assignment.asset as any;
    if (!assetDoc) {
      return res.status(404).json({ message: "Ativo vinculado não encontrado." });
    }

    const employeeName = assignment.snapshot?.name ?? "N/A";
    const employeeCpf = assignment.snapshot?.cpf ?? "N/A";
    const assetName = assetDoc.name ?? "Ativo";
    const assetTag = assetDoc.assetTag ?? "Sem patrimônio";
    const serial = assetDoc.serialNumber ?? "Sem serial";
    const checkoutCondition = assignment.checkoutCondition ?? "Não informada";
    const checkoutDate = formatDate(assignment.checkoutDate);

    const filenameSafeTag = String(assetTag).replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `termo-responsabilidade-${filenameSafeTag}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);

    doc.fontSize(14).font("Helvetica-Bold").text("TERMO DE RESPONSABILIDADE DE EQUIPAMENTO", {
      align: "center",
    });

    doc.moveDown(2);
    doc.font("Helvetica").fontSize(11).text(
      `Pelo presente termo, o colaborador ${employeeName}, CPF ${employeeCpf}, declara o recebimento do equipamento ${assetName}, patrimônio ${assetTag}, serial ${serial}, em ${checkoutDate}, em condição "${checkoutCondition}", comprometendo-se com o uso adequado, guarda, conservação e devolução quando solicitado pela empresa.`,
      {
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(1.5);
    doc.text(
      "Declaro estar ciente de que o equipamento é de propriedade da empresa e que qualquer dano, perda ou uso indevido poderá gerar responsabilização conforme as políticas internas aplicáveis.",
      {
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(2.5);
    doc.text(`Data da entrega: ${checkoutDate}`);
    doc.moveDown(3);

    doc.text("________________________________________", { align: "left" });
    doc.text("Assinatura do Colaborador", { align: "left" });

    doc.moveDown(2.5);
    doc.text("________________________________________", { align: "left" });
    doc.text("Assinatura da Empresa", { align: "left" });

    doc.end();
    return undefined;
  } catch {
    return res.status(500).json({ message: "Erro ao gerar termo em PDF." });
  }
};

export const uploadSignedTerm = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    if (!isValidObjectId(assignmentId)) {
      return res.status(400).json({ message: "assignmentId inválido." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Arquivo não enviado." });
    }

    const assignment = await AssetAssignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Registro de custódia não encontrado." });
    }

    const normalized = req.file.path.split(path.sep).join("/");
    const uploadsIndex = normalized.lastIndexOf("/uploads/");
    const publicPath = uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : `/uploads/terms/${req.file.filename}`;

    assignment.signedTermUrl = publicPath;
    await assignment.save();

    return res.json(assignment);
  } catch {
    return res.status(500).json({ message: "Erro ao anexar termo assinado." });
  }
};
