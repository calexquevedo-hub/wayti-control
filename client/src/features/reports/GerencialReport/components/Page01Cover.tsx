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
}

export const Page01Cover: React.FC<Props> = ({ data }) => {
  return (
    <div 
      className={`w-full h-full flex flex-col justify-between p-16 relative overflow-hidden `}
      style={{}}
    >
      {/* Decorative vertical bar */}
      <div className={`absolute left-0 top-0 bottom-0 bg-[#448aff] w-4`} />
      
      <div className="space-y-4">
        <p className={`font-bold tracking-[0.3em] uppercase text-[#448aff] text-sm`}>
          Gerência de TI — {data.sprintName} {data.status}
        </p>
        <h1 className={`font-black leading-tight max-w-4xl text-[#1a237e] text-7xl`}>
          {data.title}
        </h1>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <p className={`font-bold text-[#283593] text-2xl`}>{data.organization}</p>
          <p className={`font-medium text-gray-500 text-xl`}>
            {data.sprintName} · {data.period} — {data.status}
          </p>
        </div>
        
        <div className={`pt-8 border-t border-gray-200 `}>
          <p className={`font-bold text-gray-400 text-sm`}>
            Relatório gerencial consolidado em {data.generatedAt}
          </p>
        </div>
      </div>

      {/* Abstract geometric shape for premium feel */}
      <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#f0f4ff] rounded-full blur-3xl opacity-60" />
    </div>
  );
};
