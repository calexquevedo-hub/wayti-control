import React from "react";

interface Props {
  data: {
    totalEpics: number;
    activeSprint: string;
    openTasks: number;
    deliveries: number;
    carryoverRate: number;
    criticalCarryover: number;
    epicTable: Array<{
      area: string;
      label: string;
      activeDeliverables: number;
      currentSprint: string;
      status: string;
    }>;
  };
}

export const Page02Executive: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full flex-1 flex flex-col p-8 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff] print:bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8 flex items-center justify-between print:bg-[#1a237e]">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">Visão Executiva do Portfólio</h2>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="Épicos (áreas)" value={data.totalEpics} subtext="em andamento" borderColor="border-blue-600" />
        <MetricCard label="Sprint em andamento" value={data.activeSprint} subtext="vigente" borderColor="border-purple-600" />
        <MetricCard label="Tarefas em aberto" value={data.openTasks} subtext="⚠️ passivo acumulado" borderColor="border-red-600" />
        <MetricCard label="Entregas" value={data.deliveries} subtext="no período" borderColor="border-green-600" />
        <MetricCard label="Taxa de Carryover" value={`${Math.round(data.carryoverRate)}%`} subtext="meta < 20%" borderColor="border-orange-500" />
        <MetricCard label="Carryover Crítico" value={data.criticalCarryover} subtext="P0/P1 ou Bloqueados" borderColor="border-red-800" />
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200 print:rounded-none">
        <h3 className="bg-[#1a237e] text-white text-sm font-bold uppercase p-3 px-6 tracking-widest print:bg-[#1a237e]">
          Épicos e Entregáveis — conforme backlog
        </h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#283593] text-white text-[10px] uppercase font-bold print:bg-[#283593]">
              <th className="p-3 px-6 border-r border-white/10">Épico (Área)</th>
              <th className="p-3 px-6 border-r border-white/10">Entregáveis ativos</th>
              <th className="p-3 px-6 border-r border-white/10">Sprint Atual</th>
              <th className="p-3 px-6">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.epicTable.map((epic, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50 text-gray-800"}>
                <td className="p-3 px-6 font-bold border-b border-gray-100">{epic.label} ({epic.area})</td>
                <td className="p-3 px-6 border-b border-gray-100 text-xs">{epic.activeDeliverables} tarefas planejadas</td>
                <td className="p-3 px-6 border-b border-gray-100 whitespace-nowrap">{epic.currentSprint}</td>
                <td className="p-3 px-6 border-b border-gray-100">
                  <StatusBadge status={epic.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, subtext, borderColor }: any) => (
  <div className={`bg-white p-6 rounded-lg shadow-md border-t-8 ${borderColor} flex flex-col items-center justify-center text-center`}>
    <h4 className="text-6xl font-black mb-1">{value}</h4>
    <p className="text-sm font-bold text-gray-800 uppercase mb-1">{label}</p>
    <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{subtext}</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isCritical = status === "Crítico";
  const colorClass = isCritical ? "bg-red-500" : "bg-yellow-400";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colorClass} shadow-sm`} />
      <span className={`text-[10px] font-bold uppercase ${isCritical ? "text-red-700" : "text-yellow-700"}`}>
        {status}
      </span>
    </div>
  );
};
