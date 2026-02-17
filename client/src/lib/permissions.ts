import type { ProfilePermissions } from "@/types";

export const PAGE_PERMISSIONS: Record<string, (permissions: ProfilePermissions) => boolean> = {
  Inbox: (p) => !!p.tickets.view && !!p.tickets.edit,
  Portal: (p) => !!p.tickets.view && !!p.tickets.create,
  "Visão Geral": (p) => !!p.reports.view,
  Demandas: (p) => !!p.demands.view,
  "Follow-ups": (p) => !!p.demands.view,
  Chamados: (p) => !!p.tickets.view,
  Ativos: (p) => !!p.assets.view,
  Contratos: (p) => !!p.contracts.view,
  "Cofre de Senhas": (p) => !!p.settings.manage,
  Automações: (p) => !!p.settings.manage,
  Relatórios: (p) => !!p.reports.view,
  Auditoria: (p) => !!p.settings.manage,
  Configurações: (p) => !!p.settings.manage,
};

export function canAccessPage(permissions: ProfilePermissions | undefined, page: string) {
  if (!permissions) return false;
  const check = PAGE_PERMISSIONS[page];
  if (!check) return true;
  return check(permissions);
}
