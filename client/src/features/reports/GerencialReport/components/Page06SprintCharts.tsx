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
    <div className="w-full h-full flex flex-col p-8 relative overflow-hidden rounded-lg shadow-xl print:shadow-none">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">
          {data.name} | {data.dates} — DETALHAMENTO
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
        {/* Gráfico */}
        <div className="flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a237e] mb-6 border-b pb-2">
            Tarefas por Épico ({data.name})
          </h3>
          <div className="flex-1 min-h-[300px] pr-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tasksByEpic} layout="vertical" margin={{ left: 100, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: "bold", fill: "#455a64" }}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={25}>
                  {data.tasksByEpic.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: "bold", fill: "#37474f" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-8 text-[10px] text-gray-500 font-medium italic">
            {topEpic ? `${topEpic.name} concentra ${topEpic.count} de ${data.tasks.length} tarefas (${topEpic.percentage}%).` : ""}
          </p>
        </div>

        {/* Tabela Resumida */}
        <div className="flex flex-col overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-widest">
            Todas as tarefas da sprint
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a237e] text-white text-[9px] uppercase font-bold">
                <th className="p-2 px-4 w-12 text-center">ID</th>
                <th className="p-2 px-4">Tarefa</th>
                <th className="p-2 px-4">Categoria</th>
                <th className="p-2 px-4">Épico</th>
                <th className="p-2 px-4 w-12 text-center">Concl.</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {data.tasks.slice(0, 15).map((task, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 px-4 border-b border-gray-100 font-bold text-center">#{task.id}</td>
                  <td className="p-2 px-4 border-b border-gray-100 font-medium truncate max-w-[150px]">{task.title}</td>
                  <td className="p-2 px-4 border-b border-gray-100">{task.category}</td>
                  <td className="p-2 px-4 border-b border-gray-100 truncate max-w-[80px]">{task.epic}</td>
                  <td className="p-2 px-4 border-b border-gray-100 text-center">
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
