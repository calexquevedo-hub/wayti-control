import {
  BarChart3,
  ClipboardList,
  FileText,
  Inbox,
  KeyRound,
  LayoutGrid,
  Monitor,
  Brain,
  Settings,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { canAccessPage } from "@/lib/permissions";
import type { ProfilePermissions } from "@/types";

const navItems = [
  { label: "Inbox", icon: Inbox },
  { label: "Portal", icon: HelpCircle },
  { label: "Visão Geral", icon: LayoutGrid },
  { label: "Demandas", icon: ClipboardList },
  { label: "Follow-ups", icon: BarChart3 },
  { label: "Chamados", icon: ClipboardList },
  { label: "Ativos", icon: Monitor },
  { label: "Contratos", icon: FileText },
  { label: "Cofre de Senhas", icon: KeyRound },
  { label: "Automações", icon: Brain },
  { label: "Relatórios", icon: FileText },
  { label: "Auditoria", icon: ShieldCheck },
  { label: "Configurações", icon: Settings },
];

const inboxViewShortcuts = [
  { label: "Overdue", viewId: "v_overdue" },
  { label: "Hoje", viewId: "v_today" },
  { label: "Sem próximo", viewId: "v_no_next" },
  { label: "Aguardando", viewId: "v_waiting" },
  { label: "P0", viewId: "v_p0" },
];

interface SidebarProps {
  active: string;
  onSelect: (label: string) => void;
  onSelectDemandView?: (viewId: string) => void;
  onSelectTicketView?: (viewId: string) => void;
  permissions?: ProfilePermissions;
}

export function Sidebar({
  active,
  onSelect,
  onSelectDemandView,
  onSelectTicketView,
  permissions,
}: SidebarProps) {
  const allowedNav = navItems.filter((item) => canAccessPage(permissions, item.label));
  return (
    <aside className="hidden h-full w-64 flex-col gap-6 border-r border-border bg-card/70 p-6 backdrop-blur lg:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          WayTI Control
        </p>
        <h1 className="text-2xl font-semibold">Alta Performance</h1>
      </div>
      <nav className="flex flex-col gap-2">
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.label;
          return (
            <button
              key={item.label}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                isActive
                  ? "bg-primary/15 text-primary shadow-glow"
                  : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => onSelect(item.label)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
