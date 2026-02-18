import type {
  ContactLog,
  Demand,
  EmailIntegrationConfig,
  ExternalParty,
  Asset,
  Contract,
  ServiceCatalog,
  KnowledgeArticle,
  Ticket,
  TicketEmailItem,
  VaultItem,
  VaultItemDetail,
  User,
  Profile,
  SystemParams,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function normalizeStatus(status: Demand["status"]) {
  const value = String(status);
  if (value === "planejado") return "Backlog" as Demand["status"];
  if (value === "em-andamento") return "Em execução" as Demand["status"];
  if (value === "risco") return "Aguardando terceiros" as Demand["status"];
  if (value === "concluido") return "Concluído" as Demand["status"];
  return status;
}

function parseDemand(raw: Demand) {
  return {
    ...raw,
    status: normalizeStatus(raw.status),
    lastUpdate: new Date(raw.lastUpdate),
    nextFollowUpAt: raw.nextFollowUpAt ? new Date(raw.nextFollowUpAt) : undefined,
    lastContactAt: raw.lastContactAt ? new Date(raw.lastContactAt) : undefined,
    followUps: raw.followUps.map((item) => ({ ...item, dueDate: new Date(item.dueDate) })),
    audits: raw.audits?.map((audit) => ({ ...audit, at: new Date(audit.at) })),
    comments: raw.comments?.map((comment) => ({ ...comment, at: new Date(comment.at) })),
    tasks: raw.tasks?.map((task) => ({
      ...task,
      createdAt: task.createdAt ? new Date(task.createdAt) : undefined,
    })),
  };
}

// Lightweight API client for the demo.
export async function fetchDemands(token: string) {
  const response = await fetch(`${API_URL}/api/demands`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    const message = data?.message ?? "Falha ao carregar demandas.";
    throw new Error(`${response.status}:${message}`);
  }

  const data = (await response.json()) as Demand[];
  return data.map(parseDemand);
}

export async function fetchReportSummary(token: string) {
  const response = await fetch(`${API_URL}/api/reports/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    const message = data?.message ?? "Falha ao carregar relatório.";
    throw new Error(`${response.status}:${message}`);
  }

  return (await response.json()) as {
    totalBudget: number;
    totalSpent: number;
    riskCount: number;
    onTimePercentage: number;
  };
}

export async function createDemand(token: string, payload: Omit<Demand, "id">) {
  const response = await fetch(`${API_URL}/api/demands`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Falha ao criar demanda.");
  }

  const data = (await response.json()) as Demand;
  return parseDemand(data);
}

export async function updateDemand(token: string, id: string, payload: Partial<Demand>) {
  const response = await fetch(`${API_URL}/api/demands/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Falha ao atualizar demanda.");
  }

  const data = (await response.json()) as Demand;
  return parseDemand(data);
}

export async function updateDemandStatus(token: string, id: string, status: Demand["status"]) {
  const response = await fetch(`${API_URL}/api/demands/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Falha ao mover demanda.");
  }

  const data = (await response.json()) as Demand;
  return parseDemand(data);
}

export async function addDemandComment(token: string, demandId: string, message: string) {
  const response = await fetch(`${API_URL}/api/demands/${demandId}/comment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao registrar comentário.");
  }

  const data = (await response.json()) as Demand;
  return parseDemand(data);
}

export async function deleteDemand(token: string, id: string, reason: string) {
  const response = await fetch(`${API_URL}/api/demands/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao excluir demanda.");
  }

  return (await response.json()) as { ok: true };
}

export async function createContact(
  token: string,
  demandId: string,
  payload: { channel: string; summary: string; nextFollowUpAt?: Date }
) {
  const response = await fetch(`${API_URL}/api/demands/${demandId}/contact`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: payload.channel,
      summary: payload.summary,
      nextFollowUpAt: payload.nextFollowUpAt?.toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error("Falha ao registrar contato.");
  }

  return (await response.json()) as ContactLog;
}

export async function fetchContacts(token: string, demandId: string) {
  const response = await fetch(`${API_URL}/api/demands/${demandId}/contacts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar contatos.");
  }
  const data = (await response.json()) as ContactLog[];
  return data.map((item) => ({
    ...item,
    at: new Date(item.at),
    nextFollowUpAt: item.nextFollowUpAt ? new Date(item.nextFollowUpAt) : undefined,
  }));
}

export async function escalateDemand(token: string, id: string, escalateTo: string) {
  const response = await fetch(`${API_URL}/api/demands/${id}/escalate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ escalateTo }),
  });

  if (!response.ok) {
    throw new Error("Falha ao escalar demanda.");
  }

  const data = (await response.json()) as Demand;
  return parseDemand(data);
}

export async function fetchExecutiveReport(token: string) {
  const response = await fetch(`${API_URL}/api/reports/executive`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Falha ao carregar relatorio executivo.");
  }

  const data = (await response.json()) as {
    statusCounts: Record<string, number>;
    p0AndOverdue: Demand[];
    totalMonthly: number;
    totalOneOff: number;
    agingBuckets: Record<string, number>;
    topWaiting: Demand[];
  };
  return {
    ...data,
    p0AndOverdue: data.p0AndOverdue.map(parseDemand),
    topWaiting: data.topWaiting.map(parseDemand),
  };
}

export async function fetchExecutiveTickets(token: string) {
  const response = await fetch(`${API_URL}/api/reports/executive-tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Falha ao carregar tickets executivos.");
  }

  const data = (await response.json()) as {
    total: number;
    overdueCount: number;
    statusCounts: Record<string, number>;
    overdueByQueue: Record<string, number>;
    agingBuckets: Record<string, number>;
    tickets: Array<{
      _id: string;
      subject: string;
      system: string;
      status: string;
      openedAt: string;
      slaDueAt?: string | null;
      isSlaOverdue?: boolean;
      demandId: {
        name: string;
        priority: string;
        impact: string;
        epic: string;
        status: string;
        nextFollowUpAt?: string;
      };
    }>;
  };

  return {
    total: data.total,
    overdueCount: data.overdueCount,
    statusCounts: data.statusCounts,
    overdueByQueue: data.overdueByQueue,
    agingBuckets: data.agingBuckets,
    tickets: data.tickets.map((ticket) => ({
      ...ticket,
      openedAt: new Date(ticket.openedAt),
      slaDueAt: ticket.slaDueAt ? new Date(ticket.slaDueAt) : null,
      demandId: {
        ...ticket.demandId,
        nextFollowUpAt: ticket.demandId?.nextFollowUpAt
          ? new Date(ticket.demandId.nextFollowUpAt)
          : undefined,
      },
    })),
  };
}

export async function fetchSlaReport(token: string) {
  const response = await fetch(`${API_URL}/api/reports/sla-tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao carregar SLA.");
  }
  return (await response.json()) as {
    warnMinutes: number;
    totals: { open: number; overdue: number; warning: number; risk48h: number };
    byQueue: Record<string, { open: number; overdue: number; warning: number }>;
    byAssignee: Record<string, { open: number; overdue: number; warning: number }>;
    agingBuckets: Record<string, number>;
  };
}
export async function fetchExternalParties(token: string) {
  const response = await fetch(`${API_URL}/api/external-parties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar parceiros.");
  }
  return (await response.json()) as ExternalParty[];
}

export async function fetchTickets(token: string) {
  const response = await fetch(`${API_URL}/api/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar chamados.");
  }
  const data = (await response.json()) as Ticket[];
  return data.map((ticket) => ({
    ...ticket,
    openedAt: new Date(ticket.openedAt),
    resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : undefined,
    closedAt: ticket.closedAt ? new Date(ticket.closedAt) : undefined,
    slaDueAt: ticket.slaDueAt ? new Date(ticket.slaDueAt) : null,
    slaResponseDueAt: ticket.slaResponseDueAt ? new Date(ticket.slaResponseDueAt) : undefined,
    firstResponseAt: ticket.firstResponseAt ? new Date(ticket.firstResponseAt) : undefined,
    approvalRequestedAt: ticket.approvalRequestedAt ? new Date(ticket.approvalRequestedAt) : undefined,
    approvalDecidedAt: ticket.approvalDecidedAt ? new Date(ticket.approvalDecidedAt) : undefined,
    comments: ticket.comments?.map((comment) => ({
      ...comment,
      at: new Date(comment.at),
    })),
  }));
}

export async function fetchAssets(token: string, params?: { search?: string; status?: string; type?: string; assignedTo?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.type) query.set("type", params.type);
  if (params?.assignedTo) query.set("assignedTo", params.assignedTo);
  const response = await fetch(`${API_URL}/api/assets?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar ativos.");
  }
  const data = (await response.json()) as Asset[];
  return data.map((asset) => ({
    ...asset,
    purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : undefined,
    warrantyExpiresAt: asset.warrantyExpiresAt ? new Date(asset.warrantyExpiresAt) : undefined,
    assignmentHistory: asset.assignmentHistory?.map((item) => ({
      ...item,
      at: new Date(item.at),
    })),
  }));
}

export async function createAsset(token: string, payload: Partial<Asset>) {
  const outgoing = { ...payload } as Record<string, unknown>;
  if (payload.assignedToId && !payload.assignedTo) {
    outgoing.assignedTo = payload.assignedToId;
  }
  const response = await fetch(`${API_URL}/api/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(outgoing),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao criar ativo.");
  }
  const data = (await response.json()) as Asset;
  return {
    ...data,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
    warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : undefined,
    assignmentHistory: data.assignmentHistory?.map((item) => ({ ...item, at: new Date(item.at) })),
  };
}

export async function updateAsset(token: string, id: string, payload: Partial<Asset>) {
  const outgoing = { ...payload } as Record<string, unknown>;
  if (payload.assignedToId && !payload.assignedTo) {
    outgoing.assignedTo = payload.assignedToId;
  }
  const response = await fetch(`${API_URL}/api/assets/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(outgoing),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao atualizar ativo.");
  }
  const data = (await response.json()) as Asset;
  return {
    ...data,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
    warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : undefined,
    assignmentHistory: data.assignmentHistory?.map((item) => ({ ...item, at: new Date(item.at) })),
  };
}

export async function fetchContracts(token: string) {
  const response = await fetch(`${API_URL}/api/contracts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar contratos.");
  }
  const data = (await response.json()) as Contract[];
  return data.map((contract) => ({
    ...contract,
    startDate: new Date(contract.startDate),
    endDate: contract.endDate ? new Date(contract.endDate) : null,
  }));
}

export async function fetchServices(token: string) {
  const response = await fetch(`${API_URL}/api/services`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar catálogo.");
  }
  return (await response.json()) as ServiceCatalog[];
}

export async function fetchKnowledgeArticles(token: string) {
  const response = await fetch(`${API_URL}/api/kb`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar base de conhecimento.");
  }
  return (await response.json()) as KnowledgeArticle[];
}

export async function createContract(token: string, payload: Partial<Contract>) {
  const response = await fetch(`${API_URL}/api/contracts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao criar contrato.");
  }
  const data = (await response.json()) as Contract;
  return {
    ...data,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
  };
}

export async function updateContract(token: string, id: string, payload: Partial<Contract>) {
  const response = await fetch(`${API_URL}/api/contracts/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao atualizar contrato.");
  }
  const data = (await response.json()) as Contract;
  return {
    ...data,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
  };
}

export async function fetchTicketEmails(token: string, id: string) {
  const response = await fetch(`${API_URL}/api/tickets/${id}/emails`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao carregar emails.");
  }
  const data = (await response.json()) as { items: TicketEmailItem[]; lastInboundFrom?: string | null };
  return {
    items: data.items.map((item) => ({ ...item, at: new Date(item.at) })),
    lastInboundFrom: data.lastInboundFrom ?? null,
  };
}

export async function sendTicketEmail(
  token: string,
  id: string,
  payload: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    statusAfter?: Ticket["status"];
    files?: File[];
  }
) {
  const formData = new FormData();
  formData.append("to", payload.to);
  formData.append("subject", payload.subject);
  formData.append("body", payload.body);
  if (payload.cc) formData.append("cc", payload.cc);
  if (payload.bcc) formData.append("bcc", payload.bcc);
  if (payload.statusAfter) formData.append("statusAfter", payload.statusAfter);
  (payload.files ?? []).forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_URL}/api/tickets/${id}/email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao enviar email.");
  }
  return (await response.json()) as { ok: true };
}

export async function updateTicket(token: string, id: string, payload: Partial<Ticket>) {
  const response = await fetch(`${API_URL}/api/tickets/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Falha ao atualizar chamado.");
  }
  const data = (await response.json()) as Ticket;
  return {
    ...data,
    openedAt: new Date(data.openedAt),
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
    slaDueAt: data.slaDueAt ? new Date(data.slaDueAt) : null,
    approvalRequestedAt: data.approvalRequestedAt ? new Date(data.approvalRequestedAt) : undefined,
    approvalDecidedAt: data.approvalDecidedAt ? new Date(data.approvalDecidedAt) : undefined,
    comments: data.comments?.map((comment) => ({
      ...comment,
      at: new Date(comment.at),
    })),
  };
}

export async function addTicketComment(
  token: string,
  id: string,
  payload: { author: string; message: string }
) {
  const response = await fetch(`${API_URL}/api/tickets/${id}/comment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Falha ao comentar chamado.");
  }
  const data = (await response.json()) as Ticket;
  return {
    ...data,
    openedAt: new Date(data.openedAt),
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
    slaDueAt: data.slaDueAt ? new Date(data.slaDueAt) : null,
    approvalRequestedAt: data.approvalRequestedAt ? new Date(data.approvalRequestedAt) : undefined,
    approvalDecidedAt: data.approvalDecidedAt ? new Date(data.approvalDecidedAt) : undefined,
    comments: data.comments?.map((comment) => ({
      ...comment,
      at: new Date(comment.at),
    })),
  };
}

export async function linkTicketDemand(token: string, id: string, demandId: string) {
  const response = await fetch(`${API_URL}/api/tickets/${id}/link-demand`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ demandId }),
  });
  if (!response.ok) {
    throw new Error("Falha ao vincular demanda.");
  }
  const data = (await response.json()) as Ticket;
  return {
    ...data,
    openedAt: new Date(data.openedAt),
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
    slaDueAt: data.slaDueAt ? new Date(data.slaDueAt) : null,
    approvalRequestedAt: data.approvalRequestedAt ? new Date(data.approvalRequestedAt) : undefined,
    approvalDecidedAt: data.approvalDecidedAt ? new Date(data.approvalDecidedAt) : undefined,
    comments: data.comments?.map((comment) => ({
      ...comment,
      at: new Date(comment.at),
    })),
  };
}

export async function createTicket(token: string, payload: Partial<Ticket>) {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Falha ao criar chamado.");
  }
  const data = (await response.json()) as Ticket;
  return {
    ...data,
    openedAt: new Date(data.openedAt),
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
    slaDueAt: data.slaDueAt ? new Date(data.slaDueAt) : null,
    approvalRequestedAt: data.approvalRequestedAt ? new Date(data.approvalRequestedAt) : undefined,
    approvalDecidedAt: data.approvalDecidedAt ? new Date(data.approvalDecidedAt) : undefined,
    comments: data.comments?.map((comment) => ({
      ...comment,
      at: new Date(comment.at),
    })),
  };
}

export async function deleteTicket(token: string, id: string) {
  const response = await fetch(`${API_URL}/api/tickets/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao excluir chamado.");
  }
  return (await response.json()) as { ok: true };
}

export async function approveTicket(token: string, id: string, notes?: string) {
  const response = await fetch(`${API_URL}/api/tickets/${id}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao aprovar chamado.");
  }
  const data = (await response.json()) as Ticket;
  return {
    ...data,
    openedAt: new Date(data.openedAt),
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
    slaDueAt: data.slaDueAt ? new Date(data.slaDueAt) : null,
    approvalRequestedAt: data.approvalRequestedAt ? new Date(data.approvalRequestedAt) : undefined,
    approvalDecidedAt: data.approvalDecidedAt ? new Date(data.approvalDecidedAt) : undefined,
    comments: data.comments?.map((comment) => ({
      ...comment,
      at: new Date(comment.at),
    })),
  };
}

export async function rejectTicket(token: string, id: string, reason: string) {
  const response = await fetch(`${API_URL}/api/tickets/${id}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao rejeitar chamado.");
  }
  const data = (await response.json()) as Ticket;
  return {
    ...data,
    openedAt: new Date(data.openedAt),
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
    slaDueAt: data.slaDueAt ? new Date(data.slaDueAt) : null,
    approvalRequestedAt: data.approvalRequestedAt ? new Date(data.approvalRequestedAt) : undefined,
    approvalDecidedAt: data.approvalDecidedAt ? new Date(data.approvalDecidedAt) : undefined,
    comments: data.comments?.map((comment) => ({
      ...comment,
      at: new Date(comment.at),
    })),
  };
}

export async function fetchEmailIntegrationConfig(token: string) {
  const response = await fetch(`${API_URL}/api/email-integration`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar configuracao de email.");
  }
  return (await response.json()) as EmailIntegrationConfig;
}

export async function updateEmailIntegrationConfig(
  token: string,
  payload: Partial<EmailIntegrationConfig> & { appPassword?: string }
) {
  const response = await fetch(`${API_URL}/api/email-integration`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Falha ao salvar configuracao de email.");
  }
  return (await response.json()) as EmailIntegrationConfig;
}

export async function testEmailIntegration(token: string) {
  const response = await fetch(`${API_URL}/api/email-integration/test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao testar conexão.");
  }
  return (await response.json()) as { ok: boolean };
}

export async function fetchAutomations(token: string) {
  const response = await fetch(`${API_URL}/api/automations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar automações.");
  }
  return (await response.json()) as any[];
}

export async function createAutomation(token: string, payload: any) {
  const response = await fetch(`${API_URL}/api/automations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao criar automação.");
  }
  return (await response.json()) as any;
}

export async function updateAutomation(token: string, id: string, payload: any) {
  const response = await fetch(`${API_URL}/api/automations/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao atualizar automação.");
  }
  return (await response.json()) as any;
}

export async function deleteAutomation(token: string, id: string) {
  const response = await fetch(`${API_URL}/api/automations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao excluir automação.");
  }
  return (await response.json()) as { ok: true };
}

export async function fetchVaultItems(token: string, params?: { search?: string; tag?: string; externalOwnerId?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.tag) query.set("tag", params.tag);
  if (params?.externalOwnerId) query.set("externalOwnerId", params.externalOwnerId);
  const response = await fetch(`${API_URL}/api/vault?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Falha ao carregar cofre.");
  const data = (await response.json()) as VaultItem[];
  return data.map((item) => ({
    ...item,
    lastRotatedAt: item.lastRotatedAt ? new Date(item.lastRotatedAt) : undefined,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  }));
}

export async function fetchVaultItem(token: string, id: string) {
  const response = await fetch(`${API_URL}/api/vault/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Falha ao carregar item.");
  const data = (await response.json()) as VaultItemDetail;
  return {
    ...data,
    lastRotatedAt: data.lastRotatedAt ? new Date(data.lastRotatedAt) : undefined,
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
  };
}

export async function createVaultItem(token: string, payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/vault`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao criar item.");
  }
  return (await response.json()) as VaultItem;
}

export async function updateVaultItem(token: string, id: string, payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/vault/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao atualizar item.");
  }
  return (await response.json()) as VaultItem;
}

export async function deleteVaultItem(token: string, id: string) {
  const response = await fetch(`${API_URL}/api/vault/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao remover item.");
  }
  return (await response.json()) as { ok: boolean };
}

export async function revealVaultSecret(token: string, id: string, action: "VIEW_SECRET" | "COPY_SECRET") {
  const response = await fetch(`${API_URL}/api/vault/${id}/secret`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw new Error("Falha ao revelar segredo.");
  return (await response.json()) as { password: string };
}

export async function reauthVault(token: string, password: string) {
  const response = await fetch(`${API_URL}/api/vault/reauth`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Senha inválida.");
  }
  return (await response.json()) as { ok: boolean; at: string };
}

export async function changePassword(token: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao atualizar senha.");
  }
  return (await response.json()) as { ok: boolean };
}

export async function fetchUsers(token: string) {
  const response = await fetch(`${API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Falha ao carregar usuários.");
  return (await response.json()) as User[];
}

export async function fetchProfiles(token: string) {
  const response = await fetch(`${API_URL}/api/profiles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Falha ao carregar perfis.");
  const data = (await response.json()) as Array<Profile & { _id?: string }>;
  return data.map((profile) => ({
    ...profile,
    id: profile.id ?? profile._id ?? "",
  }));
}

export async function createProfile(token: string, payload: Partial<Profile>) {
  const response = await fetch(`${API_URL}/api/profiles`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Falha ao criar perfil.");
  return (await response.json()) as Profile;
}

export async function updateProfile(token: string, id: string, payload: Partial<Profile>) {
  const response = await fetch(`${API_URL}/api/profiles/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Falha ao atualizar perfil.");
  return (await response.json()) as Profile;
}

export async function deleteProfile(token: string, id: string) {
  const response = await fetch(`${API_URL}/api/profiles/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Erro desconhecido ao excluir perfil.");
  }
  return (await response.json()) as { ok: boolean; message?: string };
}

export async function createUser(token: string, payload: { name: string; email: string; profileId: string }) {
  const response = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao criar usuário.");
  }
  return (await response.json()) as { user: User; tempPassword: string };
}

export async function updateUser(token: string, id: string, payload: { name: string; profileId: string; isActive: boolean }) {
  const response = await fetch(`${API_URL}/api/users/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Falha ao atualizar usuário.");
  return (await response.json()) as User;
}

export async function resetUserPassword(token: string, id: string) {
  const response = await fetch(`${API_URL}/api/users/${id}/reset-password`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Falha ao resetar senha.");
  return (await response.json()) as { user: User; tempPassword: string };
}

export async function fetchSystemParams(token: string) {
  const response = await fetch(`${API_URL}/api/system-params`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Falha ao carregar parâmetros.");
  return (await response.json()) as SystemParams;
}

export async function updateSystemParams(
  token: string,
  payload: Partial<SystemParams> & {
    gmailAppPassword?: string;
    sendGridApiKey?: string;
    office365Pass?: string;
    sesSmtpPass?: string;
    mailgunApiKey?: string;
    smtpPass?: string;
  }
) {
  const response = await fetch(`${API_URL}/api/system-params`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Falha ao salvar parâmetros.");
  return (await response.json()) as SystemParams;
}

export async function requestEmailChange(token: string, newEmail: string) {
  const response = await fetch(`${API_URL}/api/users/me/request-email-change`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ newEmail }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao solicitar troca de e-mail.");
  }
  return (await response.json()) as { ok: boolean };
}

export async function verifyEmailChange(token: string, code: string) {
  const response = await fetch(`${API_URL}/api/users/me/verify-email-change`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao validar código.");
  }
  return (await response.json()) as { ok: boolean; email: string };
}

export async function updateMyProfile(
  token: string,
  payload: {
    name?: string;
    locale?: string;
    theme?: "light" | "dark";
    notificationPrefs?: { email?: boolean; slack?: boolean };
  }
) {
  const response = await fetch(`${API_URL}/api/users/me`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? "Falha ao atualizar perfil.");
  }
  return (await response.json()) as User;
}
