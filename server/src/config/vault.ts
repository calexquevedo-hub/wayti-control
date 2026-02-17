import crypto from "crypto";

import { env } from "./env";

const KEY_LENGTH = 32;

function parseKey(raw: string) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let buf: Buffer | null = null;
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    buf = Buffer.from(trimmed, "hex");
  } else {
    try {
      buf = Buffer.from(trimmed, "base64");
    } catch {
      buf = null;
    }
  }
  if (!buf || buf.length !== KEY_LENGTH) return null;
  return buf;
}

export function getVaultKey() {
  const key = parseKey(env.vaultMasterKey);
  if (!key) {
    throw new Error("VAULT_MASTER_KEY inválida.");
  }
  return key;
}

export function encryptSecret(plain: string) {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    data: encrypted.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(payload: { iv: string; data: string; tag: string }) {
  const key = getVaultKey();
  const iv = Buffer.from(payload.iv, "base64");
  const data = Buffer.from(payload.data, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
