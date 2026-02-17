export type ViewScope = "demands" | "tickets";

export type ViewOp =
  | "eq"
  | "ne"
  | "in"
  | "contains"
  | "isnull"
  | "isnotnull"
  | "today"
  | "between";

export type ViewFilter = {
  field: string; // ex: "status", "priority", "epic", "nextFollowUpAt", "overdue"
  op: ViewOp;
  value?: unknown; // string | number | boolean | string[] | {from,to}
};

export type ViewSort = {
  field: string; // ex: "priority", "nextFollowUpAt", "impact"
  dir: "asc" | "desc";
};

export type SavedView = {
  id: string;
  scope: ViewScope;
  name: string;
  description?: string;

  filters: ViewFilter[];
  sort: ViewSort[];

  // colunas visíveis na tabela (mantém simples)
  columns: string[];

  isPinned?: boolean;
  isDefault?: boolean;
  updatedAt: string; // ISO
};

export type ViewsState = {
  version: 1;
  views: SavedView[];
  activeByScope: Record<ViewScope, string | null>;
};
