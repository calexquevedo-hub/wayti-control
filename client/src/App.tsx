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
  createAsset,
  escalateDemand,
  updateAsset,
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

const AuditLog = lazy(() => import("@/features/AuditLog").then((m) => ({ default: m.AuditLog })));
const DemandBoard = lazy(() => import("@/features/DemandBoard").then((m) => ({ default: m.DemandBoard })));
const Dashboard = lazy(() => import("@/features/Dashboard").then((m) => ({ default: m.Dashboard })));
const FollowUps = lazy(() => import("@/features/FollowUps").then((m) => ({ default: m.FollowUps })));
const Inbox = lazy(() => import("@/features/Inbox").then((m) => ({ default: m.Inbox })));
const Portal = lazy(() => import("@/features/Portal").then((m) => ({ default: m.Portal })));
const Reports = lazy(() => import("@/features/Reports").then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import("@/features/Settings").then((m) => ({ default: m.Settings })));
const Tickets = lazy(() => import("@/features/Tickets").then((m) => ({ default: m.Tickets })));
const Assets = lazy(() => import("@/features/Assets").then((m) => ({ default: m.Assets })));
const Contracts = lazy(() => import("@/features/Contracts").then((m) => ({ default: m.Contracts })));
const Vault = lazy(() => import("@/features/Vault").then((m) => ({ default: m.Vault })));
const Automations = lazy(() => import("@/features/Automations/Automations").then((m) => ({ default: m.Automations })));

const pages = [
  "Inbox",
  "Portal",
  "Visão Geral",
  "Demandas",
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
            demands={demands}
            onCreate={actions.create}
            onUpdate={actions.update}
            onDelete={actions.remove}
            onAddComment={actions.addComment}
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
      case "Follow-ups":
        return <FollowUps demands={demands} onUpdate={actions.update} />;
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
        return (
          <Assets
            token={user?.token}
            assets={assets}
            tickets={tickets}
            users={usersList}
            onCreate={async (payload) => {
              if (!user?.token) return;
              const created = await createAsset(user.token, payload);
              setAssets((prev) => [created, ...prev]);
            }}
            onUpdate={async (id, payload) => {
              if (!user?.token) return;
              const updated = await updateAsset(user.token, id, payload);
              setAssets((prev) => prev.map((asset) => (asset.id === id ? updated : asset)));
            }}
          />
        );
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
      case "Automações":
        return <Automations token={user?.token} />;
      case "Relatórios":
        return <Reports reportSnapshots={reportSnapshots} demands={demands} token={user?.token} />;
      case "Auditoria":
        return canAccessPage(permissions, "Auditoria") ? (
          <AuditLog demands={demands} />
        ) : (
          <div className="rounded-lg border border-border/60 bg-background/40 p-6 text-sm text-muted-foreground">
            Acesso restrito.
          </div>
        );
      case "Configurações":
        return (
          <Settings
            notifications={notifications.items}
            token={user?.token}
            externalParties={externalParties}
          />
        );
      default:
        return canAccessPage(permissions, "Visão Geral") ? (
          <Dashboard demands={demands} tickets={tickets} />
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
              <label className="text-sm font-medium">Nova senha</label>
              <Input
                type="password"
                value={passwordDraft}
                onChange={(event) => setPasswordDraft(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Confirmar senha</label>
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Repita a senha"
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
      onSelect={setActive}
      onSelectDemandView={(viewId) => {
        setActiveDemandViewId(viewId);
        setActiveView("demands", viewId);
        setActive("Inbox");
      }}
      onSelectTicketView={(viewId) => {
        setActiveTicketViewId(viewId);
        setActiveView("tickets", viewId);
        setActive("Chamados");
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
