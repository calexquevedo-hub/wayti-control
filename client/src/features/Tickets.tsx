import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bolt, Clock, Flag, Mail, Paperclip, User, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SavedViewsBar } from "@/features/demands/components/SavedViewsBar";
import { applyView } from "@/features/demands/views/views.engine";
import { loadViewsState, setActiveView, upsertView } from "@/features/demands/views/views.storage";
import type { SavedView } from "@/features/demands/views/views.types";
import type { Asset, Demand, ExternalParty, Ticket, TicketEmailItem, User as AppUser } from "@/types";
import { fetchTicketEmails, sendTicketEmail } from "@/lib/api";
import { fetchSystemParams } from "@/lib/api";

interface TicketsProps {
  token?: string;
  currentUser?: AppUser;
  tickets: Ticket[];
  activeViewId: string | null;
  onChangeView: (viewId: string | null) => void;
  demands: Demand[];
  externalParties: ExternalParty[];
  assets: Asset[];
  onUpdateTicket: (id: string, payload: Partial<Ticket>) => Promise<void>;
  onCreateTicket: (payload: Partial<Ticket>) => Promise<void>;
  onAddComment: (id: string, message: string) => Promise<void>;
  onLinkDemand: (id: string, demandId: string) => Promise<void>;
  onDeleteTicket: (id: string) => Promise<void>;
  onApproveTicket: (id: string, notes?: string) => Promise<void>;
  onRejectTicket: (id: string, reason: string) => Promise<void>;
}

const quickFilters = [
  { id: "open", label: "Abertos" },
  { id: "triage", label: "Triagem" },
  { id: "approvals", label: "Aprovações" },
  { id: "overdue", label: "Atrasados" },
  { id: "risk", label: "Risco 48h" },
  { id: "waitingVendor", label: "Aguardando fornecedor" },
  { id: "unlinked", label: "Sem vínculo" },
];

const statusTone: Record<Ticket["status"], "default" | "secondary" | "warning" | "success" | "outline"> = {
  Novo: "secondary",
  Triagem: "warning",
  "Em atendimento": "default",
  "Aguardando fornecedor": "warning",
  "Aguardando solicitante": "secondary",
  "Aguardando aprovação": "warning",
  Resolvido: "success",
  Fechado: "outline",
  Cancelado: "outline",
};

const channelTone: Record<NonNullable<Ticket["channel"]>, "default" | "secondary" | "outline"> = {
  Email: "default",
  Portal: "secondary",
  Telefone: "outline",
  WhatsApp: "secondary",
  Chat: "default",
  Manual: "outline",
};

