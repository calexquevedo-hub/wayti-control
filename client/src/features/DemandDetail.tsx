import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContactLog, Demand, Ticket } from "@/types";
import { DemandTasks } from "@/features/demands/DemandTasks";

interface DemandDetailProps {
  demand: Demand;
  contacts?: ContactLog[];
  tickets?: Ticket[];
  onUpdateTasks?: (tasks: Demand["tasks"]) => void;
  defaultTab?: string;
}

function formatDate(value: Date) {
  if (Number.isNaN(value.getTime())) {
    return "-";
  }
  return value.toLocaleDateString("pt-BR");
}

export function DemandDetail({
  demand,
  contacts = [],
  tickets = [],
  onUpdateTasks,
  defaultTab = "resumo",
}: DemandDetailProps) {
  const timeline = [...demand.followUps]
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
    .map((item) => ({
      title: item.title,
      date: item.dueDate,
      owner: item.owner,
      status: item.status,
      notes: item.notes,
    }));

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="resumo">Resumo</TabsTrigger>
        <TabsTrigger value="comentarios">Comentários</TabsTrigger>
        <TabsTrigger value="contatos">Contatos</TabsTrigger>
        <TabsTrigger value="dependencias">Dependências</TabsTrigger>
        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        <TabsTrigger value="evidencias">Evidências</TabsTrigger>
        <TabsTrigger value="plano">Plano de execução</TabsTrigger>
        <TabsTrigger value="tickets">Chamados</TabsTrigger>
      </TabsList>

      <TabsContent value="resumo">
        <div className="grid gap-4">
          <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <p>Patrocinador: {demand.sponsor}</p>
              <p>Responsável: {demand.responsible}</p>
              <p>Categoria: {demand.category}</p>
              <p>Prioridade: {demand.priority}</p>
              <p>Impacto: {demand.impact}</p>
              {demand.executiveSummary ? <p>Resumo: {demand.executiveSummary}</p> : null}
              <p>Aprovador: {demand.approver ?? "Não definido"}</p>
              <p>Situação de aprovação: {demand.approvalStatus ?? "pendente"}</p>
              {demand.approvalNotes ? <p>Notas de aprovação: {demand.approvalNotes}</p> : null}
              {demand.approvalSlaDays ? <p>SLA de aprovação: {demand.approvalSlaDays} dias</p> : null}
              <p>Última atualização: {formatDate(demand.lastUpdate)}</p>
            </div>
          </div>
          <div className="grid gap-3">
            <p className="text-sm font-semibold">Workflow de aprovação</p>
            {demand.approvalStages && demand.approvalStages.length > 0 ? (
              demand.approvalStages.map((stage, index) => (
                <div key={`${stage.name}-${index}`} className="rounded-lg border border-border/60 bg-card/70 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold">{stage.name}</p>
                    <span className="text-xs text-muted-foreground">{stage.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Responsável: {stage.owner}</p>
                  {stage.slaDays ? (
                    <p className="text-xs text-muted-foreground">SLA: {stage.slaDays} dias</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Sem etapas configuradas.</div>
            )}
          </div>
          <div className="grid gap-3">
            <p className="text-sm font-semibold">Linha do tempo de follow-ups</p>
            {timeline.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem follow-ups registrados.</div>
            ) : null}
            {timeline.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-lg border border-border/60 bg-card/70 p-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold">{item.title}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Responsável: {item.owner}</p>
                <p className="text-xs text-muted-foreground">Status: {item.status}</p>
                <p className="text-xs text-muted-foreground">Notas: {item.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="comentarios">
        <div className="grid gap-3 text-sm text-muted-foreground">
          {demand.comments && demand.comments.length > 0 ? (
            demand.comments.map((comment, index) => (
              <div key={`${comment.author}-${comment.at}-${index}`} className="rounded-lg border border-border/60 bg-card/70 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{comment.author}</span>
                  <span>{formatDate(comment.at)}</span>
                </div>
                <p className="mt-2 text-sm">{comment.message}</p>
              </div>
            ))
          ) : (
            <p>Sem comentários registrados.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="contatos">
        <div className="grid gap-3 text-sm text-muted-foreground">
          {contacts.length === 0 ? <p>Sem contatos registrados.</p> : null}
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-lg border border-border/60 bg-card/70 p-4">
              <p className="text-xs">{formatDate(contact.at)}</p>
              <p className="text-sm font-semibold">{contact.channel}</p>
              <p>{contact.summary}</p>
              {contact.nextFollowUpAt ? (
                <p className="text-xs">Proximo: {formatDate(contact.nextFollowUpAt)}</p>
              ) : null}
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="dependencias">
        <div className="grid gap-3 text-sm text-muted-foreground">
          {demand.dependencies?.length ? (
            demand.dependencies.map((dep, index) => (
              <div key={`${dep.title}-${index}`} className="rounded-lg border border-border/60 bg-card/70 p-4">
                <p className="text-sm font-semibold">{dep.title}</p>
                <p>Tipo: {dep.kind}</p>
                <p>Dono: {dep.owner}</p>
                <p>Status: {dep.status}</p>
                {dep.notes ? <p>Notas: {dep.notes}</p> : null}
              </div>
            ))
          ) : (
            <p>Sem dependências registradas.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="financeiro">
        <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
          <p>Financeiro mensal: R$ {demand.financialMonthly.toLocaleString("pt-BR")}</p>
          <p>One-off: R$ {demand.financialOneOff.toLocaleString("pt-BR")}</p>
          <p>Orçamento: R$ {demand.budget.toLocaleString("pt-BR")}</p>
          <p>Gasto: R$ {demand.spent.toLocaleString("pt-BR")}</p>
        </div>
      </TabsContent>

      <TabsContent value="evidencias">
        <div className="grid gap-3 text-sm text-muted-foreground">
          {demand.evidenceLinks?.length ? (
            demand.evidenceLinks.map((link, index) => (
              <div key={`${link.label}-${index}`} className="rounded-lg border border-border/60 bg-card/70 p-3">
                <p className="text-sm font-semibold">{link.label}</p>
                <p>{link.kind}</p>
                <a className="text-xs underline" href={link.url} target="_blank" rel="noreferrer">
                  {link.url}
                </a>
              </div>
            ))
          ) : (
            <p>Sem evidencias registradas.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="tickets">
        <div className="grid gap-3 text-sm text-muted-foreground">
          {tickets.length === 0 ? <p>Sem tickets vinculados.</p> : null}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-border/60 bg-card/70 p-4">
              <p className="text-sm font-semibold">{ticket.subject}</p>
              <p>Status: {ticket.status}</p>
              <p>Sistema: {ticket.system}</p>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="plano">
        <DemandTasks
          tasks={demand.tasks ?? []}
          onUpdateTasks={(tasks) => {
            if (!onUpdateTasks) return;
            onUpdateTasks(tasks);
          }}
        />
      </TabsContent>
    </Tabs>
  );
}
