import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  CalendarDays,
  CheckSquare,
  Copy,
  DollarSign,
  ListTodo,
  MessageSquare,
  Plus,
  Trash2,
  UserCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchDomainItems } from "@/lib/api";
import type { Demand } from "@/types";
import {
  demandSchema,
  type DemandFormInput,
  type DemandFormValues,
} from "./demand.schema";

interface DemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  demandToEdit?: Demand | null;
  onSave: (values: DemandFormValues, demandId?: string) => Promise<void>;
  onDelete?: (demandId: string) => Promise<void>;
  onAddComment?: (demandId: string, message: string) => Promise<{ ok: boolean; message?: string }>;
}

const EMPTY_SELECT_VALUE = "__none__";

const defaults: DemandFormInput = {
  titulo: "",
  status: "Backlog",
  prioridade: "P2",
  categoria: "",
  epico: "",
  responsavel: "",
  prazo: "",
  proximo_follow_up: "",
  ultimo_contato: "",
  escalonar_em: "",
  dono_externo: "",
  impacto: "Médio",
  dependencia: "",
  resumo_executivo: "",
  link_evidencia: "",
  financeiro_mensal: 0,
  financeiro_one_off: 0,
  checklist: [],
};

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function DemandModal({
  isOpen,
  onClose,
  token,
  demandToEdit,
  onSave,
  onDelete,
  onAddComment,
}: DemandModalProps) {
  const isEdit = Boolean(demandToEdit?.id);
  const [saving, setSaving] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [epicOptions, setEpicOptions] = useState<string[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);

  const form = useForm<DemandFormInput, unknown, DemandFormValues>({
    resolver: zodResolver(demandSchema),
    defaultValues: defaults,
  });

  const checklistArray = useFieldArray({
    control: form.control,
    name: "checklist",
  });

  useEffect(() => {
    if (!isOpen) return;

    if (!demandToEdit) {
      form.reset(defaults);
      return;
    }

    const raw = demandToEdit as Demand & Record<string, any>;
    const checklist = Array.isArray(raw.checklist)
      ? raw.checklist
      : Array.isArray(demandToEdit.tasks)
      ? demandToEdit.tasks.map((task) => ({ texto: task.title ?? "", checado: Boolean(task.isCompleted) }))
      : [];

    form.reset({
      titulo: raw.titulo ?? demandToEdit.name ?? "",
      status: (raw.status ?? demandToEdit.status ?? "Backlog") as DemandFormValues["status"],
      prioridade: (raw.prioridade ?? demandToEdit.priority ?? "P2") as DemandFormValues["prioridade"],
      categoria: raw.categoria ?? demandToEdit.category ?? "",
      epico: raw.epico ?? demandToEdit.epic ?? "",
      responsavel: raw.responsavel ?? demandToEdit.responsible ?? "",
      prazo: toDateInput(raw.prazo),
      proximo_follow_up: toDateInput(raw.proximo_follow_up ?? demandToEdit.nextFollowUpAt),
      ultimo_contato: toDateInput(raw.ultimo_contato ?? demandToEdit.lastContactAt),
      escalonar_em: toDateInput(raw.escalonar_em),
      dono_externo: raw.dono_externo ?? "",
      impacto: (raw.impacto ?? demandToEdit.impact ?? "Médio") as DemandFormValues["impacto"],
      dependencia: raw.dependencia ?? "",
      resumo_executivo: raw.resumo_executivo ?? demandToEdit.executiveSummary ?? "",
      link_evidencia: raw.link_evidencia ?? "",
      financeiro_mensal: Number(raw.financeiro_mensal ?? demandToEdit.financialMonthly ?? 0),
      financeiro_one_off: Number(raw.financeiro_one_off ?? demandToEdit.financialOneOff ?? 0),
      checklist,
    });
  }, [demandToEdit, form, isOpen]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let mounted = true;

    setDomainsLoading(true);
    Promise.all([fetchDomainItems(token, "CATEGORY"), fetchDomainItems(token, "EPIC")])
      .then(([categories, epics]) => {
        if (!mounted) return;
        setCategoryOptions(categories.map((item) => item.label));
        setEpicOptions(epics.map((item) => item.label));
      })
      .catch(() => {
        if (!mounted) return;
        setCategoryOptions([]);
        setEpicOptions([]);
      })
      .finally(() => {
        if (mounted) setDomainsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, token]);

  const checklist = form.watch("checklist") ?? [];
  const doneChecklist = checklist.filter((item) => item.checado).length;
  const checklistProgress = checklist.length ? Math.round((doneChecklist / checklist.length) * 100) : 0;

  const activity = useMemo(() => {
    if (!demandToEdit) return [];
    const comments = (demandToEdit.comments ?? []).map((comment) => ({
      at: toDate(comment.at) ?? new Date(),
      author: comment.author,
      text: comment.message,
      type: "comment" as const,
    }));

    const audits = (demandToEdit.audits ?? []).map((audit) => ({
      at: toDate(audit.at) ?? new Date(),
      author: audit.actor,
      text: audit.notes ?? `${audit.action}${audit.field ? ` (${audit.field})` : ""}`,
      type: "audit" as const,
    }));

    return [...comments, ...audits]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 25);
  }, [demandToEdit]);

  async function handleSubmit(values: DemandFormValues) {
    setSaving(true);
    setStatusMsg(null);
    try {
      await onSave(values, demandToEdit?.id);
      onClose();
    } catch (error: any) {
      setStatusMsg(error?.message ?? "Falha ao salvar demanda.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !demandToEdit?.id || !onDelete) return;
    await onDelete(demandToEdit.id);
    onClose();
  }

  async function handleAddComment() {
    if (!demandToEdit?.id || !onAddComment || !commentDraft.trim()) return;
    const result = await onAddComment(demandToEdit.id, commentDraft.trim());
    if (!result.ok) {
      setStatusMsg(result.message ?? "Falha ao comentar.");
      return;
    }
    setCommentDraft("");
    setStatusMsg("Comentário registrado. Reabra o card para atualizar a atividade.");
  }

  const categoryChoices = useMemo(() => {
    const current = form.watch("categoria");
    const values = [...categoryOptions];
    if (current && !values.includes(current)) values.push(current);
    return values;
  }, [categoryOptions, form]);

  const epicChoices = useMemo(() => {
    const current = form.watch("epico");
    const values = [...epicOptions];
    if (current && !values.includes(current)) values.push(current);
    return values;
  }, [epicOptions, form]);

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {form.watch("titulo") || (isEdit ? "Editar Demanda" : "Nova Demanda")}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? `na lista ${form.watch("status")}${demandToEdit?.sequentialId ? ` • #${demandToEdit.sequentialId}` : ""}`
                  : `na lista ${form.watch("status")}`}
              </DialogDescription>
            </div>
            <Badge variant="outline">{form.watch("prioridade")}</Badge>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-12 gap-6 px-6 py-5">
          <section className="col-span-12 space-y-6 lg:col-span-8">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" {...form.register("titulo")} />
              {form.formState.errors.titulo ? (
                <p className="text-xs text-destructive">{form.formState.errors.titulo.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumo_executivo">Descrição</Label>
              <Textarea id="resumo_executivo" rows={7} {...form.register("resumo_executivo")} />
            </div>

            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-medium">
                  <ListTodo className="h-4 w-4" /> Checklist
                </div>
                <span className="text-xs text-muted-foreground">
                  {doneChecklist}/{checklist.length}
                </span>
              </div>
              <Progress value={checklistProgress} className="mb-3" />

              <div className="space-y-2">
                {checklistArray.fields.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(form.watch(`checklist.${index}.checado`))}
                      onChange={(event) =>
                        form.setValue(`checklist.${index}.checado`, event.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    <Input {...form.register(`checklist.${index}.texto`)} />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => checklistArray.remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => checklistArray.append({ texto: "", checado: false })}
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar item
              </Button>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" /> Atividade
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
                ) : (
                  activity.map((item, index) => (
                    <div key={`${item.at.toISOString()}-${index}`} className="rounded-md border border-border/50 p-2">
                      <p className="text-xs text-muted-foreground">
                        {item.author} • {item.at.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-sm">{item.text}</p>
                    </div>
                  ))
                )}
              </div>

              {isEdit ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Escrever um comentário..."
                  />
                  <Button type="button" onClick={handleAddComment}>Comentar</Button>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="col-span-12 space-y-4 lg:col-span-4">
            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Propriedades</p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="inline-flex items-center gap-1">
                    <UserCircle2 className="h-3.5 w-3.5" /> Membro
                  </Label>
                  <Input {...form.register("responsavel")} />
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={form.watch("status") || "Backlog"}
                    onValueChange={(value) =>
                      form.setValue("status", value as DemandFormValues["status"], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Backlog">Backlog</SelectItem>
                      <SelectItem value="Esta semana">Esta semana</SelectItem>
                      <SelectItem value="Em execução">Em execução</SelectItem>
                      <SelectItem value="Aguardando terceiros">Aguardando terceiros</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Prioridade</Label>
                  <Select
                    value={form.watch("prioridade") || "P2"}
                    onValueChange={(value) =>
                      form.setValue("prioridade", value as DemandFormValues["prioridade"], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 - Crítico</SelectItem>
                      <SelectItem value="P1">P1 - Alta</SelectItem>
                      <SelectItem value="P2">P2 - Média</SelectItem>
                      <SelectItem value="P3">P3 - Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select
                    value={form.watch("categoria") || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      form.setValue("categoria", value === EMPTY_SELECT_VALUE ? "" : value, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Selecione...</SelectItem>
                      {domainsLoading ? (
                        <SelectItem value="__loading_category__" disabled>
                          Carregando...
                        </SelectItem>
                      ) : categoryChoices.length === 0 ? (
                        <SelectItem value="__empty_category__" disabled>
                          Sem categorias
                        </SelectItem>
                      ) : (
                        categoryChoices.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Épico</Label>
                  <Select
                    value={form.watch("epico") || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      form.setValue("epico", value === EMPTY_SELECT_VALUE ? "" : value, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Épico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Selecione...</SelectItem>
                      {domainsLoading ? (
                        <SelectItem value="__loading_epic__" disabled>
                          Carregando...
                        </SelectItem>
                      ) : epicChoices.length === 0 ? (
                        <SelectItem value="__empty_epic__" disabled>
                          Sem épicos
                        </SelectItem>
                      ) : (
                        epicChoices.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Prazo
                  </Label>
                  <Input
                    type="date"
                    value={form.watch("prazo") || ""}
                    onChange={(event) => form.setValue("prazo", event.target.value || "")}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="inline-flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Financeiro (R$)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" {...form.register("financeiro_mensal")} />
                    <Input type="number" step="0.01" {...form.register("financeiro_one_off")} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Ações</p>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled>
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled>
                  <Archive className="mr-2 h-4 w-4" /> Arquivar
                </Button>
                {isEdit ? (
                  <Button type="button" variant="destructive" className="w-full" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
                  Cancelar
                </Button>
              </div>
            </div>

            {statusMsg ? <p className="text-xs text-amber-600 dark:text-amber-300">{statusMsg}</p> : null}
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
