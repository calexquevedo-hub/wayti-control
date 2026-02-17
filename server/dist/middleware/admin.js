export function requireAdmin(_req, res, next) {
    const user = res.locals.user;
    if (!user || user.role !== "Admin") {
        return res.status(403).json({ message: "Acesso restrito." });
    }
    return next();
}
