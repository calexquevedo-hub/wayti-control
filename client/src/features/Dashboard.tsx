import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  TrendingUp,
  UserX,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Demand, Ticket } from "@/types";
import { ExecutiveCharts } from "@/features/ExecutiveCharts";

const statusMap: Record<
  Demand["status"],
  { label: string; tone: "default" | "warning" | "success" | "secondary" }
> = {
  "Aguardando terceiros": { label: "Aguardando terceiros", tone: "warning" },
  "Backlog": { label: "Backlog", tone: "default" },
  "Esta semana": { label: "Esta semana", tone: "secondary" },
  "Em execução": { label: "Em execução", tone: "secondary" },
  "Concluído": { label: "Concluído", tone: "success" },
  "Cancelado": { label: "Cancelado", tone: "default" },
};

interface DashboardProps {
  demands: Demand[];
  tickets: Ticket[];
}

type TimeFilter = "today" | "week" | "month";

function isWithinRange(date: Date, filter: TimeFilter) {
  const now = new Date();
  if (filter === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  const days = filter === "week" ? 7 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= start && date <= now;
}

export function Dashboard({ demands, tickets }: DashboardProps) {
  const totalBudget = demands.reduce((sum, demand) => sum + (Number(demand.budget) || 0), 0);
  const totalSpent = demands.reduce((sum, demand) => sum + (Number(demand.spent) || 0), 0);
  const hasData = demands.length > 0;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");

  const ticketMetrics = useMemo(() => {
    const filtered = tickets.filter((ticket) => isWithinRange(ticket.openedAt, timeFilter));
    const open = filtered.filter(
      (ticket) => !["Resolvido", "Fechado", "Cancelado"].includes(ticket.status)
    );
    const overdue = open.filter((ticket) => ticket.isSlaOverdue).length;
    const unassigned = open.filter((ticket) => !ticket.assignee).length;
    const resolvedInRange = tickets.filter(
      (ticket) => ticket.resolvedAt && isWithinRange(ticket.resolvedAt, timeFilter)
    ).length;

    const statusBuckets = [
      {
        name: "Novo",
        value: filtered.filter((t) => t.status === "Novo").length,
      },
      {
        name: "Aberto",
        value: filtered.filter((t) => ["Triagem", "Em atendimento"].includes(t.status)).length,
      },
      {
        name: "Pendente",
        value: filtered.filter((t) =>
          ["Aguardando fornecedor", "Aguardando solicitante"].includes(t.status)
        ).length,
      },
      {
        name: "Resolvido",
        value: filtered.filter((t) => ["Resolvido", "Fechado"].includes(t.status)).length,
      },
    ];

    const priorityBuckets = ["P0", "P1", "P2", "P3"].map((priority) => ({
      name: priority,
      value: filtered.filter((t) => t.priority === priority).length,
    }));

    const agents = open.reduce<Record<string, { name: string; count: number; overdue: number }>>(
      (acc, ticket) => {
        const key = ticket.assignee ?? "Não atribuído";
        if (!acc[key]) acc[key] = { name: key, count: 0, overdue: 0 };
        acc[key].count += 1;
        if (ticket.isSlaOverdue) acc[key].overdue += 1;
        return acc;
      },
      {}
    );
    const topAgents = Object.values(agents)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      openCount: open.length,
      overdueCount: overdue,
      unassignedCount: unassigned,
      resolvedCount: resolvedInRange,
      statusBuckets,
      priorityBuckets,
      topAgents,
    };
  }, [tickets, timeFilter]);

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-border/60 bg-background/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Visão Gerencial de Chamados</h2>
            <p className="text-sm text-muted-foreground">Painel operacional inspirado no Zoho Desk.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`rounded-md border px-3 py-1 text-xs ${
                timeFilter === "today"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
              onClick={() => setTimeFilter("today")}
            >
              Hoje
            </button>
            <button
              className={`rounded-md border px-3 py-1 text-xs ${
                timeFilter === "week"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
              onClick={() => setTimeFilter("week")}
            >
              Esta Semana
            </button>
            <button
              className={`rounded-md border px-3 py-1 text-xs ${
                timeFilter === "month"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
              onClick={() => setTimeFilter("month")}
            >
              Este Mês
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <Card className="bg-card/70">
            <CardHeader>
              <CardDescription>Em Aberto</CardDescription>
              <CardTitle>{ticketMetrics.openCount}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Inbox className="h-4 w-4 text-primary" />
              Chamados ativos no período
            </CardContent>
          </Card>
          <Card className="status-warning-card">
            <CardHeader>
              <CardDescription className="font-semibold text-[var(--status-warning-fg)]">Vencidos</CardDescription>
              <CardTitle className="text-[var(--status-warning-strong)]">{ticketMetrics.overdueCount}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm font-medium text-[var(--status-warning-fg)]">
              <AlertTriangle className="h-4 w-4 text-[var(--status-warning-strong)]" />
              SLA estourado
            </CardContent>
          </Card>
          <Card className="bg-card/70 border-destructive/40">
            <CardHeader>
              <CardDescription>Não Atribuídos</CardDescription>
              <CardTitle className="text-destructive">{ticketMetrics.unassignedCount}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserX className="h-4 w-4 text-destructive" />
              Sem responsável definido
            </CardContent>
          </Card>
          <Card className="status-success-card">
            <CardHeader>
              <CardDescription className="font-semibold text-[var(--status-success-fg)]">Resolvidos Hoje</CardDescription>
              <CardTitle className="text-[var(--status-success-strong)]">{ticketMetrics.resolvedCount}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm font-medium text-[var(--status-success-fg)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--status-success-strong)]" />
              Produtividade no período
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Chamados por Status</CardTitle>
            <CardDescription>Novo, Aberto, Pendente, Resolvido.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketMetrics.statusBuckets}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(148,163,184,0.1)" }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Chamados por Prioridade</CardTitle>
            <CardDescription>Distribuição P0–P3.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ticketMetrics.priorityBuckets}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {ticketMetrics.priorityBuckets.map((entry, index) => {
                    const colors = ["#fb7185", "#f97316", "#38bdf8", "#4ade80"];
                    return <Cell key={entry.name} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Top 5 Agentes com Mais Chamados Abertos</CardTitle>
            <CardDescription>Gargalos de atendimento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {ticketMetrics.topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem chamados em aberto.</p>
            ) : (
              ticketMetrics.topAgents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.overdue} vencido(s)
                    </p>
                  </div>
                  <Badge variant={agent.overdue > 0 ? "warning" : "outline"}>
                    {agent.count} em aberto
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Saúde Operacional</CardTitle>
            <CardDescription>Impacto financeiro e follow-ups em andamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Orçamento consolidado: R$ {totalBudget.toLocaleString("pt-BR")}
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Gasto real: R$ {totalSpent.toLocaleString("pt-BR")}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {demands.reduce((sum, item) => sum + item.followUps.length, 0)} follow-ups ativos
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/70">
          <CardHeader>
            <CardDescription>Orçamento consolidado</CardDescription>
            <CardTitle>R$ {totalBudget.toLocaleString("pt-BR")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            {hasData ? "60% do planejado para 2026" : "Sem dados carregados"}
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader>
            <CardDescription>Gasto real</CardDescription>
            <CardTitle>R$ {totalSpent.toLocaleString("pt-BR")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            {hasData ? "-8% vs trimestre anterior" : "Sem dados carregados"}
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader>
            <CardDescription>Follow-ups ativos</CardDescription>
            <CardTitle>{demands.reduce((sum, item) => sum + item.followUps.length, 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {hasData ? "Monitoramento diário de prazos críticos" : "Sem dados carregados"}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Demandas prioritárias</CardTitle>
            <CardDescription>Projetos e contratos em acompanhamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demands.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem demandas cadastradas.</p>
            ) : (
              demands.map((demand) => (
                <div
                  key={demand.id}
                  className="rounded-lg border border-border/60 bg-background/40 p-4"
                >
                  <div className="flex items-center justify-between">
                  <div>
                      <h3 className="text-base font-semibold">{demand.name}</h3>
                  </div>
                    <Badge variant={statusMap[demand.status].tone}>
                      {statusMap[demand.status].label}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Patrocinador: {demand.sponsor}</span>
                    <span>Atualizado em {demand.lastUpdate.toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Riscos e mitigações</CardTitle>
            <CardDescription>Alertas de contratos, compras e implantações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demands.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem riscos registrados.</p>
            ) : (
              <>
                <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold">Contratos com SLA crítico</p>
                  <p className="text-xs text-muted-foreground">Análise em andamento.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold">Compras em atraso</p>
                  <p className="text-xs text-muted-foreground">Revisar backlog financeiro.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                  <p className="text-sm font-semibold">Implantações críticas</p>
                  <p className="text-xs text-muted-foreground">Validação de janela de mudança pendente.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Painel Executivo</CardTitle>
            <CardDescription>Visão consolidada de custos e prioridades.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <ExecutiveCharts demands={demands} />
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados para exibir gráficos.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
