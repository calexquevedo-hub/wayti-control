import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeArticle, ServiceCatalog, Ticket } from "@/types";

interface PortalProps {
  services: ServiceCatalog[];
  articles: KnowledgeArticle[];
  onCreateTicket: (payload: Partial<Ticket>) => Promise<void>;
}

export function Portal({ services, articles, onCreateTicket }: PortalProps) {
  const [query, setQuery] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceCatalog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState("");

  const filteredServices = useMemo(() => {
    if (!query.trim()) return services.filter((item) => item.isVisible);
    return services.filter((item) =>
      `${item.title} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [services, query]);

  const filteredArticles = useMemo(() => {
    if (!query.trim()) return articles.slice(0, 6);
    return articles.filter((item) =>
      `${item.title} ${item.body}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [articles, query]);

  const groupedServices = useMemo(() => {
    return filteredServices.reduce<Record<string, ServiceCatalog[]>>((acc, service) => {
      const key = service.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(service);
      return acc;
    }, {});
  }, [filteredServices]);

  return (
    <div className="grid gap-6">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Portal de Serviços</CardTitle>
          <CardDescription>Como podemos ajudar hoje?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="🔍 Buscar por serviços ou artigos..."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {Object.entries(groupedServices).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
                {items.map((service) => (
                  <button
                    key={service.id}
                    className="w-full rounded-lg border border-border/60 bg-background/40 p-3 text-left transition hover:border-primary/50"
                    onClick={() => {
                      setSelectedService(service);
                      setDialogOpen(true);
                    }}
                  >
                    <p className="text-sm font-semibold text-foreground">{service.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.description || "Solicitação guiada"}
                    </p>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Top artigos</CardTitle>
          <CardDescription>Autoajuda mais consultada</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {filteredArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum artigo encontrado.</p>
          ) : (
            filteredArticles.map((article) => (
              <div key={article.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">{article.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{article.body}</p>
                {article.relatedServiceId ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Serviço relacionado: {article.relatedServiceId.title}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedService?.title ?? "Novo chamado"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              Prioridade definida pelo catálogo: {selectedService?.defaultPriority ?? "-"}
              <br />
              SLA padrão: {selectedService?.defaultSLA ?? "-"} horas
              {selectedService?.requiresApproval ? (
                <>
                  <br />
                  Aprovação obrigatória: sim
                </>
              ) : null}
            </div>
            <div className="grid gap-1">
              <label>Descrição do problema</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva o que está acontecendo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!selectedService) return;
                await onCreateTicket({
                  subject: selectedService.title,
                  description,
                  serviceId: selectedService.id,
                  category: selectedService.category,
                  queue: "TI Interna",
                  status: "Novo",
                  openedAt: new Date(),
                  channel: "Portal",
                });
                setDescription("");
                setDialogOpen(false);
              }}
            >
              Abrir chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
