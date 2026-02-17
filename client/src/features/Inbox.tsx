import React, { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, AlertTriangle } from "lucide-react";

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
import { SavedViewsBar } from "@/features/demands/components/SavedViewsBar";
import { applyView } from "@/features/demands/views/views.engine";
import { loadViewsState } from "@/features/demands/views/views.storage";
import type { SavedView, ViewFilter, ViewOp } from "@/features/demands/views/views.types";
import type { Demand, DemandEscalateTo } from "@/types";

const quickFilters = [
  { id: "today", label: "Hoje" },
  { id: "overdue", label: "Atrasados" },
  { id: "p0", label: "P0" },
  { id: "awaiting", label: "Aguardando terceiros" },
  { id: "noNext", label: "Sem proximo follow-up" },
];

const priorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

interface InboxProps {
  demands: Demand[];
  onRefresh: () => Promise<void>;
  onUpdate: (id: string, payload: Partial<Demand>) => Promise<{ ok: boolean; message?: string }>;
  onContact: (id: string, payload: { channel: string; summary: string; nextFollowUpAt?: Date }) => Promise<void>;
  onEscalate: (id: string, to: DemandEscalateTo) => Promise<void>;
  activeViewId: string | null;
  onChangeView: (viewId: string | null) => void;
}

function formatDate(value?: Date) {
  if (!value) return "-";
  return value.toLocaleDateString("pt-BR");
}

