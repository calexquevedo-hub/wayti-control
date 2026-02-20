import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  SmilePlus,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const periods = ["Últimos 7 dias", "Últimos 30 dias", "Este Mês", "Personalizado"];

const kpis = [
  { title: "Chamados Abertos", value: "128", trend: "↑ 12% vs mês anterior", trendTone: "text-emerald-600", icon: Activity },
  { title: "Taxa de Resolução", value: "84%", trend: "↑ 6% vs mês anterior", trendTone: "text-emerald-600", icon: CheckCircle2 },
  { title: "Cumprimento de SLA", value: "92%", trend: "↓ 3% vs mês anterior", trendTone: "text-red-600", icon: Clock3 },
  { title: "CSAT", value: "4.6/5.0", trend: "↑ 0.2 vs mês anterior", trendTone: "text-emerald-600", icon: SmilePlus },
];

const volumeData = [
  { day: "01", created: 12, resolved: 9 },
  { day: "02", created: 15, resolved: 10 },
  { day: "03", created: 18, resolved: 16 },
  { day: "04", created: 14, resolved: 12 },
  { day: "05", created: 20, resolved: 15 },
  { day: "06", created: 17, resolved: 18 },
  { day: "07", created: 21, resolved: 19 },
  { day: "08", created: 16, resolved: 14 },
  { day: "09", created: 19, resolved: 17 },
  { day: "10", created: 13, resolved: 12 },
];

const slaViolationsData = [
  { priority: "Urgente", violations: 18 },
  { priority: "Alta", violations: 12 },
  { priority: "Média", violations: 6 },
  { priority: "Baixa", violations: 2 },
];

const topCategoriesData = [
  { name: "ERP", value: 38, color: "#2563eb" },
  { name: "Infraestrutura", value: 24, color: "#0ea5e9" },
  { name: "Acessos", value: 20, color: "#14b8a6" },
  { name: "Fiscal", value: 12, color: "#f59e0b" },
  { name: "Outros", value: 6, color: "#64748b" },
];

const teamPerformance = [
  { name: "João TI", resolved: 42, tmr: "2h 35m", initials: "JT" },
  { name: "Fernanda N1", resolved: 39, tmr: "2h 58m", initials: "FN" },
  { name: "Marcos N2", resolved: 31, tmr: "3h 22m", initials: "MN" },
  { name: "Bruna Infra", resolved: 28, tmr: "3h 46m", initials: "BI" },
];

export function ReportsDashboard() {
  const [period, setPeriod] = useState(periods[1]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500">Visão gerencial da operação de chamados.</p>
        </div>
        <div className="w-full sm:w-56">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            {periods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-sm text-slate-500">{kpi.title}</p>
                <Icon className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{kpi.value}</p>
              <p className={`mt-1 text-xs font-medium ${kpi.trendTone}`}>{kpi.trend}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Volume: Criados vs. Resolvidos</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" name="Criados" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolvidos" stroke="#16a34a" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Violações de SLA por Prioridade</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaViolationsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="violations" name="Violações" radius={[6, 6, 0, 0]}>
                  {slaViolationsData.map((entry) => (
                    <Cell
                      key={entry.priority}
                      fill={
                        entry.priority === "Urgente"
                          ? "#dc2626"
                          : entry.priority === "Alta"
                          ? "#f97316"
                          : entry.priority === "Média"
                          ? "#2563eb"
                          : "#64748b"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Top Categorias</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={topCategoriesData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  {topCategoriesData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Desempenho da Equipe</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Técnico</th>
                  <th className="px-3 py-2 text-left">Chamados Resolvidos</th>
                  <th className="px-3 py-2 text-left">Tempo Médio de Resolução</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((person) => (
                  <tr key={person.name} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                          {person.initials}
                        </span>
                        <span className="font-medium text-slate-800">{person.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{person.resolved}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                        {person.tmr}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ReportsDashboard;

