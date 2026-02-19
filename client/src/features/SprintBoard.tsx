import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DragUpdate,
  type DropResult,
} from "@hello-pangea/dnd";
import { CalendarDays, Settings, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DemandModal } from "@/features/demands/DemandModal";
import { KanbanCard } from "@/features/demands/components/KanbanCard";
import { KanbanColumn } from "@/features/demands/components/KanbanColumn";
import { SprintManagerModal } from "@/features/demands/SprintManagerModal";
import type { DemandFormValues } from "@/features/demands/demand.schema";
import { fetchCurrentSprint, moveDemand } from "@/lib/api";
import type { Demand, DemandStatus, Sprint } from "@/types";

const COLUMNS: DemandStatus[] = [
  "Backlog",
  "Esta semana",
  "Em execução",
  "Aguardando terceiros",
  "Concluído",
  "Cancelado",
];

interface SprintBoardProps {
  token?: string;
  demands: Demand[];
  onUpdate: (id: string, payload: Partial<Demand>) => Promise<{ ok: boolean; message?: string }>;
  onAddComment: (id: string, message: string) => Promise<{ ok: boolean; message?: string }>;
  onRefresh?: () => Promise<void>;
}

function toDemandPayload(values: DemandFormValues, current?: Demand): Partial<Demand> {
  const checklistProgress = values.checklist.length
    ? Math.round((values.checklist.filter((i) => i.checado).length / values.checklist.length) * 100)
    : 0;

  return {
    name: values.titulo,
    titulo: values.titulo,
    category: values.categoria as any,
    categoria: values.categoria,
    status: values.status,
    priority: values.prioridade,
    prioridade: values.prioridade,
    impact: values.impacto as any,
    impacto: values.impacto,
    epic: values.epico,
    epico: values.epico,
    sprintId: values.sprintId || undefined,
    responsible: values.responsavel,
    responsavel: values.responsavel,
    progress: checklistProgress,
    financialMonthly: values.financeiro_mensal,
    financialOneOff: values.financeiro_one_off,
    executiveSummary: values.resumo_executivo,
    budget: current?.budget ?? 0,
    spent: current?.spent ?? 0,
    lastUpdate: new Date(),
    nextFollowUpAt: values.proximo_follow_up ? new Date(values.proximo_follow_up) : undefined,
    lastContactAt: values.ultimo_contato ? new Date(values.ultimo_contato) : undefined,
    tasks: values.checklist.map((item) => ({
      title: item.texto,
      isCompleted: item.checado,
    })),
    prazo: values.prazo ? new Date(values.prazo) : undefined,
    ultimo_contato: values.ultimo_contato ? new Date(values.ultimo_contato) : undefined,
    proximo_follow_up: values.proximo_follow_up ? new Date(values.proximo_follow_up) : undefined,
    escalonar_em: values.escalonar_em ? new Date(values.escalonar_em) : undefined,
    dependencia: values.dependencia,
    financeiro_mensal: values.financeiro_mensal,
    financeiro_one_off: values.financeiro_one_off,
    link_evidencia: values.link_evidencia,
    resumo_executivo: values.resumo_executivo,
    checklist: values.checklist,
  } as Partial<Demand>;
}

export function SprintBoard({ token, demands, onUpdate, onAddComment, onRefresh }: SprintBoardProps) {
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
  const [loadingSprint, setLoadingSprint] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardDemands, setBoardDemands] = useState<Demand[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const loadSprint = useCallback(async () => {
    if (!token) return;
    setLoadingSprint(true);
    setError(null);
    try {
      const sprint = await fetchCurrentSprint(token);
      setCurrentSprint(sprint);
    } catch (e: any) {
      setCurrentSprint(null);
      setError(e?.message ?? "Nenhuma sprint ativa.");
    } finally {
      setLoadingSprint(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSprint();
  }, [loadSprint]);

  useEffect(() => {
    if (!currentSprint) {
      setBoardDemands([]);
      return;
    }
    const filtered = demands.filter((item) => !item.isArchived && item.sprintId === currentSprint.id);
    setBoardDemands(filtered);
  }, [currentSprint, demands]);

  const done = useMemo(
    () => boardDemands.filter((item) => item.status === "Concluído").length,
    [boardDemands]
  );
  const total = boardDemands.length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const daysLeft = useMemo(() => {
    if (!currentSprint) return 0;
    const diff = currentSprint.endDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [currentSprint]);

  const handleCardClick = useCallback((demand: Demand) => {
    setEditingDemand(demand);
    setModalOpen(true);
  }, []);

  const handleDragOver = useCallback((_update: DragUpdate) => {}, []);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
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
          const resultUpdate = await onUpdate(draggableId, { status: nextStatus, lastUpdate: new Date() });
          if (!resultUpdate.ok) throw new Error(resultUpdate.message ?? "Falha ao mover demanda.");
        }
      } catch (e: any) {
        setBoardDemands(previous);
        setError(e?.message ?? "Falha ao mover demanda.");
      }
    },
    [boardDemands, onUpdate, token]
  );

  async function saveDemand(values: DemandFormValues, demandId?: string) {
    if (!demandId) return;
    const current = boardDemands.find((d) => d.id === demandId);
    const response = await onUpdate(demandId, toDemandPayload(values, current));
    if (!response.ok) throw new Error(response.message ?? "Falha ao atualizar demanda.");
  }

  const reloadBoardData = useCallback(async () => {
    await onRefresh?.();
    await loadSprint();
  }, [loadSprint, onRefresh]);

  return (
    <Card className="bg-card/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="inline-flex items-center gap-2">
            <Target className="h-5 w-5" /> Visão de Sprint
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsManagerOpen(true)}>
              <Settings className="mr-2 h-4 w-4" /> Gerenciar Sprints
            </Button>
            {currentSprint ? <Badge variant="outline">{currentSprint.status}</Badge> : null}
          </div>
        </div>

        {loadingSprint ? (
          <p className="text-sm text-muted-foreground">Carregando sprint atual...</p>
        ) : currentSprint ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{currentSprint.name}</p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {currentSprint.startDate.toLocaleDateString("pt-BR")} - {currentSprint.endDate.toLocaleDateString("pt-BR")}
                </p>
              </div>
              <p className="text-sm font-medium">Faltam {daysLeft} dia(s)</p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>
                  {done}/{total}
                </span>
              </div>
              <Progress value={progress} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{error ?? "Nenhuma sprint ativa encontrada."}</p>
        )}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardHeader>

      <CardContent>
        {!currentSprint ? null : (
          <DragDropContext onDragUpdate={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUMNS.map((status) => {
                const items = boardDemands.filter((d) => d.status === status);
                return (
                  <Droppable key={status} droppableId={status}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        <KanbanColumn
                          title={status}
                          count={items.length}
                          isDraggingOver={snapshot.isDraggingOver}
                          onAddCard={() => {}}
                          showAddButton={false}
                          placeholder={provided.placeholder}
                        >
                          {items.map((demand, index) => (
                            <Draggable key={demand.id} draggableId={demand.id} index={index}>
                              {(drag) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  {...drag.dragHandleProps}
                                  className="cursor-grab"
                                >
                                  <KanbanCard demand={demand} onClick={handleCardClick} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </KanbanColumn>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </CardContent>

      <DemandModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDemand(null);
        }}
        token={token}
        demandToEdit={editingDemand}
        onSave={saveDemand}
        onAddComment={onAddComment}
        onRefresh={reloadBoardData}
      />

      <SprintManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        token={token!}
        onSaved={reloadBoardData}
      />
    </Card>
  );
}
