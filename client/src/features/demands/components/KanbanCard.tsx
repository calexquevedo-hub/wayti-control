import { memo } from "react";
import { CheckSquare, Clock3, DollarSign } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Demand, DemandPriority } from "@/types";

interface KanbanCardProps {
  demand: Demand;
  onClick: (demand: Demand) => void;
}

const priorityTone: Record<DemandPriority, string> = {
  P0: "bg-red-500",
  P1: "bg-orange-500",
  P2: "bg-blue-500",
  P3: "bg-emerald-500",
};

const categoryTone = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const epicTone = [
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-lime-500",
  "bg-red-500",
  "bg-blue-500",
];

function getTitle(demand: Demand) {
  return ((demand as Demand & { titulo?: string }).titulo ?? demand.name ?? "").trim();
}

function getSequentialId(demand: Demand) {
  const seq = (demand as Demand & { sequentialId?: number }).sequentialId;
  return typeof seq === "number" ? `#${seq}` : `#${demand.id}`;
}

function getChecklistMeta(demand: Demand) {
  const checklist = (demand as Demand & { checklist?: Array<{ texto: string; checado: boolean }> }).checklist;
  if (Array.isArray(checklist)) {
    const done = checklist.filter((item) => item.checado).length;
    return { done, total: checklist.length };
  }
  const tasks = demand.tasks ?? [];
  const done = tasks.filter((task) => task.isCompleted).length;
  return { done, total: tasks.length };
}

function getDeadline(demand: Demand): Date | null {
  const raw = (demand as Demand & { prazo?: string | Date | null }).prazo;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDeadlineTone(deadline: Date | null) {
  if (!deadline) return "text-slate-500 dark:text-slate-400";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded px-1.5 py-0.5";
  }
  if (diffDays <= 2) {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 rounded px-1.5 py-0.5";
  }
  return "text-slate-500 dark:text-slate-400";
}

function shortMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function initials(name?: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function hashIndex(value: string, size: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash) % size;
}

function getAcronym(text?: string) {
  const cleaned = (text ?? "").trim();
  if (!cleaned) return "";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3);
  }
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function KanbanCardBase({ demand, onClick }: KanbanCardProps) {
  const checklist = getChecklistMeta(demand);
  const deadline = getDeadline(demand);
  const deadlineTone = getDeadlineTone(deadline);
  const monthly = Number((demand as Demand & { financeiro_mensal?: number }).financeiro_mensal ?? demand.financialMonthly ?? 0);
  const oneOff = Number((demand as Demand & { financeiro_one_off?: number }).financeiro_one_off ?? demand.financialOneOff ?? 0);
  const totalFinancial = monthly + oneOff;
  const isChecklistDone = checklist.total > 0 && checklist.done === checklist.total;
  const category = ((demand as Demand & { categoria?: string }).categoria ?? demand.category ?? "").toString();
  const epic = ((demand as Demand & { epico?: string }).epico ?? demand.epic ?? "").toString();
  const categoryBadgeTone = categoryTone[hashIndex(category || demand.id, categoryTone.length)];
  const epicBadgeTone = epicTone[hashIndex(epic || demand.id, epicTone.length)];

  return (
    <Card
      onClick={() => onClick(demand)}
      className="group cursor-pointer rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <CardContent className="p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={`inline-flex h-4 items-center justify-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wider text-white ${priorityTone[demand.priority]}`}
              title={`Prioridade ${demand.priority}`}
            >
              {demand.priority}
            </span>
            {category ? (
              <span
                className={`inline-flex h-4 items-center justify-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wider text-white ${categoryBadgeTone}`}
                title={category}
              >
                {getAcronym(category)}
              </span>
            ) : null}
            {epic ? (
              <span
                className={`inline-flex h-4 items-center justify-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wider text-white ${epicBadgeTone}`}
                title={epic}
              >
                {getAcronym(epic)}
              </span>
            ) : null}
          </div>
          <span className="font-mono text-[10px] text-slate-400">{getSequentialId(demand)}</span>
        </div>

        <p className="line-clamp-3 text-sm font-medium text-slate-900 dark:text-slate-100">{getTitle(demand)}</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {deadline ? (
              <span className={`inline-flex items-center gap-1 ${deadlineTone}`}>
                <Clock3 className="h-3.5 w-3.5" />
                {deadline.toLocaleDateString("pt-BR")}
              </span>
            ) : null}

            {checklist.total > 0 ? (
              <span className={`inline-flex items-center gap-1 ${isChecklistDone ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                <CheckSquare className="h-3.5 w-3.5" />
                {checklist.done}/{checklist.total}
              </span>
            ) : null}

            {totalFinancial > 0 ? (
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <DollarSign className="h-3.5 w-3.5" />
                {shortMoney(totalFinancial)}
              </span>
            ) : null}
          </div>

          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-600 dark:text-slate-100">
            {initials(demand.responsible)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const KanbanCard = memo(KanbanCardBase);
