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
  isPrinting?: boolean;
}

export const Page04SprintSummary: React.FC<Props> = ({ data, isPrinting }) => {
  return (
    <div className={`w-full h-full flex flex-col p-8 relative overflow-hidden ${isPrinting ? 'p-2' : ''}`} style={isPrinting ? { pageBreakAfter: 'always' } : {}}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] ${isPrinting ? 'w-2' : 'w-3'}`} />
      
      <div className="flex-1 flex flex-col" style={isPrinting ? { pageBreakBefore: 'always', pageBreakInside: 'avoid' } : {}}>
        <header className={isPrinting ? "bg-white text-blue-900 border-b-2 border-blue-900 pb-2 mb-6" : "bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
          <h2 className={`font-bold uppercase tracking-wider ${isPrinting ? 'text-xl' : 'text-xl ml-8'}`}>
            {data.name} | {data.dates} — {data.status}
          </h2>
        </header>

        <div className={`flex items-center gap-4 text-red-700 ${isPrinting ? 'bg-white border p-2 border-red-100 mb-4 rounded-md' : 'bg-red-50 border border-red-200 p-4 rounded-md mb-8'}`}>
          <AlertCircle className={isPrinting ? "w-6 h-6 flex-shrink-0" : "w-8 h-8 flex-shrink-0"} />
          <div>
            <p className={`font-bold uppercase tracking-widest ${isPrinting ? 'text-[8px]' : 'text-xs'}`}>Atenção: Passivo Acumulado / Carryover</p>
            <p className={isPrinting ? "text-[10px]" : "text-sm"}>A sprint atual contém itens não finalizados de períodos anteriores que impactam a capacidade produtiva.</p>
          </div>
        </div>

        <div className={`grid grid-cols-6 gap-3 ${isPrinting ? 'gap-2 mb-4' : 'mb-8'}`}>
          <MiniCard label="Carryover Anterior" value={data.carryoverFromLast} color="text-red-600" isPrinting={isPrinting} />
          <MiniCard label="Novas Tarefas" value={data.newTasks} color="text-blue-600" isPrinting={isPrinting} />
          <MiniCard label="Taxa Carryover" value={`${Math.round(data.carryoverRate)}%`} color="text-orange-600" isPrinting={isPrinting} />
          <MiniCard label="Total em Aberto" value={data.totalOpen} color="text-red-700" isPrinting={isPrinting} />
          <MiniCard label="Dias Restantes" value={data.daysRemaining} color="text-gray-800" isPrinting={isPrinting} />
          <MiniCard label="Data Fim" value={data.endDate} color="text-gray-800" isDate isPrinting={isPrinting} />
        </div>

        <div className={`flex-1 overflow-hidden bg-white ${isPrinting ? 'mb-4' : 'rounded-lg shadow-sm border border-gray-200'}`}>
          <h3 className={isPrinting ? "bg-white text-blue-900 text-sm font-bold uppercase pb-2 mb-2 border-b-2 border-blue-900 tracking-widest px-2" : "bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-widest"}>
            Tarefas planejadas para a sprint
          </h3>
          <table className={`w-full text-left border-collapse ${isPrinting ? 'text-xs' : ''}`}>
            <thead>
              <tr className={isPrinting ? "text-gray-500 text-[10px] uppercase font-bold border-b-2 border-gray-200" : "bg-[#283593] text-white text-[9px] uppercase font-bold"}>
                <th className={`p-2 px-6 ${isPrinting ? 'w-16 text-center py-1' : 'border-r border-white/10 w-16 text-center'}`}>ID</th>
                <th className={`p-2 px-6 ${isPrinting ? 'py-1' : 'border-r border-white/10'}`}>Tarefa</th>
                <th className={`p-2 px-6 ${isPrinting ? 'py-1' : 'border-r border-white/10'}`}>Épico</th>
                <th className={`p-2 px-6 ${isPrinting ? 'py-1' : 'border-r border-white/10'}`}>Responsável</th>
                <th className={`p-2 px-6 ${isPrinting ? 'py-1' : ''}`}>Bloqueio / Gate</th>
              </tr>
            </thead>
            <tbody className={isPrinting ? "text-[10px]" : "text-[11px]"}>
              {data.tasks.slice(0, 14).map((task, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${isPrinting ? 'border-b border-gray-50' : ''}`}>
                  <td className={`p-2 px-6 border-b border-gray-100 font-bold text-center ${isPrinting ? 'py-1 border-none' : ''}`}>#{task.id}</td>
                  <td className={`p-2 px-6 border-b border-gray-100 font-medium ${isPrinting ? 'py-1 border-none' : ''}`}>
                    {task.title}
                    {task.isCarryover && (
                      <span className={`ml-2 uppercase font-bold px-1 rounded border ${isPrinting ? "bg-white border-orange-500 text-orange-700 text-[8px]" : "bg-orange-100 border-orange-200 text-orange-700 text-[8px]"}`}>
                        Carryover {task.carryoverCount && task.carryoverCount > 1 ? `(${task.carryoverCount}x)` : ""}
                      </span>
                    )}
                  </td>
                  <td className={`p-2 px-6 border-b border-gray-100 ${isPrinting ? 'py-1 border-none' : ''}`}>{task.epic}</td>
                  <td className={`p-2 px-6 border-b border-gray-100 whitespace-nowrap ${isPrinting ? 'py-1 border-none' : ''}`}>{task.responsible}</td>
                  <td className={`p-2 px-6 border-b border-gray-100 text-red-600 font-bold ${isPrinting ? 'py-1 border-none' : ''}`}>{task.gate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
 
const MiniCard = ({ label, value, color, isDate, isPrinting }: any) => (
  <div className={`bg-white rounded border flex flex-col items-center justify-center text-center ${isPrinting ? 'p-2 shadow-none border-gray-100 min-h-0' : 'p-4 shadow-sm border-gray-200 min-h-[100px] rounded-lg'}`}>
    <p className={`font-black ${isDate ? (isPrinting ? "text-base" : "text-2xl tracking-normal") : (isPrinting ? "text-xl" : "text-4xl tracking-tighter")} ${color}`}>{value}</p>
    <p className={`font-bold text-gray-400 uppercase tracking-widest ${isPrinting ? 'mt-1 text-[7px]' : 'mt-2 text-[9px]'}`}>{label}</p>
  </div>
);
