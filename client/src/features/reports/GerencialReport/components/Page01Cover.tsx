import React from "react";

interface Props {
  data: {
    title: string;
    organization: string;
    sprintName: string;
    period: string;
    status: string;
    generatedAt: string;
  };
  isPrinting?: boolean;
}

export const Page01Cover: React.FC<Props> = ({ data, isPrinting }) => {
  return (
    <div 
      className={`w-full h-full flex flex-col justify-between p-16 relative overflow-hidden ${isPrinting ? 'p-2' : ''}`}
      style={isPrinting ? { pageBreakAfter: 'always' } : {}}
    >
      {/* Decorative vertical bar */}
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] ${isPrinting ? 'w-2' : 'w-4'}`} />
      
      <div className="space-y-4">
        <p className={`font-bold tracking-[0.3em] uppercase text-[#448aff] ${isPrinting ? 'text-xs' : 'text-sm'}`}>
          Gerência de TI — {data.sprintName} {data.status}
        </p>
        <h1 className={`font-black leading-tight max-w-4xl text-[#1a237e] ${isPrinting ? 'text-2xl' : 'text-7xl'}`}>
          {data.title}
        </h1>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <p className={`font-bold text-[#283593] ${isPrinting ? 'text-xl' : 'text-2xl'}`}>{data.organization}</p>
          <p className={`font-medium text-gray-500 ${isPrinting ? 'text-sm' : 'text-xl'}`}>
            {data.sprintName} · {data.period} — {data.status}
          </p>
        </div>
        
        <div className={`pt-8 border-t border-gray-200 ${isPrinting ? 'pt-4' : ''}`}>
          <p className={`font-bold text-gray-400 ${isPrinting ? 'text-xs' : 'text-sm'}`}>
            Relatório gerencial consolidado em {isPrinting ? data.generatedAt.split(' ')[0] : data.generatedAt}
          </p>
        </div>
      </div>

      {/* Abstract geometric shape for premium feel - hidden on print */}
      {!isPrinting && <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#f0f4ff] rounded-full blur-3xl opacity-60" />}
    </div>
  );
};
