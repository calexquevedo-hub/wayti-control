import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface KanbanColumnProps {
  title: string;
  count: number;
  children: ReactNode;
  placeholder?: ReactNode;
  onAddCard: () => void;
  showAddButton?: boolean;
  isDraggingOver?: boolean;
}

export function KanbanColumn({
  title,
  count,
  children,
  placeholder,
  onAddCard,
  showAddButton = true,
  isDraggingOver = false,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex h-full w-80 shrink-0 flex-col rounded-xl border p-2 ${
        isDraggingOver
          ? "border-blue-300 bg-slate-200 dark:border-blue-700 dark:bg-slate-700/70"
          : "border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1 py-1">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>

      <div className="min-h-[40px] flex-1 space-y-2 overflow-y-auto px-1 pb-2">{children}{placeholder}</div>

      {showAddButton ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-1 justify-start text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          onClick={onAddCard}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar um cartão
        </Button>
      ) : null}
    </div>
  );
}
