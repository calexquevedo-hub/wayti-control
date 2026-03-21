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
    <div className="w-full h-full bg-[#1a237e] text-white flex flex-col justify-between p-16 relative overflow-hidden print:shadow-none shadow-xl rounded-lg print:rounded-none">
      {/* Decorative vertical bar like in Slide1 */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#448aff] print:bg-[#448aff]" />
      
      <div className="space-y-4">
        <p className="text-sm font-medium tracking-[0.3em] uppercase opacity-80">
          Gerência de TI — {data.sprintName} {data.status}
        </p>
        <h1 className="text-7xl font-bold leading-tight max-w-4xl">
          {data.title}
        </h1>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <p className="text-2xl font-semibold opacity-90">{data.organization}</p>
          <p className="text-xl opacity-70">
            {data.sprintName} · {data.period} — {data.status}
          </p>
        </div>
        
        <div className="pt-8 border-t border-white/20">
          <p className="text-sm opacity-50">Relatório gerado em {data.generatedAt}</p>
        </div>
      </div>

      {/* Abstract geometric shape for premium feel */}
      <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#303f9f] rounded-full blur-3xl opacity-30" />
    </div>
  );
};
