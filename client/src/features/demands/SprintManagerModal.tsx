import { useEffect, useMemo, useState } from "react";
import { Calendar, Edit2, Plus, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createSprint, deleteSprint, fetchSprints, updateSprint } from "@/lib/api";
import type { Sprint } from "@/types";

interface SprintManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  onSaved?: () => Promise<void> | void;
}

interface SprintFormState {
  name: string;
  startDate: string;
  endDate: string;
  status: "Planned" | "Active" | "Closed";
}

const EMPTY_FORM: SprintFormState = {
  name: "",
  startDate: "",
  endDate: "",
  status: "Planned",
};

function toDateInput(value: Date | string | undefined) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function SprintManagerModal({ isOpen, onClose, token, onSaved }: SprintManagerModalProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SprintFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function loadSprints() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSprints(token);
      setSprints(data);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar sprints.");
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    void loadSprints();
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }, [isOpen, token]);

  const orderedSprints = useMemo(
    () => [...sprints].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
    [sprints]
  );

  function handleNew() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError(null);
  }

  function handleEdit(sprint: Sprint) {
    setEditingId(sprint.id);
    setFormData({
      name: sprint.name,
      startDate: toDateInput(sprint.startDate),
      endDate: toDateInput(sprint.endDate),
      status: sprint.status,
    });
    setError(null);
  }

  async function handleSave() {
    if (!token) return;
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      setError("Preencha nome, data inicial e data final.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateSprint(token, editingId, formData);
      } else {
        await createSprint(token, formData);
      }
      await loadSprints();
      await onSaved?.();
      handleNew();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao salvar sprint.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Tem certeza que deseja deletar? As demandas voltarão para o Backlog.")) return;

    setSaving(true);
    setError(null);
    try {
      await deleteSprint(token, id);
      await loadSprints();
      await onSaved?.();
      if (editingId === id) handleNew();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao deletar sprint.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-w-4xl flex-col bg-slate-50 p-0 dark:bg-slate-900">
        <DialogHeader className="border-b bg-white px-6 py-4 dark:bg-slate-950">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" /> Gerenciador de Sprints
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[60vh] overflow-hidden">
          <div className="w-1/2 overflow-y-auto border-r bg-white p-4 dark:bg-slate-950">
            <div className="space-y-3">
              {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
              {!loading && orderedSprints.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma sprint cadastrada.</p>
              ) : null}

              {orderedSprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="flex items-center justify-between rounded-lg border bg-slate-50 p-3 dark:bg-slate-900"
                >
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      {sprint.name}
                      <Badge variant={sprint.status === "Active" ? "default" : "secondary"}>
                        {sprint.status}
                      </Badge>
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {sprint.startDate.toLocaleDateString("pt-BR")} - {sprint.endDate.toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(sprint)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500"
                      onClick={() => void handleDelete(sprint.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/2 space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                {editingId ? "Editar Sprint" : "Nova Sprint"}
              </h3>
              {editingId ? (
                <Button variant="ghost" size="sm" onClick={handleNew}>
                  Cancelar edição
                </Button>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Nome da Sprint</label>
              <Input
                placeholder="Ex: Sprint 12"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Data Início</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Data Fim</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(event) => setFormData((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value as SprintFormState["status"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planejada (Futura)</SelectItem>
                  <SelectItem value="Active">Ativa (Em andamento)</SelectItem>
                  <SelectItem value="Closed">Fechada (Concluída)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="mt-4 w-full" onClick={() => void handleSave()} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              {editingId ? "Salvar Alterações" : "Criar Nova Sprint"}
            </Button>

            {formData.status === "Active" ? (
              <p className="mt-2 text-center text-xs text-orange-500">
                Atenção: Ativar esta sprint fechará automaticamente a sprint ativa atual.
              </p>
            ) : null}

            {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
