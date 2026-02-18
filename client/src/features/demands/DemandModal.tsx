import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Demand } from "@/types";
import { CATEGORIES, EPICS } from "./constants";
import {
  demandSchema,
  type DemandFormInput,
  type DemandFormValues,
} from "./demand.schema";

interface DemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  demandToEdit?: Demand | null;
  onSave: (values: DemandFormValues, demandId?: string) => Promise<void>;
  onDelete?: (demandId: string) => Promise<void>;
}

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

const EMPTY_SELECT_VALUE = "__none__";

function toDateInput(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function DemandModal({
  isOpen,
  onClose,
  demandToEdit,
  onSave,
  onDelete,
}: DemandModalProps) {
  const isEdit = Boolean(demandToEdit?.id);

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

    const raw = demandToEdit as any;
    const checklist = Array.isArray(raw.checklist)
      ? raw.checklist
      : Array.isArray(demandToEdit.tasks)
      ? demandToEdit.tasks.map((t: any) => ({ texto: t.title ?? "", checado: Boolean(t.isCompleted) }))
      : [];

    form.reset({
      titulo: raw.titulo ?? demandToEdit.name ?? "",
      status: (raw.status ?? demandToEdit.status ?? "Backlog") as DemandFormValues["status"],
      prioridade: (raw.prioridade ?? demandToEdit.priority ?? "P2") as DemandFormValues["prioridade"],
      categoria: raw.categoria ?? demandToEdit.category ?? "",
      epico: raw.epico ?? demandToEdit.epic ?? "",
      responsavel: raw.responsavel ?? demandToEdit.responsible ?? "",
      prazo: toDateInput(raw.prazo) ?? "",
      proximo_follow_up: toDateInput(raw.proximo_follow_up ?? demandToEdit.nextFollowUpAt) ?? "",
      ultimo_contato: toDateInput(raw.ultimo_contato ?? demandToEdit.lastContactAt) ?? "",
      escalonar_em: toDateInput(raw.escalonar_em) ?? "",
      dono_externo: raw.dono_externo ?? "",
      impacto: (raw.impacto ?? demandToEdit.impact ?? "Médio") as DemandFormValues["impacto"],
      dependencia: raw.dependencia ?? "",
      resumo_executivo: raw.resumo_executivo ?? demandToEdit.executiveSummary ?? "",
      link_evidencia: raw.link_evidencia ?? "",
      financeiro_mensal: Number(raw.financeiro_mensal ?? demandToEdit.financialMonthly ?? 0),
      financeiro_one_off: Number(raw.financeiro_one_off ?? demandToEdit.financialOneOff ?? 0),
      checklist,
    });
  }, [isOpen, demandToEdit, form]);

  const checklist = form.watch("checklist") ?? [];
  const done = checklist.filter((i) => i.checado).length;
  const progress = checklist.length ? Math.round((done / checklist.length) * 100) : 0;

  async function submit(values: DemandFormValues) {
    await onSave(values, demandToEdit?.id);
    onClose();
  }

  async function removeDemand() {
    if (!isEdit || !demandToEdit?.id || !onDelete) return;
    await onDelete(demandToEdit.id);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
          <DialogHeader className="m-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{isEdit ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
              <div className="flex items-center gap-2">
                {isEdit ? (
                  <Badge variant="secondary">
                    #{(demandToEdit as Demand & { sequentialId?: number })?.sequentialId ?? demandToEdit?.id}
                  </Badge>
                ) : null}
                <Badge variant="outline">{form.watch("status")}</Badge>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="max-h-[78vh] overflow-y-auto px-6 py-4">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="detalhes">Detalhes & Contexto</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" {...form.register("titulo")} />
                {form.formState.errors.titulo ? <p className="text-xs text-destructive">{form.formState.errors.titulo.message}</p> : null}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    onValueChange={(value) =>
                      form.setValue("status", value as DemandFormValues["status"], { shouldValidate: true })
                    }
                    value={form.watch("status") || "Backlog"}
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
                <div className="grid gap-2">
                  <Label>Prioridade</Label>
                  <Select
                    onValueChange={(value) =>
                      form.setValue("prioridade", value as DemandFormValues["prioridade"], { shouldValidate: true })
                    }
                    value={form.watch("prioridade") || "P2"}
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
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.watch("categoria") || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      form.setValue("categoria", value === EMPTY_SELECT_VALUE ? "" : value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Selecione...</SelectItem>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Épico</Label>
                  <Select
                    value={form.watch("epico") || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      form.setValue("epico", value === EMPTY_SELECT_VALUE ? "" : value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o épico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Selecione...</SelectItem>
                      {EPICS.map((epic) => (
                        <SelectItem key={epic} value={epic}>
                          {epic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Responsável</Label>
                  <Input {...form.register("responsavel")} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Prazo Final</Label>
                  <Input type="date" value={form.watch("prazo") || ""} onChange={(e) => form.setValue("prazo", e.target.value || "")} />
                </div>
                <div className="grid gap-2">
                  <Label>Próximo Follow-up</Label>
                  <Input type="date" value={form.watch("proximo_follow_up") || ""} onChange={(e) => form.setValue("proximo_follow_up", e.target.value || "")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="detalhes" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Dono Externo</Label>
                  <Input {...form.register("dono_externo")} />
                </div>
                <div className="grid gap-2">
                  <Label>Impacto</Label>
                  <Select
                    onValueChange={(value) =>
                      form.setValue("impacto", value as DemandFormValues["impacto"], { shouldValidate: true })
                    }
                    value={form.watch("impacto") || "Médio"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Impacto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alto">Alto</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Dependência</Label>
                  <Input {...form.register("dependencia")} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Resumo Executivo</Label>
                <Textarea rows={5} {...form.register("resumo_executivo")} />
              </div>

              <div className="grid gap-2">
                <Label>Link/Evidência</Label>
                <Input {...form.register("link_evidencia")} placeholder="https://..." />
                {form.formState.errors.link_evidencia ? <p className="text-xs text-destructive">{form.formState.errors.link_evidencia.message}</p> : null}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Último contato</Label>
                  <Input type="date" value={form.watch("ultimo_contato") || ""} onChange={(e) => form.setValue("ultimo_contato", e.target.value || "")} />
                </div>
                <div className="grid gap-2">
                  <Label>Escalonar em</Label>
                  <Input type="date" value={form.watch("escalonar_em") || ""} onChange={(e) => form.setValue("escalonar_em", e.target.value || "")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Financeiro Mensal</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input type="number" step="0.01" inputMode="decimal" className="pl-9" {...form.register("financeiro_mensal")} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Financeiro One-off</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input type="number" step="0.01" inputMode="decimal" className="pl-9" {...form.register("financeiro_one_off")} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progresso</span>
                  <span>{done}/{checklist.length}</span>
                </div>
                <Progress value={progress} />
              </div>

              <div className="space-y-2">
                {checklistArray.fields.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(form.watch(`checklist.${index}.checado`))}
                      onChange={(e) => form.setValue(`checklist.${index}.checado`, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Input {...form.register(`checklist.${index}.texto`)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => checklistArray.remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={() => checklistArray.append({ texto: "", checado: false })}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar Item
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex items-center justify-between">
            <div>
              {isEdit ? (
                <Button type="button" variant="destructive" onClick={removeDemand}>
                  Excluir Demanda
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">{isEdit ? "Salvar alterações" : "Criar demanda"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