export function Inbox({
  demands,
  onRefresh,
  onUpdate,
  onContact,
  onEscalate,
  activeViewId,
  onChangeView,
}: InboxProps) {
  const [filter, setFilter] = useState<string>("today");
  const [viewNotice, setViewNotice] = useState<string | null>(null);
  const [viewNoticeVisible, setViewNoticeVisible] = useState(false);
  const [contactDemand, setContactDemand] = useState<Demand | null>(null);
  const [escalateDemand, setEscalateDemand] = useState<Demand | null>(null);
  const [contactForm, setContactForm] = useState({
    channel: "Email",
    summary: "",
    nextFollowUpAt: "",
  });
  const [escalateTo, setEscalateTo] = useState<DemandEscalateTo>("N/A");

  useEffect(() => {
    if (!viewNotice) return;
    setViewNoticeVisible(true);
    const hideTimer = window.setTimeout(() => setViewNoticeVisible(false), 2600);
    const clearTimer = window.setTimeout(() => setViewNotice(null), 3000);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [viewNotice]);

  const activeView: SavedView | null = useMemo(() => {
    const st = loadViewsState();
    return st.views.find((v) => v.id === activeViewId) ?? null;
  }, [activeViewId]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const base = activeView ? applyView(demands, activeView) : demands;

    if (activeView) return base;

    return base
      .filter((item) => {
        if (filter === "p0") return item.priority === "P0";
        if (filter === "awaiting") return item.status === "Aguardando terceiros";
        if (filter === "overdue") return item.isOverdue;
        if (filter === "noNext") return !item.nextFollowUpAt;
        if (filter === "today") {
          return item.nextFollowUpAt
            ? item.nextFollowUpAt.toISOString().slice(0, 10) === today
            : false;
        }
        return true;
      })
      .sort((a, b) => {
        const p = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
        if (p !== 0) return p;
        const overdue = Number(Boolean(b.isOverdue)) - Number(Boolean(a.isOverdue));
        if (overdue !== 0) return overdue;
        const nextA = a.nextFollowUpAt ? a.nextFollowUpAt.getTime() : Infinity;
        const nextB = b.nextFollowUpAt ? b.nextFollowUpAt.getTime() : Infinity;
        return nextA - nextB;
      });
  }, [demands, filter, activeView]);

  const getCurrentDraftView = React.useCallback((): Omit<SavedView, "updatedAt"> => {
    const filters: ViewFilter[] = [];
    const addFilter = (field: string, op: ViewOp, value?: unknown) => {
      filters.push({ field, op, value });
    };
    if (filter === "p0") addFilter("priority", "eq", "P0");
    if (filter === "awaiting") addFilter("status", "eq", "Aguardando terceiros");
    if (filter === "overdue") addFilter("overdue", "eq", true);
    if (filter === "noNext") addFilter("nextFollowUpAt", "isnull");
    if (filter === "today") addFilter("nextFollowUpAt", "today");

    return {
      id: "",
      scope: "demands",
      name: "Nova view",
      description: "",
      filters,
      sort: [
        { field: "priority", dir: "asc" },
        { field: "nextFollowUpAt", dir: "asc" },
      ],
      columns: [
        "priority",
        "status",
        "epic",
        "name",
        "externalOwner",
        "nextFollowUpAt",
        "overdue",
        "impact",
        "financialMonthly",
        "financialOneOff",
        "escalateTo",
      ],
      isPinned: true,
      isDefault: false,
    };
  }, [filter]);

  async function handleContactSave() {
    if (!contactDemand) return;
    await onContact(contactDemand.id, {
      channel: contactForm.channel,
      summary: contactForm.summary,
      nextFollowUpAt: contactForm.nextFollowUpAt ? new Date(contactForm.nextFollowUpAt) : undefined,
    });
    setContactDemand(null);
    setContactForm({ channel: "Email", summary: "", nextFollowUpAt: "" });
    await onRefresh();
  }

  async function handleEscalate() {
    if (!escalateDemand) return;
    await onEscalate(escalateDemand.id, escalateTo);
    setEscalateDemand(null);
    await onRefresh();
  }

  return (
    <Card className="bg-card/70">
      <CardHeader>
        <CardTitle>Inbox de Follow-up</CardTitle>
        <CardDescription>Priorize o que exige acao esta semana.</CardDescription>
        <div className="pt-2">
          <SavedViewsBar
            scope="demands"
            activeViewId={activeViewId}
            onChangeActive={onChangeView}
            getCurrentDraftView={getCurrentDraftView}
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {quickFilters.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "default" : "outline"}
              onClick={() => {
                if (activeView) {
                  onChangeView(null);
                  setViewNotice("View desativada para aplicar filtros rápidos.");
                }
                setFilter(item.id);
              }}
              disabled={Boolean(activeView)}
              title={activeView ? "Desative a view para usar filtros rápidos." : undefined}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {viewNotice ? (
          <div
            className={`mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 transition-opacity duration-300 ${
              viewNoticeVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {viewNotice}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground">Nenhuma demanda encontrada.</div>
        ) : null}
        {filtered.map((item) => (
          <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.isOverdue ? "warning" : "secondary"}>{item.priority}</Badge>
                  <span className="text-xs text-muted-foreground">{item.status}</span>
                </div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Épico: {item.epic} • Dono externo: {item.externalOwnerId ?? "Não definido"}
                </p>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <p>Proximo follow-up: {formatDate(item.nextFollowUpAt)}</p>
                <p>Impacto: {item.impact}</p>
                <p>
                  Financeiro: R$ {(item.financialMonthly ?? 0).toLocaleString("pt-BR")}/mes + R$
                  {(item.financialOneOff ?? 0).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setContactDemand(item)}>
                      Registrar contato
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar contato</DialogTitle>
                      <DialogDescription>Atualize o follow-up e proxima data.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 text-sm">
                      <div className="grid gap-2">
                        <label className="font-medium">Canal</label>
                        <select
                          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                          value={contactForm.channel}
                          onChange={(event) =>
                            setContactForm((prev) => ({ ...prev, channel: event.target.value }))
                          }
                        >
                          {["Email", "WhatsApp", "Teams", "Reunião", "Outro"].map((channel) => (
                            <option key={channel} value={channel}>
                              {channel}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <label className="font-medium">Resumo</label>
                        <Input
                          value={contactForm.summary}
                          onChange={(event) =>
                            setContactForm((prev) => ({ ...prev, summary: event.target.value }))
                          }
                          placeholder="Resumo do contato"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="font-medium">Proximo follow-up</label>
                        <Input
                          type="date"
                          value={contactForm.nextFollowUpAt}
                          onChange={(event) =>
                            setContactForm((prev) => ({
                              ...prev,
                              nextFollowUpAt: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setContactDemand(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleContactSave}>Salvar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const next = new Date();
                    next.setDate(next.getDate() + 3);
                    await onUpdate(item.id, { nextFollowUpAt: next });
                    await onRefresh();
                  }}
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Adiar 3 dias
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setEscalateDemand(item)}>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Escalonar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Escalonar demanda</DialogTitle>
                      <DialogDescription>Defina o nivel de escalonamento.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 text-sm">
                      <select
                        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                        value={escalateTo}
                        onChange={(event) =>
                          setEscalateTo(event.target.value as DemandEscalateTo)
                        }
                      >
                        {[
                          "N/A",
                          "Eduardo",
                          "Diretoria",
                          "Financeiro",
                          "Jurídico",
                          "Fornecedor",
                          "Parceiro",
                          "Outro",
                        ].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEscalateDemand(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleEscalate}>Salvar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  onClick={async () => {
                    await onUpdate(item.id, { status: "Concluído" });
                    await onRefresh();
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Concluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
