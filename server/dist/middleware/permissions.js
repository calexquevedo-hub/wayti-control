import { rolePermissions } from "../config/permissions";
export function requirePermission(permission) {
    return (_req, res, next) => {
        const user = res.locals.user;
        if (!user?.role) {
            return res.status(403).json({ message: "Acesso restrito." });
        }
        const allowed = rolePermissions(user.role);
        if (!allowed.includes(permission)) {
            return res.status(403).json({ message: "Permissão insuficiente." });
        }
        return next();
    };
}
