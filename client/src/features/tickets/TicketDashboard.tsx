import { useMemo, useState } from "react";
import { Clock3, LayoutGrid, List, Search } from "lucide-react";

type TicketStatus = "Novo" | "Em Atendimento" | "Aguardando Retorno" | "Resolvido";
type TicketPriority = "Baixa" | "Média" | "Alta" | "Urgente";

type TicketItem = {
  id: number;
  title: string;
  requester: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  slaMinutesLeft: number;
  assignee: string;
};

type QuickFilter = "all" | "unassigned" | "mine" | "waiting" | "sla-risk";
type ViewMode = "list" | "kanban";

const quickFilters: Array<{ id: QuickFilter; label: string }> = [
  { id: "unassigned", label: "Não Atribuídos" },
  { id: "mine", label: "Meus Chamados" },
  { id: "waiting", label: "Aguardando Retorno" },
  { id: "sla-risk", label: "SLA em Risco" },
];

const statusColumns: TicketStatus[] = [
  "Novo",
  "Em Atendimento",
  "Aguardando Retorno",
  "Resolvido",
];

const mockTickets: TicketItem[] = [
  {
    id: 1042,
    title: "Sem acesso ao ERP financeiro",
    requester: "Maria Silva",
    category: "Sistemas > ERP",
    priority: "Urgente",
    status: "Novo",
    slaMinutesLeft: 45,
    assignee: "Unassigned",
  },
  {
    id: 1048,
    title: "Erro ao anexar XML de NFe",
    requester: "Carlos Mendes",
    category: "Fiscal > Emissão",
    priority: "Alta",
    status: "Em Atendimento",
    slaMinutesLeft: 130,
    assignee: "João TI",
  },
  {
    id: 1051,
    title: "Solicitação de novo usuário no CRM",
    requester: "Aline Prado",
    category: "Acessos > CRM",
    priority: "Média",
    status: "Aguardando Retorno",
    slaMinutesLeft: -20,
    assignee: "João TI",
  },
  {
    id: 1054,
    title: "Notebook com lentidão extrema",
    requester: "Rafael Gomes",
    category: "Infra > Hardware",
    priority: "Alta",
    status: "Em Atendimento",
    slaMinutesLeft: 210,
    assignee: "Fernanda N1",
  },
  {
    id: 1058,
    title: "Ajuste de assinatura de e-mail",
    requester: "Paula Costa",
    category: "Comunicação > SMTP",
    priority: "Baixa",
    status: "Resolvido",
    slaMinutesLeft: 320,
    assignee: "Fernanda N1",
  },
  {
    id: 1062,
    title: "VPN não conecta fora da matriz",
    requester: "Henrique Dias",
    category: "Rede > VPN",
    priority: "Urgente",
    status: "Novo",
    slaMinutesLeft: 18,
    assignee: "Unassigned",
  },
];

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

export function TicketDashboard() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<number[]>([]);

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
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="sticky top-0 z-10 space-y-3 rounded-lg border bg-white p-4 shadow-sm">
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
                <tr key={ticket.id} className="cursor-pointer border-t hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(ticket.id)}
                      onChange={() => toggleSelect(ticket.id)}
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
                  <article key={ticket.id} className="rounded-lg border bg-white p-3 shadow-sm">
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
