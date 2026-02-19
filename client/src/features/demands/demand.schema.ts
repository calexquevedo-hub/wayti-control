import { z } from "zod";

export const checklistItemSchema = z.object({
  texto: z.string().min(1, "Informe o item"),
  checado: z.boolean().default(false),
});

export const demandSchema = z.object({
  titulo: z.string().min(3, "Título muito curto"),
  status: z.enum([
    "Backlog",
    "Esta semana",
    "Em execução",
    "Aguardando terceiros",
    "Concluído",
    "Cancelado",
  ]),
  prioridade: z.enum(["P0", "P1", "P2", "P3"]),
  categoria: z.string().min(1, "Informe a categoria"),
  epico: z.string().optional().default(""),
  sprintId: z.string().optional().default(""),
  responsavel: z.string().min(1, "Informe o responsável"),

  prazo: z.string().optional().nullable(),
  proximo_follow_up: z.string().optional().nullable(),
  ultimo_contato: z.string().optional().nullable(),
  escalonar_em: z.string().optional().nullable(),

  dono_externo: z.string().optional().default(""),
  impacto: z.enum(["Alto", "Médio", "Baixo"]).default("Médio"),
  dependencia: z.string().optional().default(""),
  resumo_executivo: z.string().optional().default(""),
  link_evidencia: z.string().url("URL inválida").optional().or(z.literal("")),

  financeiro_mensal: z.coerce.number().min(0),
  financeiro_one_off: z.coerce.number().min(0),

  checklist: z.array(checklistItemSchema).default([]),
});

export type DemandFormInput = z.input<typeof demandSchema>;
export type DemandFormValues = z.output<typeof demandSchema>;
