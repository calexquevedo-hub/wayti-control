import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { Demand } from "@/types";

interface AuditLogProps {
  demands: Demand[];
}

function formatDate(value: Date) {
  if (Number.isNaN(value.getTime())) {
    return "-";
  }
  return value.toLocaleString("pt-BR");
}

export function AuditLog({ demands }: AuditLogProps) {
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const entries = useMemo(() => {
    return demands
      .flatMap((demand) =>
        (demand.audits ?? []).map((audit) => ({
          ...audit,
          demandId: demand.id,
          demandName: demand.name,
        }))
      )
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [demands]);

  const actors = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.actor))).filter(Boolean),
    [entries]
  );
  const actions = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.action))).filter(Boolean),
    [entries]
  );

  const filtered = entries.filter((entry) => {
    const matchActor = actorFilter === "all" || entry.actor === actorFilter;
    const matchAction = actionFilter === "all" || entry.action === actionFilter;
    const matchSearch =
      entry.demandName.toLowerCase().includes(search.toLowerCase()) ||
      (entry.field ?? "").toLowerCase().includes(search.toLowerCase());
    return matchActor && matchAction && matchSearch;
  });

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm lg:grid-cols-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por demanda ou campo"
        />
        <select
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
          value={actorFilter}
          onChange={(event) => setActorFilter(event.target.value)}
        >
          <option value="all">Todos os atores</option>
          {actors.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
        >
          <option value="all">Todas as acoes</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhuma auditoria registrada.</div>
      ) : null}
      {filtered.map((entry, index) => (
        <div
          key={`${entry.at}-${index}`}
          className="rounded-lg border border-border/60 bg-card/70 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{formatDate(entry.at)}</p>
              <p className="text-sm font-semibold">{entry.demandName}</p>
            </div>
            <span className="text-xs text-muted-foreground">{entry.actor}</span>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            <p>Acao: {entry.action}</p>
            {entry.field ? <p>Campo: {entry.field}</p> : null}
            {entry.before ? <p>Antes: {entry.before}</p> : null}
            {entry.after ? <p>Depois: {entry.after}</p> : null}
            {entry.notes ? <p>Notas: {entry.notes}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
