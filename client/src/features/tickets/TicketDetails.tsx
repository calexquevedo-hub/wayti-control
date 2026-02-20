import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  Link as LinkIcon,
  Paperclip,
  Printer,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";

import type { TicketItem } from "./mockData";
import { mockTickets } from "./mockData";
import type { ViewMode } from "./TicketDashboard";

type ReplyMode = "reply" | "internal";

const priorityTone: Record<string, string> = {
  Baixa: "bg-slate-100 text-slate-700",
  Média: "bg-amber-100 text-amber-700",
  Alta: "bg-orange-100 text-orange-700",
  Urgente: "bg-red-100 text-red-700",
};

interface TicketDetailsProps {
  ticketId: number;
  returnView?: ViewMode;
  onBack?: (view: ViewMode) => void;
}

export function TicketDetails({ ticketId, returnView = "list", onBack }: TicketDetailsProps) {
  const [replyMode, setReplyMode] = useState<ReplyMode>("reply");
  const [message, setMessage] = useState("");
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [loading, setLoading] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => {
      const found = mockTickets.find((item) => item.id === ticketId) ?? null;
      setTicket(found);
      setLoading(false);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [ticketId]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [message]);

  const slaUi = useMemo(() => {
    if (!ticket) return null;
    const slaMinutesLeft = ticket.slaMinutesLeft;
    if (slaMinutesLeft <= 0) {
      return { label: "SLA vencido", detail: "⏱️ Venceu", tone: "bg-red-100 text-red-700 border-red-200" };
    }
    if (slaMinutesLeft <= 120) {
      const h = Math.floor(slaMinutesLeft / 60);
      const m = slaMinutesLeft % 60;
      return {
        label: "SLA em atenção",
        detail: `⏱️ Vence em ${h}h ${m}m`,
        tone: "bg-amber-100 text-amber-700 border-amber-200",
      };
    }
    const h = Math.floor(slaMinutesLeft / 60);
    const m = slaMinutesLeft % 60;
    return {
      label: "SLA saudável",
      detail: `⏱️ Vence em ${h}h ${m}m`,
      tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }, [ticket]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    await navigator.clipboard.writeText(url);
  };

  const handleBack = () => {
    onBack?.(returnView);
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Carregando chamado...</div>;
  }

  if (!ticket || !slaUi) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-slate-600">Chamado não encontrado.</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a Fila
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row">
      <section className="flex flex-1 flex-col gap-4">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <div>
            <button
              type="button"
              onClick={handleBack}
              className="mb-2 inline-flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a Fila
            </button>
            <h1 className="text-lg font-semibold text-slate-900">
              #{ticket.id} - {ticket.title}
            </h1>
            <p className="text-sm text-slate-500">{ticket.category} • aberto por {ticket.requester}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <LinkIcon className="h-4 w-4" />
              Copiar Link
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </header>

        <div className="flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {ticket.timeline.map((item) => {
              if (item.type === "system") {
                return (
                  <div key={item.id} className="text-center text-xs text-slate-500">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">{item.message}</span>
                  </div>
                );
              }

              const isAgent = item.type === "agent";
              const isInternal = item.type === "internal";
              return (
                <div key={item.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                      isAgent && "bg-blue-600 text-white",
                      item.type === "user" && "bg-slate-100 text-slate-800",
                      isInternal && "border border-amber-200 bg-amber-50 text-amber-900",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs opacity-90">
                      <span className="font-semibold">{item.author}</span>
                      {isInternal ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          <ShieldAlert className="h-3 w-3" />
                          Visível apenas para a equipe
                        </span>
                      ) : null}
                      <span>{item.createdAt}</span>
                    </div>
                    <p>{item.message}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="sticky bottom-0 border-t bg-white p-4">
            <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setReplyMode("reply")}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  replyMode === "reply" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Responder ao Cliente
              </button>
              <button
                type="button"
                onClick={() => setReplyMode("internal")}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  replyMode === "internal" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Adicionar Nota Interna
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              placeholder={
                replyMode === "reply"
                  ? "Escreva sua resposta para o cliente..."
                  : "Escreva uma nota interna para a equipe..."
              }
              className="max-h-56 min-h-[88px] w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Digite "/" para respostas prontas</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Paperclip className="h-4 w-4" />
                  Anexar Arquivo
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              </div>
            </div>
          </footer>
        </div>
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80">
        <div className={`rounded-lg border p-4 shadow-sm ${slaUi.tone}`}>
          <p className="text-xs font-semibold uppercase tracking-wide">{slaUi.label}</p>
          <p className="mt-2 text-lg font-semibold">{slaUi.detail}</p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Atributos do Chamado</h2>
          <div className="space-y-4 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
              <select defaultValue={ticket.status} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                <option>Aberto</option>
                <option>Pendente</option>
                <option>Resolvido</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Responsável</span>
              <select defaultValue={ticket.assignee} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                <option>Atribuir a mim</option>
                <option>João TI</option>
                <option>Fernanda N1</option>
                <option>Unassigned</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Prioridade</span>
              <div className="flex items-center gap-2">
                <select defaultValue={ticket.priority} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                  <option>Urgente</option>
                </select>
                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Categoria</span>
              <select defaultValue={ticket.category} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                <option>{ticket.category}</option>
                <option>Sistemas &gt; ERP</option>
                <option>Infraestrutura &gt; Rede</option>
                <option>Acessos &gt; Permissões</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Solicitante</h2>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{ticket.requesterDetails.name}</p>
              <p className="text-xs text-slate-500">{ticket.requesterDetails.department}</p>
              <p className="mt-1 text-xs text-slate-600">{ticket.requesterDetails.email}</p>
            </div>
          </div>
          <button type="button" className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-700">
            Ver chamados anteriores desta pessoa
          </button>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertCircle className="h-4 w-4 text-slate-500" />
            Contexto Rápido
          </h2>
          <ul className="space-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5" /> Última atualização: há 7 min
            </li>
            <li>Canal: Portal</li>
            <li>Ambiente: Produção</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

export default TicketDetails;

