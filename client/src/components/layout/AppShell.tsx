import { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import type { ProfilePermissions } from "@/types";

interface AppShellProps {
  active: string;
  onSelect: (value: string) => void;
  onSelectDemandView?: (viewId: string) => void;
  onSelectTicketView?: (viewId: string) => void;
  userEmail: string;
  permissions?: ProfilePermissions;
  onLogout: () => void;
  onOpenPreferences: () => void;
  children: ReactNode;
}

export function AppShell({
  active,
  onSelect,
  onSelectDemandView,
  onSelectTicketView,
  userEmail,
  permissions,
  onLogout,
  onOpenPreferences,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        active={active}
        onSelect={onSelect}
        onSelectDemandView={onSelectDemandView}
        onSelectTicketView={onSelectTicketView}
        permissions={permissions}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          active={active}
          onSelect={onSelect}
          permissions={permissions}
          userEmail={userEmail}
          onLogout={onLogout}
          onOpenPreferences={onOpenPreferences}
        />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
