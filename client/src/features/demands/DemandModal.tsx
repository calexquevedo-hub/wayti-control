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
import type { Demand } from "@/types";
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
  prazo: null,
  proximo_follow_up: null,
  ultimo_contato: null,
  escalonar_em: null,
  dono_externo: "",
  impacto: "Médio",
  dependencia: "",
  resumo_executivo: "",
  link_evidencia: "",
  financeiro_mensal: 0,
  financeiro_one_off: 0,
  checklist: [],
};

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
      prazo: raw.prazo ?? null,
      proximo_follow_up: raw.proximo_follow_up ?? (demandToEdit.nextFollowUpAt ? new Date(demandToEdit.nextFollowUpAt).toISOString().slice(0, 10) : null),
      ultimo_contato: raw.ultimo_contato ?? (demandToEdit.lastContactAt ? new Date(demandToEdit.lastContactAt).toISOString().slice(0, 10) : null),
      escalonar_em: raw.escalonar_em ?? null,
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
              <Badge variant="outline">{form.watch("status")}</Badge>
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
                  <select className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" {...form.register("status")}> 
                    <option value="Backlog">Backlog</option>
                    <option value="Esta semana">Esta semana</option>
                    <option value="Em execução">Em execução</option>
                    <option value="Aguardando terceiros">Aguardando terceiros</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Prioridade</Label>
                  <select className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" {...form.register("prioridade")}>
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Input {...form.register("categoria")} />
                </div>
                <div className="grid gap-2">
                  <Label>Épico</Label>
                  <Input {...form.register("epico")} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Responsável</Label>
                  <Input {...form.register("responsavel")} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Prazo Final</Label>
                  <Input type="date" value={form.watch("prazo") ?? ""} onChange={(e) => form.setValue("prazo", e.target.value || null)} />
                </div>
                <div className="grid gap-2">
                  <Label>Próximo Follow-up</Label>
                  <Input type="date" value={form.watch("proximo_follow_up") ?? ""} onChange={(e) => form.setValue("proximo_follow_up", e.target.value || null)} />
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
                  <select className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" {...form.register("impacto")}>
                    <option value="Alto">Alto</option>
                    <option value="Médio">Médio</option>
                    <option value="Baixo">Baixo</option>
                  </select>
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
                  <Input type="date" value={form.watch("ultimo_contato") ?? ""} onChange={(e) => form.setValue("ultimo_contato", e.target.value || null)} />
                </div>
                <div className="grid gap-2">
                  <Label>Escalonar em</Label>
                  <Input type="date" value={form.watch("escalonar_em") ?? ""} onChange={(e) => form.setValue("escalonar_em", e.target.value || null)} />
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
