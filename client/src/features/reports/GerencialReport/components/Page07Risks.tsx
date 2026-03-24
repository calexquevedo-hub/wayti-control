import React from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

interface Props {
  data: Array<{
    severity: string;
    title: string;
    description: string;
    impact: string;
    ownerInternal: string;
    status: string;
  }>;
  isPrinting?: boolean;
}

export const Page07Risks: React.FC<Props> = ({ data, isPrinting }) => {
  return (
    <div className={`w-full flex-1 flex flex-col p-8 relative overflow-hidden ${isPrinting ? 'p-2' : ''}`} style={isPrinting ? { pageBreakBefore: 'always' } : {}}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] ${isPrinting ? 'w-2' : 'w-3'}`} />
      
      <header className={isPrinting ? "bg-white text-blue-900 border-b-2 border-blue-900 pb-2 mb-6" : "bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
        <h2 className={`font-bold uppercase tracking-wider ${isPrinting ? 'text-xl' : 'text-xl ml-8'}`}>
          RISCOS, ALERTAS E OBSERVAÇÕES GERENCIAIS
        </h2>
      </header>
 
      <div className={`grid grid-cols-2 gap-6 flex-1 overflow-auto pr-4 custom-scrollbar ${isPrinting ? 'gap-4 overflow-visible' : ''}`}>
        {data.length > 0 ? (
          data.map((risk, idx) => (
            <div key={idx} className={`bg-white rounded-lg shadow-md border-l-8 overflow-hidden h-fit ${isPrinting ? 'shadow-none border border-gray-200 border-l-4' : ''}`} style={{ borderLeftColor: getSeverityColor(risk.severity), ...(isPrinting ? { pageBreakInside: 'avoid' } : {}) }}>
              <div className={`p-4 ${isPrinting ? 'p-2' : ''}`}>
                <div className={`flex justify-between items-start mb-2 ${isPrinting ? 'mb-1' : ''}`}>
                  <div className="flex items-center gap-2">
                    {risk.severity === "Crítico" ? <ShieldAlert className={`text-red-600 ${isPrinting ? 'w-4 h-4' : 'w-5 h-5'}`} /> : <AlertTriangle className={`text-yellow-500 ${isPrinting ? 'w-4 h-4' : 'w-5 h-5'}`} />}
                    <span className={`font-black uppercase tracking-tighter ${isPrinting ? 'text-[8px]' : 'text-[10px]'}`} style={{ color: getSeverityColor(risk.severity) }}>
                      {risk.severity}
                    </span>
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded-full uppercase ${isPrinting ? 'bg-white border px-1 text-[7px] ' + (risk.status === "Aberto" ? 'border-red-500 text-red-700' : 'border-green-500 text-green-700') : 'text-[9px] ' + (risk.status === "Aberto" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}`}>
                    {risk.status}
                  </span>
                </div>
                <h4 className={`font-bold text-gray-800 mb-1 leading-tight ${isPrinting ? 'text-xs' : 'text-sm'}`}>{risk.title}</h4>
                <p className={`text-gray-500 mb-3 ${isPrinting ? 'text-[9px] mb-1' : 'text-[11px] line-clamp-3'}`}>{risk.description}</p>
                <div className={`flex justify-between border-t pt-2 mt-auto ${isPrinting ? 'pt-1' : ''}`}>
                  <div className={`uppercase font-bold text-gray-400 ${isPrinting ? 'text-[7px]' : 'text-[8px]'}`}>
                    <p>Impacto: <span className="text-gray-600">{risk.impact}</span></p>
                  </div>
                  <div className={`uppercase font-bold text-gray-400 text-right ${isPrinting ? 'text-[7px]' : 'text-[8px]'}`}>
                    <p>Dono: <span className="text-gray-600">{risk.ownerInternal}</span></p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`col-span-2 flex flex-col items-center justify-center p-20 text-gray-400 gap-4 opacity-50 italic ${isPrinting ? 'p-10 text-xs' : ''}`}>
            <ShieldCheck className={isPrinting ? "w-8 h-8" : "w-16 h-16"} />
            <p>Nenhum risco crítico identificado no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Crítico": return "#d32f2f";
    case "Alto": return "#f57c00";
    case "Médio": return "#fbc02d";
    default: return "#455a64";
  }
};
