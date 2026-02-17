import mongoose from "mongoose";
import { ProfileModel } from "../models/Profile";
import { UserModel } from "../models/User";
export const getProfiles = async (_req, res) => {
    try {
        const profiles = await ProfileModel.find().sort({ name: 1 });
        return res.json(profiles);
    }
    catch {
        return res.status(500).json({ message: "Erro ao buscar perfis." });
    }
};
export const createProfile = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "O nome do perfil é obrigatório." });
        }
        const existing = await ProfileModel.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: "Já existe um perfil com este nome." });
        }
        const created = await ProfileModel.create(req.body);
        return res.status(201).json(created);
    }
    catch {
        return res.status(500).json({ message: "Erro ao criar perfil." });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const profile = await ProfileModel.findById(id);
        if (!profile) {
            return res.status(404).json({ message: "Perfil não encontrado." });
        }
        if (profile.isSystem && profile.name === "Administrador") {
            if (updates.permissions || updates.name) {
                return res.status(403).json({
                    message: "Ação Proibida: O perfil Administrador não pode ser modificado para evitar bloqueio do sistema.",
                });
            }
        }
        if (profile.isSystem && updates.name && updates.name !== profile.name) {
            return res.status(403).json({
                message: "Não é permitido renomear perfis padrão do sistema.",
            });
        }
        const updated = await ProfileModel.findByIdAndUpdate(id, updates, { new: true });
        if (!updated) {
            return res.status(404).json({ message: "Perfil não encontrado." });
        }
        return res.json(updated);
    }
    catch {
        return res.status(500).json({ message: "Erro ao atualizar perfil." });
    }
};
export const deleteProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID inválido fornecido." });
        }
        const profile = await ProfileModel.findById(id);
        if (!profile) {
            return res.status(404).json({ message: "Perfil não encontrado." });
        }
        if (profile.isSystem) {
            return res.status(403).json({
                message: "Perfis padrão do sistema (Admin, Técnico, Solicitante) não podem ser excluídos.",
            });
        }
        const usersUsingProfile = await UserModel.countDocuments({ profile: id });
        if (usersUsingProfile > 0) {
            return res.status(400).json({
                message: `Não é possível excluir. Existem ${usersUsingProfile} usuários vinculados a este perfil. Mude-os antes de excluir.`,
            });
        }
        await ProfileModel.findByIdAndDelete(id);
        return res.json({ message: "Perfil excluído com sucesso." });
    }
    catch (error) {
        console.error("Erro ao deletar perfil:", error);
        return res.status(500).json({ message: "Erro interno no servidor." });
    }
};
