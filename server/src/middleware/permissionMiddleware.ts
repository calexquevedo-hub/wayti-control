import type { Request, Response, NextFunction } from "express";

type ModuleKey =
  | "tickets"
  | "demands"
  | "assets"
  | "contracts"
  | "users"
  | "reports"
  | "settings";
type ActionKey = "view" | "create" | "edit" | "delete" | "manage";

export function checkPermission(module: ModuleKey, action: ActionKey) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as { profile?: any } | undefined;
    if (!user?.profile) {
      return res.status(403).json({ message: "Acesso negado: Perfil não encontrado." });
    }

    const permissions = user.profile.permissions;
    if (!permissions || !permissions[module]) {
      return res.status(403).json({ message: "Módulo não permitido." });
    }

    const hasAccess = permissions[module][action];
    if (!hasAccess) {
      return res.status(403).json({ message: `Sem permissão para ${action} em ${module}.` });
    }

    return next();
  };
}

