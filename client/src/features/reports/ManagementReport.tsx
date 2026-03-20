import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileDown, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchDashboardData } from "@/lib/api";
import type { Demand } from "@/types";

interface ManagementReportProps {
  token?: string;
  demands?: Demand[];
  onBack: () => void;
}

type DashboardPayload = Awaited<ReturnType<typeof fetchDashboardData>>;

type ReportTask = {
  id: string;
  sequentialId: number | null;
  name: string;
  categoria: string;
  epico: string;
  responsible: string;
  dependencia: string;
  isDone: boolean;
};

const COLORS = {
  primary: "#4472C4",
  navy: "#27306E",
  orange: "#ED7D31",
  yellow: "#FFC000",
  green: "#70AD47",
  slate: "#44546A",
  red: "#D92D20",
  bg: "#EEF3FF",
  line: "#D7E0F2",
};

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function toDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function HeaderBand({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className="relative overflow-hidden border-b"
      style={{ backgroundColor: COLORS.navy, borderColor: COLORS.line }}
    >
      <div
        className="absolute inset-y-0 left-0 w-12"
        style={{ backgroundColor: COLORS.primary }}
      />
      <div className="px-14 py-6 text-white">
        <h2 className="text-[32px] font-extrabold tracking-wide">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-white/80">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Slide({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`management-report-slide overflow-hidden rounded-[22px] border bg-white shadow-[0_24px_80px_rgba(27,39,94,0.12)] ${className}`}
      style={{ borderColor: COLORS.line }}
    >
      {children}
    </section>
  );
}

function LabelValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: COLORS.line }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function statusTone(statusColor: "green" | "yellow" | "purple" | "gray") {
  if (statusColor === "green") return { bg: "#EAF6E4", accent: COLORS.green, text: "Concluída" };
  if (statusColor === "yellow") return { bg: "#FFF5DB", accent: COLORS.yellow, text: "Carryover" };
  if (statusColor === "purple") return { bg: "#EEEAFE", accent: "#7C3AED", text: "Em andamento" };
  return { bg: "#F1F5F9", accent: "#CBD5E1", text: "Futura" };
}

