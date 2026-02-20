import {
  BellRing,
  BarChart3,
  ExternalLink,
  FileSignature,
  Headset,
  Kanban,
  Key,
  Laptop,
  LayoutDashboard,
  Rocket,
  Settings,
  Settings2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

import { canAccessPage } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ProfilePermissions } from "@/types";

type NavItem = {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Meu Espaço",
    items: [
      { value: "Visão Geral", label: "Visão Geral", icon: LayoutDashboard },
      { value: "Inbox", label: "Follow-up", icon: BellRing },
    ],
  },
  {
    title: "Operação",
    items: [
      { value: "Sprint", label: "War Room", icon: Rocket },
      { value: "Demandas", label: "Demandas", icon: Kanban },
      { value: "Chamados", label: "Chamados", icon: Headset },
    ],
  },
  {
    title: "Gestão de TI",
    items: [
      { value: "Ativos", label: "Ativos", icon: Laptop },
      { value: "Contratos", label: "Contratos", icon: FileSignature },
      { value: "Cofre de Senhas", label: "Cofre de Senhas", icon: Key },
    ],
  },
  {
    title: "Dados e Sistema",
    items: [
      { value: "Relatórios", label: "Relatórios", icon: BarChart3 },
      { value: "Automações", label: "Automações", icon: Zap },
      { value: "Auditoria", label: "Auditoria", icon: ShieldCheck },
      { value: "Follow-ups", label: "Configuração de Follow-ups", icon: Settings2 },
      { value: "Configurações", label: "Configurações", icon: Settings },
    ],
  },
];

const footerItems: NavItem[] = [{ value: "Portal", label: "Portal do Cliente", icon: ExternalLink }];

interface SidebarProps {
  active: string;
  onSelect: (label: string) => void;
  onSelectDemandView?: (viewId: string) => void;
  onSelectTicketView?: (viewId: string) => void;
  permissions?: ProfilePermissions;
}

export function Sidebar({ active, onSelect, permissions }: SidebarProps) {
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPage(permissions, item.value)),
    }))
    .filter((group) => group.items.length > 0);

  const visibleFooterItems = footerItems.filter((item) => canAccessPage(permissions, item.value));

  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-border bg-card/70 p-6 backdrop-blur lg:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">WayTI Control</p>
        <h1 className="text-2xl font-semibold">Alta Performance</h1>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <span className="mt-6 mb-2 block px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 md:text-xs">
              {group.title}
            </span>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.value;
                return (
                  <button
                    key={item.value}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-primary/15 text-primary shadow-glow"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() => onSelect(item.value)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {visibleFooterItems.length > 0 ? (
        <div className="mt-auto border-t border-border/70 pt-4">
          {visibleFooterItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.value;
            return (
              <button
                key={item.value}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  isActive ? "bg-primary/15 text-primary shadow-glow" : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => onSelect(item.value)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
