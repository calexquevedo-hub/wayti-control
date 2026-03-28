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
    <div className={`w-full flex-1 flex flex-col p-8 relative overflow-hidden `} style={{}}>
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] w-3`} />
      
      <header className={"bg-[#1a237e] text-white p-4 -mx-8 -mt-8 mb-8"}>
        <h2 className={`font-bold uppercase tracking-wider text-xl ml-8`}>
          RISCOS, ALERTAS E OBSERVAÇÕES GERENCIAIS
        </h2>
      </header>
 
      <div className={`flex flex-col gap-4 flex-1 overflow-auto pr-4 custom-scrollbar `}>
        {data.length > 0 ? (
          data.map((risk, idx) => (
            <div key={idx} className={`bg-white rounded-lg shadow-sm border-l-4 overflow-hidden flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-gray-100`} style={{ borderLeftColor: getSeverityColor(risk.severity) }}>
              <div className="flex flex-col min-w-[100px] gap-1">
                <div className="flex items-center gap-1.5">
                  {risk.severity === "Crítico" ? <ShieldAlert className={`text-red-600 w-4 h-4`} /> : <AlertTriangle className={`text-yellow-500 w-4 h-4`} />}
                  <span className={`font-black uppercase tracking-tighter text-[9px]`} style={{ color: getSeverityColor(risk.severity) }}>
                    {risk.severity}
                  </span>
                </div>
                <span className={`font-bold px-2 py-0.5 rounded-full uppercase w-fit text-center ${risk.status === "Aberto" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"} text-[8px]`}>
                  {risk.status}
                </span>
              </div>
              
              <div className="flex-1">
                <h4 className={`font-bold text-gray-800 mb-0.5 leading-tight text-xs`}>{risk.title}</h4>
                <p className={`text-gray-500 text-[11px] leading-relaxed`}>{risk.description}</p>
              </div>

              <div className={`flex flex-col text-right gap-1 min-w-[120px] pt-2 md:pt-0`}>
                <p className="uppercase font-bold text-gray-400 text-[8px]">Impacto: <span className="text-gray-600 truncate">{risk.impact}</span></p>
                <p className="uppercase font-bold text-gray-400 text-[8px]">Responsável: <span className="text-gray-600 truncate">{risk.ownerInternal}</span></p>
              </div>
            </div>
          ))
        ) : (
          <div className={`col-span-2 flex flex-col items-center justify-center p-20 text-gray-400 gap-4 opacity-50 italic `}>
            <ShieldCheck className={"w-16 h-16"} />
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