export function ManagementReport({ token, demands = [], onBack }: ManagementReportProps) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setData(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchDashboardData(token)
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? "Não foi possível carregar o relatório gerencial.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const reportBase = useMemo(() => {
    const detailing = data?.detailing;
    const sprint = detailing?.sprint ?? data?.currentSprint ?? null;
    const activeTaskMap = new Map((data?.currentSprint?.activeTasks ?? []).map((task) => [task.id, task]));

    const mergedTasks: ReportTask[] = (detailing?.tasks ?? []).map((task) => {
      const taskId = String(task.id);
      const current = activeTaskMap.get(taskId);
      const demandMatch = demands.find(
        (item) =>
          String(item.id) === taskId ||
          (task.sequentialId != null && item.sequentialId === task.sequentialId),
      );
      return {
        id: taskId,
        sequentialId: task.sequentialId,
        name: task.name,
        categoria: task.categoria || demandMatch?.categoria || demandMatch?.category || "-",
        epico: task.epico || current?.epico || demandMatch?.epico || demandMatch?.epic || "-",
        responsible:
          current?.responsible ||
          demandMatch?.responsavel ||
          demandMatch?.responsible ||
          "Não atribuído",
        dependencia:
          current?.dependencia || demandMatch?.dependencia || "",
        isDone: task.isDone,
      };
    });

    const derivedTasks = mergedTasks.length
      ? mergedTasks
      : (data?.currentSprint?.activeTasks ?? []).map((task) => {
          const demandMatch = demands.find((item) => String(item.id) === String(task.id));
          return {
            id: String(task.id),
            sequentialId: demandMatch?.sequentialId ?? null,
            name: task.name,
            categoria: demandMatch?.categoria || demandMatch?.category || "-",
            epico: task.epico || demandMatch?.epico || demandMatch?.epic || "-",
            responsible: task.responsible || demandMatch?.responsavel || demandMatch?.responsible || "Não atribuído",
            dependencia: task.dependencia || demandMatch?.dependencia || "",
            isDone: false,
          };
        });

    const currentSprintDemands = demands.filter((item) => {
      if (!sprint) return false;
      const sprintRef =
        typeof item.sprint === "object" && item.sprint ? (item.sprint as any).id ?? (item.sprint as any)._id ?? "" : item.sprintId ?? "";
      return String(sprintRef) === String(sprint.id);
    });

    const overdueTasks = currentSprintDemands.filter((item) => {
      if (item.status === "Concluído" || item.status === "Cancelado") return false;
      const due = toDate(item.prazo);
      if (!due) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });

    const blockedTasks = derivedTasks.filter((task) => task.dependencia.trim().length > 0);
    const p0Tasks = currentSprintDemands.filter((item) => (item.prioridade ?? item.priority) === "P0");

    const riskLines = [
      ...blockedTasks.slice(0, 5).map((item) => ({
        kind: "Bloqueio",
        title: item.name,
        detail: item.dependencia,
      })),
      ...overdueTasks.slice(0, 3).map((item) => ({
        kind: "Prazo",
        title: item.titulo ?? item.name,
        detail: `Prazo expirado em ${formatDate(item.prazo)}`,
      })),
      ...p0Tasks.slice(0, 3).map((item) => ({
        kind: "Prioridade",
        title: item.titulo ?? item.name,
        detail: "Item crítico P0 na sprint atual",
      })),
    ].slice(0, 8);

    const concentration = data?.detailing?.concentration;
    const topEpics = data?.detailing?.tasksByEpic ?? [];

    const nextSteps = derivedTasks
      .filter((item) => !item.isDone)
      .slice(0, 8)
      .map((item, index) => ({
        order: index + 1,
        title: item.name,
        owner: item.responsible,
        epic: item.epico,
      }));

    return {
      sprint,
      tasks: derivedTasks,
      topEpics,
      concentration,
      blockedTasks,
      overdueTasks,
      riskLines,
      nextSteps,
      currentSprintDemands,
    };
  }, [data, demands]);

  const taskPages = useMemo(() => chunk(reportBase.tasks, 11), [reportBase.tasks]);
  const firstTaskPage = taskPages[0] ?? [];
  const secondTaskPage = taskPages[1] ?? [];

  const executiveSummary = useMemo(() => {
    if (!data) return null;
    const highRiskEpics = data.executive.epicsHealth.filter((item) => item.healthStatus === "Crítico");
    return {
      ...data.executive,
      criticalEpics: highRiskEpics,
    };
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  const sprintTitle = reportBase.sprint?.name ?? "Sprint Atual";
  const sprintRange = reportBase.sprint
    ? `${formatDate(reportBase.sprint.startDate)} a ${formatDate(reportBase.sprint.endDate)}`
    : "Período não definido";

  return (
    <div className="space-y-6">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          body {
            background: white !important;
          }
          .management-report-toolbar {
            display: none !important;
          }
          .management-report-deck {
            gap: 0 !important;
          }
          .management-report-slide {
            break-after: page;
            page-break-after: always;
            box-shadow: none !important;
            border-radius: 0 !important;
            min-height: 180mm !important;
            width: 100% !important;
            margin: 0 !important;
          }
          .management-report-slide:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="management-report-toolbar flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Relatório Gerencial TI</h1>
          <p className="text-sm text-slate-500">
            Template executivo reproduzido a partir do modelo da Sprint 13.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Visualizar impressão
          </Button>
          <Button className="gap-2" onClick={handlePrint}>
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">Montando relatório gerencial...</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="management-report-deck space-y-8">
          <Slide>
            <HeaderBand title={`GERÊNCIA DE TI — ${sprintTitle.toUpperCase()} EM ANDAMENTO`} />
            <div
              className="flex h-[620px] flex-col justify-between px-14 py-12"
              style={{ background: `linear-gradient(180deg, ${COLORS.bg} 0%, #FFFFFF 58%)` }}
            >
              <div className="space-y-6">
                <div className="inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-white" style={{ backgroundColor: COLORS.primary }}>
                  WayTI
                </div>
                <div>
                  <p className="text-5xl font-black tracking-tight text-slate-950">
                    Relatório Gerencial de Projetos de TI
                  </p>
                  <p className="mt-5 text-2xl font-semibold text-slate-700">Integra Soluções</p>
                  <p className="mt-3 text-xl font-medium text-slate-500">
                    {sprintTitle} · {sprintRange} –{" "}
                    {data.currentSprint ? "Em andamento" : "Sem sprint ativa"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <LabelValue label="Épicos ativos" value={data.executive.totalEpicsActive} />
                <LabelValue label="Tarefas em aberto" value={data.executive.totalOpenTasks} />
                <LabelValue label="Entregues" value={data.executive.totalDeliveredTasks} />
              </div>
              <p className="text-sm font-medium text-slate-400">
                Relatório gerado em {formatDate(new Date())}
              </p>
            </div>
          </Slide>

          <Slide>
            <HeaderBand title="VISÃO EXECUTIVA DO PORTFÓLIO" subtitle={sprintRange} />
            <div className="grid h-[620px] gap-8 px-10 py-10 md:grid-cols-[1.15fr_0.85fr]" style={{ backgroundColor: COLORS.bg }}>
              <div className="rounded-[28px] border bg-white p-8" style={{ borderColor: COLORS.line }}>
                <h3 className="text-2xl font-extrabold tracking-wide text-slate-900">ÉPICOS E ENTREGÁVEIS</h3>
                <div className="mt-6 space-y-4">
                  {executiveSummary?.epicsHealth.map((item) => (
                    <div key={item.epicName} className="rounded-2xl border p-4" style={{ borderColor: COLORS.line }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-slate-900">{item.epicName}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {item.activeDeliverables.join(" • ") || "Sem entregáveis ativos"}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white"
                          style={{
                            backgroundColor:
                              item.healthStatus === "Crítico" ? COLORS.orange : COLORS.green,
                          }}
                        >
                          {item.healthStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: COLORS.line }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Resumo
                  </p>
                  <div className="mt-4 grid gap-3">
                    <LabelValue label="Épicos ativos" value={data.executive.totalEpicsActive} />
                    <LabelValue label="Tarefas abertas" value={data.executive.totalOpenTasks} />
                    <LabelValue label="Entregues" value={data.executive.totalDeliveredTasks} />
                  </div>
                </div>
                <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: COLORS.line }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Pontos de atenção
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                    {executiveSummary?.criticalEpics.length ? (
                      executiveSummary.criticalEpics.map((item) => (
                        <div key={item.epicName} className="rounded-2xl border p-3" style={{ borderColor: "#F5D7BD" }}>
                          <p className="font-bold text-slate-900">{item.epicName}</p>
                          <p>{item.activeDeliverables.length} entregáveis em monitoramento crítico.</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border p-3" style={{ borderColor: COLORS.line }}>
                        Nenhum épico classificado como crítico nesta sprint.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Slide>

          <Slide>
            <HeaderBand title="HISTÓRICO DE SPRINTS" subtitle="Roadmap consolidado" />
            <div className="h-[620px] px-10 py-10" style={{ backgroundColor: COLORS.bg }}>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {data.sprintHistory.map((sprint) => {
                  const tone = statusTone(sprint.statusColor);

                  return (
                    <div
                      key={sprint.id}
                      className="overflow-hidden rounded-[28px] border bg-white"
                      style={{ borderColor: COLORS.line }}
                    >
                      <div className="px-6 py-6" style={{ backgroundColor: tone.bg }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-2xl font-extrabold text-slate-900">{sprint.name}</p>
                            <p className="mt-2 text-sm font-medium text-slate-500">
                              {formatDate(sprint.startDate)}–{formatDate(sprint.endDate)}
                            </p>
                          </div>
                          <div
                            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white"
                            style={{ backgroundColor: tone.accent }}
                          >
                            {tone.text}
                          </div>
                        </div>
                        <div className="mt-8">
                          <p className="text-4xl font-black text-slate-900">{sprint.taskCount} tarefas</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
                <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-700">🟢 Concluída</span>
                <span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700">🟡 Carryover</span>
                <span className="rounded-full bg-violet-50 px-4 py-2 text-violet-700">🟣 Em andamento</span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">⚪ Futura</span>
              </div>
            </div>
          </Slide>

          <Slide>
            <HeaderBand title={`${sprintTitle.toUpperCase()} | ${sprintRange} — DETALHAMENTO`} />
            <div className="grid h-[620px] gap-8 px-10 py-10 md:grid-cols-[1fr_1.18fr]" style={{ backgroundColor: COLORS.bg }}>
              <div className="rounded-[28px] border bg-white p-8" style={{ borderColor: COLORS.line }}>
                <h3 className="text-2xl font-extrabold tracking-[0.18em] text-slate-900">
                  TAREFAS POR ÉPICO
                </h3>
                <div className="mt-8 space-y-5">
                  {reportBase.topEpics.map((item, index) => {
                    const width = reportBase.topEpics[0]?.total
                      ? Math.max((item.total / reportBase.topEpics[0].total) * 100, 8)
                      : 0;
                    const palette = [COLORS.green, "#D99800", "#1F6D9B", "#E32626", COLORS.primary];
                    return (
                      <div key={item.epicName} className="grid grid-cols-[1.3fr_2fr_auto] items-center gap-4">
                        <p className="text-[20px] font-semibold text-slate-700">{item.epicName}</p>
                        <div className="h-6 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${width}%`, backgroundColor: palette[index % palette.length] }}
                          />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{item.total}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-10 rounded-3xl bg-slate-50 p-5 text-lg italic text-slate-600">
                  {reportBase.concentration ? (
                    <>
                      <strong>{reportBase.concentration.epicName}</strong> concentra{" "}
                      <strong>
                        {reportBase.concentration.total} de {reportBase.tasks.length} tarefas
                      </strong>{" "}
                      ({reportBase.concentration.percent}%).
                    </>
                  ) : (
                    <>Sem concentração relevante registrada para a sprint atual.</>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: COLORS.line }}>
                <h3 className="text-2xl font-extrabold tracking-[0.18em] text-slate-900">
                  TODAS AS TAREFAS DA SPRINT
                </h3>
                <div className="mt-6 overflow-hidden rounded-2xl border" style={{ borderColor: COLORS.line }}>
                  <table className="w-full border-collapse text-left">
                    <thead style={{ backgroundColor: COLORS.navy }}>
                      <tr className="text-white">
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>ID</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Tarefa</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Categoria</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Épico</th>
                        <th className="px-4 py-3 text-sm font-bold">Concl.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firstTaskPage.map((task) => (
                        <tr key={task.id} className="border-t text-[18px]" style={{ borderColor: COLORS.line }}>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            #{task.sequentialId ?? task.id}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.name}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.categoria}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.epico}
                          </td>
                          <td className="px-4 py-3 text-center align-top text-[22px] font-black" style={{ color: task.isDone ? COLORS.green : COLORS.red }}>
                            {task.isDone ? "✓" : "×"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Slide>

          <Slide>
            <HeaderBand title={`${sprintTitle.toUpperCase()} — CONTINUAÇÃO DO DETALHAMENTO`} />
            <div className="h-[620px] px-10 py-10" style={{ backgroundColor: COLORS.bg }}>
              <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: COLORS.line }}>
                <div className="overflow-hidden rounded-2xl border" style={{ borderColor: COLORS.line }}>
                  <table className="w-full border-collapse text-left">
                    <thead style={{ backgroundColor: COLORS.navy }}>
                      <tr className="text-white">
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>ID</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Tarefa</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Categoria</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Épico</th>
                        <th className="px-4 py-3 text-sm font-bold">Concl.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(secondTaskPage.length ? secondTaskPage : reportBase.tasks.slice(firstTaskPage.length, firstTaskPage.length + 11)).map((task) => (
                        <tr key={task.id} className="border-t text-[18px]" style={{ borderColor: COLORS.line }}>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            #{task.sequentialId ?? task.id}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.name}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.categoria}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.epico}
                          </td>
                          <td className="px-4 py-3 text-center align-top text-[22px] font-black" style={{ color: task.isDone ? COLORS.green : COLORS.red }}>
                            {task.isDone ? "✓" : "×"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {secondTaskPage.length === 0 ? (
                  <div className="flex h-[430px] items-center justify-center text-xl font-semibold text-slate-400">
                    Todas as tarefas caberam na página anterior.
                  </div>
                ) : null}
              </div>
            </div>
          </Slide>

          <Slide>
            <HeaderBand
              title={`${sprintTitle.toUpperCase()} | ${sprintRange} – EM ANDAMENTO ▶`}
            />
            <div className="grid h-[620px] gap-8 px-10 py-10 md:grid-cols-[0.78fr_1.22fr]" style={{ backgroundColor: COLORS.bg }}>
              <div className="space-y-5">
                <div className="rounded-2xl border bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800" style={{ borderColor: "#F5D7BD" }}>
                  ⚠ Passivo acumulado: sprint anterior encerrou com carryover para a sprint atual.
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabelValue label="Carryover da sprint anterior" value={data.currentSprint?.carryover ?? 0} />
                  <LabelValue label="Novas da sprint atual" value={data.currentSprint?.newScope ?? 0} />
                  <LabelValue label="Total em aberto" value={reportBase.tasks.length} />
                  <LabelValue label="Sprint encerra" value={formatDate(reportBase.sprint?.endDate)} />
                </div>

                <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: COLORS.line }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                    Resumo operacional
                  </p>
                  <div className="mt-4 space-y-3 text-base text-slate-700">
                    <p>Bloqueios ativos: {reportBase.blockedTasks.length}</p>
                    <p>Itens com prazo vencido: {reportBase.overdueTasks.length}</p>
                    <p>Itens críticos P0: {reportBase.currentSprintDemands.filter((item) => (item.prioridade ?? item.priority) === "P0").length}</p>
                  </div>
                </div>
              </div>

                <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: COLORS.line }}>
                <h3 className="text-2xl font-extrabold tracking-[0.18em] text-slate-900">
                  TAREFAS PLANEJADAS PARA A SPRINT
                </h3>
                <div className="mt-6 overflow-hidden rounded-2xl border" style={{ borderColor: COLORS.line }}>
                  <table className="w-full border-collapse text-left">
                    <thead style={{ backgroundColor: COLORS.navy }}>
                      <tr className="text-white">
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>ID</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Tarefa</th>
                        <th className="border-r px-4 py-3 text-sm font-bold" style={{ borderColor: "#9BA8D1" }}>Responsável</th>
                        <th className="px-4 py-3 text-sm font-bold">Gate / Bloqueio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportBase.tasks.slice(0, 12).map((task) => (
                        <tr key={task.id} className="border-t text-[17px]" style={{ borderColor: COLORS.line }}>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            #{task.sequentialId ?? task.id}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.name}
                          </td>
                          <td className="border-r px-4 py-3 align-top" style={{ borderColor: COLORS.line }}>
                            {task.responsible}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {task.dependencia ? (
                              <span className="font-semibold text-red-600">{task.dependencia}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Slide>

          <Slide>
            <HeaderBand title="RISCOS, ALERTAS E OBSERVAÇÕES GERENCIAIS" />
            <div className="grid h-[620px] gap-8 px-10 py-10 md:grid-cols-[0.92fr_1.08fr]" style={{ backgroundColor: COLORS.bg }}>
              <div className="rounded-[28px] border bg-white p-7" style={{ borderColor: COLORS.line }}>
                <h3 className="text-2xl font-extrabold tracking-[0.18em] text-slate-900">ALERTAS</h3>
                <div className="mt-6 space-y-4">
                  {reportBase.riskLines.length ? (
                    reportBase.riskLines.map((item, index) => (
                      <div
                        key={`${item.kind}-${item.title}-${index}`}
                        className="grid grid-cols-[88px_1fr] gap-4 rounded-2xl border bg-slate-50 p-4"
                        style={{ borderColor: COLORS.line }}
                      >
                        <div
                          className="flex h-fit items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white"
                          style={{
                            backgroundColor:
                              item.kind === "Bloqueio"
                                ? COLORS.red
                                : item.kind === "Prazo"
                                  ? COLORS.orange
                                  : COLORS.yellow,
                          }}
                        >
                          {item.kind === "Bloqueio"
                            ? "Crítico"
                            : item.kind === "Prazo"
                              ? "Alto"
                              : "Médio"}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border p-4 text-base text-slate-600" style={{ borderColor: COLORS.line }}>
                      Nenhum risco relevante mapeado para esta sprint.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border bg-white p-7" style={{ borderColor: COLORS.line }}>
                  <h3 className="text-2xl font-extrabold tracking-[0.18em] text-slate-900">
                    OBSERVAÇÕES GERENCIAIS
                  </h3>
                  <div className="mt-6 space-y-4 text-base leading-7 text-slate-700">
                    <p>
                      A sprint apresenta <strong>{data.currentSprint?.carryover ?? 0}</strong> itens
                      de carryover e <strong>{data.currentSprint?.newScope ?? 0}</strong> novas
                      entradas, pressionando a capacidade operacional.
                    </p>
                    <p>
                      Há <strong>{reportBase.blockedTasks.length}</strong> tarefas com dependência
                      explícita registrada, o que exige acompanhamento próximo junto a parceiros e
                      áreas de negócio.
                    </p>
                    <p>
                      O épico com maior concentração é{" "}
                      <strong>{reportBase.concentration?.epicName ?? "N/A"}</strong>, representando{" "}
                      <strong>{reportBase.concentration?.percent ?? 0}%</strong> da sprint.
                    </p>
                  </div>
                </div>
                <div className="rounded-[28px] border bg-white p-7" style={{ borderColor: COLORS.line }}>
                  <h3 className="text-2xl font-extrabold tracking-[0.18em] text-slate-900">DECISÕES</h3>
                  <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                    <li>• Priorizar desbloqueio dos gates críticos ainda nesta janela.</li>
                    <li>• Preservar foco da sprint e conter novas entradas fora do escopo acordado.</li>
                    <li>• Reforçar follow-up executivo nas frentes com fornecedor/parceiro.</li>
                  </ul>
                </div>
              </div>
            </div>
          </Slide>

          <Slide>
            <HeaderBand title="PRÓXIMOS PASSOS" subtitle="Plano de ação gerencial" />
            <div className="h-[620px] px-10 py-10" style={{ backgroundColor: COLORS.bg }}>
              <div className="rounded-[28px] border bg-white p-8" style={{ borderColor: COLORS.line }}>
                <div className="grid gap-5">
                  {reportBase.nextSteps.length ? (
                    reportBase.nextSteps.map((item) => (
                      <div
                        key={`${item.order}-${item.title}`}
                        className="grid items-center gap-4 rounded-2xl border p-5 md:grid-cols-[auto_1fr_auto]"
                        style={{ borderColor: COLORS.line }}
                      >
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-black text-white"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          {String(item.order).padStart(2, "0")}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-500">
                            {item.epic} · {item.owner}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white"
                          style={{
                            backgroundColor:
                              item.order <= 2 ? COLORS.red : item.order <= 6 ? COLORS.yellow : COLORS.green,
                            color: item.order <= 6 ? "#1f2937" : "#fff",
                          }}
                        >
                          {item.order <= 2 ? "Imediato" : item.order <= 6 ? "Curto prazo" : "Acompanhar"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border p-5 text-base text-slate-600" style={{ borderColor: COLORS.line }}>
                      Nenhum próximo passo calculado automaticamente.
                    </div>
                  )}
                </div>
                <p className="mt-8 text-sm font-medium text-slate-400">
                  Integra Soluções · Gerência de TI · {formatDate(new Date())}
                </p>
              </div>
            </div>
          </Slide>
        </div>
      ) : null}
    </div>
  );
}
