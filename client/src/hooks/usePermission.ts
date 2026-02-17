import { useAuth } from "@/hooks/useAuth";

type Module =
  | "tickets"
  | "demands"
  | "assets"
  | "contracts"
  | "users"
  | "reports"
  | "settings";
type Action = "view" | "create" | "edit" | "delete" | "manage";

export function usePermission() {
  const { user } = useAuth();

  const can = (module: Module, action: Action) => {
    if (user?.profile?.name === "Administrador") return true;
    const hasPermission = user?.profile?.permissions?.[module]?.[action];
    return !!hasPermission;
  };

  return { can };
}
