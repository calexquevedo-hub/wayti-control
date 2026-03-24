import React from "react";

interface Props {
  data: Array<{
    order: number;
    title: string;
    priorityColor: string;
    responsible: string;
    dueLabel: string;
  }>;
  isPrinting?: boolean;
}

export const Page08NextSteps: React.FC<Props> = ({ data, isPrinting }) => {
  return (
    <div className={`w-full flex-1 flex flex-col p-8 relative overflow-hidden ${isPrinting ? 'p-2' : ''}`} style={isPrinting ? { pageBreakBefore: 'always' } : {}}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] ${isPrinting ? 'w-2' : 'w-3'}`} />
      
      <header className={isPrinting ? "bg-white text-blue-900 border-b-2 border-blue-900 pb-2 mb-6" : "bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-12"}>
        <h2 className={`font-bold uppercase tracking-wider ${isPrinting ? 'text-xl' : 'text-xl ml-8'}`}>
          PRÓXIMOS PASSOS
        </h2>
      </header>
 
      <div className={`flex-1 ${isPrinting ? 'px-0' : 'px-8'}`}>
        <div className={`space-y-6 max-w-4xl mx-auto ${isPrinting ? 'space-y-3' : ''}`}>
          {data.map((step, idx) => (
            <div key={idx} className={`flex items-center gap-6 group ${isPrinting ? 'gap-3' : ''}`}>
              <div className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold shadow-md ${isPrinting ? 'w-8 h-8 text-sm shadow-none border border-blue-900 bg-white text-blue-900' : 'w-12 h-12 text-lg bg-[#1a237e] text-white'}`}>
                {(idx + 1).toString().padStart(2, '0')}
              </div>
              
              <div className={`flex-1 bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-100 flex items-center justify-between group-hover:shadow-md transition-shadow ${isPrinting ? 'p-2 shadow-none border border-gray-100 border-l-4' : ''}`} style={{ borderLeftColor: getStepColor(step.priorityColor), ...(isPrinting ? { pageBreakInside: 'avoid' } : {}) }}>
                <div className="space-y-1">
                  <h4 className={`font-bold text-gray-700 tracking-tight ${isPrinting ? 'text-xs' : 'text-base'}`}>{step.title}</h4>
                  <p className={`text-gray-400 font-bold uppercase tracking-widest ${isPrinting ? 'text-[8px]' : 'text-[10px]'}`}>
                    Responsável: <span className="text-gray-600 font-normal">{step.responsible}</span>
                  </p>
                </div>
                
                <div className={`flex items-center gap-4 ${isPrinting ? 'gap-2' : ''}`}>
                  <div className={`rounded-full shadow-sm ${isPrinting ? 'w-2 h-2 bg-white border border-[color:var(--tw-border-opacity)]' : 'w-3 h-3 ' + getStepBg(step.priorityColor)}`} style={{ borderColor: getStepColor(step.priorityColor) }} />
                  <span className={`font-black text-gray-800 uppercase italic ${isPrinting ? 'text-[10px]' : 'text-sm'}`}>
                    {step.dueLabel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
 
      <footer className="mt-auto text-center pt-8 border-t border-gray-200 print:hidden">
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
