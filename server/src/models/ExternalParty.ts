import mongoose, { Schema } from "mongoose";

const ExternalPartySchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["Fornecedor", "Parceiro", "Cliente"], required: true },
    category: {
      type: String,
      enum: ["Software", "Hardware", "Telecom", "Consultoria"],
      required: false,
    },
    emails: [{ type: String }],
    phones: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true }
);

export const ExternalPartyModel = mongoose.model("ExternalParty", ExternalPartySchema);
