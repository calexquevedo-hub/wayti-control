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
}

export const Page05SprintTasks: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full flex-1 flex flex-col p-8 relative overflow-hidden print:p-2 print:break-before-page">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff] print:w-2" />
      
      <header className="text-blue-900 border-b border-gray-300 pb-2 mb-6">
        <h2 className="text-xl font-bold uppercase tracking-wider">
          {data.name} | {data.dates} — DETALHAMENTO
        </h2>
      </header>
 
      <div className="flex-1 bg-white">
        <h3 className="text-blue-900 text-sm font-bold uppercase pb-2 mb-2 border-b border-gray-200 tracking-widest px-2 print:px-0">
          Todas as tarefas da sprint
        </h3>
        <table className="w-full text-left border-collapse print:table print:text-xs">
          <thead>
            <tr className="text-gray-500 text-[10px] uppercase font-bold border-b-2 border-gray-200">
              <th className="p-3 px-6 w-16 text-center print:px-2 print:py-1">ID</th>
              <th className="p-3 px-6 print:px-2 print:py-1">Tarefa</th>
              <th className="p-3 px-6 print:px-2 print:py-1">Categoria</th>
              <th className="p-3 px-6 print:px-2 print:py-1">Épico</th>
              <th className="p-3 px-6 w-16 text-center print:px-2 print:py-1">Concl.</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {data.tasks.slice(0, 20).map((task, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} print:bg-transparent print:border-b print:border-gray-50 print:break-inside-avoid`}>
                <td className="p-2 px-6 border-b border-gray-100 font-bold text-center print:px-2 print:py-1 print:border-none">#{task.id}</td>
                <td className="p-2 px-6 border-b border-gray-100 font-medium text-xs print:px-2 print:py-1 print:border-none">
                  {task.title}
                  {task.isCarryover && (
                    <span className="ml-2 bg-orange-100 text-orange-700 text-[8px] px-1 rounded border border-orange-200 uppercase font-bold print:bg-transparent print:border-orange-500">
                      Carryover {task.carryoverCount && task.carryoverCount > 1 ? `(${task.carryoverCount}x)` : ""}
                    </span>
                  )}
                </td>
                <td className="p-2 px-6 border-b border-gray-100 whitespace-nowrap print:px-2 print:py-1 print:border-none">{task.category}</td>
                <td className="p-2 px-6 border-b border-gray-100 print:px-2 print:py-1 print:border-none">{task.epic}</td>
                <td className="p-2 px-6 border-b border-gray-100 text-center print:px-2 print:py-1 print:border-none">
                  {task.done ? (
                    <div className="flex justify-center"><Check className="w-4 h-4 text-green-600 font-black stroke-[4px] print:w-3 print:h-3" /></div>
                  ) : (
                    <div className="flex justify-center"><X className="w-4 h-4 text-red-600 font-black stroke-[4px] print:w-3 print:h-3" /></div>
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
