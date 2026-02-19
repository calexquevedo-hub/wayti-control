import mongoose, { Schema } from "mongoose";
import { CounterModel } from "./Counter";

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

const ChecklistItemSchema = new Schema(
  {
    texto: { type: String, required: true, trim: true },
    checado: { type: Boolean, default: false },
  },
  { _id: false }
);

const DEMAND_STATUS_VALUES = [
  "Backlog",
  "Esta semana",
  "Em execução",
  "Aguardando terceiros",
  "Concluído",
  "Cancelado",
] as const;

const DemandSchema = new Schema(
  {
    sequentialId: { type: Number, index: true },
    name: { type: String, required: true },
    titulo: { type: String, trim: true },
    type: { type: String, required: true },
    category: { type: String, default: "Comunicado/Follow-up" },
    categoria: { type: String, trim: true },
    status: { type: String, enum: DEMAND_STATUS_VALUES, default: "Backlog" },
    priority: { type: String, default: "P2" },
    prioridade: { type: String, enum: ["P0", "P1", "P2", "P3"] },
    impact: { type: String, default: "Médio" },
    impacto: { type: String, enum: ["Alto", "Médio", "Baixo"] },
    epic: { type: String, default: "Outros" },
    epico: { type: String, trim: true },
    sponsor: { type: String, required: true },
    responsible: { type: String, default: "Alexandre Quevedo" },
    responsavel: { type: String, trim: true },
    dono_externo: { type: String, trim: true },
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
    financeiro_mensal: { type: Schema.Types.Decimal128, default: 0 },
    financeiro_one_off: { type: Schema.Types.Decimal128, default: 0 },
    executiveSummary: { type: String, default: "" },
    resumo_executivo: { type: String, default: "" },
    notes: { type: String, default: "" },
    dependencia: { type: String, default: "" },
    link_evidencia: { type: String, default: "" },
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
    checklist: [ChecklistItemSchema],
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
    prazo: { type: Date },
    ultimo_contato: { type: Date },
    proximo_follow_up: { type: Date },
    escalonar_em: { type: Date },
    posicao: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        if (ret.financeiro_mensal && typeof ret.financeiro_mensal?.toString === "function") {
          ret.financeiro_mensal = Number(ret.financeiro_mensal.toString());
        }
        if (ret.financeiro_one_off && typeof ret.financeiro_one_off?.toString === "function") {
          ret.financeiro_one_off = Number(ret.financeiro_one_off.toString());
        }
        delete ret._id;
      },
    },
  }
);

DemandSchema.pre("validate", function (next) {
  const doc = this as any;
  if (!doc.titulo && doc.name) doc.titulo = doc.name;
  if (!doc.name && doc.titulo) doc.name = doc.titulo;

  if (!doc.categoria && doc.category) doc.categoria = doc.category;
  if (!doc.category && doc.categoria) doc.category = doc.categoria;

  if (!doc.prioridade && doc.priority) doc.prioridade = doc.priority;
  if (!doc.priority && doc.prioridade) doc.priority = doc.prioridade;

  if (!doc.impacto && doc.impact) doc.impacto = doc.impact;
  if (!doc.impact && doc.impacto) doc.impact = doc.impacto;

  if (!doc.epico && doc.epic) doc.epico = doc.epic;
  if (!doc.epic && doc.epico) doc.epic = doc.epico;

  if (!doc.responsavel && doc.responsible) doc.responsavel = doc.responsible;
  if (!doc.responsible && doc.responsavel) doc.responsible = doc.responsavel;

  if (!doc.proximo_follow_up && doc.nextFollowUpAt) doc.proximo_follow_up = doc.nextFollowUpAt;
  if (!doc.nextFollowUpAt && doc.proximo_follow_up) doc.nextFollowUpAt = doc.proximo_follow_up;

  if (!doc.ultimo_contato && doc.lastContactAt) doc.ultimo_contato = doc.lastContactAt;
  if (!doc.lastContactAt && doc.ultimo_contato) doc.lastContactAt = doc.ultimo_contato;

  if (!doc.escalonar_em && doc.escalateAt) doc.escalonar_em = doc.escalateAt;

  if (Array.isArray(doc.checklist) && doc.checklist.length > 0) {
    const total = doc.checklist.length;
    const checked = doc.checklist.filter((item: any) => item?.checado).length;
    doc.progress = total ? Math.round((checked / total) * 100) : 0;
  }

  next();
});

DemandSchema.pre("save", async function (next) {
  try {
    const doc = this as any;
    if (!doc.isNew || typeof doc.sequentialId === "number") {
      next();
      return;
    }

    const counter = await CounterModel.findOneAndUpdate(
      { name: "demands" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    doc.sequentialId = counter.seq;
    next();
  } catch (error) {
    next(error as Error);
  }
});

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
