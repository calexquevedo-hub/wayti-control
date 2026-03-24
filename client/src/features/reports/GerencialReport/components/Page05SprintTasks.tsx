import React from "react";
import { Check, X } from "lucide-react";

interface Props {
  data: {
    name: string;
    dates: string;
    tasks: Array<{
      id: number;
      title: string;
      category: string;
      epic: string;
      done: boolean;
      isCarryover?: boolean;
      carryoverCount?: number;
    }>;
  };
  isPrinting?: boolean;
}

export const Page05SprintTasks: React.FC<Props> = ({ data, isPrinting }) => {
  return (
    <div className={`w-full flex-1 flex flex-col p-8 relative overflow-hidden ${isPrinting ? 'p-2' : ''}`} style={isPrinting ? { pageBreakBefore: 'always' } : {}}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] ${isPrinting ? 'w-2' : 'w-3'}`} />
      
      <header className={isPrinting ? "bg-white text-blue-900 border-b-2 border-blue-900 pb-2 mb-6" : "bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
        <h2 className={`font-bold uppercase tracking-wider ${isPrinting ? 'text-xl' : 'text-xl ml-8'}`}>
          {data.name} | {data.dates} — DETALHAMENTO
        </h2>
      </header>
 
      <div className={`flex-1 bg-white ${isPrinting ? '' : 'rounded-lg shadow-sm border border-gray-200 overflow-hidden'}`}>
        <h3 className={isPrinting ? "bg-white text-blue-900 text-sm font-bold uppercase pb-2 mb-2 border-b-2 border-blue-900 tracking-widest px-2" : "bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-widest"}>
          Todas as tarefas da sprint
        </h3>
        <table className={`w-full text-left border-collapse ${isPrinting ? 'text-xs' : ''}`}>
          <thead>
            <tr className={isPrinting ? "text-gray-500 text-[10px] uppercase font-bold border-b-2 border-gray-200" : "bg-[#283593] text-white text-[10px] uppercase font-bold"}>
              <th className={`p-3 px-6 ${isPrinting ? 'w-16 text-center py-1' : 'border-r border-white/10 w-16 text-center'}`}>ID</th>
              <th className={`p-3 px-6 ${isPrinting ? 'py-1' : 'border-r border-white/10'}`}>Tarefa</th>
              <th className={`p-3 px-6 ${isPrinting ? 'py-1' : 'border-r border-white/10'}`}>Categoria</th>
              <th className={`p-3 px-6 ${isPrinting ? 'py-1' : 'border-r border-white/10'}`}>Épico</th>
              <th className={`p-3 px-6 ${isPrinting ? 'w-16 text-center py-1' : 'w-16 text-center'}`}>Concl.</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {data.tasks.slice(0, 20).map((task, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${isPrinting ? 'border-b border-gray-50' : ''}`} style={isPrinting ? { pageBreakInside: 'avoid' } : {}}>
                <td className={`p-2 px-6 border-b border-gray-100 font-bold text-center ${isPrinting ? 'py-1 border-none' : ''}`}>#{task.id}</td>
                <td className={`p-2 px-6 border-b border-gray-100 font-medium text-xs ${isPrinting ? 'py-1 border-none' : ''}`}>
                  {task.title}
                  {task.isCarryover && (
                    <span className={`ml-2 uppercase font-bold px-1 rounded border ${isPrinting ? "bg-white border-orange-500 text-orange-700 text-[8px]" : "bg-orange-100 border-orange-200 text-orange-700 text-[8px]"}`}>
                      Carryover {task.carryoverCount && task.carryoverCount > 1 ? `(${task.carryoverCount}x)` : ""}
                    </span>
                  )}
                </td>
                <td className={`p-2 px-6 border-b border-gray-100 whitespace-nowrap ${isPrinting ? 'py-1 border-none' : ''}`}>{task.category}</td>
                <td className={`p-2 px-6 border-b border-gray-100 ${isPrinting ? 'py-1 border-none' : ''}`}>{task.epic}</td>
                <td className={`p-2 px-6 border-b border-gray-100 text-center ${isPrinting ? 'py-1 border-none' : ''}`}>
                  {task.done ? (
                    <div className="flex justify-center"><Check className={`text-green-600 font-black stroke-[4px] ${isPrinting ? "w-3 h-3" : "w-4 h-4"}`} /></div>
                  ) : (
                    <div className="flex justify-center"><X className={`text-red-600 font-black stroke-[4px] ${isPrinting ? "w-3 h-3" : "w-4 h-4"}`} /></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
