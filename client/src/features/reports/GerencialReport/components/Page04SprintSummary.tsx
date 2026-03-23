import React from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  data: {
    name: string;
    dates: string;
    status: string;
    carryoverFromLast: number;
    carryoverRate: number;
    carryoverCriticalCount: number;
    newTasks: number;
    totalOpen: number;
    daysRemaining: number;
    endDate: string;
    tasks: Array<{
      id: number;
      title: string;
      epic: string;
      responsible: string;
      gate: string;
      isCarryover?: boolean;
      carryoverCount?: number;
    }>;
  };
}

export const Page04SprintSummary: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full flex-1 flex flex-col p-8 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8 print:bg-transparent print:border-b-2 print:border-blue-900 print:text-blue-900 print:mb-4">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">
          {data.name} | {data.dates} — {data.status}
        </h2>
      </header>
 
      <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-8 flex items-center gap-4 text-red-700 print:p-2 print:bg-white print:border-red-100 print:mb-4">
        <AlertCircle className="w-8 h-8 print:w-6 print:h-6" />
        <div>
          <p className="font-bold uppercase text-xs tracking-widest print:text-[8px]">Atenção: Passivo Acumulado / Carryover</p>
          <p className="text-sm print:text-[10px]">A sprint atual contém itens não finalizados de períodos anteriores que impactam a capacidade produtiva.</p>
        </div>
      </div>
 
      <div className="grid grid-cols-6 gap-3 mb-8 print:gap-2 print:mb-4 print:break-inside-avoid">
        <MiniCard label="Carryover Anterior" value={data.carryoverFromLast} color="text-red-600" />
        <MiniCard label="Novas Tarefas" value={data.newTasks} color="text-blue-600" />
        <MiniCard label="Taxa Carryover" value={`${Math.round(data.carryoverRate)}%`} color="text-orange-600" />
        <MiniCard label="Total em Aberto" value={data.totalOpen} color="text-red-700" />
        <MiniCard label="Dias Restantes" value={data.daysRemaining} color="text-gray-800" />
        <MiniCard label="Data Fim" value={data.endDate} color="text-gray-800" isDate />
      </div>
 
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:rounded-none print:border-none print:break-inside-avoid">
        <h3 className="bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-widest print:bg-gray-100 print:text-gray-900 print:border-b print:px-2 print:py-1">
          Tarefas planejadas para a sprint
        </h3>
        <table className="w-full text-left border-collapse print:table">
          <thead>
            <tr className="bg-[#283593] text-white text-[9px] uppercase font-bold print:bg-transparent print:text-gray-900 print:border-b-2 print:border-gray-200">
              <th className="p-2 px-6 border-r border-white/10 w-16 text-center print:px-2 print:py-1 print:border-none">ID</th>
              <th className="p-2 px-6 border-r border-white/10 print:px-2 print:py-1 print:border-none">Tarefa</th>
              <th className="p-2 px-6 border-r border-white/10 print:px-2 print:py-1 print:border-none">Épico</th>
              <th className="p-2 px-6 border-r border-white/10 print:px-2 print:py-1 print:border-none">Responsável</th>
              <th className="p-2 px-6 print:px-2 print:py-1">Bloqueio / Gate</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {data.tasks.slice(0, 14).map((task, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} print:bg-transparent print:border-b print:border-gray-50`}>
                <td className="p-2 px-6 border-b border-gray-100 font-bold text-center print:px-2 print:py-1 print:border-none">#{task.id}</td>
                <td className="p-2 px-6 border-b border-gray-100 font-medium print:px-2 print:py-1 print:border-none">
                  {task.title}
                  {task.isCarryover && (
                    <span className="ml-2 bg-orange-100 text-orange-700 text-[8px] px-1 rounded border border-orange-200 uppercase font-bold print:bg-transparent print:border-orange-500">
                      Carryover {task.carryoverCount && task.carryoverCount > 1 ? `(${task.carryoverCount}x)` : ""}
                    </span>
                  )}
                </td>
                <td className="p-2 px-6 border-b border-gray-100 print:px-2 print:py-1 print:border-none">{task.epic}</td>
                <td className="p-2 px-6 border-b border-gray-100 whitespace-nowrap print:px-2 print:py-1 print:border-none">{task.responsible}</td>
                <td className="p-2 px-6 border-b border-gray-100 text-red-600 font-bold print:px-2 print:py-1 print:border-none">{task.gate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
 
const MiniCard = ({ label, value, color, isDate }: any) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center min-h-[100px] print:min-h-0 print:p-2 print:shadow-none print:border-gray-100">
    <p className={`font-black ${isDate ? "text-2xl tracking-normal print:text-base" : "text-4xl tracking-tighter print:text-xl"} ${color}`}>{value}</p>
    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 print:mt-1 print:text-[7px]">{label}</p>
  </div>
);
