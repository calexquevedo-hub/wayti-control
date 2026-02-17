import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportReportCSV, exportReportPDF } from "@/lib/export";
import { fetchExecutiveReport, fetchExecutiveTickets, fetchSlaReport } from "@/lib/api";
import type { Demand, ReportSnapshot } from "@/types";

interface ReportsProps {
  reportSnapshots: ReportSnapshot[];
  demands?: Demand[];
  token?: string;
}

export function Reports({ reportSnapshots, demands = [], token }: ReportsProps) {
  const [executive, setExecutive] = useState<null | {
    statusCounts: Record<string, number>;
    p0AndOverdue: Demand[];
    totalMonthly: number;
    totalOneOff: number;
    agingBuckets: Record<string, number>;
    topWaiting: Demand[];
  }>(null);
  const [executiveTickets, setExecutiveTickets] = useState<null | {
    total: number;
    overdueCount: number;
    statusCounts: Record<string, number>;
    overdueByQueue: Record<string, number>;
    agingBuckets: Record<string, number>;
    tickets: Array<{
      _id: string;
      subject: string;
      system: string;
      status: string;
      openedAt: Date;
      slaDueAt?: Date | null;
      isSlaOverdue?: boolean;
      demandId: {
        name: string;
        priority: string;
        impact: string;
        epic: string;
        status: string;
        nextFollowUpAt?: Date;
      };
    }>;
  }>(null);
  const [slaReport, setSlaReport] = useState<null | {
    warnMinutes: number;
    totals: { open: number; overdue: number; warning: number; risk48h: number };
    byQueue: Record<string, { open: number; overdue: number; warning: number }>;
    byAssignee: Record<string, { open: number; overdue: number; warning: number }>;
    agingBuckets: Record<string, number>;
  }>(null);

  useEffect(() => {
    if (!token) return;
    fetchExecutiveReport(token)
      .then((data) => setExecutive(data))
      .catch(() => setExecutive(null));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchExecutiveTickets(token)
      .then((data) => setExecutiveTickets(data))
      .catch(() => setExecutiveTickets(null));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchSlaReport(token)
      .then((data) => setSlaReport(data))
      .catch(() => setSlaReport(null));
  }, [token]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Resumo Executivo</CardTitle>
          <CardDescription>Indicadores consolidados para alta gestão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => exportReportCSV(demands, reportSnapshots)}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button className="gap-2" onClick={() => exportReportPDF(demands, reportSnapshots)}>
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
          {reportSnapshots.map((snapshot) => (
            <div
              key={snapshot.period}
              className="rounded-lg border border-border/60 bg-background/40 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{snapshot.period}</p>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Orçamento total</span>
                  <span>R$ {snapshot.totalBudget.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Gasto real</span>
                  <span>R$ {snapshot.totalSpent.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Projetos em risco</span>
                  <span>{snapshot.riskCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Entregas no prazo</span>
                  <span>{snapshot.onTimePercentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Visão Executiva</CardTitle>
          <CardDescription>Dados reais do backend para alta gestão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {!executive ? <p>Nenhum dado executivo carregado.</p> : null}
          {executive ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">Financeiro consolidado</p>
                <p>Total mensal: R$ {executive.totalMonthly.toLocaleString("pt-BR")}</p>
                <p>Total one-off: R$ {executive.totalOneOff.toLocaleString("pt-BR")}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">Itens por status</p>
                {Object.entries(executive.statusCounts).map(([status, count]) => (
                  <p key={status}>
                    {status}: {count}
                  </p>
                ))}
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">Aging buckets</p>
                {Object.entries(executive.agingBuckets).map(([bucket, count]) => (
                  <p key={bucket}>
                    {bucket} dias: {count}
                  </p>
                ))}
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">P0 + Overdue</p>
                {executive.p0AndOverdue.length === 0 ? (
                  <p>Nenhum item crítico.</p>
                ) : (
                  executive.p0AndOverdue.map((item) => (
                    <p key={item.id}>
                      {item.priority} • {item.name}
                    </p>
                  ))
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">Aguardando terceiros</p>
                {executive.topWaiting.length === 0 ? (
                  <p>Nenhuma demanda aguardando terceiros.</p>
                ) : (
                  executive.topWaiting.map((item) => (
                    <p key={item.id}>
                      {item.priority} • {item.name}
                    </p>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-card/70 lg:col-span-2">
        <CardHeader>
          <CardTitle>Tickets Executivos</CardTitle>
          <CardDescription>Tickets vinculados a demandas P0 em aberto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {!executiveTickets ? <p>Nenhum ticket executivo carregado.</p> : null}
          {executiveTickets ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs">
                  Total: {executiveTickets.total}
                </div>
                <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                  SLA estourado: {executiveTickets.overdueCount}
                </div>
                {Object.entries(executiveTickets.overdueByQueue).map(([queue, count]) => (
                  <div
                    key={queue}
                    className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs"
                  >
                    {queue}: {count}
                  </div>
                ))}
              </div>

              {executiveTickets.tickets.length === 0 ? (
                <p>Nenhum ticket executivo encontrado.</p>
              ) : (
                executiveTickets.tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="rounded-lg border border-border/60 bg-background/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{ticket.subject}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-muted px-2 py-0.5">{ticket.system}</span>
                        {ticket.isSlaOverdue ? (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200">
                            SLA estourado
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs">
                      <p>
                        Demanda: {ticket.demandId.name} • Épico: {ticket.demandId.epic} • Status:{" "}
                        {ticket.demandId.status}
                      </p>
                      <p>
                        Próximo follow-up:{" "}
                        {ticket.demandId.nextFollowUpAt
                          ? ticket.demandId.nextFollowUpAt.toLocaleDateString("pt-BR")
                          : "-"}
                      </p>
                      <p>
                        Aberto em {ticket.openedAt.toLocaleDateString("pt-BR")} • SLA vence em{" "}
                        {ticket.slaDueAt ? ticket.slaDueAt.toLocaleDateString("pt-BR") : "-"}
                      </p>
                    </div>
                  </div>
                ))
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">Tickets por status</p>
                  {Object.entries(executiveTickets.statusCounts).map(([status, count]) => (
                    <p key={status} className="text-xs">
                      {status}: {count}
                    </p>
                  ))}
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">Aging buckets</p>
                  {Object.entries(executiveTickets.agingBuckets).map(([bucket, count]) => (
                    <p key={bucket} className="text-xs">
                      {bucket} dias: {count}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-card/70 lg:col-span-2">
        <CardHeader>
          <CardTitle>Dashboard de SLA</CardTitle>
          <CardDescription>Indicadores de SLA por fila e responsável.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {!slaReport ? <p>Nenhum dado de SLA carregado.</p> : null}
          {slaReport ? (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Abertos</p>
                  <p className="text-lg font-semibold text-foreground">{slaReport.totals.open}</p>
                </div>
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-200">SLA estourado</p>
                  <p className="text-lg font-semibold text-amber-100">{slaReport.totals.overdue}</p>
                </div>
                <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
                  <p className="text-xs text-orange-200">
                    Vence em {slaReport.warnMinutes} min
                  </p>
                  <p className="text-lg font-semibold text-orange-100">
                    {slaReport.totals.warning}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3">
                  <p className="text-xs text-blue-100">Risco 48h</p>
                  <p className="text-lg font-semibold text-blue-50">{slaReport.totals.risk48h}</p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">SLA por fila</p>
                  {Object.entries(slaReport.byQueue).map(([queue, stats]) => (
                    <div key={queue} className="mt-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{queue}</p>
                      <p>Abertos: {stats.open}</p>
                      <p>Estourado: {stats.overdue}</p>
                      <p>Vence em breve: {stats.warning}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">SLA por responsável</p>
                  {Object.entries(slaReport.byAssignee).map(([assignee, stats]) => (
                    <div key={assignee} className="mt-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{assignee}</p>
                      <p>Abertos: {stats.open}</p>
                      <p>Estourado: {stats.overdue}</p>
                      <p>Vence em breve: {stats.warning}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">Aging de chamados</p>
                {Object.entries(slaReport.agingBuckets).map(([bucket, count]) => (
                  <p key={bucket} className="text-xs">
                    {bucket} dias: {count}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
