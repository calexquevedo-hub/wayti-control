import { useEffect, useMemo, useState } from "react";

import { AccessControl } from "@/features/settings/AccessControl";
import { DomainSettings } from "@/features/settings/DomainSettings";
import { Automations } from "@/features/Automations/Automations";
import { AuditLog } from "@/features/AuditLog";
import { FollowUps } from "@/features/FollowUps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchEmailIntegrationConfig, fetchSystemParams, testEmailIntegration, updateEmailIntegrationConfig, updateSystemParams } from "@/lib/api";
import type { NotificationItem } from "@/hooks/useNotifications";
import type { Demand, EmailIntegrationConfig, ExternalParty, ProfilePermissions, SystemParams } from "@/types";

type SectionKey =
  | "configuracoes-demandas"
  | "controle-de-acesso"
  | "configuracoes-chamado"
  | "canais-e-email";

type SubKey =
  | "categorias"
  | "epicos"
  | "automacoes"
  | "configuracoes-de-follow-up"
  | "auditoria"
  | "notificacoes"
  | "perfis"
  | "usuarios"
  | "politicas-de-sla"
  | "respostas-prontas"
  | "integracao-imap"
  | "envio-smtp"
  | "assinatura-padrao";

interface SettingsProps {
  notifications?: NotificationItem[];
  token?: string;
  externalParties?: ExternalParty[];
  demands?: Demand[];
  onUpdateDemand?: (id: string, payload: Partial<Demand>) => Promise<{ ok: boolean; message?: string }>;
  permissions?: ProfilePermissions;
}

const emptyEmailConfig: EmailIntegrationConfig = {
  id: "",
  enabled: false,
  provider: "Gmail",
  emailAddress: "",
  imapHost: "imap.gmail.com",
  imapPort: 993,
  imapTls: true,
  mailbox: "INBOX",
  pollingIntervalMin: 5,
  defaultQueue: "TI Interna",
  defaultStatus: "Novo",
  defaultImpact: "Médio",
  defaultUrgency: "Média",
  defaultSystem: "Email",
  defaultCategory: "Suporte",
  defaultExternalOwnerId: "",
  hasPassword: false,
};

const emptySystemParams: SystemParams = {
  id: "",
  mailProvider: "Gmail",
  fromName: "WayTI Control",
  fromEmail: "",
  gmailUser: "",
  hasGmailPassword: false,
  hasSendGridKey: false,
  office365User: "",
  hasOffice365Password: false,
  sesRegion: "us-east-1",
  sesSmtpUser: "",
  hasSesPassword: false,
  mailgunDomain: "",
  hasMailgunKey: false,
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  hasSmtpPassword: false,
  slaWarningMinutes: 120,
  slaPolicies: {
    urgentHours: 8,
    highHours: 48,
    mediumHours: 120,
    lowHours: 240,
  },
  emailSignature: "",
  cannedResponses: [],
};

const sections: Array<{
  key: SectionKey;
  title: string;
  items: Array<{ sub: SubKey; label: string; canView: (p?: ProfilePermissions) => boolean }>;
}> = [
  {
    key: "configuracoes-demandas",
    title: "Configurações de Demandas",
    items: [
      { sub: "categorias", label: "Categorias", canView: (p) => !!p?.demands?.view },
      { sub: "epicos", label: "Épicos", canView: (p) => !!p?.demands?.view },
      { sub: "automacoes", label: "Automações", canView: (p) => !!p?.settings?.manage },
      {
        sub: "configuracoes-de-follow-up",
        label: "Configurações de Follow-up",
        canView: (p) => !!p?.demands?.view,
      },
      { sub: "auditoria", label: "Auditoria", canView: (p) => !!p?.settings?.manage },
      { sub: "notificacoes", label: "Notificações", canView: (p) => !!p?.settings?.manage },
    ],
  },
  {
    key: "controle-de-acesso",
    title: "Controle de Acesso",
    items: [
      { sub: "perfis", label: "Perfis", canView: (p) => !!p?.users?.manage },
      { sub: "usuarios", label: "Usuários", canView: (p) => !!p?.users?.manage },
    ],
  },
  {
    key: "configuracoes-chamado",
    title: "Configurações de Chamado",
    items: [
      { sub: "politicas-de-sla", label: "Políticas de SLA", canView: (p) => !!p?.settings?.manage },
      { sub: "respostas-prontas", label: "Respostas Prontas", canView: (p) => !!p?.settings?.manage },
    ],
  },
  {
    key: "canais-e-email",
    title: "Canais e E-mail",
    items: [
      { sub: "integracao-imap", label: "Integração IMAP", canView: (p) => !!p?.settings?.manage },
      { sub: "envio-smtp", label: "Envio SMTP", canView: (p) => !!p?.settings?.manage },
      { sub: "assinatura-padrao", label: "Assinatura Padrão", canView: (p) => !!p?.settings?.manage },
    ],
  },
];

