import mongoose, { Schema } from "mongoose";

const ServiceCatalogSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "LifeBuoy" },
    category: {
      type: String,
      enum: ["Hardware", "Software", "Acesso", "Infra"],
      required: true,
    },
    isVisible: { type: Boolean, default: true },
    defaultPriority: {
      type: String,
      enum: ["P0", "P1", "P2", "P3"],
      default: "P2",
    },
    defaultSLA: { type: Number, default: 24 },
    formTemplate: { type: Object },
    requiresApproval: { type: Boolean, default: false },
    approverRole: {
      type: String,
      enum: ["Admin", "Agent"],
    },
    specificApproverId: { type: Schema.Types.ObjectId, ref: "User" },
    autoAssignTo: { type: String },
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

export const ServiceCatalogModel = mongoose.model("ServiceCatalog", ServiceCatalogSchema);
