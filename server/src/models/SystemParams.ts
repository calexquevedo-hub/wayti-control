import mongoose, { Schema } from "mongoose";

const SystemParamsSchema = new Schema(
  {
    mailProvider: {
      type: String,
      enum: ["Gmail", "Office365", "SendGrid", "AmazonSES", "Mailgun", "SMTP"],
      default: "Gmail",
    },
    fromName: { type: String, default: "WayTI Control" },
    fromEmail: { type: String, default: "" },
    gmailUser: { type: String, default: "" },
    gmailAppPasswordEnc: { type: String },
    gmailAppPasswordIv: { type: String },
    gmailAppPasswordTag: { type: String },
    sendGridApiKeyEnc: { type: String },
    sendGridApiKeyIv: { type: String },
    sendGridApiKeyTag: { type: String },
    office365User: { type: String, default: "" },
    office365PassEnc: { type: String },
    office365PassIv: { type: String },
    office365PassTag: { type: String },
    sesRegion: { type: String, default: "us-east-1" },
    sesSmtpUser: { type: String, default: "" },
    sesSmtpPassEnc: { type: String },
    sesSmtpPassIv: { type: String },
    sesSmtpPassTag: { type: String },
    mailgunDomain: { type: String, default: "" },
    mailgunApiKeyEnc: { type: String },
    mailgunApiKeyIv: { type: String },
    mailgunApiKeyTag: { type: String },
    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: "" },
    smtpPassEnc: { type: String },
    smtpPassIv: { type: String },
    smtpPassTag: { type: String },
    slaWarningMinutes: { type: Number, default: 120 },
    slaPolicies: {
      urgentHours: { type: Number, default: 8 },
      highHours: { type: Number, default: 48 },
      mediumHours: { type: Number, default: 120 },
      lowHours: { type: Number, default: 240 },
    },
    emailSignature: { type: String, default: "" },
    cannedResponses: [
      new Schema(
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          body: { type: String, required: true },
          scope: { type: String, enum: ["personal", "shared"], default: "shared" },
        },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);

export const SystemParamsModel = mongoose.model("SystemParams", SystemParamsSchema);
