import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";
import { Check, X } from "lucide-react";

interface Props {
  data: {
    name: string;
    dates: string;
    tasksByEpic: Array<{ name: string; count: number; percentage: number }>;
    tasks: Array<{
      id: number;
      title: string;
      category: string;
      epic: string;
      done: boolean;
    }>;
  };
}

const COLORS = ["#f44336", "#4caf50", "#ff9800", "#00838f", "#e91e63", "#2196f3"];

export const Page06SprintCharts: React.FC<Props> = ({ data }) => {
  const topEpic = data.tasksByEpic.sort((a, b) => b.count - a.count)[0];

  return (
    <div className="w-full flex-1 flex flex-col p-8 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8 print:bg-transparent print:border-b-2 print:border-blue-900 print:text-blue-900 print:mb-4">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">
          {data.name} | {data.dates} — DETALHAMENTO
        </h2>
      </header>
 
      <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden print:gap-4">
        {/* Gráfico */}
        <div className="flex flex-col print:break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a237e] mb-6 border-b pb-2 print:mb-2 print:text-[10px]">
            Tarefas por Épico ({data.name})
          </h3>
          <div className="flex-1 min-h-[350px] pr-8 print:min-h-[320px] print:pr-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <BarChart data={data.tasksByEpic} layout="vertical" margin={{ left: 80, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: "bold", fill: "#455a64" }}
                  width={100}
                />
                <Tooltip content={() => null} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.tasksByEpic.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fontWeight: "bold", fill: "#37474f" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-8 text-[10px] text-gray-500 font-medium italic print:mt-2 print:text-[8px]">
            {topEpic ? `${topEpic.name} concentra ${topEpic.count} de ${data.tasks.length} tarefas (${topEpic.percentage}%).` : ""}
          </p>
        </div>
 
        {/* Tabela Resumida */}
        <div className="flex flex-col overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200 print:rounded-none print:border-none print:break-inside-avoid">
          <h3 className="bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-widest print:bg-gray-100 print:text-gray-900 print:border-b print:px-2 print:py-1">
            Todas as tarefas da sprint
          </h3>
          <table className="w-full text-left border-collapse print:table">
            <thead>
              <tr className="bg-[#1a237e] text-white text-[9px] uppercase font-bold print:bg-transparent print:text-gray-900 print:border-b-2 print:border-gray-200">
                <th className="p-2 px-4 w-12 text-center print:px-2 print:py-1 print:border-none">ID</th>
                <th className="p-2 px-4 print:px-2 print:py-1 print:border-none">Tarefa</th>
                <th className="p-2 px-4 print:px-2 print:py-1 print:border-none">Categoria</th>
                <th className="p-2 px-4 print:px-2 print:py-1 print:border-none">Épico</th>
                <th className="p-2 px-4 w-12 text-center print:px-2 print:py-1">Concl.</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {data.tasks.slice(0, 18).map((task, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} print:bg-transparent print:border-b print:border-gray-50`}>
                  <td className="p-2 px-4 border-b border-gray-100 font-bold text-center print:px-2 print:py-1 print:border-none">#{task.id}</td>
                  <td className="p-2 px-4 border-b border-gray-100 font-medium truncate max-w-[150px] print:px-2 print:py-1 print:border-none print:max-w-none print:truncate-none print:whitespace-normal">{task.title}</td>
                  <td className="p-2 px-4 border-b border-gray-100 print:px-2 print:py-1 print:border-none">{task.category}</td>
                  <td className="p-2 px-4 border-b border-gray-100 truncate max-w-[80px] print:px-2 print:py-1 print:border-none print:max-w-none">{task.epic}</td>
                  <td className="p-2 px-4 border-b border-gray-100 text-center print:px-2 print:py-1 print:border-none">
                    {task.done ? (
                      <Check className="w-3 h-3 text-green-600 mx-auto" strokeWidth={3} />
                    ) : (
                      <X className="w-3 h-3 text-red-600 mx-auto" strokeWidth={3} />
                    )}
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