function readLocation() {
  const url = new URL(window.location.href);
  const secao = (url.searchParams.get("secao") as SectionKey | null) ?? "configuracoes-demandas";
  const sub = (url.searchParams.get("sub") as SubKey | null) ?? "categorias";
  return { secao, sub };
}

function writeLocation(secao: SectionKey, sub: SubKey, mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href);
  url.pathname = "/configuracoes";
  url.searchParams.set("secao", secao);
  url.searchParams.set("sub", sub);
  const nextUrl = `${url.pathname}?${url.searchParams.toString()}`;
  if (mode === "replace") {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

export function Settings({
  notifications = [],
  token,
  externalParties = [],
  demands = [],
  onUpdateDemand,
  permissions,
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>(() => readLocation().secao);
  const [activeSub, setActiveSub] = useState<SubKey>(() => readLocation().sub);

  const [emailConfig, setEmailConfig] = useState<EmailIntegrationConfig>(emptyEmailConfig);
  const [emailPasswordDraft, setEmailPasswordDraft] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const [systemParams, setSystemParams] = useState<SystemParams>(emptySystemParams);
  const [systemDialogOpen, setSystemDialogOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);
  const [systemSecrets, setSystemSecrets] = useState({
    gmailAppPassword: "",
    sendGridApiKey: "",
    office365Pass: "",
    sesSmtpPass: "",
    mailgunApiKey: "",
    smtpPass: "",
  });

  const [cannedResponses, setCannedResponses] = useState<
    Array<{ id: string; title: string; body: string; scope: "personal" | "shared" }>
  >([]);
  const [cannedStatus, setCannedStatus] = useState<string | null>(null);
  const [cannedDialogOpen, setCannedDialogOpen] = useState(false);
  const [cannedDraft, setCannedDraft] = useState({
    id: "",
    title: "",
    body: "",
    scope: "shared" as "personal" | "shared",
  });

  const [slaPolicyDraft, setSlaPolicyDraft] = useState({
    urgentHours: 8,
    highHours: 48,
    mediumHours: 120,
    lowHours: 240,
  });
  const [slaStatus, setSlaStatus] = useState<string | null>(null);
  const [signatureDraft, setSignatureDraft] = useState("");

  useEffect(() => {
    const initial = readLocation();
    writeLocation(initial.secao, initial.sub, "replace");
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const state = readLocation();
      setActiveSection(state.secao);
      setActiveSub(state.sub);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchEmailIntegrationConfig(token)
      .then((data) => setEmailConfig({ ...emptyEmailConfig, ...data }))
      .catch(() => setEmailConfig(emptyEmailConfig));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchSystemParams(token)
      .then((data) => {
        setSystemParams((prev) => ({ ...prev, ...data }));
        if (Array.isArray(data.cannedResponses)) {
          setCannedResponses(data.cannedResponses);
        }
        if (data.slaPolicies) {
          setSlaPolicyDraft({
            urgentHours: data.slaPolicies.urgentHours ?? 8,
            highHours: data.slaPolicies.highHours ?? 48,
            mediumHours: data.slaPolicies.mediumHours ?? 120,
            lowHours: data.slaPolicies.lowHours ?? 240,
          });
        }
        if (typeof data.emailSignature === "string") {
          setSignatureDraft(data.emailSignature);
        }
      })
      .catch(() => undefined);
  }, [token]);

  const visibleSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.canView(permissions)),
      }))
      .filter((section) => section.items.length > 0);
  }, [permissions]);

  useEffect(() => {
    const section = visibleSections.find((item) => item.key === activeSection);
    if (!section) {
      const fallbackSection = visibleSections[0];
      if (!fallbackSection) return;
      const fallbackSub = fallbackSection.items[0].sub;
      setActiveSection(fallbackSection.key);
      setActiveSub(fallbackSub);
      writeLocation(fallbackSection.key, fallbackSub, "replace");
      return;
    }

    const subAllowed = section.items.some((item) => item.sub === activeSub);
    if (!subAllowed) {
      const fallbackSub = section.items[0].sub;
      setActiveSub(fallbackSub);
      writeLocation(section.key, fallbackSub, "replace");
    }
  }, [activeSection, activeSub, visibleSections]);

  const currentSection = visibleSections.find((section) => section.key === activeSection);
  const currentSubAllowed = currentSection?.items.some((item) => item.sub === activeSub) ?? false;

  const handleSectionChange = (section: SectionKey) => {
    const target = visibleSections.find((item) => item.key === section);
    if (!target) return;
    const nextSub = target.items.some((item) => item.sub === activeSub) ? activeSub : target.items[0].sub;
    setActiveSection(section);
    setActiveSub(nextSub);
    writeLocation(section, nextSub, "push");
  };

  const handleSubChange = (sub: SubKey) => {
    if (!currentSection) return;
    setActiveSub(sub);
    writeLocation(currentSection.key, sub, "push");
  };

  const renderConfigChamado = () => {
    if (activeSub === "respostas-prontas") {
      return (
        <Card className="bg-card/70">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Respostas Prontas</CardTitle>
              <CardDescription>Snippets para uso rápido pelos agentes.</CardDescription>
            </div>
            <Button
              onClick={() => {
                setCannedDraft({ id: "", title: "", body: "", scope: "shared" });
                setCannedDialogOpen(true);
              }}
            >
              Nova resposta
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {cannedStatus ? <p className="text-xs text-amber-300">{cannedStatus}</p> : null}
            {cannedResponses.length === 0 ? <p>Nenhuma resposta cadastrada.</p> : null}
            {cannedResponses.map((tpl) => (
              <div key={tpl.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tpl.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tpl.scope === "shared" ? "Compartilhado" : "Pessoal"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setCannedDraft(tpl); setCannedDialogOpen(true); }}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!token) return;
                        const next = cannedResponses.filter((item) => item.id !== tpl.id);
                        setCannedResponses(next);
                        try {
                          await updateSystemParams(token, { cannedResponses: next });
                          setCannedStatus("Resposta removida.");
                        } catch (error: any) {
                          setCannedStatus(error?.message ?? "Falha ao remover.");
                        }
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{tpl.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Políticas de SLA</CardTitle>
          <CardDescription>Defina a janela de vencimento por prioridade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-3 lg:grid-cols-4">
            {[
              { key: "urgentHours", label: "Urgente (P0)" },
              { key: "highHours", label: "Alta (P1)" },
              { key: "mediumHours", label: "Média (P2)" },
              { key: "lowHours", label: "Baixa (P3)" },
            ].map((item) => (
              <div key={item.key} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <Input
                  type="number"
                  value={(slaPolicyDraft as any)[item.key]}
                  onChange={(event) =>
                    setSlaPolicyDraft((prev) => ({
                      ...prev,
                      [item.key]: Number(event.target.value),
                    }))
                  }
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Horas</p>
              </div>
            ))}
          </div>
          {slaStatus ? <p className="text-xs text-amber-300">{slaStatus}</p> : null}
          <Button
            onClick={async () => {
              if (!token) return;
              try {
                const updated = await updateSystemParams(token, {
                  slaPolicies: slaPolicyDraft,
                });
                setSystemParams((prev) => ({ ...prev, ...updated }));
                setSlaStatus("Políticas de SLA salvas.");
              } catch (error: any) {
                setSlaStatus(error?.message ?? "Falha ao salvar políticas.");
              }
            }}
          >
            Salvar políticas
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderCanaisEmail = () => {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Integração IMAP</CardTitle>
              <CardDescription>Recebimento de e-mails para abertura de chamados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className={emailConfig.enabled && emailConfig.hasPassword ? "text-emerald-300" : "text-amber-300"}>
                  {emailConfig.enabled && emailConfig.hasPassword ? "Configurado" : "Pendente"}
                </span>
              </div>
              {testStatus ? <p className="text-xs text-amber-300">{testStatus}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setEmailDialogOpen(true)}>Configurar</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!token) return;
                    try {
                      setTestStatus("Testando conexão...");
                      await testEmailIntegration(token);
                      setTestStatus("Conexão IMAP validada com sucesso.");
                    } catch (error: any) {
                      setTestStatus(error?.message ?? "Falha ao testar conexão.");
                    }
                  }}
                >
                  Testar IMAP
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Envio SMTP</CardTitle>
              <CardDescription>Configuração do serviço de envio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className={systemParams.smtpHost && systemParams.smtpUser && systemParams.hasSmtpPassword ? "text-emerald-300" : "text-amber-300"}>
                  {systemParams.smtpHost && systemParams.smtpUser && systemParams.hasSmtpPassword
                    ? "Configurado"
                    : "Pendente"}
                </span>
              </div>
              <Button size="sm" onClick={() => setSystemDialogOpen(true)}>Configurar envio</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Assinatura Padrão</CardTitle>
            <CardDescription>Rodapé aplicado em todos os e-mails enviados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <Textarea
              value={signatureDraft}
              onChange={(event) => setSignatureDraft(event.target.value)}
              placeholder="Atenciosamente, Equipe de TI"
            />
            <Button
              onClick={async () => {
                if (!token) return;
                try {
                  const updated = await updateSystemParams(token, { emailSignature: signatureDraft });
                  setSystemParams((prev) => ({ ...prev, ...updated }));
                  setSystemStatus("Assinatura salva.");
                } catch (error: any) {
                  setSystemStatus(error?.message ?? "Falha ao salvar assinatura.");
                }
              }}
            >
              Salvar assinatura
            </Button>
            {systemStatus ? <p className="text-xs text-amber-300">{systemStatus}</p> : null}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSubContent = () => {
    if (!currentSubAllowed) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você não tem permissão para acessar este módulo.</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    if (activeSection === "configuracoes-demandas") {
      if (activeSub === "categorias") {
        return <DomainSettings token={token} initialType="CATEGORY" hideTypeTabs />;
      }
      if (activeSub === "epicos") return <DomainSettings token={token} initialType="EPIC" hideTypeTabs />;
      if (activeSub === "automacoes") return <Automations token={token} />;
      if (activeSub === "configuracoes-de-follow-up") {
        if (!onUpdateDemand) {
          return (
            <Card><CardContent className="pt-6 text-sm text-muted-foreground">Configuração de Follow-up indisponível.</CardContent></Card>
          );
        }
        return <FollowUps demands={demands} onUpdate={onUpdateDemand} />;
      }
      if (activeSub === "auditoria") return <AuditLog demands={demands} />;
      return (
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Status enviados por e-mail/Slack (simulado).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {notifications.length === 0 ? <p>Nenhuma notificação enviada ainda.</p> : null}
            {notifications.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-xs uppercase text-muted-foreground">{item.channel}</p>
                <p>{item.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "controle-de-acesso") {
      return (
        <AccessControl
          token={token}
          initialTab={activeSub === "perfis" ? "profiles" : "users"}
          hideTabSelector
        />
      );
    }
    if (activeSection === "configuracoes-chamado") return renderConfigChamado();
    return renderCanaisEmail();
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Administração central de regras e integrações.</p>
      </div>

      <div className="hidden w-full md:block">
        <div
          role="tablist"
          aria-label="Seções de configurações"
          className="mb-6 flex w-full flex-row flex-wrap gap-2"
        >
          {visibleSections.map((section) => {
            const isActive = section.key === activeSection;
            return (
              <button
                key={section.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSectionChange(section.key)}
                className={`min-h-11 rounded-lg border px-4 py-2 text-sm transition ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full space-y-3 md:hidden">
        {visibleSections.map((section) => {
          const active = section.key === activeSection;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => handleSectionChange(section.key)}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-4 py-3 text-left ${active ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <span className="text-sm font-medium">{section.title}</span>
              <Badge variant={active ? "default" : "outline"}>{active ? "Ativa" : "Abrir"}</Badge>
            </button>
          );
        })}
      </div>

      {currentSection ? (
        <Card className="w-full self-stretch">
          <CardHeader>
            <CardTitle className="text-base">{currentSection.title}</CardTitle>
            <CardDescription>Selecione um módulo desta seção.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {currentSection.items.map((item) => (
                <button
                  key={item.sub}
                  type="button"
                  onClick={() => handleSubChange(item.sub)}
                  className={`flex min-h-11 w-full items-center rounded-lg border px-3 py-2 text-left text-sm ${item.sub === activeSub ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/50"}`}
                >
                  <span className="w-full truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="w-full self-stretch">{renderSubContent()}</div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Integração IMAP</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <div className="grid gap-1"><label>E-mail</label><Input value={emailConfig.emailAddress} onChange={(event) => setEmailConfig((prev) => ({ ...prev, emailAddress: event.target.value }))} /></div>
            <div className="grid gap-1"><label>Senha</label><Input type="password" value={emailPasswordDraft} onChange={(event) => setEmailPasswordDraft(event.target.value)} placeholder={emailConfig.hasPassword ? "Senha já configurada" : "Cole aqui"} /></div>
            <div className="grid gap-1"><label>Servidor IMAP</label><Input value={emailConfig.imapHost} onChange={(event) => setEmailConfig((prev) => ({ ...prev, imapHost: event.target.value }))} /></div>
            <div className="grid gap-1"><label>Porta</label><Input type="number" value={emailConfig.imapPort} onChange={(event) => setEmailConfig((prev) => ({ ...prev, imapPort: Number(event.target.value) }))} /></div>
            {emailStatus ? <p className="text-xs text-amber-300">{emailStatus}</p> : null}
            <Button
              onClick={async () => {
                if (!token) return;
                try {
                  const updated = await updateEmailIntegrationConfig(token, {
                    ...emailConfig,
                    appPassword: emailPasswordDraft || undefined,
                  });
                  setEmailConfig((prev) => ({ ...prev, ...updated }));
                  setEmailPasswordDraft("");
                  setEmailStatus("Configuração salva.");
                } catch (error: any) {
                  setEmailStatus(error?.message ?? "Falha ao salvar configuração.");
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={systemDialogOpen} onOpenChange={setSystemDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Envio SMTP</DialogTitle></DialogHeader>
          <div className="grid gap-3 text-sm">
            <div className="grid gap-1"><label>Servidor SMTP</label><Input value={systemParams.smtpHost} onChange={(event) => setSystemParams((prev) => ({ ...prev, smtpHost: event.target.value }))} /></div>
            <div className="grid gap-1"><label>Porta</label><Input type="number" value={systemParams.smtpPort} onChange={(event) => setSystemParams((prev) => ({ ...prev, smtpPort: Number(event.target.value) }))} /></div>
            <div className="grid gap-1"><label>Usuário SMTP</label><Input value={systemParams.smtpUser} onChange={(event) => setSystemParams((prev) => ({ ...prev, smtpUser: event.target.value }))} /></div>
            <div className="grid gap-1"><label>Senha SMTP</label><Input type="password" value={systemSecrets.smtpPass} onChange={(event) => setSystemSecrets((prev) => ({ ...prev, smtpPass: event.target.value }))} /></div>
            {systemStatus ? <p className="text-xs text-amber-300">{systemStatus}</p> : null}
            <Button
              onClick={async () => {
                if (!token) return;
                try {
                  const updated = await updateSystemParams(token, {
                    smtpHost: systemParams.smtpHost,
                    smtpPort: systemParams.smtpPort,
                    smtpUser: systemParams.smtpUser,
                    smtpPass: systemSecrets.smtpPass || undefined,
                  });
                  setSystemParams((prev) => ({ ...prev, ...updated }));
                  setSystemSecrets((prev) => ({ ...prev, smtpPass: "" }));
                  setSystemStatus("Configuração SMTP salva.");
                } catch (error: any) {
                  setSystemStatus(error?.message ?? "Falha ao salvar SMTP.");
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cannedDialogOpen} onOpenChange={setCannedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Resposta pronta</DialogTitle></DialogHeader>
          <div className="grid gap-3 text-sm">
            <div className="grid gap-1"><label>Título</label><Input value={cannedDraft.title} onChange={(event) => setCannedDraft((prev) => ({ ...prev, title: event.target.value }))} /></div>
            <div className="grid gap-1"><label>Texto</label><Textarea value={cannedDraft.body} onChange={(event) => setCannedDraft((prev) => ({ ...prev, body: event.target.value }))} /></div>
            <Button
              onClick={async () => {
                if (!token) return;
                if (!cannedDraft.title.trim() || !cannedDraft.body.trim()) return;
                const next = cannedDraft.id
                  ? cannedResponses.map((tpl) => (tpl.id === cannedDraft.id ? { ...tpl, ...cannedDraft } : tpl))
                  : [
                      ...cannedResponses,
                      {
                        id: `canned_${Date.now()}`,
                        title: cannedDraft.title.trim(),
                        body: cannedDraft.body.trim(),
                        scope: cannedDraft.scope,
                      },
                    ];
                setCannedResponses(next);
                try {
                  await updateSystemParams(token, { cannedResponses: next });
                  setCannedStatus("Resposta salva.");
                  setCannedDialogOpen(false);
                  setCannedDraft({ id: "", title: "", body: "", scope: "shared" });
                } catch (error: any) {
                  setCannedStatus(error?.message ?? "Falha ao salvar resposta.");
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