function initials(value?: string) {
  if (!value) return "NA";
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function applyTemplateVars(template: string, ticket: Ticket) {
  const map: Record<string, string> = {
    "{ticket}": ticket.code,
    "{assunto}": ticket.subject,
    "{status}": ticket.status,
    "{prioridade}": ticket.priority,
    "{fila}": ticket.queue,
    "{responsavel}": ticket.assignee ?? "Não atribuído",
    "{sistema}": ticket.system,
    "{categoria}": ticket.category,
  };
  return Object.keys(map).reduce(
    (acc, key) => acc.split(key).join(map[key]),
    template
  );
}

function isSameDay(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function timeAgo(value: Date) {
  const diff = Date.now() - value.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

const ticketColumnDefs: Array<{
  id: string;
  label: string;
  width: string;
  required?: boolean;
  render: (ticket: Ticket) => React.ReactNode;
}> = [
  {
    id: "slaDueAt",
    label: "SLA",
    width: "120px",
    render: (ticket) =>
      ticket.slaDueAt ? (
        <Badge variant={ticket.isSlaOverdue ? "warning" : "outline"}>
          {ticket.slaDueAt.toLocaleDateString("pt-BR")}
        </Badge>
      ) : (
        <Badge variant="outline">Sem SLA</Badge>
      ),
  },
  {
    id: "subject",
    label: "Chamado",
    width: "1.6fr",
    required: true,
    render: (ticket) => (
      <div>
        <p className="text-sm font-semibold text-foreground">
          {ticket.code} • {ticket.subject}
        </p>
        <p className="text-xs text-muted-foreground">
          Sistema: {ticket.system || "-"} • Categoria: {ticket.category || "-"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={channelTone[ticket.channel ?? "Manual"]}>
            {ticket.channel ?? "Manual"}
          </Badge>
          <span>Demanda: {ticket.demandId ?? "Não vinculado"}</span>
        </div>
      </div>
    ),
  },
  {
    id: "channel",
    label: "Canal",
    width: "0.7fr",
    render: (ticket) => (
      <Badge variant={channelTone[ticket.channel ?? "Manual"]}>
        {ticket.channel ?? "Manual"}
      </Badge>
    ),
  },
  {
    id: "queue",
    label: "Fila",
    width: "0.8fr",
    render: (ticket) => (
      <div className="text-xs">
        <span className="font-medium text-foreground">{ticket.queue}</span>
      </div>
    ),
  },
  {
    id: "status",
    label: "Situação",
    width: "0.8fr",
    render: (ticket) => <Badge variant={statusTone[ticket.status]}>{ticket.status}</Badge>,
  },
  {
    id: "priority",
    label: "Prioridade",
    width: "0.7fr",
    render: (ticket) => (
      <Badge variant={ticket.priority === "P0" ? "warning" : "outline"}>
        {ticket.priority}
      </Badge>
    ),
  },
  {
    id: "openedAt",
    label: "Abertura",
    width: "0.8fr",
    render: (ticket) => (
      <span className="text-xs text-muted-foreground">
        {ticket.openedAt.toLocaleDateString("pt-BR")}
      </span>
    ),
  },
  {
    id: "system",
    label: "Sistema",
    width: "0.8fr",
    render: (ticket) => <span className="text-xs">{ticket.system || "-"}</span>,
  },
  {
    id: "assignee",
    label: "Responsável",
    width: "0.8fr",
    render: (ticket) => (
      <div className="flex items-center gap-2 text-xs">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
          {initials(ticket.assignee)}
        </span>
        <span>{ticket.assignee ?? "Sem responsável"}</span>
      </div>
    ),
  },
  {
    id: "demandId",
    label: "Vínculo",
    width: "0.9fr",
    render: (ticket) => (
      <span className="text-xs">{ticket.demandId ?? "Não vinculado"}</span>
    ),
  },
];

const defaultColumnOrder = ticketColumnDefs.map((col) => col.id);

export function Tickets({
  token,
  currentUser,
  tickets,
  activeViewId,
  onChangeView,
  demands,
  externalParties,
  assets,
  onUpdateTicket,
  onCreateTicket,
  onAddComment,
  onLinkDemand,
  onDeleteTicket,
  onApproveTicket,
  onRejectTicket,
}: TicketsProps) {
  const [systemFilter, setSystemFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("open");
  const [queueFilter, setQueueFilter] = useState<Ticket["queue"] | "all">("all");
  const [workMode, setWorkMode] = useState<"mine" | "today" | "all">("all");
  const [search, setSearch] = useState("");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [replyCc, setReplyCc] = useState("");
  const [replyBcc, setReplyBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [emailItemsByTicket, setEmailItemsByTicket] = useState<Record<string, TicketEmailItem[]>>({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [inlinePreview, setInlinePreview] = useState<{
    emailId: string;
    index: number;
    url: string;
    contentType?: string;
    filename?: string;
  } | null>(null);
  const [imageGallery, setImageGallery] = useState<Array<{
    emailId: string;
    index: number;
    url: string;
    filename?: string;
  }>>([]);
  const [zoomImage, setZoomImage] = useState<{ url: string; filename?: string } | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [slaWarningMinutes, setSlaWarningMinutes] = useState(120);
  const [slaPolicies, setSlaPolicies] = useState({
    urgentHours: 8,
    highHours: 48,
    mediumHours: 120,
    lowHours: 240,
  });
  const [cannedResponses, setCannedResponses] = useState<
    Array<{ id: string; title: string; body: string; scope: "personal" | "shared" }>
  >([]);
  const [replyTemplateId, setReplyTemplateId] = useState<string>("");
  const [replyMode, setReplyMode] = useState<"reply" | "note">("reply");
  const [noteText, setNoteText] = useState("");
  const [cannedOpen, setCannedOpen] = useState(false);

  const replyTemplates = useMemo(() => cannedResponses, [cannedResponses]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDemandId, setLinkDemandId] = useState<string>("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<Ticket["status"]>("Triagem");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<Ticket["status"]>("Triagem");
  const [bulkVendorOpen, setBulkVendorOpen] = useState(false);
  const [bulkVendorId, setBulkVendorId] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState<Ticket["status"]>("Triagem");
  const [editPriority, setEditPriority] = useState<Ticket["priority"]>("P2");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnScope, setColumnScope] = useState<"all" | Ticket["queue"]>("all");
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const [splitWidth, setSplitWidth] = useState(62);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [createPayload, setCreatePayload] = useState({
    subject: "",
    description: "",
    system: "",
    category: "",
    impact: "Médio" as Ticket["impact"],
    urgency: "Média" as Ticket["urgency"],
    queue: "TI Interna" as Ticket["queue"],
    externalOwnerId: "",
    channel: "Manual" as Ticket["channel"],
    assignee: "",
    relatedAssetId: "",
  });
  const [createAssigneeId, setCreateAssigneeId] = useState("");

  const activeView: SavedView | null = useMemo(() => {
    const st = loadViewsState();
    return st.views.find((v) => v.id === activeViewId) ?? null;
  }, [activeViewId]);

  useEffect(() => {
    if (queueFilter === "all") {
      setColumnScope("all");
    } else {
      setColumnScope(queueFilter);
    }
  }, [queueFilter]);

  useEffect(() => {
    async function loadSystemParams() {
      if (!token) return;
      try {
        const params = await fetchSystemParams(token);
        if (typeof params.slaWarningMinutes === "number") {
          setSlaWarningMinutes(params.slaWarningMinutes);
        }
        if (params.slaPolicies) {
          setSlaPolicies({
            urgentHours: params.slaPolicies.urgentHours ?? 8,
            highHours: params.slaPolicies.highHours ?? 48,
            mediumHours: params.slaPolicies.mediumHours ?? 120,
            lowHours: params.slaPolicies.lowHours ?? 240,
          });
        }
        if (Array.isArray(params.cannedResponses)) {
          setCannedResponses(params.cannedResponses);
        }
      } catch {
        // ignore
      }
    }
    loadSystemParams();
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const exists = replyTemplates.some((tpl) => tpl.id === replyTemplateId);
    if (!exists && replyTemplates.length > 0) {
      setReplyTemplateId(replyTemplates[0].id);
      if (selectedTicket) {
        setReplyText(applyTemplateVars(replyTemplates[0].body, selectedTicket));
      } else {
        setReplyText(replyTemplates[0].body);
      }
    }
  }, [replyTemplates, replyTemplateId, selectedTicket]);

  useEffect(() => {
    if (!replyTemplates.length) return;
    if (!replyTemplateId) {
      setReplyTemplateId(replyTemplates[0].id);
    }
  }, [replyTemplates, replyTemplateId]);

  useEffect(() => {
    if (!selectedTicket) return;
    const updated = tickets.find((ticket) => ticket.id === selectedTicket.id);
    if (updated) {
      setSelectedTicket(updated);
    }
  }, [tickets, selectedTicket]);

  useEffect(() => {
    if (!selectedTicket) return;
    setEditStatus(selectedTicket.status);
    setEditPriority(selectedTicket.priority);
  }, [selectedTicket]);

  useEffect(() => {
    async function loadEmails() {
      if (!token || !selectedTicket) return;
      setEmailLoading(true);
      try {
        const data = await fetchTicketEmails(token, selectedTicket.id);
        setEmailItemsByTicket((prev) => ({ ...prev, [selectedTicket.id]: data.items }));
        if (data.lastInboundFrom) {
          setReplyTo(data.lastInboundFrom);
        }
        setReplySubject(`Re: ${selectedTicket.subject}`);
      } catch {
        // ignore
      } finally {
        setEmailLoading(false);
      }
    }
    loadEmails();
  }, [token, selectedTicket?.id]);

  useEffect(() => {
    return () => {
      if (inlinePreview?.url) {
        URL.revokeObjectURL(inlinePreview.url);
      }
      imageGallery.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [inlinePreview, imageGallery]);

  useEffect(() => {
    const fallback = ["slaDueAt", "subject", "queue", "status", "priority", "openedAt"];
    const base = activeView?.columns?.length ? activeView.columns : fallback;
    const required = ticketColumnDefs.filter((col) => col.required).map((col) => col.id);
    const ordered = [
      ...base,
      ...required.filter((id) => !base.includes(id)),
      ...defaultColumnOrder.filter((id) => !base.includes(id) && !required.includes(id)),
    ];
    setVisibleColumnIds(Array.from(new Set([...base, ...required])));
    setColumnOrder(Array.from(new Set(ordered)));
  }, [activeViewId, activeView?.columns]);

  const visibleColumns = useMemo(() => {
    const visibleSet = new Set(visibleColumnIds);
    return columnOrder
      .filter((id) => visibleSet.has(id))
      .map((id) => ticketColumnDefs.find((col) => col.id === id))
      .filter(Boolean) as typeof ticketColumnDefs;
  }, [columnOrder, visibleColumnIds]);

  const columnStorageKey = useMemo(() => {
    return columnScope === "all" ? "tiDemand.ticketColumns.global" : `tiDemand.ticketColumns.${columnScope}`;
  }, [columnScope]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(columnStorageKey);
      if (!raw) return;
      const data = JSON.parse(raw) as { order?: string[]; visible?: string[] };
      const order = Array.isArray(data.order) ? data.order : [];
      if (order.length) {
        setColumnOrder((prev) => {
          const merged = [
            ...order,
            ...prev.filter((id) => !order.includes(id)),
          ];
          return Array.from(new Set(merged));
        });
      }
      if (Array.isArray(data.visible) && data.visible.length) {
        const required = ticketColumnDefs.filter((col) => col.required).map((col) => col.id);
        setVisibleColumnIds(Array.from(new Set([...data.visible, ...required])));
      }
    } catch {
      // ignore
    }
  }, [columnStorageKey]);

  const gridTemplate = useMemo(() => {
    const widths = ["28px", ...visibleColumns.map((col) => col.width)];
    return widths.join(" ");
  }, [visibleColumns]);

  const demandById = useMemo(() => {
    const map = new Map<string, Demand>();
    demands.forEach((demand) => map.set(demand.id, demand));
    return map;
  }, [demands]);

  const assetsByUser = useMemo(() => {
    const map = new Map<string, Asset[]>();
    assets.forEach((asset) => {
      if (asset.assignedTo?.id) {
        const list = map.get(asset.assignedTo.id) ?? [];
        list.push(asset);
        map.set(asset.assignedTo.id, list);
      }
    });
    return map;
  }, [assets]);

  useEffect(() => {
    if (!createAssigneeId) return;
    const candidates = assetsByUser.get(createAssigneeId) ?? [];
    if (candidates.length === 1) {
      setCreatePayload((prev) => ({ ...prev, relatedAssetId: candidates[0].id }));
    }
  }, [createAssigneeId, assetsByUser]);

  const assetOptions = useMemo(() => {
    return assets.map((asset) => ({
      id: asset.id,
      label: `${asset.tag} • ${asset.name}`,
      assignedToId: asset.assignedTo?.id,
      assignedToName: asset.assignedTo?.name,
    }));
  }, [assets]);

  const assignedUsers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    assets.forEach((asset) => {
      if (asset.assignedTo?.id) {
        seen.set(asset.assignedTo.id, { id: asset.assignedTo.id, name: asset.assignedTo.name });
      }
    });
    return Array.from(seen.values());
  }, [assets]);

  const permissions =
    currentUser && typeof currentUser.profile === "object" && currentUser.profile
      ? currentUser.profile.permissions
      : undefined;
  const isRequester =
    !!permissions?.tickets?.view &&
    !!permissions?.tickets?.create &&
    !permissions?.tickets?.edit &&
    !permissions?.tickets?.delete;

  const canApprove = (ticket: Ticket) => {
    if (ticket.status !== "Aguardando aprovação") return false;
    if (!currentUser) return false;
    if (isRequester) return false;
    if (ticket.approvalApproverId) return ticket.approvalApproverId === currentUser.id;
    if (ticket.approvalApproverRole) {
      const isAdmin = !!permissions?.settings?.manage;
      const isAgent = !isAdmin && !!permissions?.tickets?.edit;
      const role = isAdmin ? "Admin" : isAgent ? "Agent" : undefined;
      return ticket.approvalApproverRole === role;
    }
    return !!permissions?.settings?.manage || !!permissions?.tickets?.edit;
  };

  const systems = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.system))),
    [tickets]
  );
  const statuses = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.status))),
    [tickets]
  );

  const slaWarnMinutes = slaWarningMinutes;

  const enriched = useMemo(() => {
    const now = nowTick;
    return tickets.map((ticket) => {
      const slaDueAt =
        ticket.slaDueAt ??
        (ticket.priority
          ? new Date(
              ticket.openedAt.getTime() +
                (ticket.priority === "P0"
                  ? slaPolicies.urgentHours
                  : ticket.priority === "P1"
                  ? slaPolicies.highHours
                  : ticket.priority === "P2"
                  ? slaPolicies.mediumHours
                  : slaPolicies.lowHours) *
                  60 *
                  60 *
                  1000
            )
          : null);
      const isSlaOverdue = slaDueAt ? slaDueAt.getTime() < now : false;
      const isSlaRisk =
        slaDueAt != null
          ? slaDueAt.getTime() >= now && slaDueAt.getTime() <= now + 48 * 60 * 60 * 1000
          : false;
      const isSlaWarning =
        slaDueAt != null
          ? slaDueAt.getTime() >= now && slaDueAt.getTime() <= now + slaWarnMinutes * 60 * 1000
          : false;
      const comments = (ticket.comments ?? []).map((comment) => ({
        ...comment,
        at: comment.at instanceof Date ? comment.at : new Date(comment.at),
      }));
      return { ...ticket, slaDueAt, isSlaOverdue, isSlaRisk, isSlaWarning, comments };
    });
  }, [tickets, nowTick]);

  const filtered = useMemo(() => {
    const base = activeView ? applyView(enriched, activeView) : enriched;
    const withQuick = base.filter((ticket: any) => {
      if (quickFilter === "triage") return ticket.status === "Triagem";
      if (quickFilter === "approvals") return ticket.status === "Aguardando aprovação" && canApprove(ticket);
      if (quickFilter === "overdue") return ticket.isSlaOverdue;
      if (quickFilter === "risk") return ticket.isSlaRisk;
      if (quickFilter === "waitingVendor") return ticket.status === "Aguardando fornecedor";
      if (quickFilter === "unlinked") return !ticket.demandId;
      return ticket.status !== "Fechado" && ticket.status !== "Cancelado";
    });
    return withQuick.filter((ticket: any) => {
      const matchSystem = systemFilter === "all" || ticket.system === systemFilter;
      const matchStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchQueue = queueFilter === "all" || ticket.queue === queueFilter;
      const matchSearch =
        !search.trim() ||
        `${ticket.code} ${ticket.subject} ${ticket.system} ${ticket.category}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchSystem && matchStatus && matchQueue && matchSearch;
    });
    const withWorkMode = withQuick.filter((ticket: any) => {
      if (workMode === "mine") {
        const name = currentUser?.name || currentUser?.email;
        if (!name) return false;
        return ticket.assignee === name;
      }
      if (workMode === "today") {
        return isSameDay(ticket.slaDueAt, new Date());
      }
      return true;
    });
    return withWorkMode;
  }, [
    activeView,
    enriched,
    systemFilter,
    statusFilter,
    quickFilter,
    queueFilter,
    search,
    workMode,
    currentUser?.name,
    currentUser?.email,
  ]);

  const sorted = useMemo(() => {
    const priorityRank = (priority: Ticket["priority"]) =>
      priority === "P0" ? 0 : priority === "P1" ? 1 : priority === "P2" ? 2 : 3;
    return [...filtered].sort((a, b) => {
      if (a.isSlaOverdue !== b.isSlaOverdue) return a.isSlaOverdue ? -1 : 1;
      if (a.slaDueAt && b.slaDueAt && a.slaDueAt.getTime() !== b.slaDueAt.getTime()) {
        return a.slaDueAt.getTime() - b.slaDueAt.getTime();
      }
      if (a.priority !== b.priority) return priorityRank(a.priority) - priorityRank(b.priority);
      return a.openedAt.getTime() - b.openedAt.getTime();
    });
  }, [filtered]);

  const slaSummary = useMemo(() => {
    const open = enriched.filter(
      (ticket) => ticket.status !== "Fechado" && ticket.status !== "Cancelado"
    );
    const overdue = open.filter((ticket) => ticket.isSlaOverdue).length;
    const risk = open.filter((ticket) => ticket.isSlaRisk).length;
    const warning = open.filter((ticket) => ticket.isSlaWarning).length;
    return { total: open.length, overdue, risk, warning };
  }, [enriched]);

  const splitColumns = useMemo(() => {
    return `${splitWidth}% 1fr`;
  }, [splitWidth]);

  function handleSplitDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = splitWidth;
    function onMove(e: MouseEvent) {
      if (!splitRef.current) return;
      const bounds = splitRef.current.getBoundingClientRect();
      const delta = e.clientX - startX;
      const next = ((startWidth / 100) * bounds.width + delta) / bounds.width;
      const clamped = Math.min(80, Math.max(40, next * 100));
      setSplitWidth(clamped);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function formatSlaCountdown(ticket: Ticket) {
    if (!ticket.slaDueAt) return "Sem SLA";
    const now = nowTick;
    const diff = ticket.slaDueAt.getTime() - now;
    const minutes = Math.floor(Math.abs(diff) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const remMinutes = minutes % 60;
    const label = `${days}d ${remHours}h ${remMinutes}m`;
    return diff < 0 ? `Atrasado ${label}` : `Faltam ${label}`;
  }

  function applyColumns(nextVisible: string[]) {
    const state = loadViewsState();
    const current = state.views.find((v) => v.id === activeViewId && v.scope === "tickets");
    const sanitized = Array.from(
      new Set(
        nextVisible.filter((colId) => ticketColumnDefs.some((col) => col.id === colId))
      )
    );
    const required = ticketColumnDefs.filter((col) => col.required).map((col) => col.id);
    const columns = Array.from(new Set([...sanitized, ...required]));

    if (current) {
      if (current.isDefault) {
        const cloneId = `t_custom_${Date.now()}`;
        const clone: SavedView = {
          ...current,
          id: cloneId,
          name: `${current.name} (custom)`,
          isDefault: false,
          isPinned: true,
          columns,
          updatedAt: new Date().toISOString(),
        };
        upsertView(clone);
        setActiveView("tickets", cloneId);
        onChangeView(cloneId);
        return;
      }
      upsertView({ ...current, columns, updatedAt: new Date().toISOString() });
      try {
        localStorage.setItem(
          columnStorageKey,
          JSON.stringify({ order: columnOrder, visible: columns })
        );
      } catch {
        // ignore
      }
      return;
    }

    const base = state.views.find((v) => v.scope === "tickets") ?? {
      id: `t_custom_${Date.now()}`,
      scope: "tickets",
      name: "Minha view",
      description: "View customizada",
      filters: [],
      sort: [],
      columns,
      isPinned: true,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };
    const newId = base.id.startsWith("t_") ? base.id : `t_custom_${Date.now()}`;
    const created: SavedView = {
      ...base,
      id: newId,
      columns,
      isPinned: true,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };
    upsertView(created);
    setActiveView("tickets", created.id);
    onChangeView(created.id);
    try {
      localStorage.setItem(
        columnStorageKey,
        JSON.stringify({ order: columnOrder, visible: columns })
      );
    } catch {
      // ignore
    }
  }

  function toggleColumn(id: string) {
    const col = ticketColumnDefs.find((item) => item.id === id);
    if (col?.required) return;
    setVisibleColumnIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      const orderedVisible = columnOrder.filter((item) => next.includes(item));
      applyColumns(orderedVisible);
      return next;
    });
  }

  function moveColumn(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    setColumnOrder((prev) => {
      const next = prev.filter((id) => id !== dragId);
      const targetIndex = next.indexOf(targetId);
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragId);
      const orderedVisible = next.filter((id) => visibleColumnIds.includes(id));
      applyColumns(orderedVisible);
      try {
        localStorage.setItem(
          columnStorageKey,
          JSON.stringify({ order: next, visible: orderedVisible })
        );
      } catch {
        // ignore
      }
      return next;
    });
  }

  function resetColumns() {
    const fallback = ["slaDueAt", "subject", "queue", "status", "priority", "openedAt"];
    const required = ticketColumnDefs.filter((col) => col.required).map((col) => col.id);
    const visible = Array.from(new Set([...fallback, ...required]));
    const order = Array.from(new Set([...fallback, ...defaultColumnOrder]));
    setVisibleColumnIds(visible);
    setColumnOrder(order);
    applyColumns(visible);
    try {
      localStorage.setItem(columnStorageKey, JSON.stringify({ order, visible }));
    } catch {
      // ignore
    }
  }

  const selectedCount = selectedIds.size;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const allVisibleSelected = sorted.length > 0 && sorted.every((ticket) => selectedIds.has(ticket.id));

  async function applyBulkStatus() {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => onUpdateTicket(id, { status: bulkStatusValue })));
    setBulkStatusOpen(false);
    clearSelection();
  }

  async function applyBulkVendor() {
    if (!selectedIds.size || !bulkVendorId) return;
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        onUpdateTicket(id, {
          queue: "Fornecedor",
          status: "Aguardando fornecedor",
          externalOwnerId: bulkVendorId,
        })
      )
    );
    setBulkVendorOpen(false);
    setBulkVendorId("");
    clearSelection();
  }

  async function applyBulkAssign() {
    if (!selectedIds.size) return;
    const assignee = currentUser?.name || currentUser?.email;
    if (!assignee) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => onUpdateTicket(id, { assignee })));
    clearSelection();
  }

  const renderDetail = (ticket: Ticket) => (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
      <div>
        <Tabs defaultValue="timeline">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="timeline">Conversas</TabsTrigger>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
            <TabsTrigger value="evidencias">Evidências</TabsTrigger>
            <TabsTrigger value="vinculo">Vínculo</TabsTrigger>
          </TabsList>
          <TabsContent value="resumo">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>{ticket.subject}</p>
              <p className="flex items-center gap-2">
                Status: <Badge variant={statusTone[ticket.status]}>{ticket.status}</Badge>
              </p>
              <p>Fila: {ticket.queue}</p>
              <p>Prioridade: {ticket.priority}</p>
              <p>Canal: {ticket.channel ?? "Manual"}</p>
              <p>Sistema: {ticket.system}</p>
              <p>Categoria: {ticket.category}</p>
              <p>
                Impacto/Urgência: {ticket.impact} / {ticket.urgency}
              </p>
              <p className="flex items-center gap-2">
                Responsável:
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                  {initials(ticket.assignee)}
                </span>
                {ticket.assignee ?? "-"}
              </p>
            </div>
          </TabsContent>
          <TabsContent value="timeline">
            <div className="grid gap-4 text-sm text-muted-foreground">
              {emailLoading ? <p className="text-xs">Carregando emails...</p> : null}
              {(() => {
                const emails = emailItemsByTicket[ticket.id] ?? [];
                const commentItems = (ticket.comments ?? []).map((c, idx) => {
                  const isSystem = String(c.message ?? "").toLowerCase().startsWith("status alterado");
                  return {
                    id: `comment-${idx}`,
                    type: isSystem ? "system" : "note",
                    at: c.at,
                    author: c.author,
                    message: c.message,
                  };
                });
                const emailItems = emails.map((email) => ({
                  id: `email-${email.id}`,
                  type: email.type,
                  at: email.at,
                  subject: email.subject,
                  from: email.from,
                  to: email.to,
                  snippet: email.snippet,
                  status: email.status,
                  error: email.error,
                  textBody: email.textBody,
                  htmlBody: email.htmlBody,
                  attachments: email.attachments,
                }));
                const items = [...commentItems, ...emailItems].sort(
                  (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
                );
                if (!items.length) return <p>Sem atividades registradas.</p>;
                return items.map((item: any) => {
                  if (item.type === "system") {
                    return (
                      <div key={item.id} className="flex justify-center">
                        <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                          {item.message}
                        </div>
                      </div>
                    );
                  }

                  const isInbound = item.type === "inbound";
                  const bubbleBase = isInbound
                    ? "bg-white/90 text-slate-800 border border-slate-200"
                    : item.type === "note"
                    ? "bg-amber-100/80 text-amber-900 border border-amber-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200";
                  const align = isInbound ? "justify-start" : "justify-end";

                  return (
                    <div key={item.id} className={`flex ${align}`}>
                      <div className={`max-w-[82%] rounded-xl p-3 ${bubbleBase}`}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                              {initials(isInbound ? item.from : item.author ?? currentUser?.name)}
                            </span>
                            <span className="font-medium text-foreground">
                              {isInbound ? item.from ?? "Cliente" : item.author ?? currentUser?.name ?? "Agente"}
                            </span>
                          </div>
                          <span>{timeAgo(new Date(item.at))}</span>
                        </div>
                        {item.type === "note" ? (
                          <p className="text-sm">{item.message}</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium">{item.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {isInbound ? `De: ${item.from}` : `Para: ${item.to}`}
                            </p>
                            {item.snippet ? <p className="text-xs">{item.snippet}</p> : null}
                          </>
                        )}

                        {item.attachments?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {item.attachments.map((att: any) => (
                              <Button
                                key={`${item.id}-${att.index}`}
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (!token) return;
                                  const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/tickets/${ticket.id}/emails/${item.id}/attachment/${att.index}`;
                                  const response = await fetch(url, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  if (!response.ok) return;
                                  const blob = await response.blob();
                                  const contentType = response.headers.get("content-type") || att.contentType;
                                  const link = document.createElement("a");
                                  link.href = window.URL.createObjectURL(blob);
                                  link.download = att.filename || "anexo";
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                  if (contentType?.startsWith("image/") || contentType === "application/pdf") {
                                    const previewUrl = window.URL.createObjectURL(blob);
                                    setInlinePreview({
                                      emailId: item.id,
                                      index: att.index,
                                      url: previewUrl,
                                      contentType,
                                      filename: att.filename,
                                    });
                                    if (contentType.startsWith("image/")) {
                                      setImageGallery((prev) => {
                                        const exists = prev.some(
                                          (img) => img.emailId === item.id && img.index === att.index
                                        );
                                        if (exists) return prev;
                                        return [...prev, { emailId: item.id, index: att.index, url: previewUrl, filename: att.filename }];
                                      });
                                    }
                                  }
                                }}
                              >
                                {att.filename ?? "Anexo"} {att.size ? `(${Math.round(att.size / 1024)} KB)` : ""}
                              </Button>
                            ))}
                          </div>
                        ) : null}

                        {item.textBody || item.htmlBody ? (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandedEmailId((prev) => (prev === item.id ? null : item.id))
                              }
                            >
                              {expandedEmailId === item.id ? "Ocultar conteúdo" : "Ver conteúdo"}
                            </Button>
                            {expandedEmailId === item.id ? (
                              <div className="mt-2 grid gap-2">
                                {item.htmlBody ? (
                                  <div className="rounded-md border border-border/60 bg-background/40 p-2 text-xs">
                                    <div className="mb-2 text-xs text-muted-foreground">Preview HTML</div>
                                    <iframe
                                      title={`email-html-${item.id}`}
                                      className="h-60 w-full rounded-md border border-border/60 bg-white"
                                      sandbox="allow-same-origin"
                                      srcDoc={item.htmlBody}
                                    />
                                  </div>
                                ) : null}
                                {item.textBody ? (
                                  <pre className="max-h-60 whitespace-pre-wrap rounded-md border border-border/60 bg-background/40 p-2 text-xs">
                                    {item.textBody}
                                  </pre>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {item.status === "failed" ? (
                          <p className="text-xs text-destructive">{item.error ?? "Falha ao enviar"}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                });
              })()}
              {inlinePreview ? (
                <div className="rounded-md border border-border/60 bg-background/40 p-2">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Preview: {inlinePreview.filename ?? "Anexo"}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        URL.revokeObjectURL(inlinePreview.url);
                        setInlinePreview(null);
                      }}
                    >
                      Fechar
                    </Button>
                  </div>
                  {inlinePreview.contentType?.startsWith("image/") ? (
                    <img
                      src={inlinePreview.url}
                      alt={inlinePreview.filename ?? "anexo"}
                      className="max-h-64 w-auto rounded-md border border-border/60"
                    />
                  ) : inlinePreview.contentType === "application/pdf" ? (
                    <iframe
                      src={inlinePreview.url}
                      className="h-64 w-full rounded-md border border-border/60"
                      title={inlinePreview.filename ?? "pdf"}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </TabsContent>
          <TabsContent value="sla">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>Aberto em: {ticket.openedAt.toLocaleDateString("pt-BR")}</p>
              <p>
                SLA vence em:{" "}
                {ticket.slaDueAt ? ticket.slaDueAt.toLocaleDateString("pt-BR") : "-"}
              </p>
              <p>Overdue: {ticket.isSlaOverdue ? "Sim" : "Não"}</p>
            </div>
          </TabsContent>
          <TabsContent value="evidencias">
            <p className="text-sm text-muted-foreground">Sem evidências.</p>
          </TabsContent>
          <TabsContent value="vinculo">
            <p className="text-sm text-muted-foreground">
              Demanda vinculada: {ticket.demandId ?? "-"}
            </p>
          </TabsContent>
        </Tabs>

        <div className="mt-4 rounded-xl border border-border/60 bg-background/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Responder</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={replyMode === "reply" ? "default" : "outline"}
                onClick={() => setReplyMode("reply")}
              >
                Responder ao Cliente
              </Button>
              <Button
                size="sm"
                variant={replyMode === "note" ? "secondary" : "outline"}
                onClick={() => setReplyMode("note")}
              >
                Nota Interna
              </Button>
            </div>
          </div>

          {replyMode === "reply" ? (
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Para</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setShowCcBcc((prev) => !prev)}
                  >
                    Adicionar Cc / Cco
                  </Button>
                </div>
                <Input
                  value={replyTo}
                  onChange={(event) => setReplyTo(event.target.value)}
                  placeholder="destinatario@empresa.com"
                />
                {showCcBcc ? (
                  <div className="grid gap-2 lg:grid-cols-2">
                    <div className="grid gap-1">
                      <label className="text-[11px] text-muted-foreground">Cc</label>
                      <Input
                        value={replyCc}
                        onChange={(event) => setReplyCc(event.target.value)}
                        placeholder="copia@empresa.com"
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] text-muted-foreground">Cco</label>
                      <Input
                        value={replyBcc}
                        onChange={(event) => setReplyBcc(event.target.value)}
                        placeholder="oculto@empresa.com"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Assunto</label>
                <Input
                  value={replySubject}
                  onChange={(event) => setReplySubject(event.target.value)}
                  placeholder="Re: assunto do chamado"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Resposta pronta</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCannedOpen(true)}
                  >
                    <Bolt className="mr-1 h-3.5 w-3.5" />
                    Inserir
                  </Button>
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={replyTemplateId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setReplyTemplateId(id);
                    const tpl = replyTemplates.find((item) => item.id === id);
                    if (tpl) setReplyText(applyTemplateVars(tpl.body, ticket));
                  }}
                >
                  {replyTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Digite a resposta para o solicitante..."
                onKeyDown={(event) => {
                  if (event.key === "/") {
                    setCannedOpen(true);
                  }
                }}
              />
              {replyFiles.length ? (
                <div className="grid gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-xs text-muted-foreground">
                  {replyFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span className="max-w-[180px] truncate">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() =>
                          setReplyFiles((prev) => prev.filter((_, idx) => idx !== index))
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 rounded-md border border-input px-3 py-1 text-xs text-muted-foreground hover:bg-muted">
                    Anexar arquivos
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        setReplyFiles(files);
                      }}
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReplyText("")}
                  >
                    Limpar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!replyText.trim()) return;
                      if (!token) return;
                      if (!replyTo.trim() || !replySubject.trim()) return;
                      const body = selectedTicket
                        ? applyTemplateVars(replyText.trim(), selectedTicket)
                        : replyText.trim();
                      await sendTicketEmail(token, ticket.id, {
                        to: replyTo.trim(),
                        cc: replyCc.trim() || undefined,
                        bcc: replyBcc.trim() || undefined,
                        subject: replySubject.trim(),
                        body,
                        statusAfter: "Aguardando solicitante",
                        files: replyFiles,
                      });
                      setReplyText("");
                      setReplyFiles([]);
                      try {
                        const data = await fetchTicketEmails(token, ticket.id);
                        setEmailItemsByTicket((prev) => ({ ...prev, [ticket.id]: data.items }));
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    Enviar e Manter Pendente
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!replyText.trim()) return;
                      if (!token) return;
                      if (!replyTo.trim() || !replySubject.trim()) return;
                      const body = selectedTicket
                        ? applyTemplateVars(replyText.trim(), selectedTicket)
                        : replyText.trim();
                      await sendTicketEmail(token, ticket.id, {
                        to: replyTo.trim(),
                        cc: replyCc.trim() || undefined,
                        bcc: replyBcc.trim() || undefined,
                        subject: replySubject.trim(),
                        body,
                        statusAfter: "Resolvido",
                        files: replyFiles,
                      });
                      setReplyText("");
                      setReplyFiles([]);
                      try {
                        const data = await fetchTicketEmails(token, ticket.id);
                        setEmailItemsByTicket((prev) => ({ ...prev, [ticket.id]: data.items }));
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    Enviar e Resolver
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 text-sm text-muted-foreground">
              <Textarea
                className="border-amber-300 bg-amber-50/70 text-amber-900"
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Escreva uma nota interna para a equipe..."
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setNoteText("")}>
                  Limpar
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-500 text-amber-950 hover:bg-amber-400"
                  onClick={async () => {
                    if (!noteText.trim()) return;
                    await onAddComment(ticket.id, noteText.trim());
                    setNoteText("");
                  }}
                >
                  Salvar nota interna
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Informações do Chamado
          </p>
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                value={ticket.status}
                onChange={async (event) =>
                  onUpdateTicket(ticket.id, { status: event.target.value as Ticket["status"] })
                }
              >
                {[
                  "Novo",
                  "Triagem",
                  "Em atendimento",
                  "Aguardando fornecedor",
                  "Aguardando solicitante",
                  "Resolvido",
                  "Fechado",
                  "Cancelado",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Prioridade</label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                value={ticket.priority}
                onChange={async (event) =>
                  onUpdateTicket(ticket.id, { priority: event.target.value as Ticket["priority"] })
                }
              >
                {["P0", "P1", "P2", "P3"].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ativo relacionado</label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                value={ticket.relatedAssetId ?? ""}
                onChange={async (event) =>
                  onUpdateTicket(ticket.id, {
                    relatedAssetId: event.target.value || undefined,
                  })
                }
              >
                <option value="">Sem ativo</option>
                {assetOptions.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1 text-xs">
              <span>SLA: {ticket.slaDueAt ? ticket.slaDueAt.toLocaleDateString("pt-BR") : "Sem SLA"}</span>
              <span>Fila: {ticket.queue}</span>
              <span>Canal: {ticket.channel ?? "Manual"}</span>
              <span>Sistema: {ticket.system}</span>
              <span>Categoria: {ticket.category}</span>
              <span>Impacto: {ticket.impact}</span>
              <span>Urgência: {ticket.urgency}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  return (
    <Card className="bg-card/70">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Chamados</CardTitle>
            <CardDescription>Inbox estilo Desk com foco em SLA e priorização.</CardDescription>
          </div>
          {!isRequester ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Novo chamado
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={workMode === "mine" ? "default" : "outline"}
            onClick={() => setWorkMode("mine")}
          >
            Meus chamados
          </Button>
          <Button
            size="sm"
            variant={workMode === "today" ? "default" : "outline"}
            onClick={() => setWorkMode("today")}
          >
            Vencendo hoje
          </Button>
          <Button
            size="sm"
            variant={workMode === "all" ? "default" : "outline"}
            onClick={() => setWorkMode("all")}
          >
            Todos
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={queueFilter === "all" ? "default" : "outline"}
            onClick={() => setQueueFilter("all")}
          >
            Todas as filas
          </Button>
          <Button
            size="sm"
            variant={queueFilter === "TI Interna" ? "default" : "outline"}
            onClick={() => setQueueFilter("TI Interna")}
          >
            TI Interna
          </Button>
          <Button
            size="sm"
            variant={queueFilter === "Fornecedor" ? "default" : "outline"}
            onClick={() => setQueueFilter("Fornecedor")}
          >
            Fornecedor
          </Button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="🔍 Buscar por código, assunto ou sistema..."
          />
          <select
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            value={systemFilter}
            onChange={(event) => setSystemFilter(event.target.value)}
          >
            <option value="all">Todos os sistemas</option>
            {systems.map((system) => (
              <option key={system} value={system}>
                {system}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todas as situações</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <SavedViewsBar scope="tickets" activeViewId={activeViewId} onChangeActive={onChangeView} />
            <Button size="sm" variant="outline" onClick={() => setColumnsOpen(true)}>
              Colunas
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickFilters.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={quickFilter === item.id ? "default" : "outline"}
              onClick={() => setQuickFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {slaSummary.overdue > 0 || slaSummary.warning > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            {slaSummary.overdue > 0 ? (
              <p className="font-semibold">
                {slaSummary.overdue} chamado(s) com SLA estourado.
              </p>
            ) : null}
            {slaSummary.warning > 0 ? (
              <p className="text-xs text-amber-100/80">
                {slaSummary.warning} chamado(s) vencem em breve.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Chamados abertos</p>
            <p className="text-lg font-semibold text-foreground">{slaSummary.total}</p>
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-200">SLA estourado</p>
            <p className="text-lg font-semibold text-amber-100">{slaSummary.overdue}</p>
          </div>
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
            <p className="text-xs text-orange-200">Vence em breve</p>
            <p className="text-lg font-semibold text-orange-100">{slaSummary.warning}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div
        ref={splitRef}
        className="grid gap-4 lg:items-start"
        style={{ gridTemplateColumns: splitColumns }}
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          {!isRequester && selectedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
              <span className="text-xs text-muted-foreground">
                {selectedCount} selecionado(s)
              </span>
              <Button size="sm" variant="outline" onClick={applyBulkAssign}>
                Atribuir a mim
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkStatusOpen(true)}
              >
                Mudar status
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkVendorOpen(true)}
              >
                Mover para fornecedor
              </Button>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Limpar seleção
              </Button>
            </div>
          ) : null}
          {sorted.length === 0 ? <p>Nenhum chamado encontrado.</p> : null}
          {!isRequester ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() => {
                  if (allVisibleSelected) clearSelection();
                  else setSelectedIds(new Set(sorted.map((ticket) => ticket.id)));
                }}
              />
              <span>Selecionar todos os chamados visíveis</span>
            </div>
          ) : null}
          {sorted.map((ticket) => (
            <div
              key={ticket.id}
              className={`group relative rounded-lg border p-4 transition ${
                selectedTicket?.id === ticket.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 bg-background/40 hover:border-border"
              }`}
              onClick={() => {
                setActiveTicket(ticket);
                setSelectedTicket(ticket);
                setDetailOpen(true);
              }}
            >
              <div className="flex items-start gap-3">
                {!isRequester ? (
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ticket.id)}
                      onChange={() => toggleSelected(ticket.id)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </div>
                ) : null}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {ticket.code}
                        </span>
                        <Badge variant={statusTone[ticket.status]} className="px-2 py-0 text-[10px]">
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{ticket.subject}</p>
                    </div>
                    <div className="relative">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-semibold ${
                          ticket.assignee
                            ? "bg-muted text-foreground"
                            : "border border-dashed border-amber-400/60 bg-amber-500/10 text-amber-200"
                        }`}
                        title={ticket.assignee ?? "Não atribuído"}
                      >
                        {initials(ticket.assignee)}
                      </div>
                      {!ticket.assignee ? (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {ticket.slaDueAt ? ticket.slaDueAt.toLocaleDateString("pt-BR") : "Sem SLA"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Flag className="h-3.5 w-3.5" />
                      {ticket.priority}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {ticket.channel ?? "Manual"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {ticket.assignee ?? "Não atribuído"}
                    </span>
                    {ticket.isSlaOverdue ? (
                      <span className="inline-flex items-center gap-1 text-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Estourado
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="px-2 py-0 text-[10px]">
                      {ticket.queue}
                    </Badge>
                    <span>Sistema: {ticket.system || "-"}</span>
                    <span>Categoria: {ticket.category || "-"}</span>
                    <span>
                      Demanda: {ticket.demandId ? demandById.get(ticket.demandId)?.name ?? "—" : "Sem vínculo"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatSlaCountdown(ticket)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-end opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="flex gap-2 rounded-md border border-border/60 bg-background/90 p-1 shadow">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTicket(ticket);
                      setSelectedTicket(ticket);
                      setDetailOpen(true);
                    }}
                  >
                    Detalhes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      const assignee = currentUser?.name || currentUser?.email;
                      if (!assignee) return;
                      onUpdateTicket(ticket.id, { assignee });
                    }}
                  >
                    Assumir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTicket(ticket);
                      setStatusValue(ticket.status);
                      setStatusOpen(true);
                    }}
                  >
                    Mudar status
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden items-stretch lg:flex">
          <div
            className="mx-2 w-1 cursor-col-resize rounded-full bg-border/60 hover:bg-border"
            onMouseDown={handleSplitDrag}
          />
          <div className="sticky top-6 w-full">
            <Card className="bg-card/70">
              <CardHeader>
                <CardTitle>Detalhe do chamado</CardTitle>
                <CardDescription>
                  {selectedTicket
                    ? `${selectedTicket.code} • ${selectedTicket.subject}`
                    : "Selecione um chamado para ver o detalhe."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {selectedTicket ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {canApprove(selectedTicket) ? (
                        <>
                          <Button
                            size="sm"
                            onClick={async () => {
                              await onApproveTicket(selectedTicket.id);
                            }}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectReason("");
                              setRejectOpen(true);
                            }}
                          >
                            Rejeitar
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const assignee = currentUser?.name || currentUser?.email;
                          if (!assignee) return;
                          onUpdateTicket(selectedTicket.id, { assignee });
                        }}
                      >
                        Assumir
                      </Button>
                      <Button
                        size="sm"
                        variant={editMode ? "default" : "outline"}
                        onClick={() => setEditMode((prev) => !prev)}
                      >
                        {editMode ? "Editar ativo" : "Editar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTicket(selectedTicket);
                          setStatusValue(selectedTicket.status);
                          setStatusOpen(true);
                        }}
                      >
                        Mudar status
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTicket(selectedTicket);
                          setCommentOpen(true);
                        }}
                      >
                        Comentário
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTicket(selectedTicket);
                          setLinkOpen(true);
                        }}
                      >
                        Vincular demanda
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTicket(selectedTicket);
                          setVendorId("");
                          setVendorOpen(true);
                        }}
                      >
                        Mover para fornecedor
                      </Button>
                      {permissions?.tickets?.delete || permissions?.settings?.manage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Tem certeza que deseja excluir este chamado? Esta ação é irreversível."
                            );
                            if (!confirmed) return;
                            await onDeleteTicket(selectedTicket.id);
                          }}
                        >
                          Excluir
                        </Button>
                      ) : null}
                    </div>
                    {editMode ? (
                      <div className="grid gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">Status</label>
                          <select
                            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                            value={editStatus}
                            onChange={(event) => setEditStatus(event.target.value as Ticket["status"])}
                          >
                            {[
                              "Novo",
                              "Triagem",
                              "Em atendimento",
                              "Aguardando fornecedor",
                              "Aguardando solicitante",
                              "Aguardando aprovação",
                              "Resolvido",
                              "Fechado",
                              "Cancelado",
                            ].map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">Prioridade</label>
                          <select
                            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                            value={editPriority}
                            onChange={(event) => setEditPriority(event.target.value as Ticket["priority"])}
                          >
                            {["P0", "P1", "P2", "P3"].map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setEditMode(false)}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              await onUpdateTicket(selectedTicket.id, {
                                status: editStatus,
                                priority: editPriority,
                              });
                              setEditMode(false);
                            }}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {renderDetail(selectedTicket)}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

        <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar comentário</DialogTitle>
            </DialogHeader>
            <Textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Descreva o comentário"
            />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setCommentOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!activeTicket) return;
                  await onAddComment(activeTicket.id, commentText);
                  setCommentText("");
                  setCommentOpen(false);
                }}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar aprovação</DialogTitle>
            </DialogHeader>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Informe o motivo da rejeição"
            />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!rejectReason.trim() || !selectedTicket}
                onClick={async () => {
                  if (!selectedTicket) return;
                  await onRejectTicket(selectedTicket.id, rejectReason.trim());
                  setRejectOpen(false);
                  setRejectReason("");
                }}
              >
                Rejeitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular demanda</DialogTitle>
            </DialogHeader>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={linkDemandId}
              onChange={(event) => setLinkDemandId(event.target.value)}
            >
              <option value="">Selecione uma demanda</option>
              {demands.map((demand) => (
                <option key={demand.id} value={demand.id}>
                  {demand.name}
                </option>
              ))}
            </select>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setLinkOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!activeTicket || !linkDemandId) return;
                  await onLinkDemand(activeTicket.id, linkDemandId);
                  setLinkDemandId("");
                  setLinkOpen(false);
                }}
              >
                Vincular
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar status</DialogTitle>
            </DialogHeader>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value as Ticket["status"])}
            >
              {[
                "Novo",
                "Triagem",
                "Em atendimento",
                "Aguardando fornecedor",
                "Aguardando solicitante",
                "Aguardando aprovação",
                "Resolvido",
                "Fechado",
                "Cancelado",
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setStatusOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!activeTicket) return;
                  await onUpdateTicket(activeTicket.id, { status: statusValue });
                  setStatusOpen(false);
                }}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mudar status em lote</DialogTitle>
            </DialogHeader>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={bulkStatusValue}
              onChange={(event) => setBulkStatusValue(event.target.value as Ticket["status"])}
            >
              {[
                "Novo",
                "Triagem",
                "Em atendimento",
                "Aguardando fornecedor",
                "Aguardando solicitante",
                "Aguardando aprovação",
                "Resolvido",
                "Fechado",
                "Cancelado",
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBulkStatusOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={applyBulkStatus}>Aplicar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkVendorOpen} onOpenChange={setBulkVendorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mover para fornecedor (lote)</DialogTitle>
            </DialogHeader>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={bulkVendorId}
              onChange={(event) => setBulkVendorId(event.target.value)}
            >
              <option value="">Selecione o fornecedor</option>
              {externalParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </select>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBulkVendorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={applyBulkVendor} disabled={!bulkVendorId}>
                Mover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={vendorOpen} onOpenChange={setVendorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mover para fornecedor</DialogTitle>
            </DialogHeader>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
            >
              <option value="">Selecione o fornecedor</option>
              {externalParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </select>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setVendorOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!activeTicket || !vendorId) return;
                  await onUpdateTicket(activeTicket.id, {
                    queue: "Fornecedor",
                    status: "Aguardando fornecedor",
                    externalOwnerId: vendorId,
                  });
                  setVendorOpen(false);
                }}
              >
                Mover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhe do chamado</DialogTitle>
            </DialogHeader>
            {activeTicket ? renderDetail(activeTicket) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={columnsOpen} onOpenChange={setColumnsOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Colunas visíveis</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <label className="text-xs text-muted-foreground">Aplicar em</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={columnScope === "all" ? "default" : "outline"}
                  onClick={() => setColumnScope("all")}
                >
                  Todas as filas
                </Button>
                <Button
                  size="sm"
                  variant={columnScope === "TI Interna" ? "default" : "outline"}
                  onClick={() => setColumnScope("TI Interna")}
                >
                  TI Interna
                </Button>
                <Button
                  size="sm"
                  variant={columnScope === "Fornecedor" ? "default" : "outline"}
                  onClick={() => setColumnScope("Fornecedor")}
                >
                  Fornecedor
                </Button>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              {columnOrder.map((id) => {
                const col = ticketColumnDefs.find((item) => item.id === id);
                if (!col) return null;
                const checked = visibleColumnIds.includes(col.id);
                return (
                  <div
                    key={col.id}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 p-2"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", col.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const dragId = event.dataTransfer.getData("text/plain");
                      if (dragId) moveColumn(dragId, col.id);
                    }}
                  >
                    <span className="cursor-grab select-none text-xs">⋮⋮</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={col.required}
                      onChange={() => toggleColumn(col.id)}
                    />
                    <span>
                      {col.label}
                      {col.required ? " (obrigatória)" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetColumns}>
                Resetar colunas
              </Button>
              <Button variant="secondary" onClick={() => setColumnsOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={cannedOpen} onOpenChange={setCannedOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Respostas prontas</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 text-sm text-muted-foreground">
              {replyTemplates.length === 0 ? (
                <p>Sem respostas cadastradas.</p>
              ) : (
                replyTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-md border border-border/60 bg-background/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{tpl.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {tpl.scope === "shared" ? "Compartilhado" : "Pessoal"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setReplyTemplateId(tpl.id);
                          const baseTicket = selectedTicket ?? activeTicket;
                          if (baseTicket) {
                            setReplyText(applyTemplateVars(tpl.body, baseTicket));
                          } else {
                            setReplyText(tpl.body);
                          }
                          setCannedOpen(false);
                        }}
                      >
                        Usar
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                      {tpl.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(zoomImage)} onOpenChange={() => setZoomImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{zoomImage?.filename ?? "Imagem"}</DialogTitle>
            </DialogHeader>
            {zoomImage ? (
              <img
                src={zoomImage.url}
                alt={zoomImage.filename ?? "Imagem"}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo chamado</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="grid gap-1">
                <label>Assunto *</label>
                <Input
                  value={createPayload.subject}
                  onChange={(event) =>
                    setCreatePayload((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  placeholder="Descreva o chamado"
                />
              </div>
              <div className="grid gap-1">
                <label>Descrição</label>
                <Textarea
                  value={createPayload.description}
                  onChange={(event) =>
                    setCreatePayload((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Sistema *</label>
                  <Input
                    value={createPayload.system}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({ ...prev, system: event.target.value }))
                    }
                    placeholder="Ex: Sankhya"
                  />
                </div>
                <div className="grid gap-1">
                  <label>Categoria *</label>
                  <Input
                    value={createPayload.category}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder="Ex: Incidente"
                  />
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Responsável (opcional)</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={createAssigneeId}
                    onChange={(event) => {
                      const id = event.target.value;
                      setCreateAssigneeId(id);
                      const name = assignedUsers.find((user) => user.id === id)?.name ?? "";
                      setCreatePayload((prev) => ({ ...prev, assignee: name }));
                    }}
                  >
                    <option value="">Não atribuído</option>
                    {assignedUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label>Ativo relacionado</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={createPayload.relatedAssetId}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({
                        ...prev,
                        relatedAssetId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sem ativo</option>
                    {assetOptions.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.label}
                      </option>
                    ))}
                  </select>
                  {createAssigneeId && assetsByUser.get(createAssigneeId)?.length ? (
                    <p className="text-[11px] text-muted-foreground">
                      Sugestão: {assetsByUser.get(createAssigneeId)?.[0]?.tag}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Canal</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={createPayload.channel ?? "Manual"}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({
                        ...prev,
                        channel: event.target.value as Ticket["channel"],
                      }))
                    }
                  >
                    {["Manual", "Email", "Portal", "Telefone", "WhatsApp", "Chat"].map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label>Origem</label>
                  <Input
                    value={createPayload.channel ? `${createPayload.channel} • Interno` : "Interno"}
                    disabled
                  />
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Impacto *</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={createPayload.impact}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({
                        ...prev,
                        impact: event.target.value as Ticket["impact"],
                      }))
                    }
                  >
                    {["Baixo", "Médio", "Alto"].map((impact) => (
                      <option key={impact} value={impact}>
                        {impact}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label>Urgência *</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={createPayload.urgency}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({
                        ...prev,
                        urgency: event.target.value as Ticket["urgency"],
                      }))
                    }
                  >
                    {["Baixa", "Média", "Alta"].map((urgency) => (
                      <option key={urgency} value={urgency}>
                        {urgency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Fila *</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={createPayload.queue}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({
                        ...prev,
                        queue: event.target.value as Ticket["queue"],
                        externalOwnerId:
                          event.target.value === "Fornecedor" ? prev.externalOwnerId : "",
                      }))
                    }
                  >
                    {["TI Interna", "Fornecedor"].map((queue) => (
                      <option key={queue} value={queue}>
                        {queue}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label>Fornecedor {createPayload.queue === "Fornecedor" ? "*" : ""}</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={createPayload.externalOwnerId}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({ ...prev, externalOwnerId: event.target.value }))
                    }
                    disabled={createPayload.queue !== "Fornecedor"}
                  >
                    <option value="">Selecione</option>
                    {externalParties.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const required = [
                    createPayload.subject,
                    createPayload.system,
                    createPayload.category,
                    createPayload.impact,
                    createPayload.urgency,
                    createPayload.queue,
                  ];
                  if (required.some((field) => !field)) return;
                  if (createPayload.queue === "Fornecedor" && !createPayload.externalOwnerId) return;
                  await onCreateTicket({
                    subject: createPayload.subject,
                    description: createPayload.description,
                    system: createPayload.system,
                    category: createPayload.category,
                    impact: createPayload.impact,
                    urgency: createPayload.urgency,
                    queue: createPayload.queue,
                    channel: createPayload.channel ?? "Manual",
                    assignee: createPayload.assignee || undefined,
                    relatedAssetId: createPayload.relatedAssetId || undefined,
                    externalOwnerId:
                      createPayload.queue === "Fornecedor"
                        ? createPayload.externalOwnerId
                        : undefined,
                    status: "Novo",
                    openedAt: new Date(),
                  });
                  setCreatePayload({
                    subject: "",
                    description: "",
                    system: "",
                    category: "",
                    impact: "Médio",
                    urgency: "Média",
                    queue: "TI Interna",
                    externalOwnerId: "",
                    channel: "Manual",
                    assignee: "",
                    relatedAssetId: "",
                  });
                  setCreateAssigneeId("");
                  setCreateOpen(false);
                }}
              >
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
