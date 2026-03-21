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
}

export const Page07Risks: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-full flex flex-col p-8 relative overflow-hidden rounded-lg shadow-xl print:shadow-none">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#448aff]" />
      
      <header className="bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8">
        <h2 className="text-xl font-bold uppercase tracking-wider ml-8">
          RISCOS, ALERTAS E OBSERVAÇÕES GERENCIAIS
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-auto pr-4 custom-scrollbar">
        {data.length > 0 ? (
          data.map((risk, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-md border-l-8 overflow-hidden h-fit" style={{ borderLeftColor: getSeverityColor(risk.severity) }}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {risk.severity === "Crítico" ? <ShieldAlert className="w-5 h-5 text-red-600" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                    <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: getSeverityColor(risk.severity) }}>
                      {risk.severity}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${risk.status === "Aberto" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {risk.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-800 mb-1 leading-tight">{risk.title}</h4>
                <p className="text-[11px] text-gray-500 line-clamp-3 mb-3">{risk.description}</p>
                <div className="flex justify-between border-t pt-2 mt-auto">
                  <div className="text-[8px] uppercase font-bold text-gray-400">
                    <p>Impacto: <span className="text-gray-600">{risk.impact}</span></p>
                  </div>
                  <div className="text-[8px] uppercase font-bold text-gray-400 text-right">
                    <p>Dono: <span className="text-gray-600">{risk.ownerInternal}</span></p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 flex flex-col items-center justify-center p-20 text-gray-400 gap-4 opacity-50 italic">
            <ShieldCheck className="w-16 h-16" />
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
