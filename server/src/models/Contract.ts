import mongoose, { Schema } from "mongoose";

const ContractSchema = new Schema(
  {
    title: { type: String, required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "ExternalParty", required: true },
    status: {
      type: String,
      enum: ["Active", "Expired", "Draft", "Canceled"],
      default: "Active",
    },
    costValue: { type: Number, required: true },
    currency: { type: String, enum: ["BRL", "USD", "EUR"], default: "BRL" },
    frequency: {
      type: String,
      enum: ["Monthly", "Yearly", "One-time"],
      default: "Monthly",
    },
    costCenter: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    noticePeriodDays: { type: Number, default: 30 },
    autoRenew: { type: Boolean, default: false },
    relatedAssets: [{ type: Schema.Types.ObjectId, ref: "Asset" }],
    contractFileUrl: { type: String },
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

ContractSchema.virtual("daysToRenew").get(function (this: any) {
  if (!this.endDate) return null;
  const diff = new Date(this.endDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

ContractSchema.virtual("renewalStatus").get(function (this: any) {
  if (!this.endDate) return "OK";
  const days = Math.ceil((new Date(this.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= (this.noticePeriodDays ?? 30)) return "Critical";
  return "OK";
});

export const ContractModel = mongoose.model("Contract", ContractSchema);
