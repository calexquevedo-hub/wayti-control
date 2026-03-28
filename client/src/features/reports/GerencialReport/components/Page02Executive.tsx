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
    <div className={`w-full h-full flex flex-col p-8 relative overflow-hidden `}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] w-3`} />
      
      <div className="flex-1 flex flex-col" style={{}}>
        <header className={"bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
          <h2 className={`font-bold uppercase tracking-wider text-xl ml-8`}>Visão Executiva do Portfólio</h2>
        </header>
 
        <div className={`grid grid-cols-3 gap-6 mb-8 `}>
          <MetricCard label="Épicos (áreas)" value={data.totalEpics} subtext="em andamento" borderColor="border-blue-600" />
          <MetricCard label="Sprint em andamento" value={data.activeSprint} subtext="vigente" borderColor="border-purple-600" />
          <MetricCard label="Tarefas em aberto" value={data.openTasks} subtext="⚠️ passivo acumulado" borderColor="border-red-600" />
          <MetricCard label="Entregas" value={data.deliveries} subtext="no período" borderColor="border-green-600" />
          <MetricCard label="Taxa de Carryover" value={`${Math.round(data.carryoverRate)}%`} subtext="meta < 20%" borderColor="border-orange-500" />
          <MetricCard label="Carryover Crítico" value={data.criticalCarryover} subtext="P0/P1 ou Bloqueados" borderColor="border-red-800" />
        </div>
 
        <div className={`flex-1 overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200`}>
          <h3 className={"bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-4 tracking-widest"}>
            Épicos e Entregáveis — conforme backlog
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={"bg-[#283593] text-white text-[9px] uppercase font-bold"}>
                <th className={`p-1.5 px-3 border-r border-white/10`}>Épico (Área)</th>
                <th className={`p-1.5 px-3 border-r border-white/10`}>Entregáveis ativos</th>
                <th className={`p-1.5 px-3 border-r border-white/10`}>Sprint Atual</th>
                <th className={`p-1.5 px-3 `}>Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {data.epicTable.map((epic, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} `}>
                  <td className={`p-1.5 px-3 font-bold border-b border-gray-100 py-1`}>{epic.label} ({epic.area})</td>
                  <td className={`p-1.5 px-3 border-b border-gray-100 text-[9px] py-1`}>{epic.activeDeliverables} tarefas planejadas</td>
                  <td className={`p-1.5 px-3 border-b border-gray-100 whitespace-nowrap py-1`}>{epic.currentSprint}</td>
                  <td className={`p-1.5 px-3 border-b border-gray-100 py-1`}>
                    <StatusBadge status={epic.status} />
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
 
const MetricCard = ({ label, value, subtext, borderColor}: any) => {
  // Check if value is a long string (like "Sprint 13")
  const isLongValue = typeof value === 'string' && value.length >= 8;
  return (
    <div className={`bg-white rounded-xl shadow-md flex flex-col items-center justify-center text-center py-10 px-4 border-t-[10px] ${borderColor} h-full transform transition-all`}>
      <h4 
        className="font-black mb-4 text-blue-800 tracking-tighter" 
        style={{ fontSize: isLongValue ? '4.5rem' : '7.5rem', lineHeight: '1' }}
      >
        {value}
      </h4>
      <p className="font-bold text-slate-700 uppercase mb-2 text-sm tracking-[0.2em]">{label}</p>
      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{subtext}</p>
    </div>
  );
};
 
const StatusBadge = ({ status}: { status: string }) => {
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

