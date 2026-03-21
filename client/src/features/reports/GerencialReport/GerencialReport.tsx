import React from "react";
import { useGerencialData } from "./useGerencialData";
import { Page01Cover } from "./components/Page01Cover";
import { Page02Executive } from "./components/Page02Executive";
import { Page03History } from "./components/Page03History";
import { Page04SprintSummary } from "./components/Page04SprintSummary";
import { Page05SprintTasks } from "./components/Page05SprintTasks";
import { Page06SprintCharts } from "./components/Page06SprintCharts";
import { Page07Risks } from "./components/Page07Risks";
import { Page08NextSteps } from "./components/Page08NextSteps";
import { Loader2, Printer } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface Props {
  token?: string;
  sprintId?: string;
  onClose?: () => void;
}

export const GerencialReport: React.FC<Props> = ({ token, sprintId }) => {
  const { data, loading, error } = useGerencialData(token, sprintId);

  // ... (if loading/error logic)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium font-mono">Gerando consolidado de dados...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-20 text-center text-red-600 font-bold">
        {error || "Erro ao carregar relatório."}
      </div>
    );
  }

  // ... (handlePrint remains same)

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative group">
      {/* ... (toolbar remains same) */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md p-4 mb-8 flex justify-between items-center border-b print:hidden shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-800">Preview do Relatório Gerencial</h2>
          <p className="text-xs text-gray-500 font-mono tracking-tighter">
            {data.coverInfo.sprintName} · {data.coverInfo.period}
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2 bg-blue-700 hover:bg-blue-800 shadow-lg">
          <Printer className="w-4 h-4" />
          Exportar PDF (Imprimir)
        </Button>
      </div>

      {/* Pages Container */}
      <div className="flex flex-col gap-12 max-w-[1200px] mx-auto pb-20 print:gap-0 print:max-w-none print:p-0">
        
        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page01Cover data={data.coverInfo} />
        </div>

        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page02Executive data={data.executiveSummary} />
        </div>

        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page03History data={data.sprintHistory} />
        </div>

        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page04SprintSummary data={data.sprintSummary} />
        </div>

        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page05SprintTasks data={data.sprintSummary} />
        </div>

        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page06SprintCharts data={{ ...data.sprintSummary, tasksByEpic: data.tasksByEpic }} />
        </div>

        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page07Risks data={data.risks} />
        </div>

        <div className="gerencial-page aspect-[16/9] w-full print:m-0 print:rounded-none">
          <Page08NextSteps data={data.nextSteps} />
        </div>

      </div>

      {/* Printing Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: 297mm 210mm;
            margin: 0;
          }
          /* Limpa TUDO que possa prender o scroll ou a altura */
          html, body, #root, main, div {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            visibility: visible !important;
          }
          body {
            visibility: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          /* Mostra apenas o conteúdo do relatório */
          .gerencial-page, .gerencial-page * {
            visibility: visible !important;
          }
          .gerencial-page {
            position: relative !important;
            width: 297mm !important;
            height: 209.5mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          /* Esconde UI do sistema */
          .print\\:hidden, .sticky, button, nav, aside {
            display: none !important;
            visibility: hidden !important;
          }
          /* Remove aspect-ratio classes during print */
          .aspect-\\[16\\/9\\] {
            aspect-ratio: auto !important;
          }
        }
      `}} />
    </div>
  );
};
