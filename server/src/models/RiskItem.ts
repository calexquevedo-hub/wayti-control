import mongoose, { Schema, Document } from "mongoose";

export interface IRiskItem extends Document {
  severity: "Crítico" | "Alto" | "Médio";
  title: string;
  description: string;
  impact: "Baixo" | "Médio" | "Alto";
  ownerInternal: string;
  ownerExternal: mongoose.Types.ObjectId;
  status: "Aberto" | "Mitigado" | "Resolvido";
  lastContactAt?: Date;
  nextFollowUpAt?: Date;
  linkedEpicValue?: string;
  linkedSprintId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RiskItemSchema = new Schema<IRiskItem>(
  {
    severity: { type: String, enum: ["Crítico", "Alto", "Médio"], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    impact: { type: String, enum: ["Baixo", "Médio", "Alto"], default: "Médio" },
    ownerInternal: { type: String, trim: true },
    ownerExternal: { type: Schema.Types.ObjectId, ref: "ExternalParty" },
    status: { type: String, enum: ["Aberto", "Mitigado", "Resolvido"], default: "Aberto" },
    lastContactAt: { type: Date },
    nextFollowUpAt: { type: Date },
    linkedEpicValue: { type: String, trim: true },
    linkedSprintId: { type: Schema.Types.ObjectId, ref: "Sprint" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

export const RiskItemModel = mongoose.model<IRiskItem>("RiskItem", RiskItemSchema);
