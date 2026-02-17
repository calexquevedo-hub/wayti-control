import { SavedView, ViewFilter, ViewSort } from "./views.types";

type AnyRow = Record<string, any>;

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

function applyFilter(rows: AnyRow[], f: ViewFilter): AnyRow[] {
  const field = f.field;
  const op = f.op;

  return rows.filter((r) => {
    const v = r[field];

    if (op === "eq") return v === f.value;
    if (op === "ne") return v !== f.value;
    if (op === "in") return Array.isArray(f.value) && (f.value as any[]).includes(v);
    if (op === "contains") return String(v ?? "").toLowerCase().includes(String(f.value ?? "").toLowerCase());
    if (op === "isnull") return v === null || v === undefined || v === "";
    if (op === "isnotnull") return !(v === null || v === undefined || v === "");
    if (op === "today") {
      if (!v) return false;
      const dv = new Date(v);
      return isSameDay(dv, new Date());
    }
    if (op === "between") {
      if (!v || !f.value || typeof f.value !== "object") return false;
      const { from, to } = f.value as any;
      const dv = new Date(v).getTime();
      const a = from ? new Date(from).getTime() : -Infinity;
      const b = to ? new Date(to).getTime() : Infinity;
      return dv >= a && dv <= b;
    }
    return true;
  });
}

function compare(a: AnyRow, b: AnyRow, sort: ViewSort) {
  const av = a[sort.field];
  const bv = b[sort.field];

  // priority: P0<P1<P2<P3
  if (sort.field === "priority") {
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 } as any;
    const ai = order[av] ?? 99;
    const bi = order[bv] ?? 99;
    return sort.dir === "asc" ? ai - bi : bi - ai;
  }

  // overdue: true first
  if (sort.field === "overdue") {
    const ai = av ? 1 : 0;
    const bi = bv ? 1 : 0;
    return sort.dir === "asc" ? ai - bi : bi - ai;
  }

  // dates/numbers/strings
  const toComparable = (x: any) => {
    if (x instanceof Date) return x.getTime();
    if (typeof x === "number") return x;
    if (typeof x === "string") {
      const t = Date.parse(x);
      if (!Number.isNaN(t)) return t;
      return x.toLowerCase();
    }
    if (typeof x === "boolean") return x ? 1 : 0;
    return x ?? "";
  };

  const ac = toComparable(av);
  const bc = toComparable(bv);

  if (ac < bc) return sort.dir === "asc" ? -1 : 1;
  if (ac > bc) return sort.dir === "asc" ? 1 : -1;
  return 0;
}

export function applyView<T extends AnyRow>(rows: T[], view: SavedView): T[] {
  let out: AnyRow[] = [...rows];
  view.filters.forEach((f) => (out = applyFilter(out, f)));
  view.sort.forEach((s) => out.sort((a, b) => compare(a, b, s)));
  return out as T[];
}
