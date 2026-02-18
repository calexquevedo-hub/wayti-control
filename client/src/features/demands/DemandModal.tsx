import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  CalendarDays,
  CalendarClock,
  CheckSquare,
  Copy,
  DollarSign,
  ListTodo,
  MessageSquare,
  Plus,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { addDays, addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { fetchDomainItems, fetchUsers } from "@/lib/api";
import type { Demand, User } from "@/types";
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

function FollowUpPicker({
  value,
  open,
  onOpenChange,
  onChange,
}: {
  value?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value]);

  const setDate = (date?: Date) => {
    if (!date) {
      onChange("");
      onOpenChange(false);
      return;
    }
    onChange(format(date, "yyyy-MM-dd"));
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start">
          <CalendarClock className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Definir Follow-up"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[320px] p-0">
        <div className="w-[320px] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Definir Follow-up
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setDate(addDays(new Date(), 1))}>
              Amanhã
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDate(addDays(new Date(), 3))}>
              +3 Dias
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDate(addDays(new Date(), 7))}>
              Próx. Semana
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDate(addMonths(new Date(), 1))}>
              Próx. Mês
            </Button>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => setDate(date)}
            locale={ptBR}
            initialFocus
            className="rounded-md border"
          />
          <div className="mt-2 border-t pt-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setDate(undefined)}
            >
              Limpar Data
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
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
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<
    Array<{ at: Date; author: string; text: string; type: "comment" | "audit" }>
  >([]);

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
    const safeDate = (value?: string | null) => (value ? String(value).slice(0, 10) : "");
    const safeISO = (value?: string | null) => (value ? new Date(value).toISOString() : "");
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = raw[key];
        if (value !== undefined && value !== null && value !== "") return value;
      }
      return "";
    };

    const checklist = Array.isArray(raw.checklist)
      ? raw.checklist
      : Array.isArray(raw.tasks)
      ? raw.tasks.map((task: Record<string, unknown>) => ({
          texto: String(task.title ?? ""),
          checado: Boolean(task.isCompleted),
        }))
      : [];

    form.reset({
      titulo: String(pick("titulo", "name")),
      status: (pick("status") || "Backlog") as DemandFormValues["status"],
      prioridade: (pick("prioridade", "priority") || "P2") as DemandFormValues["prioridade"],
      categoria: String(pick("categoria", "category")),
      epico: String(pick("epico", "epic")),
      responsavel: String(pick("responsavel", "responsible")),
      prazo: safeDate(pick("prazo", "deadline")),
      proximo_follow_up: safeISO(pick("proximo_follow_up", "nextFollowUpAt")),
      ultimo_contato: safeDate(pick("ultimo_contato", "lastContactAt")),
      escalonar_em: safeDate(pick("escalonar_em")),
      dono_externo: String(pick("dono_externo")),
      impacto: (pick("impacto", "impact") || "Médio") as DemandFormValues["impacto"],
      dependencia: String(pick("dependencia")),
      resumo_executivo: String(pick("resumo_executivo", "executiveSummary", "description")),
      link_evidencia: String(pick("link_evidencia")),
      financeiro_mensal: Number(pick("financeiro_mensal", "financialMonthly") || 0),
      financeiro_one_off: Number(pick("financeiro_one_off", "financialOneOff") || 0),
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

  useEffect(() => {
    if (!isOpen || !token) return;
    let mounted = true;
    setUsersLoading(true);
    fetchUsers(token)
      .then((data) => {
        if (!mounted) return;
        setUsers(data.filter((item) => item.isActive));
      })
      .catch(() => {
        if (!mounted) return;
        setUsers([]);
      })
      .finally(() => {
        if (mounted) setUsersLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, token]);

  const checklist = form.watch("checklist") ?? [];
  const doneChecklist = checklist.filter((item) => item.checado).length;
  const checklistProgress = checklist.length ? Math.round((doneChecklist / checklist.length) * 100) : 0;
  const currentCategoria = form.watch("categoria");
  const currentEpico = form.watch("epico");
  const currentResponsavel = form.watch("responsavel");

  const activity = useMemo(() => {
    if (!demandToEdit) return [];
    const comments = (demandToEdit.comments ?? []).map((comment) => ({
      at: toDate(comment.at) ?? new Date(),
      author: comment.author,
      text: comment.message,
      type: "comment" as const,
    }));

    const audits = (demandToEdit.audits ?? [])
      .filter((audit) => {
        const field = String(audit.field ?? "").toLowerCase();
        const action = String(audit.action ?? "").toLowerCase();
        if (action === "moved") return true;
        return ["status", "responsible", "responsavel", "prazo", "nextfollowupat", "proximo_follow_up"].includes(
          field
        );
      })
      .map((audit) => ({
        at: toDate(audit.at) ?? new Date(),
        author: audit.actor,
        text:
          audit.notes ??
          (audit.field
            ? `${audit.field}: ${audit.before ?? "-"} → ${audit.after ?? "-"}`
            : String(audit.action)),
        type: "audit" as const,
      }));

    return [...comments, ...audits]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 25);
  }, [demandToEdit]);

  useEffect(() => {
    setActivityItems(activity);
  }, [activity]);

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
    const optimisticComment = {
      at: new Date(),
      author: "Você",
      text: commentDraft.trim(),
      type: "comment" as const,
    };
    setActivityItems((prev) => [optimisticComment, ...prev].slice(0, 25));
    setCommentDraft("");
    setStatusMsg(null);
  }

  const categoryChoices = useMemo(() => {
    const values = [...categoryOptions];
    if (currentCategoria && !values.includes(currentCategoria)) values.push(currentCategoria);
    return values;
  }, [categoryOptions, currentCategoria]);

  const epicChoices = useMemo(() => {
    const values = [...epicOptions];
    if (currentEpico && !values.includes(currentEpico)) values.push(currentEpico);
    return values;
  }, [epicOptions, currentEpico]);

  const userChoices = useMemo(() => {
    const base = users.map((item) => item.name);
    if (currentResponsavel && !base.includes(currentResponsavel)) base.unshift(currentResponsavel);
    return Array.from(new Set(base));
  }, [users, currentResponsavel]);

  const followUpValue = form.watch("proximo_follow_up");

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
                {activityItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
                ) : (
                  activityItems.map((item, index) => (
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
                  <Select
                    value={form.watch("responsavel") || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      form.setValue("responsavel", value === EMPTY_SELECT_VALUE ? "" : value, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Selecione...</SelectItem>
                      {userChoices.map((name) => (
                        <SelectItem key={name} value={name}>
                          <span className="inline-flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                              {name.slice(0, 2).toUpperCase()}
                            </span>
                            {name}
                          </span>
                        </SelectItem>
                      ))}
                      {userChoices.length === 0 ? (
                        <SelectItem value="__empty_user__" disabled>
                          Sem usuários
                        </SelectItem>
                      ) : null}
                      {usersLoading ? (
                        <SelectItem value="__loading_user__" disabled>
                          Carregando...
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
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
                      {categoryChoices.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                      {categoryChoices.length === 0 ? (
                        <SelectItem value="__empty_category__" disabled>
                          Sem categorias
                        </SelectItem>
                      ) : null}
                      {domainsLoading ? (
                        <SelectItem value="__loading_category__" disabled>
                          Carregando...
                        </SelectItem>
                      ) : null}
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
                      {epicChoices.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                      {epicChoices.length === 0 ? (
                        <SelectItem value="__empty_epic__" disabled>
                          Sem épicos
                        </SelectItem>
                      ) : null}
                      {domainsLoading ? (
                        <SelectItem value="__loading_epic__" disabled>
                          Carregando...
                        </SelectItem>
                      ) : null}
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
                    <CalendarClock className="h-3.5 w-3.5" /> Próximo Follow-up
                  </Label>
                  <FollowUpPicker
                    value={followUpValue || ""}
                    open={followUpPickerOpen}
                    onOpenChange={setFollowUpPickerOpen}
                    onChange={(value) =>
                      form.setValue("proximo_follow_up", value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Financeiro
                  </Label>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Valor Mensal (Recorrente)</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          R$
                        </span>
                        <Input className="pl-9" type="number" step="0.01" {...form.register("financeiro_mensal")} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Valor One-off (Setup/Único)</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          R$
                        </span>
                        <Input className="pl-9" type="number" step="0.01" {...form.register("financeiro_one_off")} />
                      </div>
                    </div>
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
