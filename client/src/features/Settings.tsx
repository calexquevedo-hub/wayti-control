import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NotificationItem } from "@/hooks/useNotifications";
import type { ExternalParty } from "@/types";

type SettingsSection = {
  key: string;
  title: string;
  description: string;
  items: string[];
};

interface SettingsProps {
  notifications?: NotificationItem[];
  token?: string;
  externalParties?: ExternalParty[];
}

const sections: SettingsSection[] = [
  {
    key: "configuracoes-demandas",
    title: "Configurações de Demandas",
    description: "Regras e catálogo que afetam o fluxo de demandas.",
    items: [
      "Categorias",
      "Épicos",
      "Automações",
      "Configurações de Follow-up",
      "Auditoria",
      "Notificações",
    ],
  },
  {
    key: "controle-de-acesso",
    title: "Controle de Acesso",
    description: "Governança de perfis e usuários.",
    items: ["Perfis", "Usuários"],
  },
  {
    key: "configuracoes-chamado",
    title: "Configurações de Chamado",
    description: "Parâmetros de atendimento e produtividade.",
    items: ["Políticas de SLA", "Respostas Prontas"],
  },
  {
    key: "canais-e-email",
    title: "Canais e E-mail",
    description: "Integrações e comunicação do service desk.",
    items: ["Integração IMAP", "Envio SMTP", "Assinatura Padrão"],
  },
];

const defaultSection = sections[0].key;

function readSectionFromUrl() {
  const url = new URL(window.location.href);
  const value = url.searchParams.get("secao") ?? defaultSection;
  return sections.some((section) => section.key === value) ? value : defaultSection;
}

function writeSectionToUrl(section: string, mode: "push" | "replace" = "replace") {
  const url = new URL(window.location.href);
  url.pathname = "/configuracoes";
  url.searchParams.set("secao", section);

  const next = `${url.pathname}?${url.searchParams.toString()}`;
  if (mode === "push") {
    window.history.pushState({}, "", next);
    return;
  }
  window.history.replaceState({}, "", next);
}

export function Settings(_props: SettingsProps) {
  const [activeSection, setActiveSection] = useState<string>(() => readSectionFromUrl());

  useEffect(() => {
    writeSectionToUrl(activeSection, "replace");
  }, []);

  useEffect(() => {
    const onPopState = () => setActiveSection(readSectionFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const currentSection = useMemo(
    () => sections.find((section) => section.key === activeSection) ?? sections[0],
    [activeSection]
  );

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    writeSectionToUrl(section, "push");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Hub central de administração do WayTI Control.
        </p>
      </div>

      <div className="hidden md:block">
        <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            {sections.map((section) => (
              <TabsTrigger key={section.key} value={section.key}>
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.key} value={section.key}>
              <Card>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {section.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left text-sm hover:bg-muted/50"
                      >
                        <span>{item}</span>
                        <Badge variant="outline">Em breve</Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="space-y-3 md:hidden">
        {sections.map((section) => {
          const open = activeSection === section.key;
          return (
            <Card key={section.key}>
              <button
                type="button"
                onClick={() => handleSectionChange(section.key)}
                className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
                <Badge variant={open ? "default" : "outline"}>{open ? "Aberto" : "Abrir"}</Badge>
              </button>

              {open ? (
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    {section.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:bg-muted/50"
                      >
                        <span>{item}</span>
                        <Badge variant="outline">Em breve</Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Seção ativa</CardTitle>
          <CardDescription>
            Deep-link atual: <code className="rounded bg-muted px-1 py-0.5">/configuracoes?secao={currentSection.key}</code>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
