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
  Laptop,
  ScrollText,
  Paperclip,
  Send
} from "lucide-react";
import { getTicketPortalAttachmentUrl } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthState } from "@/hooks/useAuth";
import type { Asset, Ticket } from "@/types";
import { cn } from "@/lib/utils";

interface PortalProps {
  currentUser?: AuthState | null;
  tickets: Ticket[];
  assets: Asset[];
  portalWelcomeTitle?: string;
  portalWelcomeSubtitle?: string;
  portalLogoUrl?: string;
  onCreatePortalTicket: (formData: FormData) => Promise<void>;
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
  portalWelcomeTitle, 
  portalWelcomeSubtitle, 
  portalLogoUrl,
  onCreatePortalTicket, 
  onAddComment 
}: PortalProps) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const myTickets = useMemo(() => {
    return tickets.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }, [tickets]);

  const stats = useMemo(() => ({
    open: myTickets.filter(t => t.status !== "Fechado" && t.status !== "Cancelado").length,
    assets: assets.filter(a => a.assignedTo?.id === currentUser?.id).length,
    resolved: tickets.filter(t => t.status === "Resolvido").length
  }), [myTickets, tickets, assets, currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("O arquivo deve ter no máximo 1MB.");
      e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Apenas JPG, PNG e PDF são permitidos.");
      e.target.value = "";
      return;
    }

    setAttachment(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("description", description);
      if (attachment) {
        formData.append("attachment", attachment);
      }
      await onCreatePortalTicket(formData);
      setSubject("");
      setDescription("");
      setAttachment(null);
      const fileInput = document.getElementById("attachment-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error(err);
      alert("Falha ao enviar chamado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-background p-8 lg:p-12 border border-primary/10">
        <div className="relative z-10 flex flex-col gap-4">
          <h2 className="text-3xl font-bold tracking-tight lg:text-5xl text-foreground">
            {portalWelcomeTitle || <>Olá, <span className="text-primary">{currentUser?.name?.split(" ")[0] || "Visitante"}</span>!</>}
          </h2>
          <p className="text-lg text-muted-foreground lg:text-xl max-w-2xl">
            {portalWelcomeSubtitle || "Precisa de ajuda do time de TI? Abra uma solicitação abaixo e nós cuidamos do resto."}
          </p>
        </div>
        <div className="absolute top-0 right-0 -mr-20 hidden lg:block overflow-hidden h-full flex items-center justify-center pr-32">
           {portalLogoUrl ? (
             <img src={portalLogoUrl} alt="Branding" className="h-48 w-auto opacity-10 object-contain rotate-12" />
           ) : (
             <div className="h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* New Ticket Form */}
        <Card className="border-border/60 bg-card/40 backdrop-blur-sm rounded-3xl overflow-hidden shadow-glow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Abrir Novo Chamado
            </CardTitle>
            <CardDescription>Explique o que você precisa e anexe um print se necessário</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Assunto / Título</label>
                <Input 
                  placeholder="Ex: Não consigo acessar o e-mail" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="rounded-xl bg-background/50"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Descrição Detalhada</label>
                <Textarea 
                  placeholder="Conte-nos um pouco mais sobre o problema..." 
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="rounded-xl bg-background/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                   Print de Tela / Documento <span className="text-[10px] font-normal opacity-60">(Opcional • Max 1MB • JPG, PNG, PDF)</span>
                </label>
                <div className="relative">
                  <Input 
                    id="attachment-input"
                    type="file" 
                    onChange={handleFileChange}
                    className="rounded-xl bg-background/50 cursor-pointer pt-2"
                    accept=".jpg,.jpeg,.png,.pdf"
                  />
                  {attachment && (
                    <div className="absolute right-3 top-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl h-12 text-lg shadow-glow font-bold mt-2"
                disabled={isSubmitting || !subject.trim()}
              >
                {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Recent Tickets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Meus Chamados
            </h3>
            {stats.open > 0 && (
               <Badge variant="secondary" className="rounded-full">{stats.open} Ativos</Badge>
            )}
          </div>

          <div className="h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary/20">
            <div className="space-y-3">
              {myTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed border-border/60">
                  <Clock className="h-12 w-12 opacity-20 mb-4" />
                  <p>Nenhum chamado registrado.</p>
                </div>
              ) : (
                myTickets.map((ticket) => (
                  <Card key={ticket.id} className="group border-border/60 bg-card/40 hover:border-primary/40 transition-all rounded-2xl cursor-pointer overflow-hidden shadow-none" onClick={() => {
                    setActiveTicket(ticket);
                    setDetailOpen(true);
                  }}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">{ticket.code}</span>
                          <Badge variant={statusTone[ticket.status]} className="text-[10px] leading-tight px-2 py-0">
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="font-bold text-foreground truncate">{ticket.subject}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Aberto em {new Date(ticket.openedAt).toLocaleDateString("pt-BR")} 
                          {ticket.assignee ? ` • Gestor: ${ticket.assignee}` : " • Aguardando técnico"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 group-hover:text-primary transition">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
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

            {activeTicket?.attachments && activeTicket.attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">Anexos</p>
                <div className="grid gap-2">
                  {activeTicket.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={getTicketPortalAttachmentUrl(activeTicket.id, idx, currentUser?.token || "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 transition group"
                    >
                      <Paperclip className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{att.filename}</p>
                        <p className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}

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
