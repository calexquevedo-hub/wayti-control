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
    <div className="w-full h-full text-[#1a237e] flex flex-col justify-between p-16 relative overflow-hidden print:shadow-none shadow-xl rounded-lg print:rounded-none">
      {/* Decorative vertical bar like in Slide1 */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#448aff]" />
      
      <div className="space-y-4">
        <p className="text-sm font-bold tracking-[0.3em] uppercase text-[#448aff]">
          Gerência de TI — {data.sprintName} {data.status}
        </p>
        <h1 className="text-7xl font-black leading-tight max-w-4xl text-[#1a237e]">
          {data.title}
        </h1>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <p className="text-2xl font-bold text-[#283593]">{data.organization}</p>
          <p className="text-xl font-medium text-gray-500">
            {data.sprintName} · {data.period} — {data.status}
          </p>
        </div>
        
        <div className="pt-8 border-t border-gray-200">
          <p className="text-sm font-bold text-gray-400">Relatório gerencial consolidado em {data.generatedAt}</p>
        </div>
      </div>

      {/* Abstract geometric shape for premium feel - much subtler now on white */}
      <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#f0f4ff] rounded-full blur-3xl opacity-60" />
    </div>
  );
};
