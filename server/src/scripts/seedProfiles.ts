import mongoose from "mongoose";
import dotenv from "dotenv";

import { ProfileModel } from "../models/Profile";
import { UserModel } from "../models/User";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "";

const seedProfiles = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI não configurado.");
    }
    await mongoose.connect(MONGO_URI);
    console.log("🔌 Conectado ao MongoDB...");

    const profiles = [
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
    ];

    const profileMap: Record<string, string> = {};

    for (const p of profiles) {
      let profile = await ProfileModel.findOne({ name: p.name });
      if (!profile) {
        profile = await ProfileModel.create(p);
        console.log(`✅ Perfil criado: ${p.name}`);
      } else {
        console.log(`ℹ️ Perfil já existe: ${p.name}`);
      }
      profileMap[p.name] = profile._id.toString();
    }

    const users = await UserModel.find({});
    for (const user of users) {
      const oldRole = user.get("role");
      let targetProfileId = profileMap["Solicitante"];

      if (oldRole === "Admin") targetProfileId = profileMap["Administrador"];
      if (oldRole === "Agent") targetProfileId = profileMap["Técnico"];

      user.set("profile", targetProfileId);
      user.set("role", undefined);
      await user.save();
      console.log(
        `👤 Usuário migrado: ${user.get("name")} -> ${oldRole || "Sem Role"}`
      );
    }

    console.log("🚀 Migração concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    process.exit(1);
  }
};

seedProfiles();
