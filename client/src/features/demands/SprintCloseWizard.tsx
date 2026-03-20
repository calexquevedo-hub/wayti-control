import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { closeSprint, fetchSprints, fetchDemands } from "@/lib/api";
import { Demand, Sprint } from "@/types";

const CARRYOVER_REASONS = [
  "Escopo/Estimativa inadequada",
  "Dependência externa (Fornecedor/Parceiro)",
  "Dependência interna (outra equipe)",
  "Falta de prioridade / mudança de prioridade",
  "Impedimento técnico (ambiente/infra)",
  "Impedimento de negócio (aprovação/pagamento)",
  "Bug/Incidente consumiu capacidade",
  "Ausência/Capacidade (férias/doença)",
  "Replanejamento deliberado (decisão de gestão)",
  "Outro",
];

interface Props {
  sprint: Sprint;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SprintCloseWizard: React.FC<Props> = ({ sprint, token, isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [nextSprints, setNextSprints] = useState<Sprint[]>([]);
  const [pendingDemands, setPendingDemands] = useState<Demand[]>([]);
  const [toSprintId, setToSprintId] = useState<string>("");
  const [decisions, setDecisions] = useState<Record<string, { type: string; reason: string; notes: string }>>({});

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sprints, demands] = await Promise.all([
        fetchSprints(token, "Planned"),
        fetchDemands(token, { sprint: sprint.id })
      ]);
      setNextSprints(sprints.filter(s => s.id !== sprint.id));
      
      const pending = demands.filter(d => d.status !== "Concluído" && d.status !== "Cancelado");
      setPendingDemands(pending);
      
      const initialDecisions: Record<string, any> = {};
      pending.forEach(d => {
        initialDecisions[d.id] = { type: "Carryover", reason: CARRYOVER_REASONS[0], notes: "" };
      });
      setDecisions(initialDecisions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionChange = (taskId: string, field: string, value: string) => {
    setDecisions(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], [field]: value }
    }));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const payload = {
        toSprintId: toSprintId || undefined,
        decisions: Object.entries(decisions).map(([taskId, d]) => ({
          taskId,
          decisionType: d.type as any,
          reasonCategory: d.reason,
          reasonNotes: d.notes
        })),
        notes: "Encerramento via Wizard"
      };
      await closeSprint(token, sprint.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "Erro ao encerrar sprint");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && pendingDemands.length > 0 && !toSprintId) {
       if (!confirm("Nenhum destino padrão selecionado. Itens marcados como carryover irão para o backlog. Continuar?")) return;
    }
    setStep(step + 1);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b bg-white">
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="text-red-500 w-5 h-5" />
            Encerrar {sprint.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
          {step === 1 && (
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurações de Fechamento</h3>
                <div className="space-y-2">
                  <Label>Destino Padrão para Carryover (Opcional)</Label>
                  <Select value={toSprintId} onValueChange={setToSprintId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a próxima sprint ou deixe para o Backlog" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextSprints.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Itens marcados como "Carryover" serão movidos para esta sprint.</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                <AlertCircle className="text-blue-600 w-5 h-5 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold">Estatísticas da Sprint:</p>
                  <ul className="list-disc ml-4 mt-1">
                    <li>Itens pendentes: {pendingDemands.length}</li>
                    <li>É necessário decidir o destino de cada item para prosseguir.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-4 bg-white border-b flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Triagem de Itens ({pendingDemands.length})</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Total de {pendingDemands.length} pendências
                </Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4 pb-4">
                  {pendingDemands.map(demand => (
                    <div key={demand.id} className="p-4 border rounded-xl space-y-4 bg-white shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-900 leading-tight">{demand.name}</h4>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-[10px] h-4">{demand.priority}</Badge>
                            <Badge variant="outline" className="text-[10px] h-4">{demand.epic}</Badge>
                          </div>
                        </div>
                        <Select 
                          value={decisions[demand.id]?.type} 
                          onValueChange={(v) => handleDecisionChange(demand.id, "type", v)}
                        >
                          <SelectTrigger className="w-40 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Carryover">Carryover ➡️</SelectItem>
                            <SelectItem value="Backlog">Backlog 📥</SelectItem>
                            <SelectItem value="Cancel">Cancelar ✖️</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Motivo (Causa Raiz)</Label>
                          <Select 
                            value={decisions[demand.id]?.reason} 
                            onValueChange={(v) => handleDecisionChange(demand.id, "reason", v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CARRYOVER_REASONS.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Observações Adicionais</Label>
                          <Textarea 
                            placeholder="Descreva o impedimento..." 
                            className="h-8 min-h-[32px] text-xs py-1"
                            value={decisions[demand.id]?.notes}
                            onChange={(e) => handleDecisionChange(demand.id, "notes", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-10 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Resumo do Encerramento</h3>
                <p className="text-gray-500">Tudo pronto para fechar a {sprint.name}.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm max-w-md mx-auto">
                <div className="p-3 border rounded-lg bg-white">
                  <p className="text-gray-500">Carryover</p>
                  <p className="text-2xl font-bold">{Object.values(decisions).filter(d => d.type === "Carryover").length}</p>
                </div>
                <div className="p-3 border rounded-lg bg-white">
                  <p className="text-gray-500">Backlog</p>
                  <p className="text-2xl font-bold">{Object.values(decisions).filter(d => d.type === "Backlog").length}</p>
                </div>
                <div className="p-3 border rounded-lg bg-white">
                  <p className="text-gray-500">Cancelados</p>
                  <p className="text-2xl font-bold">{Object.values(decisions).filter(d => d.type === "Cancel").length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-white">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={loading}>
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button 
              onClick={nextStep} 
              className="gap-2"
              disabled={loading}
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleFinish} 
              className="gap-2 bg-green-700 hover:bg-green-800"
              disabled={loading}
            >
              {loading ? "Processando..." : "Confirmar e Encerrar Sprint"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
