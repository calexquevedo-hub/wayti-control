import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationItem } from "@/hooks/useNotifications";
import type { EmailIntegrationConfig, ExternalParty, SystemParams } from "@/types";
import {
  fetchEmailIntegrationConfig,
  fetchSystemParams,
  testEmailIntegration,
  updateEmailIntegrationConfig,
  updateSystemParams,
} from "@/lib/api";
import { AccessControl } from "@/features/settings/AccessControl";

interface SettingsProps {
  notifications?: NotificationItem[];
  token?: string;
  externalParties?: ExternalParty[];
}

const emptyConfig: EmailIntegrationConfig = {
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

export function Settings({ notifications = [], token, externalParties = [] }: SettingsProps) {
  const [emailConfig, setEmailConfig] = useState<EmailIntegrationConfig>(emptyConfig);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [systemDialogOpen, setSystemDialogOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);
  const [systemParams, setSystemParams] = useState<SystemParams>({
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
  });
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
  const [cannedDialogOpen, setCannedDialogOpen] = useState(false);
  const [cannedDraft, setCannedDraft] = useState({
    id: "",
    title: "",
    body: "",
    scope: "shared" as "personal" | "shared",
  });
  const [cannedStatus, setCannedStatus] = useState<string | null>(null);
  const [slaPolicyDraft, setSlaPolicyDraft] = useState({
    urgentHours: 8,
    highHours: 48,
    mediumHours: 120,
    lowHours: 240,
  });
  const [slaStatus, setSlaStatus] = useState<string | null>(null);
  const [signatureDraft, setSignatureDraft] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchEmailIntegrationConfig(token)
      .then((data) => setEmailConfig({ ...emptyConfig, ...data }))
      .catch(() => setEmailConfig(emptyConfig));
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

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Integração de Chamados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid gap-1">
              <label>Provedor de recebimento</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={emailConfig.provider ?? "Gmail"}
                onChange={(event) => {
                  const provider = event.target.value as EmailIntegrationConfig["provider"];
                  if (provider === "Gmail") {
                    setEmailConfig((prev) => ({
                      ...prev,
                      provider,
                      imapHost: "imap.gmail.com",
                      imapPort: 993,
                      imapTls: true,
                    }));
                  } else if (provider === "Office365") {
                    setEmailConfig((prev) => ({
                      ...prev,
                      provider,
                      imapHost: "outlook.office365.com",
                      imapPort: 993,
                      imapTls: true,
                    }));
                  } else {
                    setEmailConfig((prev) => ({ ...prev, provider }));
                  }
                }}
              >
                <option value="Gmail">Gmail</option>
                <option value="Office365">Office365</option>
                <option value="IMAP">IMAP genérico</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid gap-1">
              <label>E-mail do provedor</label>
              <Input
                value={emailConfig.emailAddress}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, emailAddress: event.target.value }))
                }
                placeholder="nome@gmail.com"
              />
            </div>
            <div className="grid gap-1">
              <label>Senha do provedor (App Password ou IMAP)</label>
              <Input
                type="password"
                value={passwordDraft}
                onChange={(event) => setPasswordDraft(event.target.value)}
                placeholder={emailConfig.hasPassword ? "Senha já configurada" : "Cole aqui"}
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="grid gap-1">
              <label>Servidor IMAP</label>
              <Input
                value={emailConfig.imapHost}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, imapHost: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <label>Porta</label>
              <Input
                type="number"
                value={emailConfig.imapPort}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, imapPort: Number(event.target.value) }))
                }
              />
            </div>
            <div className="grid gap-1">
              <label>Caixa</label>
              <Input
                value={emailConfig.mailbox}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, mailbox: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="grid gap-1">
              <label>Intervalo (min)</label>
              <Input
                type="number"
                value={emailConfig.pollingIntervalMin}
                onChange={(event) =>
                  setEmailConfig((prev) => ({
                    ...prev,
                    pollingIntervalMin: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-1">
              <label>Fila padrão</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={emailConfig.defaultQueue}
                onChange={(event) =>
                  setEmailConfig((prev) => ({
                    ...prev,
                    defaultQueue: event.target.value as EmailIntegrationConfig["defaultQueue"],
                  }))
                }
              >
                <option value="TI Interna">TI Interna</option>
                <option value="Fornecedor">Fornecedor</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label>Fornecedor padrão (opcional)</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={emailConfig.defaultExternalOwnerId ?? ""}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, defaultExternalOwnerId: event.target.value }))
                }
              >
                    <option value="">Não definido</option>
                {externalParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="grid gap-1">
              <label>Sistema padrão</label>
              <Input
                value={emailConfig.defaultSystem}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, defaultSystem: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <label>Categoria padrão</label>
              <Input
                value={emailConfig.defaultCategory}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, defaultCategory: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <label>Status inicial</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={emailConfig.defaultStatus}
                onChange={(event) =>
                  setEmailConfig((prev) => ({
                    ...prev,
                    defaultStatus: event.target.value as EmailIntegrationConfig["defaultStatus"],
                  }))
                }
              >
                {["Novo", "Triagem", "Em atendimento", "Aguardando fornecedor", "Aguardando solicitante"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="grid gap-1">
              <label>Impacto padrão</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={emailConfig.defaultImpact}
                onChange={(event) =>
                  setEmailConfig((prev) => ({
                    ...prev,
                    defaultImpact: event.target.value as EmailIntegrationConfig["defaultImpact"],
                  }))
                }
              >
                {["Baixo", "Médio", "Alto"].map((impact) => (
                  <option key={impact} value={impact}>
                    {impact}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label>Urgência padrão</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={emailConfig.defaultUrgency}
                onChange={(event) =>
                  setEmailConfig((prev) => ({
                    ...prev,
                    defaultUrgency: event.target.value as EmailIntegrationConfig["defaultUrgency"],
                  }))
                }
              >
                {["Baixa", "Média", "Alta"].map((urgency) => (
                  <option key={urgency} value={urgency}>
                    {urgency}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label>Ativar integração</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={emailConfig.enabled ? "true" : "false"}
                onChange={(event) =>
                  setEmailConfig((prev) => ({ ...prev, enabled: event.target.value === "true" }))
                }
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          <div className="grid gap-1">
            <label>Notas internas (opcional)</label>
            <Textarea placeholder="Ex: Caixa exclusiva para chamados, sem anexos grandes." />
          </div>

          {emailStatus ? <p className="text-xs text-emerald-300">{emailStatus}</p> : null}
          {testStatus ? <p className="text-xs text-amber-300">{testStatus}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                if (!token) return;
                try {
                  const updated = await updateEmailIntegrationConfig(token, {
                    ...emailConfig,
                    appPassword: passwordDraft || undefined,
                  });
                  setEmailConfig({ ...emailConfig, ...updated });
                  setPasswordDraft("");
                  setEmailStatus("Configuração salva com sucesso.");
                  setTestStatus(null);
                } catch (error) {
                  setEmailStatus("Não foi possível salvar a configuração.");
                }
              }}
            >
              Salvar configuração
            </Button>
            <Button
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
              Testar conexão
            </Button>
            <Button variant="secondary" onClick={() => setEmailDialogOpen(false)}>
              Fechar
            </Button>
          </div>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
      <div className="lg:col-span-12">
        <Tabs defaultValue="canned" className="grid gap-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="canned">Respostas Prontas</TabsTrigger>
            <TabsTrigger value="sla">Políticas de SLA</TabsTrigger>
            <TabsTrigger value="channels">Canais e E-mail</TabsTrigger>
          </TabsList>

          <TabsContent value="canned">
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
                {cannedResponses.length === 0 ? (
                  <p>Nenhuma resposta cadastrada.</p>
                ) : (
                  cannedResponses.map((tpl) => (
                    <div key={tpl.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{tpl.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {tpl.scope === "shared" ? "Compartilhado" : "Pessoal"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCannedDraft(tpl);
                              setCannedDialogOpen(true);
                            }}
                          >
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
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sla">
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
          </TabsContent>

          <TabsContent value="channels">
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
                    <Button size="sm" onClick={() => setEmailDialogOpen(true)}>
                      Configurar
                    </Button>
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
                  <Button size="sm" onClick={() => setSystemDialogOpen(true)}>
                    Configurar envio
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4 bg-card/70">
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
                      const updated = await updateSystemParams(token, {
                        emailSignature: signatureDraft,
                      });
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
          </TabsContent>
        </Tabs>
      </div>

      <AccessControl token={token} />

      <Card className="bg-card/70 lg:col-span-12">
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>Status enviados por e-mail/Slack (simulado).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {notifications.length === 0 ? (
            <p>Nenhuma notificação enviada ainda.</p>
          ) : null}
          {notifications.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs uppercase text-muted-foreground">{item.channel}</p>
              <p>{item.message}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </CardContent>
      </Card>


      <Dialog open={cannedDialogOpen} onOpenChange={setCannedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resposta pronta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              Variáveis disponíveis: {"{ticket}"}, {"{assunto}"}, {"{status}"}, {"{prioridade}"},{" "}
              {"{fila}"}, {"{responsavel}"}, {"{sistema}"}, {"{categoria}"}
            </div>
            <div className="grid gap-2">
              <label>Título / Atalho</label>
              <Input
                value={cannedDraft.title}
                onChange={(event) =>
                  setCannedDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Ex: Atualização padrão"
              />
            </div>
            <div className="grid gap-2">
              <label>Disponibilidade</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={cannedDraft.scope}
                onChange={(event) =>
                  setCannedDraft((prev) => ({
                    ...prev,
                    scope: event.target.value as "personal" | "shared",
                  }))
                }
              >
                <option value="personal">Pessoal</option>
                <option value="shared">Compartilhado</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label>Texto da resposta</label>
              <Textarea
                value={cannedDraft.body}
                onChange={(event) =>
                  setCannedDraft((prev) => ({ ...prev, body: event.target.value }))
                }
                placeholder="Texto que será usado na resposta."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  if (!token) return;
                  if (!cannedDraft.title.trim() || !cannedDraft.body.trim()) return;
                  const next = cannedDraft.id
                    ? cannedResponses.map((tpl) =>
                        tpl.id === cannedDraft.id ? { ...tpl, ...cannedDraft } : tpl
                      )
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
                  } catch (error: any) {
                    setCannedStatus(error?.message ?? "Falha ao salvar resposta.");
                  }
                }}
              >
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCannedDraft({ id: "", title: "", body: "", scope: "shared" })
                }
              >
                Limpar
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCannedDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={systemDialogOpen} onOpenChange={setSystemDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Parâmetros do Sistema</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <label>Serviço de envio</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={systemParams.mailProvider}
                onChange={(event) =>
                  setSystemParams((prev) => ({
                    ...prev,
                    mailProvider: event.target.value as SystemParams["mailProvider"],
                  }))
                }
              >
                <option value="Gmail">Gmail (App Password)</option>
                <option value="Office365">Office365</option>
                <option value="SendGrid">SendGrid</option>
                <option value="AmazonSES">Amazon SES</option>
                <option value="Mailgun">Mailgun</option>
                <option value="SMTP">SMTP da empresa</option>
              </select>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Nome do remetente</label>
                <Input
                  value={systemParams.fromName}
                  onChange={(event) => setSystemParams((prev) => ({ ...prev, fromName: event.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <label>E-mail do remetente</label>
                <Input
                  value={systemParams.fromEmail}
                  onChange={(event) => setSystemParams((prev) => ({ ...prev, fromEmail: event.target.value }))}
                />
              </div>
            </div>

            {systemParams.mailProvider === "Gmail" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Gmail usuário</label>
                  <Input
                    value={systemParams.gmailUser}
                    onChange={(event) => setSystemParams((prev) => ({ ...prev, gmailUser: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label>App Password</label>
                  <Input
                    type="password"
                    value={systemSecrets.gmailAppPassword}
                    onChange={(event) =>
                      setSystemSecrets((prev) => ({ ...prev, gmailAppPassword: event.target.value }))
                    }
                    placeholder={systemParams.hasGmailPassword ? "Senha já configurada" : "Cole aqui"}
                  />
                </div>
              </div>
            ) : null}

            {systemParams.mailProvider === "Office365" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Usuário Office365</label>
                  <Input
                    value={systemParams.office365User}
                    onChange={(event) => setSystemParams((prev) => ({ ...prev, office365User: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label>Senha (App Password)</label>
                  <Input
                    type="password"
                    value={systemSecrets.office365Pass}
                    onChange={(event) =>
                      setSystemSecrets((prev) => ({ ...prev, office365Pass: event.target.value }))
                    }
                    placeholder={systemParams.hasOffice365Password ? "Senha já configurada" : "Cole aqui"}
                  />
                </div>
              </div>
            ) : null}

            {systemParams.mailProvider === "SendGrid" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>API Key</label>
                  <Input
                    type="password"
                    value={systemSecrets.sendGridApiKey}
                    onChange={(event) =>
                      setSystemSecrets((prev) => ({ ...prev, sendGridApiKey: event.target.value }))
                    }
                    placeholder={systemParams.hasSendGridKey ? "Chave já configurada" : "Cole aqui"}
                  />
                </div>
              </div>
            ) : null}

            {systemParams.mailProvider === "AmazonSES" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Região</label>
                  <Input
                    value={systemParams.sesRegion}
                    onChange={(event) => setSystemParams((prev) => ({ ...prev, sesRegion: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label>Usuário SMTP</label>
                  <Input
                    value={systemParams.sesSmtpUser}
                    onChange={(event) => setSystemParams((prev) => ({ ...prev, sesSmtpUser: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label>Senha SMTP</label>
                  <Input
                    type="password"
                    value={systemSecrets.sesSmtpPass}
                    onChange={(event) =>
                      setSystemSecrets((prev) => ({ ...prev, sesSmtpPass: event.target.value }))
                    }
                    placeholder={systemParams.hasSesPassword ? "Senha já configurada" : "Cole aqui"}
                  />
                </div>
              </div>
            ) : null}

            {systemParams.mailProvider === "Mailgun" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Domínio</label>
                  <Input
                    value={systemParams.mailgunDomain}
                    onChange={(event) => setSystemParams((prev) => ({ ...prev, mailgunDomain: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label>API Key</label>
                  <Input
                    type="password"
                    value={systemSecrets.mailgunApiKey}
                    onChange={(event) =>
                      setSystemSecrets((prev) => ({ ...prev, mailgunApiKey: event.target.value }))
                    }
                    placeholder={systemParams.hasMailgunKey ? "Chave já configurada" : "Cole aqui"}
                  />
                </div>
              </div>
            ) : null}

            {systemParams.mailProvider === "SMTP" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-1">
                  <label>Host SMTP</label>
                  <Input
                    value={systemParams.smtpHost}
                    onChange={(event) => setSystemParams((prev) => ({ ...prev, smtpHost: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label>Porta</label>
                  <Input
                    type="number"
                    value={systemParams.smtpPort}
                    onChange={(event) =>
                      setSystemParams((prev) => ({ ...prev, smtpPort: Number(event.target.value) }))
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <label>Usuário SMTP</label>
                  <Input
                    value={systemParams.smtpUser}
                    onChange={(event) => setSystemParams((prev) => ({ ...prev, smtpUser: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label>Senha SMTP</label>
                  <Input
                    type="password"
                    value={systemSecrets.smtpPass}
                    onChange={(event) => setSystemSecrets((prev) => ({ ...prev, smtpPass: event.target.value }))}
                    placeholder={systemParams.hasSmtpPassword ? "Senha já configurada" : "Cole aqui"}
                  />
                </div>
                <div className="grid gap-1">
                  <label>Conexão segura (TLS)</label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={systemParams.smtpSecure ? "true" : "false"}
                    onChange={(event) =>
                      setSystemParams((prev) => ({ ...prev, smtpSecure: event.target.value === "true" }))
                    }
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Alerta de SLA (minutos)</label>
                <Input
                  type="number"
                  min={5}
                  value={systemParams.slaWarningMinutes ?? 120}
                  onChange={(event) =>
                    setSystemParams((prev) => ({
                      ...prev,
                      slaWarningMinutes: Number(event.target.value || 120),
                    }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <label>Descrição</label>
                <Input value="Notificação visual antes do SLA estourar." disabled />
              </div>
            </div>

            {systemStatus ? <p className="text-xs text-amber-300">{systemStatus}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSystemDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={async () => {
                if (!token) return;
                try {
                  const updated = await updateSystemParams(token, {
                    ...systemParams,
                    gmailAppPassword: systemSecrets.gmailAppPassword || undefined,
                    sendGridApiKey: systemSecrets.sendGridApiKey || undefined,
                    office365Pass: systemSecrets.office365Pass || undefined,
                    sesSmtpPass: systemSecrets.sesSmtpPass || undefined,
                    mailgunApiKey: systemSecrets.mailgunApiKey || undefined,
                    smtpPass: systemSecrets.smtpPass || undefined,
                  });
                  setSystemParams((prev) => ({ ...prev, ...updated }));
                  setSystemSecrets({
                    gmailAppPassword: "",
                    sendGridApiKey: "",
                    office365Pass: "",
                    sesSmtpPass: "",
                    mailgunApiKey: "",
                    smtpPass: "",
                  });
                  setSystemStatus("Parâmetros salvos.");
                } catch (error: any) {
                  setSystemStatus(error?.message ?? "Falha ao salvar parâmetros.");
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
