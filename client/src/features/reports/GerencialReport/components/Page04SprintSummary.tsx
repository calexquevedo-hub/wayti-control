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
    <div className="w-full h-full flex flex-col p-8 relative overflow-hidden rounded-lg shadow-xl print:shadow-none">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">
          {data.name} | {data.dates} — {data.status}
        </h2>
      </header>

      <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-8 flex items-center gap-4 text-red-700">
        <AlertCircle className="w-8 h-8" />
        <div>
          <p className="font-bold uppercase text-xs tracking-widest">Atenção: Passivo Acumulado / Carryover</p>
          <p className="text-sm">A sprint atual contém itens não finalizados de períodos anteriores que impactam a capacidade produtiva.</p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 mb-8">
        <MiniCard label="Carryover Anterior" value={data.carryoverFromLast} color="text-red-600" />
        <MiniCard label="Novas Tarefas" value={data.newTasks} color="text-blue-600" />
        <MiniCard label="Taxa Carryover" value={`${Math.round(data.carryoverRate)}%`} color="text-orange-600" />
        <MiniCard label="Total em Aberto" value={data.totalOpen} color="text-red-700" />
        <MiniCard label="Dias Restantes" value={data.daysRemaining} color="text-gray-800" />
        <MiniCard label="Data Fim" value={data.endDate} color="text-gray-800" isDate />
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <h3 className="bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-widest">
          Tarefas planejadas para a sprint
        </h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#283593] text-white text-[9px] uppercase font-bold">
              <th className="p-2 px-6 border-r border-white/10 w-16 text-center">ID</th>
              <th className="p-2 px-6 border-r border-white/10">Tarefa</th>
              <th className="p-2 px-6 border-r border-white/10">Épico</th>
              <th className="p-2 px-6 border-r border-white/10">Responsável</th>
              <th className="p-2 px-6">Bloqueio / Gate</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {data.tasks.slice(0, 10).map((task, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="p-2 px-6 border-b border-gray-100 font-bold text-center">#{task.id}</td>
                <td className="p-2 px-6 border-b border-gray-100 font-medium">
                  {task.title}
                  {task.isCarryover && (
                    <span className="ml-2 bg-orange-100 text-orange-700 text-[8px] px-1 rounded border border-orange-200 uppercase font-bold">
                      Carryover {task.carryoverCount && task.carryoverCount > 1 ? `(${task.carryoverCount}x)` : ""}
                    </span>
                  )}
                </td>
                <td className="p-2 px-6 border-b border-gray-100">{task.epic}</td>
                <td className="p-2 px-6 border-b border-gray-100 whitespace-nowrap">{task.responsible}</td>
                <td className="p-2 px-6 border-b border-gray-100 text-red-600 font-bold">{task.gate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MiniCard = ({ label, value, color, isDate }: any) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center min-h-[100px]">
    <p className={`font-black ${isDate ? "text-2xl tracking-normal" : "text-4xl tracking-tighter"} ${color}`}>{value}</p>
    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">{label}</p>
  </div>
);
