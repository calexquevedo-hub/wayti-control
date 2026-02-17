import type { Demand } from "@/types";
import { TimeSeriesChart } from "@/features/TimeSeriesChart";

interface ExecutiveChartsProps {
  demands: Demand[];
}

export function ExecutiveCharts({ demands }: ExecutiveChartsProps) {
  const totalBudget = demands.reduce((sum, d) => sum + d.budget, 0);
  const totalSpent = demands.reduce((sum, d) => sum + d.spent, 0);
  const remaining = Math.max(totalBudget - totalSpent, 0);

  const topDemands = [...demands]
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border/60 bg-background/40 p-4">
        <p className="text-sm font-semibold">Orçamento vs Gasto</p>
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Orçamento total</span>
            <span>R$ {totalBudget.toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Gasto total</span>
            <span>R$ {totalSpent.toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Saldo</span>
            <span>R$ {remaining.toLocaleString("pt-BR")}</span>
          </div>
          <div className="mt-3 h-3 rounded-full bg-muted">
            <div
              className="h-3 rounded-full bg-primary"
              style={{ width: `${totalBudget ? (totalSpent / totalBudget) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-background/40 p-4">
        <p className="text-sm font-semibold">Top 5 demandas por orçamento</p>
        <div className="mt-3 space-y-3 text-xs text-muted-foreground">
          {topDemands.map((demand) => (
            <div key={demand.id}>
              <div className="flex items-center justify-between">
                <span>{demand.name}</span>
                <span>R$ {demand.budget.toLocaleString("pt-BR")}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-emerald-400"
                  style={{ width: `${totalBudget ? (demand.budget / totalBudget) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <TimeSeriesChart demands={demands} />
    </div>
  );
}
