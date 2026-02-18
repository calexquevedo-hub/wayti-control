export type DemandStatus =
  | "Aguardando terceiros"
  | "Backlog"
  | "Esta semana"
  | "Em execução"
  | "Concluído"
  | "Cancelado";
export type ApprovalStatus = "pendente" | "aprovado" | "reprovado";
export type DemandCategory =
  | "Comunicado/Follow-up"
  | "Ação"
  | "Decisão"
  | "Risco/Impedimento";
export type DemandPriority = "P0" | "P1" | "P2" | "P3";
export type DemandImpact = "Baixo" | "Médio" | "Alto";
export type DemandEscalateTo =
  | "N/A"
  | "Eduardo"
  | "Diretoria"
  | "Financeiro"
  | "Jurídico"
  | "Fornecedor"
  | "Parceiro"
  | "Outro";

export interface ApprovalStage {
  name: string;
  owner: string;
  status: ApprovalStatus;
  slaDays?: number;
}
export type DemandType = "projeto" | "contrato" | "custo" | "compra" | "implantacao";

export interface FollowUp {
  id: string;
  title: string;
  owner: string;
  dueDate: Date;
  status: "aberto" | "em-validacao" | "feito";
  notes: string;
}

export interface AuditEntry {
  at: Date;
  action: string;
  actor: string;
  field?: string;
  before?: string;
  after?: string;
  notes?: string;
}

export interface DemandComment {
  at: Date;
  author: string;
  message: string;
}

export interface Dependency {
  title: string;
  kind: "Interna" | "Externa";
  owner: string;
  externalOwnerId?: string;
  status: "Aberta" | "Em andamento" | "Concluída" | "Bloqueante";
  notes?: string;
}

export interface EvidenceLink {
  label: string;
  url: string;
  kind: "Link" | "Arquivo" | "Email" | "Print";
}

export interface ExternalParty {
  id: string;
  name: string;
  type: "Fornecedor" | "Parceiro" | "Cliente";
  category?: "Software" | "Hardware" | "Telecom" | "Consultoria";
  emails: string[];
  phones: string[];
  notes?: string;
}

export interface ContactLog {
  id: string;
  demandId: string;
  at: Date;
  channel: "Email" | "WhatsApp" | "Teams" | "Reunião" | "Outro";
  summary: string;
  nextFollowUpAt?: Date;
}

export interface Ticket {
  id: string;
  code: string;
  queue: "TI Interna" | "Fornecedor";
  status:
    | "Novo"
    | "Triagem"
    | "Em atendimento"
    | "Aguardando fornecedor"
    | "Aguardando solicitante"
    | "Aguardando aprovação"
    | "Resolvido"
    | "Fechado"
    | "Cancelado";
  externalOwnerId?: string;
  assignee?: string;
  channel?: "Email" | "Portal" | "Telefone" | "WhatsApp" | "Chat" | "Manual";
  system: string;
  category: string;
  impact: "Baixo" | "Médio" | "Alto";
  urgency: "Baixa" | "Média" | "Alta";
  priority: "P0" | "P1" | "P2" | "P3";
  subject: string;
  description?: string;
  resolutionNotes?: string;
  openedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  slaDueAt?: Date | null;
  isSlaOverdue?: boolean;
  slaResponseDueAt?: Date;
  firstResponseAt?: Date;
  demandId?: string;
  relatedAssetId?: string;
  serviceId?: string;
  approvalStatus?: "NotRequired" | "Pending" | "Approved" | "Rejected";
  approvalRequestedAt?: Date;
  approvalDecidedAt?: Date;
  approvalDecidedBy?: string;
  approvalReason?: string;
  approvalApproverRole?: "Admin" | "Agent";
  approvalApproverId?: string;
  comments?: Array<{
    at: Date;
    author: string;
    message: string;
  }>;
}

export interface ServiceCatalog {
  id: string;
  title: string;
  description?: string;
  icon: string;
  category: "Hardware" | "Software" | "Acesso" | "Infra";
  isVisible: boolean;
  defaultPriority: "P0" | "P1" | "P2" | "P3";
  defaultSLA: number;
  formTemplate?: Record<string, unknown>;
  requiresApproval?: boolean;
  approverRole?: "Admin" | "Agent";
  specificApproverId?: string;
  autoAssignTo?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  body: string;
  tags: string[];
  views: number;
  helpfulVotes: number;
  relatedServiceId?: ServiceCatalog;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  serialNumber?: string;
  type: "Hardware" | "Software" | "License" | "Peripheral" | "Mobile";
  brand?: string;
  model?: string;
  purchaseDate?: Date;
  purchaseValue?: number;
  warrantyExpiresAt?: Date;
  assignedTo?: { id: string; name: string; email: string };
  assignedToId?: string;
  status: "InUse" | "InStock" | "Maintenance" | "Retired" | "Lost";
  location?: string;
  assignmentHistory?: Array<{
    at: Date;
    userId?: string;
    userName?: string;
    notes?: string;
  }>;
}

