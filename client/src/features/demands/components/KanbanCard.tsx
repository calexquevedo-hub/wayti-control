import { memo } from "react";
import { CheckSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Demand, DemandPriority } from "@/types";

interface KanbanCardProps {
  demand: Demand;
  onClick: (demand: Demand) => void;
}

const priorityBadgeTone: Record<DemandPriority, string> = {
  P0: "bg-red-50 text-red-800 border-red-200",
  P1: "bg-orange-50 text-orange-800 border-orange-200",
  P2: "bg-blue-50 text-blue-800 border-blue-200",
  P3: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const priorityBorderTone: Record<DemandPriority, string> = {
  P0: "border-l-red-500",
  P1: "border-l-orange-500",
  P2: "border-l-blue-500",
  P3: "border-l-emerald-500",
};

function getTitle(demand: Demand): string {
  return ((demand as unknown as { titulo?: string }).titulo ?? demand.name ?? "").trim();
}

function getChecklistMeta(demand: Demand): { total: number; done: number; progress: number } {
  const explicit = (demand as unknown as { checklist?: Array<{ texto: string; checado: boolean }> }).checklist;
  if (Array.isArray(explicit)) {
    const done = explicit.filter((item) => item.checado).length;
    const total = explicit.length;
    return { total, done, progress: total ? Math.round((done / total) * 100) : 0 };
  }

  const tasks = demand.tasks ?? [];
  const done = tasks.filter((task) => task.isCompleted).length;
  const total = tasks.length;
  return { total, done, progress: total ? Math.round((done / total) * 100) : demand.progress ?? 0 };
}

function getResponsibleInitials(name?: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function KanbanCardComponent({ demand, onClick }: KanbanCardProps) {
  const checklist = getChecklistMeta(demand);

  return (
    <Card
      onClick={() => onClick(demand)}
      className={`cursor-pointer border border-border/60 bg-card/90 border-l-[6px] ${priorityBorderTone[demand.priority]} hover:shadow-md`}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={priorityBadgeTone[demand.priority]}>
            {demand.priority}
          </Badge>
          <span className="text-[11px] text-muted-foreground">#{demand.id}</span>
        </div>
        <p className="text-sm font-medium text-foreground line-clamp-2">{getTitle(demand)}</p>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {checklist.total > 0 ? (
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                Checklist
              </span>
              <span>
                {checklist.done}/{checklist.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${checklist.progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{demand.category}</span>
          <div className="flex items-center gap-2">
            <span>{demand.lastUpdate.toLocaleDateString("pt-BR")}</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
              {getResponsibleInitials(demand.responsible)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const KanbanCard = memo(KanbanCardComponent);
