import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { LoginPanel } from "@/components/layout/LoginPanel";
import { useAuth } from "@/hooks/useAuth";
import { useDemandData } from "@/hooks/useDemandData";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { canAccessPage } from "@/lib/permissions";
import {
  addTicketComment,
  changePassword,
  createTicket,
  createContact,
  deleteTicket,
  escalateDemand,
  fetchExternalParties,
  fetchUsers,
  fetchAssets,
  fetchTickets,
  fetchContracts,
  fetchServices,
  fetchKnowledgeArticles,
  createContract,
  updateContract,
  linkTicketDemand,
  updateTicket,
  approveTicket,
  rejectTicket,
  requestEmailChange,
  verifyEmailChange,
  updateMyProfile,
} from "@/lib/api";
import { loadViewsState, setActiveView } from "@/features/demands/views/views.storage";
import type {
  Asset,
  Contract,
  DemandEscalateTo,
  ExternalParty,
  KnowledgeArticle,
  ServiceCatalog,
  Ticket,
  User,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DemandBoard = lazy(() => import("@/features/DemandBoard").then((m) => ({ default: m.DemandBoard })));
const SprintBoard = lazy(() =>
  import("@/features/demands/SprintBoard").then((m) => ({ default: m.SprintBoard }))
);
const DemandsDashboardPage = lazy(() =>
  import("@/features/demands/DemandsDashboardPage").then((m) => ({ default: m.DemandsDashboardPage }))
);
const Inbox = lazy(() => import("@/features/Inbox").then((m) => ({ default: m.Inbox })));
const Portal = lazy(() => import("@/features/Portal").then((m) => ({ default: m.Portal })));
const Reports = lazy(() => import("@/features/Reports").then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import("@/features/Settings").then((m) => ({ default: m.Settings })));
const Tickets = lazy(() => import("@/features/Tickets").then((m) => ({ default: m.Tickets })));
const AssetsPage = lazy(() =>
  import("@/features/assets/AssetsPage").then((m) => ({ default: m.AssetsPage }))
);
const Contracts = lazy(() => import("@/features/Contracts").then((m) => ({ default: m.Contracts })));
const Vault = lazy(() => import("@/features/Vault").then((m) => ({ default: m.Vault })));

const pages = [
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

const PAGE_PATHS: Record<string, string> = {
  Inbox: "/inbox",
  Portal: "/portal",
  "Visão Geral": "/",
  Demandas: "/demandas",
  Sprint: "/sprints",
  "Follow-ups": "/configuracoes",
  Chamados: "/chamados",
  Ativos: "/ativos",
  Contratos: "/contratos",
  "Cofre de Senhas": "/senhas",
  Automações: "/configuracoes",
  Relatórios: "/relatorios",
  Auditoria: "/configuracoes",
  Configurações: "/configuracoes",
};

const PATH_PAGE_MATCHERS: Array<{ regex: RegExp; page: string }> = [
  { regex: /^\/$/, page: "Visão Geral" },
  { regex: /^\/inbox\/?$/, page: "Inbox" },
  { regex: /^\/portal\/?$/, page: "Portal" },
  { regex: /^\/demandas\/?$/, page: "Demandas" },
  { regex: /^\/sprints\/?$/, page: "Sprint" },
  { regex: /^\/follow-ups\/?$/, page: "Configurações" },
  { regex: /^\/chamados\/?$/, page: "Chamados" },
  { regex: /^\/ativos\/?$/, page: "Ativos" },
  { regex: /^\/contratos\/?$/, page: "Contratos" },
  { regex: /^\/senhas\/?$/, page: "Cofre de Senhas" },
  { regex: /^\/automacoes\/?$/, page: "Configurações" },
  { regex: /^\/auditoria\/?$/, page: "Configurações" },
  { regex: /^\/relatorios\/?$/, page: "Relatórios" },
  { regex: /^\/configuracoes\/?$/, page: "Configurações" },
];

const LEGACY_SETTINGS_REDIRECTS: Array<{ regex: RegExp; secao: string; sub: string }> = [
  { regex: /^\/auditoria\/?$/, secao: "configuracoes-demandas", sub: "auditoria" },
  { regex: /^\/automacoes\/?$/, secao: "configuracoes-demandas", sub: "automacoes" },
  {
    regex: /^\/follow-ups\/?$/,
    secao: "configuracoes-demandas",
    sub: "configuracoes-de-follow-up",
  },
  {
    regex: /^\/dados-de-sistema\/auditoria\/?$/,
    secao: "configuracoes-demandas",
    sub: "auditoria",
  },
  {
    regex: /^\/dados-de-sistema\/automacoes\/?$/,
    secao: "configuracoes-demandas",
    sub: "automacoes",
  },
  {
    regex: /^\/dados-de-sistema\/follow-ups\/?$/,
    secao: "configuracoes-demandas",
    sub: "configuracoes-de-follow-up",
  },
];

function mapLegacySettingsPath(pathname: string) {
  const match = LEGACY_SETTINGS_REDIRECTS.find((item) => item.regex.test(pathname));
  if (!match) return null;
  return `/configuracoes?secao=${match.secao}&sub=${match.sub}`;
}

function resolvePageFromPath(pathname: string) {
  const match = PATH_PAGE_MATCHERS.find((item) => item.regex.test(pathname));
  return match?.page;
}

export default function App() {
  const { user, login, logout, updateUser } = useAuth();
  const [active, setActive] = useState(pages[0]);
  const [activeDemandViewId, setActiveDemandViewId] = useState<string | null>(() => {
    const st = loadViewsState();
    return st.activeByScope.demands;
  });
  const [activeTicketViewId, setActiveTicketViewId] = useState<string | null>(() => {
    const st = loadViewsState();
    return st.activeByScope.tickets;
  });
  const [externalParties, setExternalParties] = useState<ExternalParty[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [prefStatus, setPrefStatus] = useState<string | null>(null);
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
  const [prefName, setPrefName] = useState("");
  const [prefLocale, setPrefLocale] = useState("pt-BR");
  const [prefTheme, setPrefTheme] = useState<"light" | "dark">("dark");
  const [prefNotifyEmail, setPrefNotifyEmail] = useState(true);
  const [prefNotifySlack, setPrefNotifySlack] = useState(true);
  const [prefPassword, setPrefPassword] = useState("");
  const [prefPasswordConfirm, setPrefPasswordConfirm] = useState("");
  const [prefSaving, setPrefSaving] = useState(false);
  const notifications = useNotifications();
  const permissions =
    user && typeof user.profile === "object" && user.profile
      ? user.profile.permissions
      : undefined;

  const { demands, reportSnapshots, loading, error, actions } = useDemandData(user?.token, {
    permissions,
    onNotify: (message) => {
      notifications.push("system", message);
      notifications.push("email", message);
      notifications.push("slack", message);
    },
  });

  const themeController = useTheme();

  useEffect(() => {
    if (!user) return;
    if (!canAccessPage(permissions, active)) {
      const fallback = pages.find((page) => canAccessPage(permissions, page));
      if (fallback) setActive(fallback);
    }
  }, [user, active, permissions]);

  useEffect(() => {
    if (!user) return;
    const byPath = resolvePageFromPath(window.location.pathname);
    if (byPath && canAccessPage(permissions, byPath)) {
      setActive(byPath);
      return;
    }
    const preferred = permissions?.settings?.manage ? "Inbox" : "Portal";
    if (canAccessPage(permissions, preferred)) {
      setActive(preferred);
      return;
    }
    const fallback = pages.find((page) => canAccessPage(permissions, page));
    if (fallback) setActive(fallback);
  }, [user, permissions]);

  const content = useMemo(() => {
    if (!user) return null;
    switch (active) {
      case "Inbox":
        return (
          <Inbox
            demands={demands}
            onRefresh={actions.refresh}
            onUpdate={actions.update}
            onContact={async (id, payload) => {
              if (!user?.token) return;
              await createContact(user.token, id, payload);
            }}
            onEscalate={async (id, to: DemandEscalateTo) => {
              if (!user?.token) return;
              await escalateDemand(user.token, id, to);
            }}
            activeViewId={activeDemandViewId}
            onChangeView={(viewId) => {
              setActiveDemandViewId(viewId);
              setActiveView("demands", viewId);
            }}
          />
        );
      case "Demandas":
        return (
          <DemandBoard
            token={user?.token}
            demands={demands}
            onCreate={actions.create}
            onUpdate={actions.update}
            onDelete={actions.remove}
            onAddComment={actions.addComment}
            onRefresh={actions.refresh}
            canDelete={Boolean(user?.profile && typeof user.profile !== "string" && user.profile.name === "Administrador")}
          />
        );
      case "Sprint":
        return (
          <SprintBoard
            token={user?.token}
            demands={demands}
            onUpdate={actions.update}
            onAddComment={actions.addComment}
            onRefresh={actions.refresh}
          />
        );
      case "Portal":
        return (
          <Portal
            services={services}
            articles={articles}
            onCreateTicket={async (payload) => {
              if (!user?.token) return;
              const created = await createTicket(user.token, payload);
              setTickets((prev) => [created, ...prev]);
            }}
          />
        );
      case "Chamados":
        return (
          <Tickets
            token={user?.token}
            currentUser={user}
            tickets={tickets}
            activeViewId={activeTicketViewId}
            onChangeView={(viewId) => {
              setActiveTicketViewId(viewId);
              setActiveView("tickets", viewId);
            }}
            demands={demands}
            externalParties={externalParties}
            assets={assets}
            onUpdateTicket={async (id, payload) => {
              if (!user?.token) return;
              const updated = await updateTicket(user.token, id, payload);
              setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
            }}
            onCreateTicket={async (payload) => {
              if (!user?.token) return;
              const created = await createTicket(user.token, payload);
              setTickets((prev) => [created, ...prev]);
            }}
            onAddComment={async (id, message) => {
              if (!user?.token) return;
              const updated = await addTicketComment(user.token, id, {
                author: user.email,
                message,
              });
              setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
            }}
            onLinkDemand={async (id, demandId) => {
              if (!user?.token) return;
              const updated = await linkTicketDemand(user.token, id, demandId);
              setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
            }}
            onDeleteTicket={async (id) => {
              if (!user?.token) return;
              await deleteTicket(user.token, id);
              setTickets((prev) => prev.filter((t) => t.id !== id));
            }}
            onApproveTicket={async (id, notes) => {
              if (!user?.token) return;
              const updated = await approveTicket(user.token, id, notes);
              setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
            }}
            onRejectTicket={async (id, reason) => {
              if (!user?.token) return;
              const updated = await rejectTicket(user.token, id, reason);
              setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
            }}
          />
        );
      case "Ativos":
        return <AssetsPage token={user?.token} />;
      case "Contratos":
        return (
          <Contracts
            token={user?.token}
            contracts={contracts}
            assets={assets}
            vendors={externalParties}
            onCreate={async (payload) => {
              if (!user?.token) return;
              const created = await createContract(user.token, payload);
              setContracts((prev) => [created, ...prev]);
            }}
            onUpdate={async (id, payload) => {
              if (!user?.token) return;
              const updated = await updateContract(user.token, id, payload);
              setContracts((prev) => prev.map((contract) => (contract.id === id ? updated : contract)));
            }}
          />
        );
      case "Cofre de Senhas":
        return <Vault token={user?.token} externalParties={externalParties} />;
      case "Relatórios":
        return <Reports reportSnapshots={reportSnapshots} demands={demands} token={user?.token} />;
      case "Configurações":
        return (
          <Settings
            notifications={notifications.items}
            token={user?.token}
            externalParties={externalParties}
            demands={demands}
            onUpdateDemand={actions.update}
            permissions={permissions}
          />
        );
      default:
        return canAccessPage(permissions, "Visão Geral") ? (
          <DemandsDashboardPage token={user?.token} />
        ) : (
          <div className="rounded-lg border border-border/60 bg-background/40 p-6 text-sm text-muted-foreground">
            Acesso restrito.
          </div>
        );
    }
  }, [
    active,
    demands,
    reportSnapshots,
    actions,
    notifications.items,
    user,
    tickets,
    assets,
    contracts,
    services,
    articles,
    activeDemandViewId,
    activeTicketViewId,
  ]);

  useEffect(() => {
    if (!user?.token) return;
    fetchTickets(user.token)
      .then((data) => setTickets(data))
      .catch(() => setTickets([]));
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    if (!permissions?.assets?.view) return;
    fetchAssets(user.token)
      .then((data) => setAssets(data))
      .catch(() => setAssets([]));
  }, [user?.token, permissions?.assets?.view]);

  useEffect(() => {
    if (!user?.token) return;
    if (!permissions?.contracts?.view) return;
    fetchContracts(user.token)
      .then((data) => setContracts(data))
      .catch(() => setContracts([]));
  }, [user?.token, permissions?.contracts?.view]);

  useEffect(() => {
    if (!user?.token) return;
    fetchServices(user.token)
      .then((data) => setServices(data))
      .catch(() => setServices([]));
    fetchKnowledgeArticles(user.token)
      .then((data) => setArticles(data))
      .catch(() => setArticles([]));
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token || !permissions?.users?.manage) return;
    fetchUsers(user.token)
      .then((data) => setUsersList(data))
      .catch(() => setUsersList([]));
  }, [user?.token, permissions?.users?.manage]);

  useEffect(() => {
    if (!user?.token) return;
    if (!permissions?.demands?.view) return;
    fetchExternalParties(user.token)
      .then((data) => setExternalParties(data))
      .catch(() => setExternalParties([]));
  }, [user?.token, permissions?.demands?.view]);

  useEffect(() => {
    const redirectUrl = mapLegacySettingsPath(window.location.pathname);
    if (redirectUrl) {
      window.history.replaceState({}, "", redirectUrl);
      setActive("Configurações");
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const redirectUrl = mapLegacySettingsPath(window.location.pathname);
      if (redirectUrl) {
        window.history.replaceState({}, "", redirectUrl);
      }
      const byPath = resolvePageFromPath(window.location.pathname);
      if (byPath && canAccessPage(permissions, byPath)) {
        setActive(byPath);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [permissions]);

  const navigateToPage = (page: string, options?: { replace?: boolean }) => {
    const pathname = PAGE_PATHS[page];
    if (!pathname) return;
    const search = page === "Configurações" ? window.location.search : "";
    const nextUrl = `${pathname}${search}`;
    if (options?.replace) {
      window.history.replaceState({}, "", nextUrl);
      return;
    }
    window.history.pushState({}, "", nextUrl);
  };

  const handleSelectPage = (page: string) => {
    setActive(page);
    navigateToPage(page);
  };

  if (!user) {
    return <LoginPanel onLogin={login} />;
  }

  if (user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>Atualize sua senha</CardTitle>
            <CardDescription>Primeiro acesso requer atualização de senha.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="first-access-new-password">
                Nova senha
              </label>
              <Input
                id="first-access-new-password"
                name="newPassword"
                type="password"
                value={passwordDraft}
                onChange={(event) => setPasswordDraft(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="first-access-confirm-password">
                Confirmar senha
              </label>
              <Input
                id="first-access-confirm-password"
                name="confirmPassword"
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
            </div>
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            <Button
              disabled={passwordSaving}
              onClick={async () => {
                if (!user.token) return;
                setPasswordError(null);
                if (passwordDraft.length < 8) {
                  setPasswordError("A senha deve ter pelo menos 8 caracteres.");
                  return;
                }
                if (passwordDraft !== passwordConfirm) {
                  setPasswordError("As senhas não conferem.");
                  return;
                }
                try {
                  setPasswordSaving(true);
                  await changePassword(user.token, passwordDraft);
                  updateUser({ ...user, mustChangePassword: false });
                  setPasswordDraft("");
                  setPasswordConfirm("");
                } catch (error: any) {
                  setPasswordError(error?.message ?? "Falha ao atualizar senha.");
                } finally {
                  setPasswordSaving(false);
                }
              }}
            >
              {passwordSaving ? "Salvando..." : "Atualizar senha"}
            </Button>
            <Button variant="outline" onClick={logout}>
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AppShell
      active={active}
      onSelect={handleSelectPage}
      onSelectDemandView={(viewId) => {
        setActiveDemandViewId(viewId);
        setActiveView("demands", viewId);
        setActive("Inbox");
        navigateToPage("Inbox");
      }}
      onSelectTicketView={(viewId) => {
        setActiveTicketViewId(viewId);
        setActiveView("tickets", viewId);
        setActive("Chamados");
        navigateToPage("Chamados");
      }}
      userEmail={user.email}
      permissions={permissions}
      onLogout={logout}
      onOpenPreferences={() => {
        setPrefOpen(true);
        setEmailStep("request");
        setPrefStatus(null);
        setNewEmail("");
        setEmailCode("");
        setPrefName(user.name ?? "");
        setPrefLocale(user.locale ?? "pt-BR");
        setPrefTheme(user.theme ?? themeController.theme);
        setPrefNotifyEmail(user.notificationPrefs?.email ?? true);
        setPrefNotifySlack(user.notificationPrefs?.slack ?? true);
        setPrefPassword("");
        setPrefPasswordConfirm("");
      }}
    >
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Carregando módulo...
          </div>
        }
      >
        {error ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Carregando indicadores...
          </div>
        ) : (
          content
        )}
      </Suspense>

      <Dialog open={prefOpen} onOpenChange={setPrefOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preferências</DialogTitle>
            <DialogDescription>Atualize seus dados com segurança.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <label>Nome completo</label>
              <Input value={prefName} onChange={(event) => setPrefName(event.target.value)} />
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Idioma</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={prefLocale}
                  onChange={(event) => setPrefLocale(event.target.value)}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label>Tema</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={prefTheme}
                  onChange={(event) => setPrefTheme(event.target.value as "light" | "dark")}
                >
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Notificações por e-mail</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={prefNotifyEmail ? "true" : "false"}
                  onChange={(event) => setPrefNotifyEmail(event.target.value === "true")}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label>Notificações por Slack</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={prefNotifySlack ? "true" : "false"}
                  onChange={(event) => setPrefNotifySlack(event.target.value === "true")}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Nova senha</label>
                <Input
                  type="password"
                  value={prefPassword}
                  onChange={(event) => setPrefPassword(event.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                />
              </div>
              <div className="grid gap-1">
                <label>Confirmar senha</label>
                <Input
                  type="password"
                  value={prefPasswordConfirm}
                  onChange={(event) => setPrefPasswordConfirm(event.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/40 p-3">
              <p className="text-xs uppercase text-muted-foreground">Alterar e-mail</p>
              {emailStep === "request" ? (
                <>
                  <label className="text-xs">Novo e-mail</label>
                  <Input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
                </>
              ) : (
                <>
                  <label className="text-xs">Código de verificação</label>
                  <Input value={emailCode} onChange={(event) => setEmailCode(event.target.value)} />
                </>
              )}
            </div>
            {prefStatus ? <p className="text-xs text-amber-300">{prefStatus}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPrefOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!user?.token) return;
                try {
                  setPrefSaving(true);
                  if (prefPassword) {
                    if (prefPassword.length < 8) {
                      setPrefStatus("A senha deve ter pelo menos 8 caracteres.");
                      setPrefSaving(false);
                      return;
                    }
                    if (prefPassword !== prefPasswordConfirm) {
                      setPrefStatus("As senhas não conferem.");
                      setPrefSaving(false);
                      return;
                    }
                    await changePassword(user.token, prefPassword);
                  }

                  const updated = await updateMyProfile(user.token, {
                    name: prefName,
                    locale: prefLocale,
                    theme: prefTheme,
                    notificationPrefs: {
                      email: prefNotifyEmail,
                      slack: prefNotifySlack,
                    },
                  });
                  updateUser({ ...user, ...updated });
                  themeController.setTheme(prefTheme);

                  if (newEmail) {
                    if (emailStep === "request") {
                      await requestEmailChange(user.token, newEmail);
                      setPrefStatus("Código enviado para o novo e-mail.");
                      setEmailStep("verify");
                      setPrefSaving(false);
                      return;
                    }
                    const data = await verifyEmailChange(user.token, emailCode);
                    updateUser({ ...user, ...updated, email: data.email });
                    setPrefStatus("E-mail atualizado com sucesso.");
                  } else {
                    setPrefStatus("Preferências atualizadas.");
                  }
                  setPrefOpen(false);
                } catch (error: any) {
                  setPrefStatus(error?.message ?? "Falha ao validar.");
                } finally {
                  setPrefSaving(false);
                }
              }}
            >
              {prefSaving ? "Salvando..." : emailStep === "request" ? "Salvar preferências" : "Validar código"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
