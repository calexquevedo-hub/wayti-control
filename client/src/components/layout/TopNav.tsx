import { Bell, ChevronDown, Cpu, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { canAccessPage } from "@/lib/permissions";
import type { ProfilePermissions } from "@/types";

type TopNavItem = {
  value: string;
  label: string;
};

type TopNavGroup = {
  title: string;
  items: TopNavItem[];
};

const navGroups: TopNavGroup[] = [
  {
    title: "Meu Espaço",
    items: [
      { value: "Visão Geral", label: "Visão Geral" },
      { value: "Inbox", label: "Inbox" },
      { value: "Follow-ups", label: "Follow-ups" },
    ],
  },
  {
    title: "Operação",
    items: [
      { value: "Sprint", label: "War Room" },
      { value: "Demandas", label: "Demandas" },
      { value: "Chamados", label: "Chamados" },
    ],
  },
  {
    title: "Gestão de TI",
    items: [
      { value: "Ativos", label: "Ativos" },
      { value: "Contratos", label: "Contratos" },
      { value: "Cofre de Senhas", label: "Cofre de Senhas" },
    ],
  },
  {
    title: "Raiz",
    items: [
      { value: "Relatórios", label: "Relatórios" },
      { value: "Portal", label: "Portal do Cliente" },
      { value: "Configurações", label: "Configurações" },
    ],
  },
];

interface TopNavProps {
  active: string;
  onSelect: (value: string) => void;
  permissions?: ProfilePermissions;
  userEmail: string;
  onLogout: () => void;
  onOpenPreferences: () => void;
}

export function TopNav({
  active,
  onSelect,
  permissions,
  userEmail,
  onLogout,
  onOpenPreferences,
}: TopNavProps) {
  const allowedGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPage(permissions, item.value)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card/70 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {allowedGroups.map((group, index) => (
              <div key={group.title}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </div>
                {group.items.map((item) => (
                  <DropdownMenuItem key={item.value} onClick={() => onSelect(item.value)}>
                    <span className={item.value === active ? "font-semibold text-primary" : ""}>
                      {item.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Cpu className="h-5 w-5" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm text-muted-foreground">Gestão de Demanda TI</p>
          <h2 className="text-lg font-semibold">Centro de Follow-ups</h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="h-5 w-5" />
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="max-w-[200px] gap-2 sm:max-w-none">
              <span className="hidden max-w-[150px] truncate sm:inline">{userEmail}</span>
              <span className="sm:hidden">Conta</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenPreferences}>Preferências</DropdownMenuItem>
            <DropdownMenuItem>Centro de ajuda</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
