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
    <div className="relative group print:absolute print:left-0 print:top-0 print:w-full print:h-auto print:overflow-visible print:bg-white print:z-[9999] print:m-0 print:p-0 print:text-black print:pb-20">
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
 
      {/* Rodapé Oficial (Fixado na Impressão) */}
      <div className="hidden print:flex print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:py-4 print:border-t print:border-gray-100 print:justify-center print:items-center print:z-[10000]">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
          INTEGRA SOLUÇÕES — GERÊNCIA DE TI — {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>

      {/* Pages Container */}
      <div id="gerencial-report-print-area" className="flex flex-col gap-12 max-w-[1200px] mx-auto pb-20 print:gap-0 print:max-w-none print:p-0 print:block print:h-auto print:overflow-visible">
        
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
            size: A4 landscape;
            margin: 0;
          }
 
          /* REGRAS SENIOR: CLEAN & INK-FRIENDLY */
          html, body, #root {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            background: white !important;
            color: black !important;
            font-size: 12pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
 
          /* FIM DO EFEITO PÔSTER: ESCALA REDUZIDA */
          h1 { font-size: 24pt !important; }
          h2 { font-size: 18pt !important; }
          h3 { font-size: 14pt !important; }
          h4 { font-size: 11pt !important; }
          p, span, td, th { font-size: 9pt !important; }
          .text-xs, .text-\\[10px\\] { font-size: 8pt !important; }

          /* DEFINIÇÃO DE PÁGINA (SLIDE) */
          .gerencial-page {
            width: 297mm !important;
            min-height: 209mm !important;
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            position: relative !important;
            margin: 0 !important;
            padding: 20mm !important; /* Respiro interno para impressão */
            overflow: visible !important;
            background: white !important;
          }

          /* QUEBRAS INTELIGENTES */
          h2, h3, header {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* EVITAR QUEBRAS DENTRO DE CARDS E TABELAS */
          .gerencial-page > *,
          .rounded-lg,
          .shadow-sm,
          table,
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* REMOVER SOMBRAS E BORDAS RESIDUAIS */
          * {
            box-shadow: none !important;
            text-shadow: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* OCULTAR TOOLTIPS DO RECHARTS */
          .recharts-tooltip-wrapper,
          .recharts-default-tooltip,
          .recharts-legend-wrapper {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }

          /* AJUSTE DE ASPECT RATIO */
          .aspect-\\[16\\/9\\] {
            aspect-ratio: auto !important;
          }

          /* CORES ESPECÍFICAS DO RELATÓRIO */
          .bg-\\[\\#1a237e\\] { background-color: #1a237e !important; }
          .bg-\\[\\#283593\\] { background-color: #283593 !important; }
          .bg-\\[\\#448aff\\] { background-color: #448aff !important; }
          .bg-\\[\\#303f9f\\] { background-color: #303f9f !important; }
          .bg-\\[\\#f0f4ff\\] { background-color: #f0f4ff !important; }
          
          /* BORDAS INDICATIVAS */
          .border-blue-600 { border-color: #2563eb !important; }
          .border-purple-600 { border-color: #9333ea !important; }
          .border-red-600 { border-color: #dc2626 !important; }
          .border-green-600 { border-color: #16a34a !important; }
          .border-orange-500 { border-color: #f97316 !important; }
          .border-red-800 { border-color: #991b1b !important; }
        }
      `}} />
    </div>
  );
};
