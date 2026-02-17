import mongoose, { Schema } from "mongoose";

const FollowUpSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    owner: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, required: true },
    notes: { type: String, required: true },
  },
  { _id: false }
);

const DependencySchema = new Schema(
  {
    title: { type: String, required: true },
    kind: { type: String, required: true },
    owner: { type: String, required: true },
    externalOwnerId: { type: Schema.Types.ObjectId, ref: "ExternalParty" },
    status: { type: String, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const EvidenceSchema = new Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    kind: { type: String, required: true },
  },
  { _id: false }
);

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    assignee: { type: String },
    createdAt: { type: Date, default: Date.now },
  }
);

const DemandSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, default: "Comunicado/Follow-up" },
    status: { type: String, default: "Backlog" },
    priority: { type: String, default: "P2" },
    impact: { type: String, default: "Médio" },
    epic: { type: String, default: "Outros" },
    sponsor: { type: String, required: true },
    responsible: { type: String, default: "Alexandre Quevedo" },
    externalOwnerId: { type: Schema.Types.ObjectId, ref: "ExternalParty" },
    approver: { type: String },
    approvalStatus: { type: String },
    approvalNotes: { type: String },
    approvalStages: [
      new Schema(
        {
          name: { type: String, required: true },
          owner: { type: String, required: true },
          status: { type: String, required: true },
          slaDays: { type: Number },
        },
        { _id: false }
      ),
    ],
    approvalSlaDays: { type: Number },
    budget: { type: Number, required: true },
    spent: { type: Number, required: true },
    progress: { type: Number, required: true },
    financialMonthly: { type: Number, default: 0 },
    financialOneOff: { type: Number, default: 0 },
    executiveSummary: { type: String, default: "" },
    notes: { type: String, default: "" },
    comments: [
      new Schema(
        {
          at: { type: Date, required: true },
          author: { type: String, required: true },
          message: { type: String, required: true },
        },
        { _id: false }
      ),
    ],
    evidenceLinks: [EvidenceSchema],
    dependencies: [DependencySchema],
    escalateTo: { type: String, default: "N/A" },
    nextFollowUpAt: { type: Date },
    lastContactAt: { type: Date },
    lastUpdate: { type: Date, required: true },
    followUps: [FollowUpSchema],
    tasks: [TaskSchema],
    audits: [
      new Schema(
        {
          at: { type: Date, required: true },
          action: { type: String, required: true },
          actor: { type: String, required: true },
          field: { type: String },
          before: { type: String },
          after: { type: String },
          notes: { type: String },
        },
        { _id: false }
      ),
    ],
    deletedAt: { type: Date },
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

DemandSchema.virtual("isOverdue").get(function (this: any) {
  if (this.status !== "Aguardando terceiros") return false;
  if (!this.nextFollowUpAt) return false;
  return new Date(this.nextFollowUpAt).getTime() <= Date.now();
});

DemandSchema.virtual("agingDays").get(function (this: any) {
  if (!this.createdAt) return 0;
  const diff = Date.now() - new Date(this.createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

DemandSchema.virtual("tasksProgress").get(function (this: any) {
  if (!this.tasks || this.tasks.length === 0) return 0;
  const completed = this.tasks.filter((task: any) => task.isCompleted).length;
  return Math.round((completed / this.tasks.length) * 100);
});

export const DemandModel = mongoose.model("Demand", DemandSchema);
