import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema(
  {
    at: { type: Date, required: true },
    author: { type: String, required: true },
    message: { type: String, required: true },
  },
  { _id: false }
);

const TicketSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    queue: { type: String, required: true },
    status: { type: String, required: true },
    externalOwnerId: { type: Schema.Types.ObjectId, ref: "ExternalParty" },
    assignee: { type: String },
    channel: { type: String, default: "Manual" },
    system: { type: String, required: true },
    category: { type: String, required: true },
    impact: { type: String, required: true },
    urgency: { type: String, required: true },
    priority: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    resolutionNotes: { type: String },
    requesterId: { type: Schema.Types.ObjectId, ref: "User" },
    requesterEmail: { type: String },
    openedAt: { type: Date, required: true },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    slaDueAt: { type: Date },
    slaResponseDueAt: { type: Date },
    firstResponseAt: { type: Date },
    demandId: { type: Schema.Types.ObjectId, ref: "Demand" },
    relatedAssetId: { type: Schema.Types.ObjectId, ref: "Asset" },
    serviceId: { type: Schema.Types.ObjectId, ref: "ServiceCatalog" },
    approvalStatus: {
      type: String,
      enum: ["NotRequired", "Pending", "Approved", "Rejected"],
      default: "NotRequired",
    },
    approvalRequestedAt: { type: Date },
    approvalDecidedAt: { type: Date },
    approvalDecidedBy: { type: String },
    approvalReason: { type: String },
    approvalApproverRole: { type: String },
    approvalApproverId: { type: Schema.Types.ObjectId, ref: "User" },
    comments: [CommentSchema],
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

TicketSchema.virtual("isSlaOverdue").get(function (this: any) {
  if (!this.slaDueAt) return false;
  if (["Fechado", "Cancelado"].includes(this.status)) return false;
  return new Date(this.slaDueAt).getTime() < Date.now();
});

export const TicketModel = mongoose.model("Ticket", TicketSchema);
