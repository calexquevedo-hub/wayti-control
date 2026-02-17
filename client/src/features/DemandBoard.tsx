import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  CheckSquare,
  Circle,
  ClipboardList,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApprovalStatus,
  Demand,
  DemandCategory,
  DemandImpact,
  DemandPriority,
  DemandStatus,
  DemandType,
} from "@/types";
import { DemandDetail } from "@/features/DemandDetail";

const statusMap: Record<
  Demand["status"],
  { label: string; tone: "default" | "warning" | "success" | "secondary" }
> = {
  "Aguardando terceiros": { label: "Aguardando terceiros", tone: "warning" },
  "Backlog": { label: "Backlog", tone: "default" },
  "Esta semana": { label: "Esta semana", tone: "secondary" },
  "Em execução": { label: "Em execução", tone: "secondary" },
  "Concluído": { label: "Concluído", tone: "success" },
  "Cancelado": { label: "Cancelado", tone: "default" },
};

const COLUMN_CONFIG: Record<string, { label: string; color: string }> = {
  "Backlog": { label: "Backlog", color: "bg-slate-100/70 border-slate-200/70 dark:bg-slate-900/40 dark:border-slate-800/60" },
  "Esta semana": { label: "Esta Semana", color: "bg-blue-50/70 border-blue-200/70 dark:bg-blue-900/20 dark:border-blue-800/40" },
  "Em execução": { label: "Em Execução", color: "bg-amber-50/70 border-amber-200/70 dark:bg-amber-900/20 dark:border-amber-800/40" },
  "Aguardando terceiros": { label: "Aguardando Terceiros", color: "bg-purple-50/70 border-purple-200/70 dark:bg-purple-900/20 dark:border-purple-800/40" },
  "Concluído": { label: "Concluído", color: "bg-emerald-50/70 border-emerald-200/70 dark:bg-emerald-900/20 dark:border-emerald-800/40" },
};

const PRIORITY_META: Record<
  DemandPriority,
  { label: string; className: string; icon: typeof AlertCircle }
> = {
  P0: {
    label: "Urgente",
    className:
      "border-red-200/70 bg-red-100/70 text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200",
    icon: AlertCircle,
  },
  P1: {
    label: "Alta",
    className:
      "border-orange-200/70 bg-orange-100/70 text-orange-700 dark:border-orange-800/40 dark:bg-orange-900/30 dark:text-orange-200",
    icon: ArrowUpCircle,
  },
  P2: {
    label: "Média",
    className:
      "border-blue-200/70 bg-blue-100/70 text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/30 dark:text-blue-200",
    icon: Circle,
  },
  P3: {
    label: "Baixa",
    className:
      "border-slate-200/70 bg-slate-100/70 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-200",
    icon: CheckCircle2,
  },
};

interface DemandBoardProps {
  demands: Demand[];
  onCreate: (payload: Omit<Demand, "id">) => Promise<{ ok: boolean; message?: string }>;
  onUpdate: (id: string, payload: Partial<Demand>) => Promise<{ ok: boolean; message?: string }>;
  onDelete: (id: string, reason: string) => Promise<{ ok: boolean; message?: string }>;
  onAddComment: (id: string, message: string) => Promise<{ ok: boolean; message?: string }>;
}

const demandTypes: { label: string; value: DemandType }[] = [
  { label: "Projeto", value: "projeto" },
  { label: "Contrato", value: "contrato" },
  { label: "Custo", value: "custo" },
  { label: "Compra", value: "compra" },
  { label: "Implantação", value: "implantacao" },
];

const demandStatuses: { label: string; value: DemandStatus }[] = [
  { label: "Aguardando terceiros", value: "Aguardando terceiros" },
  { label: "Backlog", value: "Backlog" },
  { label: "Esta semana", value: "Esta semana" },
  { label: "Em execução", value: "Em execução" },
  { label: "Concluído", value: "Concluído" },
  { label: "Cancelado", value: "Cancelado" },
];

const demandCategories: { label: string; value: DemandCategory }[] = [
  { label: "Comunicado/Follow-up", value: "Comunicado/Follow-up" },
  { label: "Ação", value: "Ação" },
  { label: "Decisão", value: "Decisão" },
  { label: "Risco/Impedimento", value: "Risco/Impedimento" },
];

