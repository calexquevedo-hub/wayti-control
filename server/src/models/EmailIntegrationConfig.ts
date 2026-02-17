import mongoose, { Schema } from "mongoose";

const EmailIntegrationConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ["Gmail", "Office365", "IMAP"], default: "Gmail" },
    emailAddress: { type: String, default: "" },
    appPassword: { type: String, default: "" },
    imapHost: { type: String, default: "imap.gmail.com" },
    imapPort: { type: Number, default: 993 },
    imapTls: { type: Boolean, default: true },
    mailbox: { type: String, default: "INBOX" },
    pollingIntervalMin: { type: Number, default: 5 },
    defaultQueue: { type: String, default: "TI Interna" },
    defaultStatus: { type: String, default: "Novo" },
    defaultImpact: { type: String, default: "Médio" },
    defaultUrgency: { type: String, default: "Média" },
    defaultSystem: { type: String, default: "Email" },
    defaultCategory: { type: String, default: "Suporte" },
    defaultExternalOwnerId: { type: Schema.Types.ObjectId, ref: "ExternalParty" },
    lastCheckedAt: { type: Date },
  },
  { timestamps: true }
);

export const EmailIntegrationConfigModel = mongoose.model(
  "EmailIntegrationConfig",
  EmailIntegrationConfigSchema
);
