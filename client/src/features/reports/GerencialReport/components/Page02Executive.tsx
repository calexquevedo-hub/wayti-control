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
  isPrinting?: boolean;
}

export const Page02Executive: React.FC<Props> = ({ data, isPrinting }) => {
  return (
    <div className={`w-full h-full flex flex-col p-8 relative overflow-hidden ${isPrinting ? 'p-2' : ''}`}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] ${isPrinting ? 'w-2' : 'w-3'}`} />
      
      <div className="flex-1 flex flex-col" style={isPrinting ? { pageBreakInside: 'avoid', pageBreakAfter: 'always' } : {}}>
        <header className={isPrinting ? "bg-white text-blue-900 border-b-2 border-blue-900 pb-2 mb-6" : "bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
          <h2 className={`font-bold uppercase tracking-wider ${isPrinting ? 'text-xl' : 'text-xl ml-8'}`}>Visão Executiva do Portfólio</h2>
        </header>
 
        <div className={`grid grid-cols-3 gap-4 mb-8 ${isPrinting ? 'gap-2 mb-4' : ''}`}>
          <MetricCard label="Épicos (áreas)" value={data.totalEpics} subtext="em andamento" borderColor="border-blue-600" isPrinting={isPrinting} />
          <MetricCard label="Sprint em andamento" value={data.activeSprint} subtext="vigente" borderColor="border-purple-600" isPrinting={isPrinting} />
          <MetricCard label="Tarefas em aberto" value={data.openTasks} subtext="⚠️ passivo acumulado" borderColor="border-red-600" isPrinting={isPrinting} />
          <MetricCard label="Entregas" value={data.deliveries} subtext="no período" borderColor="border-green-600" isPrinting={isPrinting} />
          <MetricCard label="Taxa de Carryover" value={`${Math.round(data.carryoverRate)}%`} subtext="meta < 20%" borderColor="border-orange-500" isPrinting={isPrinting} />
          <MetricCard label="Carryover Crítico" value={data.criticalCarryover} subtext="P0/P1 ou Bloqueados" borderColor="border-red-800" isPrinting={isPrinting} />
        </div>
 
        <div className={`flex-1 overflow-hidden bg-white ${isPrinting ? 'mb-4' : 'rounded-lg shadow-sm border border-gray-200'}`}>
          <h3 className={isPrinting ? "bg-white text-blue-900 text-sm font-bold uppercase pb-2 mb-2 border-b-2 border-blue-900 tracking-widest px-2" : "bg-[#1a237e] text-white text-sm font-bold uppercase p-3 px-6 tracking-widest"}>
            Épicos e Entregáveis — conforme backlog
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={isPrinting ? "text-gray-500 text-[10px] uppercase font-bold border-b-2 border-gray-200" : "bg-[#283593] text-white text-[10px] uppercase font-bold"}>
                <th className={`p-3 px-6 ${isPrinting ? 'px-2 py-1' : 'border-r border-white/10'}`}>Épico (Área)</th>
                <th className={`p-3 px-6 ${isPrinting ? 'px-2 py-1' : 'border-r border-white/10'}`}>Entregáveis ativos</th>
                <th className={`p-3 px-6 ${isPrinting ? 'px-2 py-1' : 'border-r border-white/10'}`}>Sprint Atual</th>
                <th className={`p-3 px-6 ${isPrinting ? 'px-2 py-1' : ''}`}>Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data.epicTable.map((epic, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${isPrinting ? 'border-b border-gray-50' : ''}`}>
                  <td className={`p-3 px-6 font-bold border-b border-gray-100 ${isPrinting ? 'px-2 py-1 border-none' : ''}`}>{epic.label} ({epic.area})</td>
                  <td className={`p-3 px-6 border-b border-gray-100 text-xs ${isPrinting ? 'px-2 py-1 border-none' : ''}`}>{epic.activeDeliverables} tarefas planejadas</td>
                  <td className={`p-3 px-6 border-b border-gray-100 whitespace-nowrap ${isPrinting ? 'px-2 py-1 border-none' : ''}`}>{epic.currentSprint}</td>
                  <td className={`p-3 px-6 border-b border-gray-100 ${isPrinting ? 'px-2 py-1 border-none' : ''}`}>
                    <StatusBadge status={epic.status} isPrinting={isPrinting} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
 
const MetricCard = ({ label, value, subtext, borderColor, isPrinting }: any) => (
  <div className={`bg-white rounded-lg shadow-md flex flex-col items-center justify-center text-center ${isPrinting ? "p-2 border-t-4 border border-gray-100 shadow-none " + borderColor : `p-6 border-t-8 ${borderColor}`}`}>
    <h4 className={`font-black mb-1 ${isPrinting ? 'text-2xl mb-0' : 'text-6xl'}`}>{value}</h4>
    <p className={`font-bold text-gray-800 uppercase mb-1 ${isPrinting ? 'text-[8px] mb-0' : 'text-sm'}`}>{label}</p>
    {!isPrinting && <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{subtext}</p>}
  </div>
);
 
const StatusBadge = ({ status, isPrinting }: { status: string; isPrinting?: boolean }) => {
  const isCritical = status === "Crítico";
  const containerClass = isPrinting 
    ? `border ${isCritical ? "border-red-500 bg-white" : "border-yellow-500 bg-white"}` 
    : (isCritical ? "bg-red-500" : "bg-yellow-400");
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full shadow-sm ${containerClass}`} />
      <span className={`font-bold uppercase ${isCritical ? "text-red-700" : "text-yellow-700"} ${isPrinting ? 'text-[8px]' : 'text-[10px]'}`}>
        {status}
      </span>
    </div>
  );
};
