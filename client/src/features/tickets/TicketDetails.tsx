import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Clock3,
  Link as LinkIcon,
  Paperclip,
  Printer,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";

type TimelineItem = {
  id: string;
  type: "user" | "agent" | "internal" | "system";
  author?: string;
  message: string;
  createdAt: string;
};

type ReplyMode = "reply" | "internal";

const mockTimeline: TimelineItem[] = [
  {
    id: "1",
    type: "system",
    message: "⚙️ Chamado criado via portal às 09:12",
    createdAt: "09:12",
  },
  {
    id: "2",
    type: "user",
    author: "Carla Souza",
    message:
      "Ao emitir nota fiscal no ERP, retorna erro 502. Isso começou hoje cedo e bloqueou o faturamento.",
    createdAt: "09:14",
  },
  {
    id: "3",
    type: "agent",
    author: "Equipe TI",
    message:
      "Recebido. Já iniciamos análise com o time de aplicações. Pode confirmar se o erro ocorre para todos os usuários?",
    createdAt: "09:20",
  },
  {
    id: "4",
    type: "internal",
    author: "João TI",
    message:
      "Visível apenas para a equipe: último deploy do serviço fiscal foi ontem às 23h. Verificar rollback rápido.",
    createdAt: "09:27",
  },
  {
    id: "5",
    type: "system",
    message: "⚙️ João alterou a prioridade para Alta às 09:31",
    createdAt: "09:31",
  },
];

const priorityTone: Record<string, string> = {
  Baixa: "bg-emerald-100 text-emerald-700",
  Média: "bg-amber-100 text-amber-700",
  Alta: "bg-orange-100 text-orange-700",
  Urgente: "bg-red-100 text-red-700",
};

export function TicketDetails() {
  const [replyMode, setReplyMode] = useState<ReplyMode>("reply");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Aberto");
  const [assignee, setAssignee] = useState("Atribuir a mim");
  const [priority, setPriority] = useState("Alta");
  const [category, setCategory] = useState("Sistemas > ERP");
  const [slaMinutesLeft] = useState(135);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [message]);

  const slaUi = useMemo(() => {
    if (slaMinutesLeft <= 0) {
      return {
        label: "SLA vencido",
        detail: "⏱️ Venceu",
        tone: "bg-red-100 text-red-700 border-red-200",
      };
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
  }, [slaMinutesLeft]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#ticket-1042`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row">
      <section className="flex flex-1 flex-col gap-4">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              #1042 - Erro ao emitir nota fiscal
            </h1>
            <p className="text-sm text-slate-500">Sistema ERP • aberto por Carla Souza</p>
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
            {mockTimeline.map((item) => {
              if (item.type === "system") {
                return (
                  <div key={item.id} className="text-center text-xs text-slate-500">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
                      {item.message}
                    </span>
                  </div>
                );
              }

              const isAgent = item.type === "agent";
              const isInternal = item.type === "internal";
              return (
                <div
                  key={item.id}
                  className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={[
                      "max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                      isAgent && "bg-blue-600 text-white",
                      item.type === "user" && "bg-slate-100 text-slate-800",
                      isInternal &&
                        "border border-amber-200 bg-amber-50 text-amber-900",
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
                  replyMode === "reply"
                    ? "bg-white font-medium text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Responder ao Cliente
              </button>
              <button
                type="button"
                onClick={() => setReplyMode("internal")}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  replyMode === "internal"
                    ? "bg-white font-medium text-slate-900 shadow-sm"
                    : "text-slate-600"
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
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3"
              >
                <option>Aberto</option>
                <option>Pendente</option>
                <option>Resolvido</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Responsável</span>
              <select
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3"
              >
                <option>Atribuir a mim</option>
                <option>João TI</option>
                <option>Maria Service Desk</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Prioridade</span>
              <div className="flex items-center gap-2">
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3"
                >
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                  <option>Urgente</option>
                </select>
                <span
                  className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone[priority]}`}
                >
                  {priority}
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Categoria</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3"
              >
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
              <p className="text-sm font-semibold text-slate-900">Carla Souza</p>
              <p className="text-xs text-slate-500">Financeiro</p>
              <p className="mt-1 text-xs text-slate-600">carla.souza@empresa.com</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
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
