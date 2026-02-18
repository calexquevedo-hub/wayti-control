import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Edit2, Filter, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchDemands, moveDemand } from "@/lib/api";
import type { Demand, DemandPriority, DemandStatus } from "@/types";
import { DemandModal } from "@/features/demands/DemandModal";
import type { DemandFormValues } from "@/features/demands/demand.schema";

const COLUMNS: DemandStatus[] = [
  "Backlog",
  "Esta semana",
  "Em execução",
  "Aguardando terceiros",
  "Concluído",
  "Cancelado",
];

const priorityTone: Record<DemandPriority, string> = {
  P0: "bg-red-50 text-red-800 border-red-200",
  P1: "bg-orange-50 text-orange-800 border-orange-200",
  P2: "bg-blue-50 text-blue-800 border-blue-200",
  P3: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

interface DemandBoardProps {
  token?: string;
  demands: Demand[];
  onCreate: (payload: Omit<Demand, "id">) => Promise<{ ok: boolean; message?: string }>;
  onUpdate: (id: string, payload: Partial<Demand>) => Promise<{ ok: boolean; message?: string }>;
  onDelete: (id: string, reason: string) => Promise<{ ok: boolean; message?: string }>;
  onAddComment: (id: string, message: string) => Promise<{ ok: boolean; message?: string }>;
}

function toDemandPayload(values: DemandFormValues, current?: Demand): Partial<Demand> & Record<string, unknown> {
  const checklistProgress = values.checklist.length
    ? Math.round((values.checklist.filter((i) => i.checado).length / values.checklist.length) * 100)
    : 0;

  return {
    // legacy fields used by existing app
    name: values.titulo,
    type: current?.type ?? "projeto",
    category: values.categoria as any,
    status: values.status,
    priority: values.prioridade,
    impact: values.impacto as any,
    epic: values.epico,
    sponsor: current?.sponsor ?? "Não definido",
    responsible: values.responsavel,
    progress: checklistProgress,
    financialMonthly: values.financeiro_mensal,
    financialOneOff: values.financeiro_one_off,
    executiveSummary: values.resumo_executivo,
    notes: current?.notes ?? "",
    budget: current?.budget ?? 0,
    spent: current?.spent ?? 0,
    lastUpdate: new Date(),
    nextFollowUpAt: values.proximo_follow_up ? new Date(values.proximo_follow_up) : undefined,
    lastContactAt: values.ultimo_contato ? new Date(values.ultimo_contato) : undefined,
    tasks: values.checklist.map((item) => ({
      title: item.texto,
      isCompleted: item.checado,
    })),

    // new explicit fields for kanban schema
    titulo: values.titulo,
    categoria: values.categoria,
    prioridade: values.prioridade,
    responsavel: values.responsavel,
    dono_externo: values.dono_externo,
    epico: values.epico,
    prazo: values.prazo ? new Date(values.prazo) : undefined,
    ultimo_contato: values.ultimo_contato ? new Date(values.ultimo_contato) : undefined,
    proximo_follow_up: values.proximo_follow_up ? new Date(values.proximo_follow_up) : undefined,
    escalonar_em: values.escalonar_em ? new Date(values.escalonar_em) : undefined,
    dependencia: values.dependencia,
    impacto: values.impacto,
    financeiro_mensal: values.financeiro_mensal,
    financeiro_one_off: values.financeiro_one_off,
    link_evidencia: values.link_evidencia,
    resumo_executivo: values.resumo_executivo,
    checklist: values.checklist,
  };
}

export function DemandBoard({
  token,
  demands,
  onCreate,
  onUpdate,
  onDelete,
}: DemandBoardProps) {
  const [boardDemands, setBoardDemands] = useState<Demand[]>([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!token) {
        setBoardDemands(demands);
        return;
      }
      try {
        const data = await fetchDemands(token);
        if (mounted) setBoardDemands(data);
      } catch {
        if (mounted) setBoardDemands(demands);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [token, demands]);

  const filtered = useMemo(() => {
    return boardDemands.filter((d) => {
      const text = `${d.name} ${d.id}`.toLowerCase();
      const okSearch = !search || text.includes(search.toLowerCase());
      const okPriority = priorityFilter === "all" || d.priority === priorityFilter;
      return okSearch && okPriority;
    });
  }, [boardDemands, search, priorityFilter]);

  async function reloadDemands() {
    if (!token) return;
    const data = await fetchDemands(token);
    setBoardDemands(data);
  }

  async function handleDragEnd(result: any) {
    if (!result.destination) return;
    const { destination, source, draggableId } = result;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const nextStatus = destination.droppableId as DemandStatus;
    const previous = [...boardDemands];

    setBoardDemands((prev) => prev.map((d) => (d.id === draggableId ? { ...d, status: nextStatus } : d)));

    try {
      if (token) {
        await moveDemand(token, draggableId, { status: nextStatus, index: destination.index });
      } else {
        const response = await onUpdate(draggableId, { status: nextStatus, lastUpdate: new Date() });
        if (!response.ok) throw new Error(response.message ?? "Falha ao mover demanda.");
      }
    } catch (e: any) {
      setBoardDemands(previous);
      setError(e?.message ?? "Falha ao mover demanda.");
    }
  }

  async function saveDemand(values: DemandFormValues, demandId?: string) {
    setError(null);
    if (demandId) {
      const current = boardDemands.find((d) => d.id === demandId);
      const result = await onUpdate(demandId, toDemandPayload(values, current) as Partial<Demand>);
      if (!result.ok) throw new Error(result.message ?? "Falha ao atualizar demanda.");
    } else {
      const payload = toDemandPayload(values) as Omit<Demand, "id">;
      const result = await onCreate(payload);
      if (!result.ok) throw new Error(result.message ?? "Falha ao criar demanda.");
    }

    if (token) await reloadDemands();
  }

  async function deleteFromModal(demandId: string | number) {
    const result = await onDelete(String(demandId), "Excluída via modal");
    if (!result.ok) throw new Error(result.message ?? "Falha ao excluir demanda.");
    if (token) {
      await reloadDemands();
    } else {
      setBoardDemands((prev) => prev.filter((d) => d.id !== String(demandId)));
    }
  }

  return (
    <Card className="bg-card/70">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Gestão de Demandas</CardTitle>
          <Button
            onClick={() => {
              setEditingDemand(null);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Demanda
          </Button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título ou ID"
          />
          <div className="col-span-2 flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["all", "P0", "P1", "P2", "P3"] as const).map((priority) => (
              <Button
                key={priority}
                size="sm"
                variant={priorityFilter === priority ? "default" : "outline"}
                onClick={() => setPriorityFilter(priority)}
              >
                {priority === "all" ? "Todas" : priority}
              </Button>
            ))}
          </div>
        </div>

        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </CardHeader>

      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((status) => {
              const items = filtered.filter((d) => d.status === status);
              return (
                <Droppable key={status} droppableId={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-w-[320px] max-w-[360px] rounded-xl border border-border/60 bg-background/40 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{status}</h3>
                        <Badge variant="outline">{items.length}</Badge>
                      </div>

                      <div className="space-y-3">
                        {items.map((demand, index) => (
                          <Draggable key={demand.id} draggableId={demand.id} index={index}>
                            {(drag) => (
                              <Card
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                className="cursor-grab border-border/60 bg-card/80 hover:shadow-md"
                              >
                                <CardHeader className="p-3 pb-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge variant="outline" className={priorityTone[demand.priority]}>
                                      {demand.priority}
                                    </Badge>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setEditingDemand(demand);
                                        setModalOpen(true);
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-sm font-medium text-foreground">{(demand as any).titulo ?? demand.name}</p>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 text-xs text-muted-foreground">
                                  <div className="flex items-center justify-between">
                                    <span>{demand.category}</span>
                                    <span>{demand.lastUpdate.toLocaleDateString("pt-BR")}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </CardContent>

      <DemandModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDemand(null);
        }}
        demandToEdit={editingDemand}
        onSave={saveDemand}
        onDelete={deleteFromModal}
      />
    </Card>
  );
}
