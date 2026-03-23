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
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8 flex items-center justify-between print:bg-transparent print:border-b-2 print:border-blue-900 print:text-blue-900 print:mb-4">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">Visão Executiva do Portfólio</h2>
      </header>
 
      <div className="grid grid-cols-3 gap-4 mb-8 print:gap-2 print:mb-4 print:break-inside-avoid">
        <MetricCard label="Épicos (áreas)" value={data.totalEpics} subtext="em andamento" borderColor="border-blue-600" />
        <MetricCard label="Sprint em andamento" value={data.activeSprint} subtext="vigente" borderColor="border-purple-600" />
        <MetricCard label="Tarefas em aberto" value={data.openTasks} subtext="⚠️ passivo acumulado" borderColor="border-red-600" />
        <MetricCard label="Entregas" value={data.deliveries} subtext="no período" borderColor="border-green-600" />
        <MetricCard label="Taxa de Carryover" value={`${Math.round(data.carryoverRate)}%`} subtext="meta < 20%" borderColor="border-orange-500" />
        <MetricCard label="Carryover Crítico" value={data.criticalCarryover} subtext="P0/P1 ou Bloqueados" borderColor="border-red-800" />
      </div>
 
      <div className="flex-1 overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200 print:rounded-none print:border-none print:break-inside-avoid">
        <h3 className="bg-[#1a237e] text-white text-sm font-bold uppercase p-3 px-6 tracking-widest print:bg-gray-100 print:text-gray-900 print:border-b print:px-2 print:py-1">
          Épicos e Entregáveis — conforme backlog
        </h3>
        <table className="w-full text-left border-collapse print:table">
          <thead>
            <tr className="bg-[#283593] text-white text-[10px] uppercase font-bold print:bg-transparent print:text-gray-900 print:border-b-2 print:border-gray-200">
              <th className="p-3 px-6 border-r border-white/10 print:px-2 print:py-1 print:border-none">Épico (Área)</th>
              <th className="p-3 px-6 border-r border-white/10 print:px-2 print:py-1 print:border-none">Entregáveis ativos</th>
              <th className="p-3 px-6 border-r border-white/10 print:px-2 print:py-1 print:border-none">Sprint Atual</th>
              <th className="p-3 px-6 print:px-2 print:py-1">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.epicTable.map((epic, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} print:bg-transparent print:border-b print:border-gray-50`}>
                <td className="p-3 px-6 font-bold border-b border-gray-100 print:px-2 print:py-1 print:border-none">{epic.label} ({epic.area})</td>
                <td className="p-3 px-6 border-b border-gray-100 text-xs print:px-2 print:py-1 print:border-none">{epic.activeDeliverables} tarefas planejadas</td>
                <td className="p-3 px-6 border-b border-gray-100 whitespace-nowrap print:px-2 print:py-1 print:border-none">{epic.currentSprint}</td>
                <td className="p-3 px-6 border-b border-gray-100 print:px-2 print:py-1 print:border-none">
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
  <div className={`bg-white p-6 rounded-lg shadow-md border-t-8 ${borderColor} flex flex-col items-center justify-center text-center print:p-2 print:border-t-4 print:shadow-none print:border print:border-gray-100`}>
    <h4 className="text-6xl font-black mb-1 print:text-3xl print:mb-0">{value}</h4>
    <p className="text-sm font-bold text-gray-800 uppercase mb-1 print:text-[8px] print:mb-0">{label}</p>
    <p className="text-[10px] text-gray-400 uppercase tracking-tighter print:hidden">{subtext}</p>
  </div>
);
 
const StatusBadge = ({ status }: { status: string }) => {
  const isCritical = status === "Crítico";
  const colorClass = isCritical ? "bg-red-500 print:bg-transparent print:border-red-500" : "bg-yellow-400 print:bg-transparent print:border-yellow-500";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colorClass} shadow-sm print:border`} />
      <span className={`text-[10px] font-bold uppercase ${isCritical ? "text-red-700" : "text-yellow-700"} print:text-[8px]`}>
        {status}
      </span>
    </div>
  );
};
