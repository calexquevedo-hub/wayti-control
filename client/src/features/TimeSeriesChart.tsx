import type { Demand } from "@/types";

interface TimeSeriesChartProps {
  demands: Demand[];
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short" });
}

export function TimeSeriesChart({ demands }: TimeSeriesChartProps) {
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { date, label: monthLabel(date), spent: 0 };
  });

  demands.forEach((demand) => {
    const monthIndex = months.findIndex(
      (item) => demand.lastUpdate.toISOString().slice(0, 7) === item.date.toISOString().slice(0, 7)
    );
    if (monthIndex >= 0) {
      months[monthIndex].spent += demand.spent;
    }
  });

  const max = Math.max(...months.map((item) => item.spent), 1);

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <p className="text-sm font-semibold">Evolucao de gastos (ultimos 6 meses)</p>
      <div className="mt-4 grid grid-cols-6 gap-2 items-end h-28">
        {months.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div
              className="w-full rounded-md bg-sky-500/70"
              style={{ height: `${(item.spent / max) * 100}%` }}
              title={`R$ ${item.spent.toLocaleString("pt-BR")}`}
            />
            <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
