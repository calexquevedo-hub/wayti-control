import { useEffect, useMemo, useState } from "react";
import { Clock3, LayoutGrid, List, Search } from "lucide-react";
import type { TicketItem, TicketPriority, TicketStatus } from "./mockData";
import { mockTickets } from "./mockData";

type QuickFilter = "all" | "unassigned" | "mine" | "waiting" | "sla-risk";
export type ViewMode = "list" | "kanban";

const quickFilters: Array<{ id: QuickFilter; label: string }> = [
  { id: "unassigned", label: "Não Atribuídos" },
  { id: "mine", label: "Meus Chamados" },
  { id: "waiting", label: "Aguardando Retorno" },
  { id: "sla-risk", label: "SLA em Risco" },
];

const statusColumns: TicketStatus[] = ["Novo", "Em Atendimento", "Aguardando Retorno", "Resolvido"];

const priorityClass: Record<TicketPriority, string> = {
  Baixa: "bg-slate-100 text-slate-700",
  Média: "bg-blue-100 text-blue-700",
  Alta: "bg-orange-100 text-orange-700",
  Urgente: "bg-red-100 text-red-700",
};

const statusClass: Record<TicketStatus, string> = {
  Novo: "bg-slate-100 text-slate-700",
  "Em Atendimento": "bg-blue-100 text-blue-700",
  "Aguardando Retorno": "bg-amber-100 text-amber-700",
  Resolvido: "bg-emerald-100 text-emerald-700",
};

function formatSla(minutes: number) {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const text = `${h}h ${m}m`;
  return minutes < 0 ? `Vencido há ${text}` : `Vence em ${text}`;
}

function avatar(name: string) {
  if (!name || name === "Unassigned") return "NA";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

interface TicketDashboardProps {
  initialView?: ViewMode;
  onOpenTicket?: (id: number, view: ViewMode) => void;
}

export function TicketDashboard({ initialView = "list", onOpenTicket }: TicketDashboardProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const filtered = useMemo(() => {
    let list = [...mockTickets];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.requester.toLowerCase().includes(q) ||
          String(t.id).includes(q)
      );
    }
    if (activeFilter === "unassigned") list = list.filter((t) => t.assignee === "Unassigned");
    if (activeFilter === "mine") list = list.filter((t) => t.assignee === "João TI");
    if (activeFilter === "waiting") list = list.filter((t) => t.status === "Aguardando Retorno");
    if (activeFilter === "sla-risk") list = list.filter((t) => t.slaMinutesLeft <= 120);
    return list;
  }, [query, activeFilter]);

  const selectedCount = selected.length;

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((t) => t.id));
  };

  const grouped = useMemo(
    () =>
      statusColumns.reduce<Record<TicketStatus, TicketItem[]>>((acc, column) => {
        acc[column] = filtered.filter((item) => item.status === column);
        return acc;
      }, {} as Record<TicketStatus, TicketItem[]>),
    [filtered]
  );

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chamados</h1>
          <p className="text-sm text-gray-500">Gestão da fila de atendimento</p>
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          + Novo Chamado
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-2"
              placeholder="Buscar por ID, título ou usuário..."
            />
          </div>

          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm ${
                viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm ${
                viewMode === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                activeFilter === filter.id
                  ? "bg-blue-100 font-medium text-blue-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-800">{selectedCount} chamados selecionados</p>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-800">
              Atribuir
            </button>
            <button type="button" className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-800">
              Alterar Status
            </button>
            <button type="button" className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-800">
              Mudar Prioridade
            </button>
          </div>
        </div>
      ) : null}

      {viewMode === "list" ? (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="w-12 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.length === filtered.length}
                    onChange={toggleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th className="px-3 py-3 text-left">ID &amp; Título</th>
                <th className="px-3 py-3 text-left">Solicitante &amp; Categoria</th>
                <th className="px-3 py-3 text-left">Prioridade</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="cursor-pointer border-t hover:bg-slate-50"
                  onClick={() => onOpenTicket?.(ticket.id, viewMode)}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(ticket.id)}
                      onChange={() => toggleSelect(ticket.id)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Selecionar chamado ${ticket.id}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">#{ticket.id} - {ticket.title}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{ticket.requester}</p>
                    <p className="text-xs text-slate-500">{ticket.category}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[ticket.status]}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        ticket.slaMinutesLeft < 0 ? "font-semibold text-red-700" : "text-emerald-700"
                      }`}
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatSla(ticket.slaMinutesLeft)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {statusColumns.map((column) => (
            <div key={column} className="w-80 shrink-0 rounded-xl border bg-slate-50/80 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{column}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                  {grouped[column].length}
                </span>
              </div>
              <div className="space-y-3">
                {grouped[column].map((ticket) => (
                  <article
                    key={ticket.id}
                    className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:bg-slate-50"
                    onClick={() => onOpenTicket?.(ticket.id, viewMode)}
                  >
                    <p className="text-xs text-slate-500">#{ticket.id}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{ticket.title}</p>
                    <div className="mt-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={ticket.slaMinutesLeft < 0 ? "font-semibold text-red-700" : "text-emerald-700"}>
                        {formatSla(ticket.slaMinutesLeft)}
                      </span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700">
                        {avatar(ticket.assignee)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TicketDashboard;
