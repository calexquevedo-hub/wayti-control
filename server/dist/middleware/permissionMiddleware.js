export function checkPermission(module, action) {
    return (_req, res, next) => {
        const user = res.locals.user;
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
