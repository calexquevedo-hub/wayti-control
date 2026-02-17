import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Trigger = "TicketCreated" | "TicketUpdated";
type Operator = "equals" | "not_equals" | "contains" | "greater_than";
type ActionType = "SendEmail" | "UpdateTicket" | "AssignAgent";

type Condition = {
  field: string;
  operator: Operator;
  value: string;
};

type Action = {
  type: ActionType;
  params: string;
};

export function AutomationForm() {
  const [title, setTitle] = useState("");
  const [trigger, setTrigger] = useState<Trigger>("TicketCreated");
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "priority", operator: "equals", value: "P0" },
  ]);
  const [actions, setActions] = useState<Action[]>([
    { type: "SendEmail", params: '{ "to": "admin@empresa.com", "subject": "Alerta", "body": "Ticket {{ticket_code}}" }' },
  ]);

  return (
    <div className="grid gap-4">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Dados básicos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <div className="grid gap-1">
            <label>Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da regra" />
          </div>
          <div className="grid gap-1">
            <label>Gatilho</label>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as Trigger)}
            >
              <option value="TicketCreated">Ticket criado</option>
              <option value="TicketUpdated">Ticket atualizado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Condições</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setConditions((prev) => [...prev, { field: "", operator: "equals", value: "" }])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          {conditions.map((cond, index) => (
            <div key={`${cond.field}-${index}`} className="grid gap-2 rounded-md border border-border/60 bg-background/40 p-3">
              <div className="grid gap-1">
                <label>Campo</label>
                <Input
                  value={cond.field}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[index] = { ...cond, field: e.target.value };
                    setConditions(next);
                  }}
                  placeholder="priority, category, status"
                />
              </div>
              <div className="grid gap-1">
                <label>Operador</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={cond.operator}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[index] = { ...cond, operator: e.target.value as Operator };
                    setConditions(next);
                  }}
                >
                  <option value="equals">Igual</option>
                  <option value="not_equals">Diferente</option>
                  <option value="contains">Contém</option>
                  <option value="greater_than">Maior que</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label>Valor</label>
                <Input
                  value={cond.value}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[index] = { ...cond, value: e.target.value };
                    setConditions(next);
                  }}
                  placeholder="P0, Aguardando aprovação, Hardware"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== index))}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ações</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActions((prev) => [...prev, { type: "SendEmail", params: "{}" }])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          {actions.map((action, index) => (
            <div key={`${action.type}-${index}`} className="grid gap-2 rounded-md border border-border/60 bg-background/40 p-3">
              <div className="grid gap-1">
                <label>Tipo</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={action.type}
                  onChange={(e) => {
                    const next = [...actions];
                    next[index] = { ...action, type: e.target.value as ActionType };
                    setActions(next);
                  }}
                >
                  <option value="SendEmail">Enviar e-mail</option>
                  <option value="UpdateTicket">Atualizar ticket</option>
                  <option value="AssignAgent">Atribuir agente</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label>Parâmetros (JSON)</label>
                <Textarea
                  value={action.params}
                  onChange={(e) => {
                    const next = [...actions];
                    next[index] = { ...action, params: e.target.value };
                    setActions(next);
                  }}
                  placeholder='{ "to": "admin@empresa.com", "subject": "Alerta", "body": "Ticket {{ticket_code}}" }'
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActions((prev) => prev.filter((_, idx) => idx !== index))}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
