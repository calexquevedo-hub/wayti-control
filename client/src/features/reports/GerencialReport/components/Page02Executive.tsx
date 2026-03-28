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
    <div className={`w-full h-full flex flex-col p-8 relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] w-3`} />
      
      <header className={"bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
        <h2 className={`font-bold uppercase tracking-tight text-xl ml-8`}>
          Visão Executiva do Portfólio — {data.activeSprint}
        </h2>
      </header>

      <div className={`grid grid-cols-3 gap-3 mb-4`}>
        <MetricCard label="Épicos (áreas)" value={data.totalEpics} color="text-blue-600" description="em andamento" />
        <MetricCard label="Sprint em andamento" value={data.activeSprint} color="text-purple-600" description="vigente" isLong />
        <MetricCard label="Tarefas em aberto" value={data.openTasks} color="text-red-600" description="⚠️ passivo acumulado" />
        <MetricCard label="Entregas" value={data.deliveries} color="text-green-600" description="no período" />
        <MetricCard label="Taxa de Carryover" value={`${Math.round(data.carryoverRate)}%`} color="text-orange-500" description="meta < 20%" />
        <MetricCard label="Carryover Crítico" value={data.criticalCarryover} color="text-red-800" description="P0/P1 ou Bloqueados" />
      </div>

      {/* Tabela Resumida */}
      <div className={`flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden`}>
        <h3 className={"bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-normal"}>
          Épicos e Entregáveis — conforme backlog
        </h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={"bg-[#283593] text-white text-[9px] uppercase font-bold"}>
              <th className={`p-1.5 px-6 border-r border-white/10`}>Épico (Área)</th>
              <th className={`p-1.5 px-6 border-r border-white/10`}>Entregáveis ativos</th>
              <th className={`p-1.5 px-6 border-r border-white/10`}>Sprint Atual</th>
              <th className={`p-1.5 px-6`}>Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {data.epicTable.map((epic, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className={`p-1.5 px-6 font-bold border-b border-gray-100`}>{epic.label} ({epic.area})</td>
                <td className={`p-1.5 px-6 border-b border-gray-100 text-[9px]`}>{epic.activeDeliverables} tarefas planejadas</td>
                <td className={`p-1.5 px-6 border-b border-gray-100 whitespace-nowrap`}>{epic.currentSprint}</td>
                <td className={`p-1.5 px-6 border-b border-gray-100`}>
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

const MetricCard = ({ label, value, color, description, isLong }: any) => (
  <div className={`bg-white rounded-xl border flex flex-col items-center justify-center text-center p-4 py-8 shadow-md border-gray-100 min-h-[140px] w-full`}>
    <p className={`font-black tracking-tight ${isLong ? "text-xl pb-2" : "text-4xl"} ${color} mb-5 leading-none`}>
      {value}
    </p>
    <p className={`font-bold text-gray-500 uppercase tracking-tight text-[10px]`}>
      {label}
    </p>
    {description && (
      <p className={`text-[8px] text-gray-400 mt-2 uppercase font-medium`}>{description}</p>
    )}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isCritical = status === "Crítico";
  const containerClass = isCritical ? "bg-red-500" : "bg-yellow-400";
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full shadow-sm ${containerClass}`} />
      <span className={`font-bold uppercase ${isCritical ? "text-red-700" : "text-yellow-700"} text-[8px]`}>
        {status}
      </span>
    </div>
  );
};