export interface Contract {
  id: string;
  title: string;
  vendorId: ExternalParty | string;
  status: "Active" | "Expired" | "Draft" | "Canceled";
  costValue: number;
  currency: "BRL" | "USD" | "EUR";
  frequency: "Monthly" | "Yearly" | "One-time";
  costCenter?: string;
  startDate: Date;
  endDate?: Date | null;
  noticePeriodDays?: number;
  autoRenew: boolean;
  relatedAssets?: Array<Asset | string>;
  contractFileUrl?: string;
  daysToRenew?: number | null;
  renewalStatus?: "Critical" | "OK";
}

export interface TicketEmailItem {
  id: string;
  type: "inbound" | "outbound";
  subject: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  at: Date;
  snippet?: string;
  textBody?: string;
  htmlBody?: string;
  headers?: Record<string, unknown>;
  attachments?: Array<{
    index: number;
    filename?: string;
    contentType?: string;
    size?: number;
  }>;
  status?: "sent" | "failed" | "received";
  error?: string;
}

export interface Demand {
  id: string;
  sequentialId?: number;
  name: string;
  titulo?: string;
  type: DemandType;
  category: DemandCategory;
  categoria?: string;
  status: DemandStatus;
  priority: DemandPriority;
  prioridade?: DemandPriority;
  impact: DemandImpact;
  impacto?: DemandImpact;
  epic: string;
  epico?: string;
  sponsor: string;
  responsible: string;
  responsavel?: string;
  externalOwnerId?: string;
  approver?: string;
  approvalStatus?: ApprovalStatus;
  approvalNotes?: string;
  approvalStages?: ApprovalStage[];
  approvalSlaDays?: number;
  budget: number;
  spent: number;
  progress: number;
  financialMonthly: number;
  financialOneOff: number;
  executiveSummary: string;
  notes: string;
  comments?: DemandComment[];
  tasks?: Array<{
    _id?: string;
    title: string;
    isCompleted: boolean;
    assignee?: string;
    createdAt?: Date;
  }>;
  evidenceLinks?: EvidenceLink[];
  dependencies?: Dependency[];
  escalateTo?: DemandEscalateTo;
  nextFollowUpAt?: Date;
  lastContactAt?: Date;
  prazo?: Date | string;
  proximo_follow_up?: Date | string;
  ultimo_contato?: Date | string;
  escalonar_em?: Date | string;
  checklist?: Array<{ texto: string; checado: boolean }>;
  lastUpdate: Date;
  followUps: FollowUp[];
  audits?: AuditEntry[];
  isOverdue?: boolean;
  agingDays?: number;
}

export interface ReportSnapshot {
  period: string;
  totalBudget: number;
  totalSpent: number;
  riskCount: number;
  onTimePercentage: number;
}

export interface EmailIntegrationConfig {
  id: string;
  enabled: boolean;
  provider?: "Gmail" | "Office365" | "IMAP";
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  mailbox: string;
  pollingIntervalMin: number;
  defaultQueue: "TI Interna" | "Fornecedor";
  defaultStatus: "Novo" | "Triagem" | "Em atendimento" | "Aguardando fornecedor" | "Aguardando solicitante";
  defaultImpact: "Baixo" | "Médio" | "Alto";
  defaultUrgency: "Baixa" | "Média" | "Alta";
  defaultSystem: string;
  defaultCategory: string;
  defaultExternalOwnerId?: string;
  hasPassword?: boolean;
}

export interface VaultItem {
  id: string;
  title: string;
  username: string;
  url?: string;
  tags: string[];
  externalOwnerId?: string;
  lastRotatedAt?: Date;
  rotationPeriodDays?: number;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VaultItemDetail extends VaultItem {
  notes?: string;
}

export type UserRole = "Admin" | "Agent" | "User";

export interface ProfilePermissions {
  tickets: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  demands: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  assets: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  contracts: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  users: { view: boolean; manage: boolean };
  reports: { view: boolean };
  settings: { manage: boolean };
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: ProfilePermissions;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profile: Profile | string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  locale?: string;
  theme?: "light" | "dark";
  notificationPrefs?: {
    email: boolean;
    slack: boolean;
  };
}

export interface SystemParams {
  id: string;
  mailProvider: "Gmail" | "Office365" | "SendGrid" | "AmazonSES" | "Mailgun" | "SMTP";
  fromName: string;
  fromEmail: string;
  gmailUser: string;
  hasGmailPassword?: boolean;
  hasSendGridKey?: boolean;
  office365User: string;
  hasOffice365Password?: boolean;
  sesRegion: string;
  sesSmtpUser: string;
  hasSesPassword?: boolean;
  mailgunDomain: string;
  hasMailgunKey?: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  hasSmtpPassword?: boolean;
  slaWarningMinutes?: number;
  slaPolicies?: {
    urgentHours: number;
    highHours: number;
    mediumHours: number;
    lowHours: number;
  };
  emailSignature?: string;
  cannedResponses?: Array<{
    id: string;
    title: string;
    body: string;
    scope: "personal" | "shared";
  }>;
}
