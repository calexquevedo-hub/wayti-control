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
    <div className="w-full h-full flex flex-col p-8 relative overflow-hidden print:p-4 print:break-after-page">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff] print:w-2" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-12 print:bg-transparent print:border-b-2 print:border-blue-900 print:text-blue-900 print:mb-8">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8 print:text-lg">Histórico de Sprints — OUT/2025 A MAR/2026</h2>
      </header>

      <div className="grid grid-cols-4 gap-8 mb-12 print:gap-4 print:mb-8 print:break-inside-avoid">
        {data.map((sprint, idx) => (
          <div key={idx} className="bg-white rounded-md shadow-lg overflow-hidden flex flex-col min-h-[160px] print:shadow-none print:border print:border-gray-100 print:min-h-0">
            <header className={`${getStatusColor(sprint.status)} p-3 text-white flex justify-between items-center print:bg-gray-100 print:text-gray-900 print:border-b`}>
              <span className="font-bold text-sm tracking-tight print:text-[10px]">{sprint.name}</span>
              <span className="text-[10px] font-medium opacity-90 print:text-[8px]">{sprint.taskCount} tarefas</span>
            </header>
            <div className="p-4 flex-1 flex flex-col justify-between print:p-2">
              <p className="text-xs text-gray-400 font-bold mb-4 print:mb-1 print:text-[8px]">{sprint.period}</p>
              <p className="text-sm font-bold text-gray-700 print:text-[9px]">{sprint.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend - Positioned at bottom on print */}
      <div className="mt-auto flex gap-12 text-[10px] font-bold uppercase tracking-widest text-gray-500 pb-8 print:absolute print:bottom-8 print:left-8 print:right-8 print:justify-center print:pb-0 print:gap-6 print:text-[8px]">
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