const demandPriorities: { label: string; value: DemandPriority }[] = [
  { label: "P0", value: "P0" },
  { label: "P1", value: "P1" },
  { label: "P2", value: "P2" },
  { label: "P3", value: "P3" },
];

const demandImpacts: { label: string; value: DemandImpact }[] = [
  { label: "Baixo", value: "Baixo" },
  { label: "Médio", value: "Médio" },
  { label: "Alto", value: "Alto" },
];

const approvalStatuses: { label: string; value: ApprovalStatus }[] = [
  { label: "Pendente", value: "pendente" },
  { label: "Aprovado", value: "aprovado" },
  { label: "Reprovado", value: "reprovado" },
];

function todayDate() {
  return new Date();
}

function parseStages(value: string, fallbackOwner: string) {
  if (!value.trim()) return [];
  return value.split(",").map((raw) => {
    const [name, owner, sla] = raw.split("|").map((part) => part.trim());
    return {
      name: name || "Etapa",
      owner: owner || fallbackOwner || "Time",
      status: "pendente" as const,
      slaDays: sla ? Number(sla) : undefined,
    };
  });
}

export function DemandBoard({
  demands,
  onCreate,
  onUpdate,
  onDelete,
  onAddComment,
}: DemandBoardProps) {
  const [boardDemands, setBoardDemands] = useState<Demand[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailDemand, setDetailDemand] = useState<Demand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Demand | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [detailTab, setDetailTab] = useState<string>("resumo");
  const [form, setForm] = useState({
    name: "",
    type: demandTypes[0].value,
    category: demandCategories[0].value,
    status: demandStatuses[0].value,
    priority: demandPriorities[2].value,
    impact: demandImpacts[1].value,
    epic: "Outros",
    sponsor: "Não definido",
    responsible: "Alexandre Quevedo",
    approver: "",
    approvalStatus: "pendente" as ApprovalStatus,
    approvalNotes: "",
    approvalStages: "",
    approvalSlaDays: "0",
    financialMonthly: "0",
    financialOneOff: "0",
    executiveSummary: "",
    budget: "0",
    spent: "0",
    progress: "0",
    notes: "",
  });

  useEffect(() => {
    setBoardDemands(demands);
  }, [demands]);

  const sorted = useMemo(() => {
    return [...boardDemands]
      .filter((item) => {
        const matchSearch =
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || item.status === statusFilter;
        const matchType = typeFilter === "all" || item.type === typeFilter;
        const matchPriority = priorityFilter === "all" || item.priority === priorityFilter;
        return matchSearch && matchStatus && matchType && matchPriority;
      })
      .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime());
  }, [boardDemands, search, statusFilter, typeFilter, priorityFilter]);

  async function handleDragEnd(result: any) {
    if (!result.destination) return;
    const { destination, draggableId, source } = result;
    if (
      source?.droppableId === destination.droppableId &&
      source?.index === destination.index
    ) {
      return;
    }
    const nextStatus = destination.droppableId as Demand["status"];
    const previous = [...boardDemands];
    setBoardDemands((prev) =>
      prev.map((item) => (item.id === draggableId ? { ...item, status: nextStatus } : item))
    );
    setDetailDemand((prev) => (prev && prev.id === draggableId ? { ...prev, status: nextStatus } : prev));
    const res = await onUpdate(draggableId, { status: nextStatus, lastUpdate: todayDate() });
    if (!res.ok) {
      setBoardDemands(previous);
      setDetailDemand((prev) =>
        prev && prev.id === draggableId ? { ...prev, status: previous.find((d) => d.id === draggableId)?.status ?? prev.status } : prev
      );
      setError(res.message ?? "Falha ao atualizar status.");
    }
  }

  function openEditDemand(demand: Demand) {
    setEditingId(demand.id);
    setDeleteTarget(demand);
    setForm({
      name: demand.name,
      type: demand.type,
      category: demand.category,
      status: demand.status,
      priority: demand.priority,
      impact: demand.impact,
      epic: demand.epic,
      sponsor: demand.sponsor,
      responsible: demand.responsible,
      approver: demand.approver ?? "",
      approvalStatus: demand.approvalStatus ?? "pendente",
      approvalNotes: demand.approvalNotes ?? "",
      approvalStages: demand.approvalStages
        ? demand.approvalStages
            .map((stage) =>
              [stage.name, stage.owner, stage.slaDays].filter(Boolean).join("|")
            )
            .join(", ")
        : "",
      approvalSlaDays: demand.approvalSlaDays ? String(demand.approvalSlaDays) : "0",
      financialMonthly: String(demand.financialMonthly ?? 0),
      financialOneOff: String(demand.financialOneOff ?? 0),
      executiveSummary: demand.executiveSummary ?? "",
      budget: String(demand.budget),
      spent: String(demand.spent),
      progress: String(demand.progress),
      notes: "",
    });
    setCommentDraft("");
    setEditOpen(true);
  }

  function openDetailDemand(demand: Demand, tab: "resumo" | "plano") {
    setDetailDemand(demand);
    setDetailTab(tab);
    setDetailOpen(true);
  }

  function openDeleteDemand(demand: Demand) {
    setError(null);
    setDeleteTarget(demand);
    setDeleteReason("");
    setDeleteOpen(true);
  }

  async function handleCreate() {
    setError(null);
    const payload: Omit<Demand, "id"> = {
      name: form.name,
      type: form.type,
      category: form.category,
      status: form.status,
      priority: form.priority,
      impact: form.impact,
      epic: form.epic,
      sponsor: form.sponsor,
      responsible: form.responsible,
      approver: form.approver,
      approvalStatus: form.approvalStatus,
      approvalNotes: form.approvalNotes,
      approvalSlaDays: Number(form.approvalSlaDays),
      financialMonthly: Number(form.financialMonthly),
      financialOneOff: Number(form.financialOneOff),
      executiveSummary: form.executiveSummary,
      notes: "",
      comments: form.notes
        ? [
            {
              at: todayDate(),
              author: form.responsible || "Sistema",
              message: form.notes,
            },
          ]
        : [],
      approvalStages: parseStages(form.approvalStages, form.approver),
      budget: Number(form.budget),
      spent: Number(form.spent),
      progress: Number(form.progress),
      lastUpdate: todayDate(),
      followUps: [],
      tasks: [],
    };

    const result = await onCreate(payload);
    if (!result.ok) {
      setError(result.message ?? "Falha ao criar demanda.");
      return;
    }

    setOpen(false);
    setForm({
      name: "",
      type: demandTypes[0].value,
      category: demandCategories[0].value,
      status: demandStatuses[0].value,
      priority: demandPriorities[2].value,
      impact: demandImpacts[1].value,
      epic: "Outros",
      sponsor: "Não definido",
      responsible: "Alexandre Quevedo",
      approver: "",
      approvalStatus: "pendente",
      approvalNotes: "",
      approvalStages: "",
      approvalSlaDays: "0",
      financialMonthly: "0",
      financialOneOff: "0",
      executiveSummary: "",
      budget: "0",
      spent: "0",
      progress: "0",
      notes: "",
    });
  }

  async function handleEdit() {
    if (!editingId) return;
    setError(null);
    const result = await onUpdate(editingId, {
      name: form.name,
      type: form.type,
      category: form.category,
      status: form.status,
      priority: form.priority,
      impact: form.impact,
      epic: form.epic,
      sponsor: form.sponsor,
      responsible: form.responsible,
      approver: form.approver,
      approvalStatus: form.approvalStatus,
      approvalNotes: form.approvalNotes,
      approvalSlaDays: Number(form.approvalSlaDays),
      financialMonthly: Number(form.financialMonthly),
      financialOneOff: Number(form.financialOneOff),
      executiveSummary: form.executiveSummary,
      approvalStages: parseStages(form.approvalStages, form.approver),
      budget: Number(form.budget),
      spent: Number(form.spent),
      progress: Number(form.progress),
      lastUpdate: todayDate(),
    });

    if (!result.ok) {
      setError(result.message ?? "Falha ao atualizar demanda.");
      return;
    }

    setEditOpen(false);
    setEditingId(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      setError("Informe o motivo da exclusão.");
      return;
    }
    setError(null);
    const result = await onDelete(deleteTarget.id, deleteReason.trim());
    if (!result.ok) {
      setError(result.message ?? "Falha ao excluir demanda.");
      return;
    }
    setEditOpen(false);
    setDeleteOpen(false);
    setDeleteReason("");
    setDeleteTarget(null);
  }

  async function handleAddComment() {
    if (!editingId) return;
    if (!commentDraft.trim()) {
      setError("Escreva um comentário antes de salvar.");
      return;
    }
    setError(null);
    const result = await onAddComment(editingId, commentDraft.trim());
    if (!result.ok) {
      setError(result.message ?? "Falha ao registrar comentário.");
      return;
    }
    setCommentDraft("");
  }

  return (
    <Card className="bg-card/70">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Portfolio de Demandas</CardTitle>
            <CardDescription>
              Projetos, contratos, custos, compras e implantações.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Nova demanda</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Nova demanda</DialogTitle>
                <DialogDescription>
                  Cadastre projetos e contratos com foco em follow-ups.
                </DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1 text-sm">
                <div className="grid gap-2">
                  <label className="font-medium">Nome *</label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Modernizacao do datacenter"
                    required
                  />
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="font-medium">Categoria</label>
                    <select
                      className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={form.category}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          category: event.target.value as DemandCategory,
                        }))
                      }
                    >
                      {demandCategories.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium">Prioridade</label>
                    <select
                      className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={form.priority}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          priority: event.target.value as DemandPriority,
                        }))
                      }
                    >
                      {demandPriorities.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="font-medium">Impacto</label>
                    <select
                      className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={form.impact}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          impact: event.target.value as DemandImpact,
                        }))
                      }
                    >
                      {demandImpacts.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium">Épico</label>
                    <Input
                      value={form.epic}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, epic: event.target.value }))
                      }
                      placeholder="Sankhya"
                    />
                  </div>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="font-medium">Responsável</label>
                    <Input
                      value={form.responsible}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, responsible: event.target.value }))
                      }
                      placeholder="Alexandre Quevedo"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium">Patrocinador *</label>
                    <Input
                      value={form.sponsor}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, sponsor: event.target.value }))
                      }
                      placeholder="Diretoria de TI"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Aprovador</label>
                  <Input
                    value={form.approver}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, approver: event.target.value }))
                    }
                    placeholder="Nome do aprovador"
                  />
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="font-medium">Tipo *</label>
                    <select
                      className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={form.type}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          type: event.target.value as DemandType,
                        }))
                      }
                      required
                    >
                      {demandTypes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium">Situação</label>
                    <select
                      className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value as DemandStatus,
                        }))
                      }
                    >
                      {demandStatuses.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2 lg:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="font-medium">Orçamento *</label>
                    <Input
                      type="number"
                      value={form.budget}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, budget: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium">Gasto *</label>
                    <Input
                      type="number"
                      value={form.spent}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, spent: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium">Progresso (%) *</label>
                    <Input
                      type="number"
                      value={form.progress}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, progress: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="font-medium">Resumo executivo</label>
                    <Textarea
                      value={form.executiveSummary}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, executiveSummary: event.target.value }))
                      }
                      placeholder="Resumo curto para alta gestão"
                    />
                  </div>
                <div className="grid gap-2">
                  <label className="font-medium">Comentário inicial</label>
                  <Textarea
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Contexto inicial para a demanda"
                  />
                </div>
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou ID"
          />
          <select
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todas as situações</option>
            {demandStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">Todos os tipos</option>
            {demandTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Prioridade:</span>
          {(["P0", "P1", "P2", "P3"] as DemandPriority[]).map((priority) => {
            const meta = PRIORITY_META[priority];
            const Icon = meta.icon;
            return (
              <Button
                key={priority}
                size="sm"
                variant={priorityFilter === priority ? "default" : "outline"}
                onClick={() =>
                  setPriorityFilter(priorityFilter === priority ? "all" : priority)
                }
                className="h-7 gap-1 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                {priority}
              </Button>
            );
          })}
          {priorityFilter !== "all" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setPriorityFilter("all")}
            >
              Limpar
            </Button>
          ) : null}
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar demanda</DialogTitle>
              <DialogDescription>Atualize os dados principais da demanda.</DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1 text-sm">
              <div className="grid gap-2">
                <label className="font-medium">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Categoria</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value as DemandCategory,
                      }))
                    }
                  >
                    {demandCategories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Prioridade</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        priority: event.target.value as DemandPriority,
                      }))
                    }
                  >
                    {demandPriorities.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Impacto</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.impact}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        impact: event.target.value as DemandImpact,
                      }))
                    }
                  >
                    {demandImpacts.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Épico</label>
                  <Input
                    value={form.epic}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, epic: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Patrocinador *</label>
                <Input
                  value={form.sponsor}
                  onChange={(event) => setForm((prev) => ({ ...prev, sponsor: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Responsavel</label>
                <Input
                  value={form.responsible}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, responsible: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Aprovador</label>
                <Input
                  value={form.approver}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, approver: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Tipo *</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.type}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        type: event.target.value as DemandType,
                      }))
                    }
                    required
                  >
                    {demandTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Situação</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value as DemandStatus,
                      }))
                    }
                  >
                    {demandStatuses.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Situação de aprovação</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.approvalStatus}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        approvalStatus: event.target.value as ApprovalStatus,
                      }))
                    }
                  >
                    {approvalStatuses.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Notas de aprovação</label>
                  <Input
                    value={form.approvalNotes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, approvalNotes: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Financeiro mensal (R$/mes)</label>
                  <Input
                    type="number"
                    value={form.financialMonthly}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, financialMonthly: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Financeiro one-off (R$)</label>
                  <Input
                    type="number"
                    value={form.financialOneOff}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, financialOneOff: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Resumo executivo</label>
                <Input
                  value={form.executiveSummary}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, executiveSummary: event.target.value }))
                  }
                  placeholder="Resumo curto para alta gestão"
                />
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Comentários</label>
                <div className="grid gap-2">
                  <Textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Escreva um comentário e clique em adicionar."
                  />
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleAddComment}>
                      Adicionar comentário
                    </Button>
                  </div>
                </div>
                {editingId ? (
                  <div className="grid gap-2">
                    {(demands.find((item) => item.id === editingId)?.comments ?? []).length ===
                    0 ? (
                      <p className="text-xs text-muted-foreground">Sem comentários registrados.</p>
                    ) : (
                      (demands.find((item) => item.id === editingId)?.comments ?? []).map(
                        (comment, index) => (
                          <div
                            key={`${comment.author}-${comment.at}-${index}`}
                            className="rounded-md border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">{comment.author}</span>
                              <span>{comment.at.toLocaleString("pt-BR")}</span>
                            </div>
                            <p className="mt-1">{comment.message}</p>
                          </div>
                        )
                      )
                    )}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Etapas (separadas por virgula)</label>
                  <Input
                    value={form.approvalStages}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, approvalStages: event.target.value }))
                    }
                    placeholder="Comite Tecnico|Marina|3, Financeiro|Fernanda|4"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">SLA total (dias)</label>
                  <Input
                    type="number"
                    value={form.approvalSlaDays}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, approvalSlaDays: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Situação de aprovação</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.approvalStatus}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        approvalStatus: event.target.value as ApprovalStatus,
                      }))
                    }
                  >
                    {approvalStatuses.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Notas de aprovação</label>
                  <Input
                    value={form.approvalNotes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, approvalNotes: event.target.value }))
                    }
                    placeholder="Observacoes da aprovacao"
                  />
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Financeiro mensal (R$/mes)</label>
                  <Input
                    type="number"
                    value={form.financialMonthly}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, financialMonthly: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Financeiro one-off (R$)</label>
                  <Input
                    type="number"
                    value={form.financialOneOff}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, financialOneOff: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Resumo executivo</label>
                <Input
                  value={form.executiveSummary}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, executiveSummary: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-medium">Etapas (separadas por virgula)</label>
                  <Input
                    value={form.approvalStages}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, approvalStages: event.target.value }))
                    }
                    placeholder="Comite Tecnico|Marina|3, Financeiro|Fernanda|4"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">SLA total (dias)</label>
                  <Input
                    type="number"
                    value={form.approvalSlaDays}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, approvalSlaDays: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-3">
                <div className="grid gap-2">
                  <label className="font-medium">Orçamento *</label>
                  <Input
                    type="number"
                    value={form.budget}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, budget: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Gasto *</label>
                  <Input
                    type="number"
                    value={form.spent}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, spent: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Progresso (%) *</label>
                  <Input
                    type="number"
                    value={form.progress}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, progress: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (!editingId) return;
                    const target = demands.find((item) => item.id === editingId) ?? null;
                    if (!target) return;
                    setError(null);
                    setDeleteTarget(target);
                    setDeleteReason("");
                    setDeleteOpen(true);
                  }}
                >
                  Excluir
                </Button>
                <Button onClick={handleEdit}>Salvar alterações</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da demanda</DialogTitle>
              <DialogDescription>Resumo e linha do tempo.</DialogDescription>
            </DialogHeader>
            {detailDemand ? (
              <DemandDetail
                demand={detailDemand}
                defaultTab={detailTab}
                onUpdateTasks={async (tasks) => {
                  const result = await onUpdate(detailDemand.id, { tasks });
                  if (!result.ok) {
                    setError(result.message ?? "Falha ao atualizar tarefas.");
                    return;
                  }
                  setDetailDemand((prev) => (prev ? { ...prev, tasks } : prev));
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Excluir demanda</DialogTitle>
              <DialogDescription>
                Esta ação remove a demanda da lista ativa e exige um motivo para auditoria.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 text-sm">
              <label className="font-medium">Motivo da exclusão</label>
              <Textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder="Ex.: Demanda cancelada pelo patrocinador."
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  disabled={!deleteReason.trim()}
                  onClick={handleDelete}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhuma demanda cadastrada ainda.
          </div>
        ) : null}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.entries(COLUMN_CONFIG).map(([statusKey, col]) => {
              const items = sorted.filter((demand) => demand.status === statusKey);
              return (
                <Droppable key={statusKey} droppableId={statusKey}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-w-[320px] max-w-[360px] flex-1 rounded-xl border ${col.color} p-3`}
                    >
                      <div className="mb-3 flex items-center justify-between px-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {col.label}
                        </h3>
                        <Badge variant="outline" className="bg-background">
                          {items.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {items.map((demand, index) => {
                          const totalTasks = demand.tasks?.length ?? 0;
                          const completedTasks = demand.tasks?.filter((t) => t.isCompleted).length ?? 0;
                          const progress =
                            totalTasks > 0
                              ? Math.round((completedTasks / totalTasks) * 100)
                              : demand.progress ?? 0;
                          return (
                            <Draggable key={demand.id} draggableId={demand.id} index={index}>
                              {(drag) => (
                                <Card
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  {...drag.dragHandleProps}
                                  className="group cursor-grab transition-all hover:shadow-md active:cursor-grabbing"
                                  onClick={() => {
                                    openDetailDemand(demand, "resumo");
                                  }}
                                >
                                  <CardHeader className="p-3 pb-0">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                      {(() => {
                                        const meta = PRIORITY_META[demand.priority] ?? PRIORITY_META.P3;
                                        const Icon = meta.icon;
                                        return (
                                          <Badge
                                            variant="outline"
                                            className={`gap-1 border px-2 py-0.5 text-[10px] ${meta.className}`}
                                          >
                                            <Icon className="h-3 w-3" />
                                            {demand.priority}
                                          </Badge>
                                        );
                                      })()}
                                      {totalTasks > 0 ? (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <CheckSquare className="h-3 w-3" />
                                          {completedTasks}/{totalTasks}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex items-start justify-between gap-2">
                                      <CardTitle className="text-sm font-medium leading-tight">
                                        {demand.name}
                                      </CardTitle>
                                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openDetailDemand(demand, "plano");
                                          }}
                                        >
                                          <ClipboardList className="h-4 w-4" />
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7"
                                              onClick={(event) => event.stopPropagation()}
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                openDetailDemand(demand, "resumo");
                                              }}
                                            >
                                              Detalhes
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                openEditDemand(demand);
                                              }}
                                            >
                                              Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                openDeleteDemand(demand);
                                              }}
                                            >
                                              Excluir
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-3 pt-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{demand.type.replace("-", " ")}</span>
                                      <span>{demand.lastUpdate.toLocaleDateString("pt-BR")}</span>
                                    </div>
                                    {totalTasks > 0 ? (
                                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                          className="h-full bg-primary transition-all duration-500"
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    ) : null}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {items.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4 text-xs text-muted-foreground">
                            Sem demandas neste status.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
