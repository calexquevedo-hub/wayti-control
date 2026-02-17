import { useEffect, useState } from "react";
import { Plus, Zap, Edit3, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AutomationEditor } from "./AutomationEditor";
import { createAutomation, deleteAutomation, fetchAutomations, updateAutomation } from "@/lib/api";

interface AutomationRule {
  _id: string;
  title: string;
  isActive: boolean;
  trigger: "TicketCreated" | "TicketUpdated";
  conditions: any[];
  actions: any[];
}

interface AutomationsProps {
  token?: string;
}

function mapUpdateActions(actions: any[]) {
  return actions.map((action) => {
    if (action.type !== "UpdateTicket") return action;
    const field = action.params?.field;
    const value = action.params?.value;
    if (field) {
      return { ...action, params: { [field]: value } };
    }
    return action;
  });
}

export function Automations({ token }: AutomationsProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchAutomations(token)
      .then((data) => setRules(data))
      .catch(() => setRules([]));
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (window.confirm("Tem certeza que deseja excluir esta regra?")) {
      await deleteAutomation(token, id);
      setRules((prev) => prev.filter((r) => r._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automação e Regras</h1>
          <p className="text-muted-foreground">
            Defina gatilhos e ações automáticas para o sistema.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingRule(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule) => (
          <Card
            key={rule._id}
            className={`border-l-4 ${rule.isActive ? "border-l-emerald-500" : "border-l-muted"}`}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  {rule.trigger === "TicketCreated" ? (
                    <Zap className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Edit3 className="h-4 w-4 text-blue-500" />
                  )}
                  {rule.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {rule.trigger === "TicketCreated" ? "Ao criar ticket" : "Ao atualizar ticket"}
                </CardDescription>
              </div>
              <Switch
                checked={rule.isActive}
                onCheckedChange={async (checked: boolean) => {
                  if (!token) return;
                  const updated = await updateAutomation(token, rule._id, { isActive: checked });
                  setRules((prev) => prev.map((item) => (item._id === rule._id ? updated : item)));
                }}
              />
            </CardHeader>
            <CardContent>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{rule.conditions.length} Condições</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="secondary">{rule.actions.length} Ações</Badge>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingRule(rule);
                    setIsEditorOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(rule._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEditorOpen && (
        <AutomationEditor
          rule={editingRule}
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={async (newRule: AutomationRule) => {
            if (!token) return;
            const payload = { ...newRule, actions: mapUpdateActions(newRule.actions) };
            if (editingRule?._id) {
              const updated = await updateAutomation(token, editingRule._id, payload);
              setRules((prev) => prev.map((item) => (item._id === editingRule._id ? updated : item)));
            } else {
              const created = await createAutomation(token, payload);
              setRules((prev) => [created, ...prev]);
            }
            setIsEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
