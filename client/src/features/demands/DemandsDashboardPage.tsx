import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchDashboardData } from "@/lib/api";

interface DemandsDashboardPageProps {
  token?: string;
}

type DashboardPayload = Awaited<ReturnType<typeof fetchDashboardData>>;

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function colorClass(statusColor: "green" | "yellow" | "purple" | "gray") {
  if (statusColor === "green") return "bg-emerald-500 text-white";
  if (statusColor === "yellow") return "bg-amber-500 text-white";
  if (statusColor === "purple") return "bg-purple-600 text-white";
  return "bg-slate-200 text-slate-700";
}

export function DemandsDashboardPage({ token }: DemandsDashboardPageProps) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setData(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    fetchDashboardData(token)
      .then((response) => {
        if (!mounted) return;
        setData(response);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message ?? "Falha ao carregar Centro de Comando.");
        setData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const sprintTotal = useMemo(() => {
    if (!data?.currentSprint) return 0;
    return data.currentSprint.carryover + data.currentSprint.newScope;
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centro de Comando</h1>
        <p className="text-sm text-muted-foreground">
          Visão estratégica e operacional do portfólio.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando dados...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && data ? (
        <Tabs defaultValue="executive" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="executive">Visão Executiva</TabsTrigger>
            <TabsTrigger value="warroom">War Room (Sprint)</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="detailing">Detalhamento</TabsTrigger>
          </TabsList>

          <TabsContent value="executive" className="space-y-4 pt-3">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Épicos Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.executive.totalEpicsActive}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Sprint em Andamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base font-semibold">{data.currentSprint?.name ?? "Nenhuma"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tarefas em Aberto</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.executive.totalOpenTasks}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Entregues</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.executive.totalDeliveredTasks}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Épicos e Entregáveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="p-2">Épico</th>
                        <th className="p-2">Entregáveis Ativos</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.executive.epicsHealth.map((item) => (
                        <tr key={item.epicName} className="border-b">
                          <td className="p-2 font-medium">{item.epicName}</td>
                          <td className="p-2 text-muted-foreground">
                            {item.activeDeliverables.join(", ") || "-"}
                          </td>
                          <td className="p-2">
                            {item.healthStatus === "Crítico" ? (
                              <Badge className="bg-red-600 text-white">Crítico</Badge>
                            ) : (
                              <Badge className="bg-emerald-500 text-white">Em andamento</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warroom" className="space-y-4 pt-3">
            {!data.currentSprint ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Nenhuma sprint ativa no momento.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Dias Restantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{data.currentSprint.daysLeft}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Carryover</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-2xl font-bold ${data.currentSprint.carryover > 0 ? "text-red-600" : ""}`}>
                        {data.currentSprint.carryover}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Novo Escopo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{data.currentSprint.newScope}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{sprintTotal}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tarefas da Sprint Atual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="p-2">ID / Nome</th>
                            <th className="p-2">Épico</th>
                            <th className="p-2">Responsável</th>
                            <th className="p-2">Bloqueio / Gate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.currentSprint.activeTasks.map((task) => (
                            <tr key={task.id} className="border-b">
                              <td className="p-2">
                                <div className="font-medium">#{task.id.slice(-6)} - {task.name}</div>
                              </td>
                              <td className="p-2 text-muted-foreground">{task.epico || "-"}</td>
                              <td className="p-2 text-muted-foreground">{task.responsible || "-"}</td>
                              <td className="p-2">
                                {task.dependencia ? (
                                  <span className="inline-flex items-center gap-1 text-red-600">
                                    <AlertTriangle className="h-4 w-4" /> {task.dependencia}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="roadmap" className="pt-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {data.sprintHistory.map((sprint) => (
                <Card key={sprint.id}>
                  <CardHeader className={`rounded-t-lg ${colorClass(sprint.statusColor)}`}>
                    <CardTitle className="text-sm">{sprint.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-4 text-sm">
                    <p>
                      <span className="text-muted-foreground">Tarefas:</span> {sprint.taskCount}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDate(sprint.startDate)} a {formatDate(sprint.endDate)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="detailing" className="space-y-4 pt-3">
            {!data.detailing ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma sprint ativa para exibir detalhamento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="overflow-hidden border-0 shadow-none">
                  <CardHeader className="rounded-md bg-[#1f2a6e] py-4 text-white">
                    <CardTitle className="text-xl font-bold uppercase tracking-wide">
                      {data.detailing.sprint.name} | {formatDate(data.detailing.sprint.startDate)} a{" "}
                      {formatDate(data.detailing.sprint.endDate)} - Detalhamento
                    </CardTitle>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm uppercase tracking-wider text-[#1f2a6e]">
                        Tarefas por Épico
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.detailing.tasksByEpic}
                            layout="vertical"
                            margin={{ left: 24, right: 16, top: 8, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis
                              type="category"
                              dataKey="epicName"
                              width={170}
                              tick={{ fill: "#334155", fontSize: 12 }}
                            />
                            <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {data.detailing.concentration ? (
                        <p className="mt-2 text-sm italic text-slate-600">
                          {data.detailing.concentration.epicName} concentra{" "}
                          {data.detailing.concentration.total} de {data.detailing.tasks.length} tarefas (
                          {data.detailing.concentration.percent}%).
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm uppercase tracking-wider text-[#1f2a6e]">
                        Todas as Tarefas da Sprint
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[420px] overflow-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="sticky top-0 border-b bg-[#1f2a6e] text-left text-xs uppercase tracking-wide text-white">
                              <th className="p-2">ID</th>
                              <th className="p-2">Tarefa</th>
                              <th className="p-2">Categoria</th>
                              <th className="p-2">Épico</th>
                              <th className="p-2">Concl.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.detailing.tasks.map((task) => (
                              <tr key={task.id} className="border-b">
                                <td className="p-2 font-medium">
                                  {task.sequentialId ? `#${task.sequentialId}` : `#${task.id.slice(-4)}`}
                                </td>
                                <td className="p-2">{task.name}</td>
                                <td className="p-2 text-muted-foreground">{task.categoria}</td>
                                <td className="p-2 text-muted-foreground">{task.epico}</td>
                                <td className="p-2">
                                  {task.isDone ? (
                                    <span className="font-bold text-emerald-600">✓</span>
                                  ) : (
                                    <span className="font-bold text-red-600">✕</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
