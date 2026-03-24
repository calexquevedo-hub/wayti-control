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
  isPrinting?: boolean;
}

const COLORS = ["#f44336", "#4caf50", "#ff9800", "#00838f", "#e91e63", "#2196f3"];

export const Page06SprintCharts: React.FC<Props> = ({ data, isPrinting }) => {
  const topEpic = data.tasksByEpic.sort((a, b) => b.count - a.count)[0];

  return (
    <div className={`w-full flex-1 flex flex-col p-8 relative overflow-hidden ${isPrinting ? 'p-2' : ''}`} style={isPrinting ? { pageBreakBefore: 'always' } : {}}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] ${isPrinting ? 'w-2' : 'w-3'}`} />
      
      <header className={isPrinting ? "bg-white text-blue-900 border-b-2 border-blue-900 pb-2 mb-6" : "bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
        <h2 className={`font-bold uppercase tracking-wider ${isPrinting ? 'text-xl' : 'text-xl ml-8'}`}>
          {data.name} | {data.dates} — DETALHAMENTO
        </h2>
      </header>
 
      <div className={`grid grid-cols-2 gap-8 flex-1 overflow-hidden ${isPrinting ? 'gap-4' : ''}`}>
        {/* Gráfico */}
        <div className="flex flex-col" style={isPrinting ? { pageBreakInside: 'avoid' } : {}}>
          <h3 className={isPrinting ? "text-blue-900 text-[10px] font-bold uppercase tracking-widest pb-2 mb-2 border-b border-gray-200" : "text-xs font-bold uppercase tracking-widest text-[#1a237e] mb-6 border-b pb-2"}>
            Tarefas por Épico ({data.name})
          </h3>
          <div className={`flex-1 min-h-[350px] pr-8 ${isPrinting ? 'min-h-[320px] pr-0' : ''}`}>
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
          <p className={`mt-8 text-[10px] text-gray-500 font-medium italic ${isPrinting ? 'mt-2 text-[8px]' : ''}`}>
            {topEpic ? `${topEpic.name} concentra ${topEpic.count} de ${data.tasks.length} tarefas (${topEpic.percentage}%).` : ""}
          </p>
        </div>
 
        {/* Tabela Resumida */}
        <div className={`flex flex-col bg-white ${isPrinting ? '' : 'rounded-lg shadow-sm border border-gray-200 overflow-hidden'}`}>
          <h3 className={isPrinting ? "bg-white text-blue-900 text-[10px] font-bold uppercase pb-2 mb-2 border-b-2 border-blue-900 tracking-widest px-2" : "bg-[#1a237e] text-white text-[10px] font-bold uppercase p-2 px-6 tracking-widest"}>
            Todas as tarefas da sprint
          </h3>
          <table className={`w-full text-left border-collapse ${isPrinting ? 'text-xs' : ''}`}>
            <thead>
              <tr className={isPrinting ? "text-gray-500 text-[9px] uppercase font-bold border-b-2 border-gray-200" : "bg-[#1a237e] text-white text-[9px] uppercase font-bold"}>
                <th className={`p-2 px-4 w-12 text-center ${isPrinting ? 'py-1 border-none' : 'border-r border-white/10'}`}>ID</th>
                <th className={`p-2 px-4 ${isPrinting ? 'py-1 border-none' : 'border-r border-white/10'}`}>Tarefa</th>
                <th className={`p-2 px-4 ${isPrinting ? 'py-1 border-none' : 'border-r border-white/10'}`}>Categoria</th>
                <th className={`p-2 px-4 ${isPrinting ? 'py-1 border-none' : 'border-r border-white/10'}`}>Épico</th>
                <th className={`p-2 px-4 w-12 text-center ${isPrinting ? 'py-1' : ''}`}>Concl.</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {data.tasks.slice(0, 18).map((task, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${isPrinting ? 'border-b border-gray-50' : ''}`} style={isPrinting ? { pageBreakInside: 'avoid' } : {}}>
                  <td className={`p-2 px-4 border-b border-gray-100 font-bold text-center ${isPrinting ? 'py-1 border-none' : ''}`}>#{task.id}</td>
                  <td className={`p-2 px-4 border-b border-gray-100 font-medium truncate max-w-[150px] ${isPrinting ? 'py-1 border-none max-w-none whitespace-normal' : ''}`}>{task.title}</td>
                  <td className={`p-2 px-4 border-b border-gray-100 ${isPrinting ? 'py-1 border-none' : ''}`}>{task.category}</td>
                  <td className={`p-2 px-4 border-b border-gray-100 truncate max-w-[80px] ${isPrinting ? 'py-1 border-none max-w-none' : ''}`}>{task.epic}</td>
                  <td className={`p-2 px-4 border-b border-gray-100 text-center ${isPrinting ? 'py-1 border-none' : ''}`}>
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
