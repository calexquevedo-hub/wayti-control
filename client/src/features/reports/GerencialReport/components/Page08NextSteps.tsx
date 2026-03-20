import React from "react";

interface Props {
  data: Array<{
    order: number;
    title: string;
    priorityColor: string;
    responsible: string;
    dueLabel: string;
  }>;
}

export const Page08NextSteps: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-full bg-[#f5f7fb] flex flex-col p-8 relative overflow-hidden rounded-lg shadow-xl print:shadow-none">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">
          PRÓXIMOS PASSOS
        </h2>
      </header>

      <div className="flex-1 px-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          {data.map((step, idx) => (
            <div key={idx} className="flex items-center gap-6 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1a237e] text-white flex items-center justify-center font-bold text-lg shadow-md">
                {(idx + 1).toString().padStart(2, '0')}
              </div>
              
              <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-100 flex items-center justify-between group-hover:shadow-md transition-shadow" style={{ borderLeftColor: getStepColor(step.priorityColor) }}>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-gray-700 tracking-tight">{step.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Responsável: <span className="text-gray-600">{step.responsible}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getStepBg(step.priorityColor)} shadow-sm`} />
                  <span className="text-sm font-black text-gray-800 uppercase italic">
                    {step.dueLabel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-auto text-center pt-8 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
          Integra Soluções • Gerência de TI • {new Date().toLocaleDateString("pt-BR")}
        </p>
      </footer>
    </div>
  );
};

const getStepColor = (color: string) => {
  switch (color) {
    case "red": return "#d32f2f";
    case "yellow": return "#fbc02d";
    case "green": return "#388e3c";
    default: return "#1a237e";
  }
};

const getStepBg = (color: string) => {
  switch (color) {
    case "red": return "bg-red-600";
    case "yellow": return "bg-yellow-400";
    case "green": return "bg-green-600";
    default: return "bg-blue-600";
  }
};
