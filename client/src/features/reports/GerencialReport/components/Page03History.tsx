import React from "react";

interface Props {
  data: Array<{
    name: string;
    period: string;
    taskCount: number;
    status: string;
  }>;
}

export const Page03History: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-full bg-[#f5f7fb] flex flex-col p-8 relative overflow-hidden rounded-lg shadow-xl print:shadow-none">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">Histórico de Sprints — OUT/2025 A MAR/2026</h2>
      </header>

      <div className="grid grid-cols-4 gap-8 mb-12">
        {data.map((sprint, idx) => (
          <div key={idx} className="bg-white rounded-md shadow-lg overflow-hidden flex flex-col min-h-[160px]">
            <header className={`${getStatusColor(sprint.status)} p-3 text-white flex justify-between items-center`}>
              <span className="font-bold text-sm tracking-tight">{sprint.name}</span>
              <span className="text-[10px] font-medium opacity-90">{sprint.taskCount} tarefas</span>
            </header>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <p className="text-xs text-gray-400 font-bold mb-4">{sprint.period}</p>
              <p className="text-sm font-bold text-gray-700">{sprint.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-auto flex gap-12 text-[10px] font-bold uppercase tracking-widest text-gray-500 pb-8">
        <LegendItem color="bg-green-500" label="Concluída" />
        <LegendItem color="bg-yellow-400" label="Carryover" />
        <LegendItem color="bg-red-500" label="Carryover crítico" />
        <LegendItem color="bg-purple-500" label="Em andamento" />
      </div>
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Concluída": return "bg-green-600";
    case "Em andamento": return "bg-purple-600";
    case "Carryover": return "bg-yellow-500";
    case "Crítico": return "bg-red-600";
    case "Futura": return "bg-gray-400";
    default: return "bg-gray-400";
  }
};

const LegendItem = ({ color, label }: any) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <span>{label}</span>
  </div>
);
