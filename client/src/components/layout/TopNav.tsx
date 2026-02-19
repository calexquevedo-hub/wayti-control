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

const navItems = [
  "Inbox",
  "Portal",
  "Visão Geral",
  "Demandas",
  "Sprint",
  "Follow-ups",
  "Chamados",
  "Ativos",
  "Contratos",
  "Cofre de Senhas",
  "Automações",
  "Relatórios",
  "Auditoria",
  "Configurações",
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
  const allowedNav = navItems.filter((label) => canAccessPage(permissions, label));
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card/70 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {allowedNav.map((label) => (
              <DropdownMenuItem key={label} onClick={() => onSelect(label)}>
                <span className={label === active ? "font-semibold text-primary" : ""}>{label}</span>
              </DropdownMenuItem>
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
