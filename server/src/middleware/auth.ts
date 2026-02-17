import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { UserModel } from "../models/User";

export interface AuthPayload {
  sub: string;
  email: string;
}

// Ensures API access only for logged-in users.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Token ausente" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    const user = await UserModel.findById(payload.sub).populate("profile");
    if (!user) {
      return res.status(401).json({ message: "Usuário inválido" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Usuário inativo" });
    }
    if (!user.profile) {
      return res.status(403).json({ message: "Perfil não encontrado." });
    }
    res.locals.user = {
      id: user.id,
      email: user.email,
      profile: user.profile,
      mustChangePassword: user.mustChangePassword,
    };
    if (user.mustChangePassword && !req.originalUrl.includes("/auth/change-password")) {
      return res.status(403).json({ message: "Atualize sua senha para continuar." });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
}
