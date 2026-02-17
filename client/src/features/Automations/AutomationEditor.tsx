import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  params: any;
}

export function AutomationEditor({ rule, open, onClose, onSave }: any) {
  const [title, setTitle] = useState("");
  const [trigger, setTrigger] = useState("TicketCreated");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    if (rule) {
      setTitle(rule.title);
      setTrigger(rule.trigger);
      setConditions(rule.conditions || []);
      setActions(rule.actions || []);
    } else {
      setTitle("");
      setTrigger("TicketCreated");
      setConditions([{ field: "priority", operator: "equals", value: "" }]);
      setActions([]);
    }
  }, [rule, open]);

  const addCondition = () =>
    setConditions([...conditions, { field: "status", operator: "equals", value: "" }]);
  const removeCondition = (idx: number) =>
    setConditions(conditions.filter((_, i) => i !== idx));
  const updateCondition = (idx: number, field: keyof Condition, val: string) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], [field]: val };
    setConditions(next);
  };

  const addAction = () => setActions([...actions, { type: "SendEmail", params: {} }]);
  const removeAction = (idx: number) => setActions(actions.filter((_, i) => i !== idx));
  const updateActionType = (idx: number, type: string) => {
    const next = [...actions];
    next[idx] = { type, params: {} };
    setActions(next);
  };
  const updateActionParam = (idx: number, key: string, val: string) => {
    const next = [...actions];
    next[idx].params = { ...next[idx].params, [key]: val };
    setActions(next);
  };

  const handleSave = () => {
    onSave({ title, trigger, conditions, actions, isActive: true });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Regra" : "Nova Automação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid gap-4 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
              1. Gatilho (Quando...)
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Regra</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Alerta de Prioridade Alta"
                />
              </div>
              <div className="space-y-2">
                <Label>Evento Disparador</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TicketCreated">Quando um Chamado é Criado</SelectItem>
                    <SelectItem value="TicketUpdated">Quando um Chamado é Atualizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="rotate-90 text-muted-foreground" />
          </div>

          <div className="grid gap-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                2. Condições (Se...)
              </h3>
              <Button size="sm" variant="outline" onClick={addCondition}>
                <Plus className="mr-1 h-3 w-3" /> E também
              </Button>
            </div>

            {conditions.map((cond, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <Select value={cond.field} onValueChange={(v: string) => updateCondition(idx, "field", v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Prioridade</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="category">Categoria</SelectItem>
                    <SelectItem value="subject">Assunto</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={cond.operator}
                  onValueChange={(v: string) => updateCondition(idx, "operator", v)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="not_equals">Diferente de</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="greater_than">Maior que</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  className="flex-1"
                  value={cond.value}
                  onChange={(e) => updateCondition(idx, "value", e.target.value)}
                  placeholder="Valor (ex: Urgente, Hardware...)"
                />

                <Button size="icon" variant="ghost" onClick={() => removeCondition(idx)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
            {conditions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Sempre executar (sem filtros).
              </p>
            ) : null}
          </div>

          <div className="flex justify-center">
            <ArrowRight className="rotate-90 text-muted-foreground" />
          </div>

          <div className="grid gap-4 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                3. Ações (Então faça...)
              </h3>
              <Button size="sm" variant="outline" onClick={addAction}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar Ação
              </Button>
            </div>

            {actions.map((action, idx) => (
              <div key={idx} className="space-y-3 rounded border bg-background p-3">
                <div className="flex items-center justify-between">
                  <Select value={action.type} onValueChange={(v: string) => updateActionType(idx, v)}>
                    <SelectTrigger className="w-[200px] font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SendEmail">Enviar E-mail</SelectItem>
                      <SelectItem value="UpdateTicket">Atualizar Chamado</SelectItem>
                      <SelectItem value="AssignAgent">Atribuir Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => removeAction(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {action.type === "SendEmail" ? (
                  <div className="grid gap-2 border-l-2 border-blue-200 pl-2">
                    <Input
                      placeholder="Para (ex: gerente@ti.com)"
                      value={action.params.to || ""}
                      onChange={(e) => updateActionParam(idx, "to", e.target.value)}
                    />
                    <Input
                      placeholder="Assunto"
                      value={action.params.subject || ""}
                      onChange={(e) => updateActionParam(idx, "subject", e.target.value)}
                    />
                    <Input
                      placeholder="Mensagem (pode usar {{ticket_code}})"
                      value={action.params.body || ""}
                      onChange={(e) => updateActionParam(idx, "body", e.target.value)}
                    />
                  </div>
                ) : null}

                {action.type === "UpdateTicket" ? (
                  <div className="grid gap-2 border-l-2 border-amber-200 pl-2 lg:grid-cols-2">
                    <Select
                      value={action.params.field || ""}
                      onValueChange={(v: string) => updateActionParam(idx, "field", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Campo a mudar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Definir Prioridade</SelectItem>
                        <SelectItem value="status">Definir Status</SelectItem>
                        <SelectItem value="category">Definir Categoria</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Novo Valor (ex: P1)"
                      value={action.params.value || ""}
                      onChange={(e) => updateActionParam(idx, "value", e.target.value)}
                    />
                  </div>
                ) : null}

                {action.type === "AssignAgent" ? (
                  <div className="border-l-2 border-purple-200 pl-2">
                    <Input
                      placeholder="E-mail do Técnico"
                      value={action.params.agentEmail || ""}
                      onChange={(e) => updateActionParam(idx, "agentEmail", e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ))}
            {actions.length === 0 ? (
              <p className="text-sm italic text-destructive">
                Adicione pelo menos uma ação.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title || actions.length === 0}>
            Salvar Regra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
