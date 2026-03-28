import { useMemo, useState } from "react";
import { 
  Search, 
  PlusCircle, 
  History, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Laptop
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Asset, KnowledgeArticle, ServiceCatalog, Ticket, User } from "@/types";
import { cn } from "@/lib/utils";

interface PortalProps {
  currentUser?: User;
  tickets: Ticket[];
  assets: Asset[];
  services: ServiceCatalog[];
  articles: KnowledgeArticle[];
  portalWelcomeTitle?: string;
  portalWelcomeSubtitle?: string;
  portalLogoUrl?: string;
  onCreateTicket: (payload: Partial<Ticket>) => Promise<void>;
  onAddComment: (id: string, message: string) => Promise<void>;
}

const statusTone: Record<Ticket["status"], "default" | "secondary" | "warning" | "success" | "outline"> = {
  Novo: "secondary",
  Triagem: "warning",
  "Em atendimento": "default",
  "Aguardando fornecedor": "warning",
  "Aguardando solicitante": "secondary",
  "Aguardando aprovação": "warning",
  Resolvido: "success",
  Fechado: "outline",
  Cancelado: "outline",
};

export function Portal({ 
  currentUser, 
  tickets, 
  assets, 
  services, 
  articles, 
  portalWelcomeTitle, 
  portalWelcomeSubtitle, 
  portalLogoUrl,
  onCreateTicket, 
  onAddComment 
}: PortalProps) {
  const [query, setQuery] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceCatalog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState("inicio");

  const scrollToCatalog = () => {
    setActiveTab("inicio");
    setTimeout(() => {
      const el = document.getElementById("catalog-search");
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const myTickets = useMemo(() => {
    return tickets.filter(t => t.status !== "Fechado" && t.status !== "Cancelado");
  }, [tickets]);

  const stats = useMemo(() => ({
    open: myTickets.length,
    assets: assets.filter(a => a.assignedTo?.id === currentUser?.id).length,
    resolved: tickets.filter(t => t.status === "Resolvido").length
  }), [myTickets, tickets, assets, currentUser]);

  const filteredServices = useMemo(() => {
    const visible = services.filter((item) => item.isVisible);
    if (!query.trim()) return visible;
    return visible.filter((item) =>
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
    <div className="flex flex-col gap-8 pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-background p-8 lg:p-12 border border-primary/10">
        <div className="relative z-10 flex flex-col gap-4 lg:max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight lg:text-5xl text-foreground">
            {portalWelcomeTitle || <>Olá, <span className="text-primary">{currentUser?.name?.split(" ")[0] || "Visitante"}</span>!</>}
          </h2>
          <p className="text-lg text-muted-foreground lg:text-xl">
            {portalWelcomeSubtitle || "Como o time de TI pode facilitar o seu dia hoje? Escolha um serviço ou busque ajuda rápida."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
             <Button size="lg" className="rounded-full shadow-glow" onClick={scrollToCatalog}>
                <PlusCircle className="mr-2 h-5 w-5" />
                Novo Chamado
             </Button>
             <Button size="lg" variant="outline" className="rounded-full bg-background/50 backdrop-blur" onClick={() => setActiveTab("chamados")}>
                <History className="mr-2 h-5 w-5" />
                Meus Chamados ({stats.open})
             </Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-20 hidden lg:block overflow-hidden h-full flex items-center justify-center pr-32">
           {portalLogoUrl ? (
             <img src={portalLogoUrl} alt="Branding" className="h-48 w-auto opacity-20 object-contain rotate-12" />
           ) : (
             <div className="h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
           )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-none bg-primary/5 shadow-none transition hover:bg-primary/10 cursor-pointer" onClick={() => setActiveTab("chamados")}>
          <CardContent className="flex items-center gap-4 pt-6 text-primary">
            <Clock className="h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">{stats.open}</p>
              <p className="text-xs uppercase tracking-wider opacity-70">Chamados em aberto</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-emerald-500/5 shadow-none transition hover:bg-emerald-500/10">
          <CardContent className="flex items-center gap-4 pt-6 text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-xs uppercase tracking-wider opacity-70">Solucionados recentemente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-amber-500/5 shadow-none transition hover:bg-amber-500/10">
          <CardContent className="flex items-center gap-4 pt-6 text-amber-500">
            <Laptop className="h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">{stats.assets}</p>
              <p className="text-xs uppercase tracking-wider opacity-70">Equipamentos atribuídos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="inicio" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
             <Search className="h-4 w-4" /> Catálogo
          </TabsTrigger>
          <TabsTrigger value="chamados" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
             <History className="h-4 w-4" /> Meus Chamados
          </TabsTrigger>
          <TabsTrigger value="ajuda" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
             <HelpCircle className="h-4 w-4" /> Ajuda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inicio" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col gap-4">
            <Input
              id="catalog-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="🔍 O que você precisa? Ex: 'Mudar senha', 'Novo notebook'..."
              className="h-12 text-lg rounded-2xl bg-card/50 border-primary/20 focus:border-primary"
            />
            
            <div className="grid gap-10">
              {Object.entries(groupedServices).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-8 rounded-full bg-primary" />
                    <h3 className="text-lg font-bold tracking-tight text-foreground uppercase">{category}</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((service) => (
                      <button
                        key={service.id}
                        className="group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-primary/50 hover:bg-card/70 hover:shadow-glow-sm"
                        onClick={() => {
                          setSelectedService(service);
                          setDialogOpen(true);
                        }}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                           <PlusCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground leading-tight">{service.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {service.description || "Solicitação assistida de serviço de TI."}
                          </p>
                        </div>
                        <div className="mt-auto pt-2 opacity-0 transition group-hover:opacity-100 flex items-center text-xs font-semibold text-primary">
                           Solicitar <ExternalLink className="ml-1 h-3 w-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chamados" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden rounded-2xl">
             <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">Meus Chamados Recentes</CardTitle>
                <CardDescription>Acompanhe o status das suas solicitações</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
                {tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                     <Clock className="h-12 w-12 opacity-20 mb-4" />
                     <p>Você não possui chamados registrados.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 hover:bg-muted/20 transition cursor-pointer">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-mono font-bold text-muted-foreground">{ticket.code}</span>
                             <Badge variant={statusTone[ticket.status]} className="text-[10px] leading-tight px-2 py-0">
                                {ticket.status}
                             </Badge>
                           </div>
                           <p className="font-semibold text-foreground">{ticket.subject}</p>
                        </div>
                        <div className="flex items-center gap-6 mt-3 sm:mt-0 text-sm text-muted-foreground">
                           <div className="flex flex-col items-end">
                              <span className="text-xs uppercase font-bold text-muted-foreground/60">Abertura</span>
                              <span>{new Date(ticket.openedAt).toLocaleDateString("pt-BR")}</span>
                           </div>
                           <div className="flex flex-col items-end min-w-[100px]">
                              <span className="text-xs uppercase font-bold text-muted-foreground/60">Responsável</span>
                              <span>{ticket.assignee || "Pendente"}</span>
                           </div>
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:text-primary"
                              onClick={() => {
                                 setActiveTicket(ticket);
                                 setDetailOpen(true);
                              }}
                           >
                              <ExternalLink className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajuda" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum artigo encontrado.</p>
            ) : (
              filteredArticles.map((article) => (
                <Card key={article.id} className="group border-border/60 bg-card/40 hover:border-primary/40 transition-all rounded-2xl cursor-pointer overflow-hidden">
                  <div className="h-2 w-full bg-primary/20 group-hover:bg-primary transition" />
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      {article.title}
                      <HelpCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {article.body}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {article.relatedServiceId ? (
                      <Badge variant="outline" className="text-[10px]">
                        Serviço Relacionado: {article.relatedServiceId.title}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Guia geral</span>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl overflow-hidden">
          <DialogHeader className="bg-primary/5 -mx-6 -mt-6 p-6 pb-4 border-b border-primary/10">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <PlusCircle className="h-6 w-6" />
               </div>
               <div>
                  <DialogTitle className="text-xl">{selectedService?.title ?? "Novo chamado"}</DialogTitle>
                  <p className="text-sm text-muted-foreground">Solicitação via {selectedService?.category}</p>
               </div>
            </div>
          </DialogHeader>
          <div className="grid gap-6 mt-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-1">
                <p className="text-xs font-bold uppercase text-muted-foreground">SLA Esperado</p>
                <p className="text-base font-semibold">{selectedService?.defaultSLA ?? "-"} horas</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-1">
                <p className="text-xs font-bold uppercase text-muted-foreground">Complexidade</p>
                <p className="text-base font-semibold">
                  {selectedService?.defaultPriority === "P0" ? "Crítico" : 
                   selectedService?.defaultPriority === "P1" ? "Alta" : "Média/Baixa"}
                </p>
              </div>
            </div>
            
            {selectedService?.requiresApproval && (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 p-4 text-amber-500 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs leading-none">Este serviço exige aprovação prévia do gestor ou área técnica.</p>
              </div>
            )}

            <div className="grid gap-2">
              <label className="font-bold text-foreground">Como podemos ajudar?</label>
              <Textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva detalhes que possam agilizar o seu atendimento."
                className="rounded-2xl border-border/60 focus:border-primary resize-none bg-muted/10"
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Voltar
            </Button>
            <Button
              className="rounded-xl shadow-glow px-8"
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
              Confirmar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl rounded-3xl overflow-hidden flex flex-col h-[80vh]">
          <DialogHeader className="bg-primary/5 -mx-6 -mt-6 p-6 pb-4 border-b border-primary/10 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <Clock className="h-6 w-6" />
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">{activeTicket?.code}</span>
                      {activeTicket && (
                        <Badge variant={statusTone[activeTicket.status]} className="text-[10px] px-2 py-0">
                           {activeTicket.status}
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="text-lg">{activeTicket?.subject}</DialogTitle>
                 </div>
              </div>
              <div className="text-right hidden sm:block">
                 <p className="text-xs font-bold uppercase text-muted-foreground">Abertura em</p>
                 <p className="text-sm font-semibold">
                    {activeTicket ? new Date(activeTicket.openedAt).toLocaleDateString("pt-BR") : "-"}
                 </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-6">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Descrição da Solicitação</p>
              <p className="text-sm whitespace-pre-wrap">{activeTicket?.description || "Sem descrição detalhada."}</p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2">
                 <History className="h-4 w-4 text-primary" />
                 <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Histórico e Comentários</h3>
               </div>
              
              <div className="space-y-3">
                {activeTicket?.comments && activeTicket.comments.length > 0 ? (
                  activeTicket.comments.map((comment, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "rounded-2xl p-4 text-sm max-w-[90%]",
                        comment.author === currentUser?.email 
                          ? "ml-auto bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted border border-border/60 rounded-tl-none"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-[10px] font-bold uppercase opacity-70">
                           {comment.author === currentUser?.email ? "Eu" : comment.author.split("@")[0]}
                        </span>
                        <span className="text-[10px] opacity-70">
                           {new Date(comment.at).toLocaleString("pt-BR", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <p>{comment.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center py-6 text-muted-foreground italic">Nenhuma interação registrada ainda.</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 shrink-0">
             <div className="relative flex gap-2">
                <Textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="min-h-[80px] rounded-2xl resize-none bg-muted/10 border-border/60 focus:border-primary pr-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      // trigger save
                    }
                  }}
                />
                <Button 
                   className="absolute bottom-2 right-2 rounded-xl h-10 w-10 p-0 shadow-glow"
                   disabled={!newComment.trim() || commentSaving}
                   onClick={async () => {
                      if (!activeTicket || !newComment.trim()) return;
                      setCommentSaving(true);
                      try {
                        await onAddComment(activeTicket.id, newComment);
                        setNewComment("");
                      } finally {
                        setCommentSaving(false);
                      }
                   }}
                >
                   <PlusCircle className="h-5 w-5" />
                </Button>
             </div>
             <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Dica: Shift + Enter para quebrar linha.
             </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
