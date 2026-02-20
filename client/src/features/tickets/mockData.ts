export type TicketStatus = "Novo" | "Em Atendimento" | "Aguardando Retorno" | "Resolvido";
export type TicketPriority = "Baixa" | "Média" | "Alta" | "Urgente";

export type TimelineItem = {
  id: string;
  type: "user" | "agent" | "internal" | "system";
  author?: string;
  message: string;
  createdAt: string;
};

export type TicketRequester = {
  name: string;
  department: string;
  email: string;
};

export type TicketItem = {
  id: number;
  title: string;
  requester: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  slaMinutesLeft: number;
  assignee: string;
  requesterDetails: TicketRequester;
  timeline: TimelineItem[];
};

export const mockTickets: TicketItem[] = [
  {
    id: 1042,
    title: "Sem acesso ao ERP financeiro",
    requester: "Maria Silva",
    category: "Sistemas > ERP",
    priority: "Urgente",
    status: "Novo",
    slaMinutesLeft: 45,
    assignee: "Unassigned",
    requesterDetails: {
      name: "Maria Silva",
      department: "Financeiro",
      email: "maria.silva@empresa.com",
    },
    timeline: [
      { id: "1", type: "system", message: "⚙️ Chamado criado via portal às 09:12", createdAt: "09:12" },
      {
        id: "2",
        type: "user",
        author: "Maria Silva",
        message: "Perdi o acesso ao ERP e não consigo aprovar pagamentos.",
        createdAt: "09:14",
      },
      {
        id: "3",
        type: "agent",
        author: "Equipe TI",
        message: "Recebido. Estamos validando no AD e no SSO.",
        createdAt: "09:20",
      },
    ],
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
    requesterDetails: {
      name: "Carlos Mendes",
      department: "Fiscal",
      email: "carlos.mendes@empresa.com",
    },
    timeline: [
      { id: "4", type: "system", message: "⚙️ João TI assumiu o chamado às 10:02", createdAt: "10:02" },
      {
        id: "5",
        type: "user",
        author: "Carlos Mendes",
        message: "Anexo XML e retorno 502 no envio.",
        createdAt: "10:08",
      },
      {
        id: "6",
        type: "internal",
        author: "João TI",
        message: "Visível apenas para a equipe: suspeita em endpoint fiscal após deploy.",
        createdAt: "10:19",
      },
    ],
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
    requesterDetails: {
      name: "Aline Prado",
      department: "Comercial",
      email: "aline.prado@empresa.com",
    },
    timeline: [
      { id: "7", type: "system", message: "⚙️ Status alterado para Aguardando Retorno às 11:13", createdAt: "11:13" },
      {
        id: "8",
        type: "agent",
        author: "João TI",
        message: "Precisamos do centro de custo para concluir a criação do usuário.",
        createdAt: "11:14",
      },
    ],
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
    requesterDetails: {
      name: "Rafael Gomes",
      department: "Operações",
      email: "rafael.gomes@empresa.com",
    },
    timeline: [
      { id: "9", type: "system", message: "⚙️ Fernanda N1 assumiu o chamado às 08:55", createdAt: "08:55" },
      {
        id: "10",
        type: "user",
        author: "Rafael Gomes",
        message: "Notebook leva 15 minutos para iniciar após atualização.",
        createdAt: "09:01",
      },
    ],
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
    requesterDetails: {
      name: "Paula Costa",
      department: "Marketing",
      email: "paula.costa@empresa.com",
    },
    timeline: [
      { id: "11", type: "system", message: "⚙️ Chamado resolvido às 16:40", createdAt: "16:40" },
      {
        id: "12",
        type: "agent",
        author: "Fernanda N1",
        message: "Assinatura atualizada em Outlook e Gmail.",
        createdAt: "16:41",
      },
    ],
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
    requesterDetails: {
      name: "Henrique Dias",
      department: "Comercial",
      email: "henrique.dias@empresa.com",
    },
    timeline: [
      { id: "13", type: "system", message: "⚙️ Chamado criado por e-mail às 07:41", createdAt: "07:41" },
      {
        id: "14",
        type: "user",
        author: "Henrique Dias",
        message: "Sem conexão VPN no hotel. Preciso acessar ERP agora.",
        createdAt: "07:43",
      },
    ],
  },
];

