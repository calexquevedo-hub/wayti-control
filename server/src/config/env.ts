import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/ti-demand",
  jwtSecret: process.env.JWT_SECRET ?? "dev_secret_change_me",
  vaultMasterKey: process.env.VAULT_MASTER_KEY ?? "",
};
