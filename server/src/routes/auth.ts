import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { UserModel } from "../models/User";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Demo-only admin login. Replace with real user store for production.
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await UserModel.findOne({ email: email.toLowerCase() }).populate("profile");
  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: "Usuário inativo" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (isValid) {
    user.lastLoginAt = new Date();
    await user.save();
    const token = jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
      expiresIn: "8h",
    });
    return res.json({ token, user: user.toJSON() });
  }

  return res.status(401).json({ message: "Credenciais inválidas" });
});

router.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { password } = req.body as { password: string };
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Senha inválida." });
  }
  const user = res.locals.user as { id: string };
  const record = await UserModel.findById(user.id);
  if (!record) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }
  record.passwordHash = await bcrypt.hash(password, 10);
  record.mustChangePassword = false;
  await record.save();
  return res.json({ ok: true });
});

export default router;
