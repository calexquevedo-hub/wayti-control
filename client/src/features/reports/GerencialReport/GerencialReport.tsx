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
      <div id="gerencial-report-print-area" className="flex flex-col gap-12 max-w-[1200px] mx-auto pb-20 print:gap-0 print:max-w-none print:p-0">
        
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
          /* RESET DRÁSTICO DE HIERARQUIA */
          html, body, #root, main, 
          .h-screen, .max-h-screen, .min-h-screen,
          .overflow-hidden, .overflow-y-auto, .overflow-auto {
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

          /* ÁREA DO RELATÓRIO */
          #gerencial-report-print-area {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important;
            z-index: 999999;
          }

          #gerencial-report-print-area * {
            visibility: visible !important;
          }

          .gerencial-page {
            width: 297mm !important;
            height: 209mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            position: relative !important;
            overflow: hidden !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* UI E NAVEGAÇÃO */
          .print\\:hidden, .sticky, button, nav, aside {
            display: none !important;
            visibility: hidden !important;
          }

          .aspect-\\[16\\/9\\] {
            aspect-ratio: auto !important;
          }

          /* CORES ESPECÍFICAS DO RELATÓRIO */
          .bg-\\[\\#1a237e\\] { background-color: #1a237e !important; }
          .bg-\\[\\#283593\\] { background-color: #283593 !important; }
          .bg-\\[\\#448aff\\] { background-color: #448aff !important; }
          .bg-\\[\\#f5f7fb\\] { background-color: #f5f7fb !important; }
          .bg-\\[\\#303f9f\\] { background-color: #303f9f !important; }
          .bg-\\[\\#f0f4ff\\] { background-color: #f0f4ff !important; }
          .border-blue-600 { border-color: #2563eb !important; }
          .border-purple-600 { border-color: #9333ea !important; }
          .border-red-600 { border-color: #dc2626 !important; }
          .border-green-600 { border-color: #16a34a !important; }
          .border-orange-500 { border-color: #f97316 !important; }
          .border-red-800 { border-color: #991b1b !important; }
          
          /* Forçar cores em todos os elementos */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
};
