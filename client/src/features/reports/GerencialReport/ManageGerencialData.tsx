import React, { useState, useEffect } from "react";
import { 
  fetchRisks, createRisk, updateRisk, deleteRisk,
  fetchNextSteps, createNextStep, updateNextStep, deleteNextStep 
} from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface Props {
  token?: string;
  activeSprintId?: string;
}

export const ManageGerencialData: React.FC<Props> = ({ token, activeSprintId }) => {
  const [risks, setRisks] = useState<any[]>([]);
  const [nextSteps, setNextSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [r, n] = await Promise.all([
        fetchRisks(token),
        fetchNextSteps(token)
      ]);
      setRisks(r);
      setNextSteps(n);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addRisk = () => {
    setRisks([...risks, { 
      title: "", severity: "Médio", status: "Aberto", impact: "Médio", 
      linkedSprintId: activeSprintId, isNew: true 
    }]);
  };

  const addNextStep = () => {
    setNextSteps([...nextSteps, { 
      title: "", priorityColor: "green", order: nextSteps.length + 1, 
      responsible: "", dueLabel: "IMEDIATO", linkedSprintId: activeSprintId, isNew: true 
    }]);
  };

  const saveRisk = async (idx: number) => {
    if (!token) return;
    const risk = risks[idx];
    try {
      if (risk.id || risk._id) {
        await updateRisk(token, risk.id || risk._id, risk);
      } else {
        const created = await createRisk(token, risk);
        const newRisks = [...risks];
        newRisks[idx] = created;
        setRisks(newRisks);
      }
      alert("Risco salvo com sucesso!");
    } catch (err) {
      alert("Erro ao salvar risco.");
    }
  };

  const saveNextStep = async (idx: number) => {
    if (!token) return;
    const step = nextSteps[idx];
    try {
      if (step.id || step._id) {
        await updateNextStep(token, step.id || step._id, step);
      } else {
        const created = await createNextStep(token, step);
        const newSteps = [...nextSteps];
        newSteps[idx] = created;
        setNextSteps(newSteps);
      }
      alert("Próximo passo salvo!");
    } catch (err) {
      alert("Erro ao salvar próximo passo.");
    }
  };

  const deleteOneRisk = async (id: string, idx: number) => {
    if (!token) return;
    if (!id) {
      setRisks(risks.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm("Excluir este risco?")) return;
    try {
      await deleteRisk(token, id);
      setRisks(risks.filter(r => (r.id || r._id) !== id));
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  const deleteOneNextStep = async (id: string, idx: number) => {
    if (!token) return;
    if (!id) {
      setNextSteps(nextSteps.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm("Excluir este passo?")) return;
    try {
      await deleteNextStep(token, id);
      setNextSteps(nextSteps.filter(s => (s.id || s._id) !== id));
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      {/* ... (render logic remains identical, just update function calls for delete) */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dados do Relatório Gerencial</h2>
      </div>

      <Tabs defaultValue="risks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="risks">Riscos e Alertas</TabsTrigger>
          <TabsTrigger value="next-steps">Próximos Passos</TabsTrigger>
        </TabsList>

        <TabsContent value="risks" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={addRisk} className="gap-2 bg-red-700 hover:bg-red-800">
              <Plus className="w-4 h-4" /> Adicionar Risco
            </Button>
          </div>
          {risks.map((risk, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={risk.title} onChange={e => {
                    const n = [...risks]; n[idx].title = e.target.value; setRisks(n);
                  }} placeholder="Título do risco" />
                </div>
                <div className="space-y-2">
                  <Label>Severidade</Label>
                  <Select value={risk.severity} onValueChange={v => {
                    const n = [...risks]; n[idx].severity = v; setRisks(n);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Crítico">Crítico</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Input value={risk.description} onChange={e => {
                    const n = [...risks]; n[idx].description = e.target.value; setRisks(n);
                  }} placeholder="Resumo do impacto e situação atual" />
                </div>
                <div className="flex justify-end col-span-2 gap-2 mt-2">
                  <Button variant="outline" size="icon" onClick={() => deleteOneRisk(risk.id || risk._id, idx)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={() => saveRisk(idx)} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="next-steps" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={addNextStep} className="gap-2 bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4" /> Adicionar Passo
            </Button>
          </div>
          {nextSteps.map((step, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6 grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ação / Título</Label>
                  <Input value={step.title} onChange={e => {
                    const n = [...nextSteps]; n[idx].title = e.target.value; setNextSteps(n);
                  }} />
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input value={step.responsible} onChange={e => {
                    const n = [...nextSteps]; n[idx].responsible = e.target.value; setNextSteps(n);
                  }} />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade (Cor)</Label>
                  <Select value={step.priorityColor} onValueChange={v => {
                    const n = [...nextSteps]; n[idx].priorityColor = v; setNextSteps(n);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="red">Vermelho (Imediato)</SelectItem>
                      <SelectItem value="yellow">Amarelo (Médio)</SelectItem>
                      <SelectItem value="green">Verde (Normal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo (Label)</Label>
                  <Input value={step.dueLabel} onChange={e => {
                    const n = [...nextSteps]; n[idx].dueLabel = e.target.value; setNextSteps(n);
                  }} placeholder="ex: IMEDIATO ou 25/03" />
                </div>
                <div className="flex justify-end col-span-2 items-end pb-1 gap-2">
                  <Button variant="outline" size="icon" onClick={() => deleteOneNextStep(step.id || step._id, idx)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={() => saveNextStep(idx)} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
