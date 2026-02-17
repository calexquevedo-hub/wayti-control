import { CalendarClock, CircleCheck, Clock, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Demand, FollowUp } from "@/types";

const statusMap = {
  "aberto": { label: "Aberto", icon: Clock, tone: "secondary" },
  "em-validacao": { label: "Em validacao", icon: CalendarClock, tone: "warning" },
  "feito": { label: "Concluido", icon: CircleCheck, tone: "success" },
} as const;

interface FollowUpsProps {
  demands: Demand[];
  onUpdate: (id: string, payload: Partial<Demand>) => Promise<{ ok: boolean; message?: string }>;
}

function todayString() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function FollowUps({ demands, onUpdate }: FollowUpsProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    demandId: demands[0]?.id ?? "",
    title: "",
    owner: "",
    dueDate: todayString(),
  });

  const followUps = useMemo(
    () =>
      demands.flatMap((demand) =>
        demand.followUps.map((item) => ({ ...item, demandId: demand.id, demandName: demand.name }))
      ),
    [demands]
  );

  async function handleAdd() {
    const demand = demands.find((item) => item.id === form.demandId);
    if (!demand) {
      setError("Selecione uma demanda valida.");
      return;
    }

    const newFollowUp: FollowUp = {
      id: `FU-${Math.floor(Math.random() * 900 + 100)}`,
      title: form.title,
      owner: form.owner,
      dueDate: toDate(form.dueDate),
      status: "aberto",
      notes: "Criado manualmente.",
    };

    const result = await onUpdate(demand.id, {
      followUps: [newFollowUp, ...demand.followUps],
      lastUpdate: new Date(),
    });

    if (!result.ok) {
      setError(result.message ?? "Falha ao criar follow-up.");
      return;
    }

    setOpen(false);
    setForm({
      demandId: demand.id,
      title: "",
      owner: "",
      dueDate: todayString(),
    });
  }

  async function handleStatusChange(
    demandId: string,
    followUpId: string,
    status: FollowUp["status"]
  ) {
    const demand = demands.find((item) => item.id === demandId);
    if (!demand) return;

    const updated = demand.followUps.map((item) =>
      item.id === followUpId ? { ...item, status } : item
    );

    await onUpdate(demandId, { followUps: updated, lastUpdate: new Date() });
  }

  async function handleReschedule(demandId: string, followUpId: string, dueDate: string) {
    const demand = demands.find((item) => item.id === demandId);
    if (!demand) return;

    const updated = demand.followUps.map((item) =>
      item.id === followUpId
        ? { ...item, dueDate: toDate(dueDate), status: "em-validacao" as const }
        : item
    );

    await onUpdate(demandId, { followUps: updated, lastUpdate: new Date() });
  }

  return (
    <Card className="bg-card/70">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Agenda de Follow-ups</CardTitle>
            <CardDescription>
              Controle diario de pendencias, aprovacoes e entregas.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo follow-up
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo follow-up</DialogTitle>
                <DialogDescription>
                  Vincule o follow-up a uma demanda ativa.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="grid gap-2">
                  <label className="font-medium">Demanda</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.demandId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, demandId: event.target.value }))
                    }
                  >
                    {demands.map((demand) => (
                      <option key={demand.id} value={demand.id}>
                        {demand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Titulo</label>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Validar aprovacao do fornecedor"
                  />
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="font-medium">Responsavel</label>
                    <Input
                      value={form.owner}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, owner: event.target.value }))
                      }
                      placeholder="Nome do responsavel"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium">Entrega</label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                      }
                    />
                  </div>
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAdd}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {followUps.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhum follow-up cadastrado.
          </div>
        ) : null}
        {followUps.map((item) => {
          const config = statusMap[item.status];
          const Icon = config.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.demandName} • Responsavel: {item.owner}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-2">
                  Entrega
                  <input
                    className="rounded-md border border-input bg-transparent px-2 py-1"
                    type="date"
                    value={item.dueDate.toISOString().slice(0, 10)}
                    onChange={(event) =>
                      handleReschedule(item.demandId, item.id, event.target.value)
                    }
                  />
                </label>
                <Badge variant={config.tone}>{config.label}</Badge>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(item.demandId, item.id, "em-validacao")}
                  >
                    Em validacao
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(item.demandId, item.id, "feito")}
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
