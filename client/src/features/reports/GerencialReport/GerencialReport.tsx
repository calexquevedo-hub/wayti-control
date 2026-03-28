import React, { useState, useEffect } from "react";
import { useGerencialData } from "./useGerencialData";
import { Page01Cover } from "./components/Page01Cover";
import { Page02Executive } from "./components/Page02Executive";
import { Page03History } from "./components/Page03History";
import { Page04SprintSummary } from "./components/Page04SprintSummary";
import { Page06SprintCharts } from "./components/Page06SprintCharts";
import { Page07Risks } from "./components/Page07Risks";
import { Page08NextSteps } from "./components/Page08NextSteps";
import { Loader2, Printer } from "lucide-react";
import { Button } from "../../../components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Props {
  token?: string;
  sprintId?: string;
  onClose?: () => void;
}

export const GerencialReport: React.FC<Props> = ({ token, sprintId }) => {
  const { data, loading, error } = useGerencialData(token, sprintId);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Wait for UI to update (hide toolbars, tooltips, etc.)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pages = document.querySelectorAll(".gerencial-page");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1200, // Force a consistent width for rendering
        });

        const imgData = canvas.toDataURL("image/png");
        
        // Calculate dimensions to fit A4 perfectly or maintain aspect ratio
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        
        let targetWidth = pdfWidth;
        let targetHeight = pdfWidth / ratio;

        if (targetHeight > pdfHeight) {
          targetHeight = pdfHeight;
          targetWidth = pdfHeight * ratio;
        }

        // Center on page
        const marginX = (pdfWidth - targetWidth) / 2;
        const marginY = (pdfHeight - targetHeight) / 2;

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "PNG", marginX, marginY, targetWidth, targetHeight);
      }

      pdf.save(`Relatorio_Gerencial_WayTI_${data.coverInfo.sprintName}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative group w-full h-auto bg-white m-0 p-0 text-black ${isExporting ? 'exporting-pdf' : ''}`}>
      {/* ... (toolbar remains same) */}
      {!isExporting && (
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md p-4 mb-8 flex justify-between items-center border-b shadow-sm exporting-hidden">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-800">Preview do Relatório Gerencial</h2>
            <p className="text-xs text-gray-500 font-mono tracking-tighter">
              {data.coverInfo.sprintName} · {data.coverInfo.period}
            </p>
          </div>
          <Button onClick={handleExportPDF} className="gap-2 bg-blue-700 hover:bg-blue-800 shadow-lg" disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {isExporting ? "Gerando PDF..." : "Exportar PDF"}
          </Button>
        </div>
      )}
 
      {/* Rodapé Oficial (Fixado na Impressão) */}
      {isExporting && (
        <div className="fixed bottom-0 left-0 w-full text-center text-xs bg-white py-4 z-[10000]">
          <p className="font-bold text-gray-400 uppercase tracking-[0.3em]">
            INTEGRA SOLUÇÕES • GERÊNCIA DE TI • {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      {/* Pages Container */}
      <div id="gerencial-report-print-area" className="flex flex-col gap-12 max-w-[1200px] mx-auto pb-20">
        
        <div className="gerencial-page aspect-[16/9] w-full bg-white relative">
          <Page01Cover data={data.coverInfo} />
        </div>
 
        <div className="gerencial-page aspect-[16/9] w-full bg-white relative">
          <Page02Executive data={data.executiveSummary} />
        </div>
 
        <div className="gerencial-page aspect-[16/9] w-full bg-white relative">
          <Page03History data={data.sprintHistory} />
        </div>
 
        <div className="gerencial-page aspect-[16/9] w-full bg-white relative">
          <Page04SprintSummary data={data.sprintSummary} />
        </div>
 
        <div className="gerencial-page aspect-[16/9] w-full bg-white relative">
          <Page06SprintCharts data={{ ...data.sprintSummary, tasksByEpic: data.tasksByEpic }} />
        </div>
 
        <div className="gerencial-page aspect-[16/9] w-full bg-white relative">
          <Page07Risks data={data.risks} />
        </div>
 
        <div className="gerencial-page aspect-[16/9] w-full bg-white relative">
          <Page08NextSteps data={data.nextSteps} />
        </div>
 
      </div>
 
      {/* Printing Styles */}
      {/* Printing Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide tooltips and hover effects during canvas capture */
        .exporting-pdf .recharts-tooltip-wrapper,
        .exporting-pdf .recharts-default-tooltip,
        .exporting-pdf .exporting-hidden {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }

        /* Enforce exact width to prevent responsive reflows when capturing */
        .exporting-pdf #gerencial-report-print-area {
          width: 1200px !important;
          max-width: 1200px !important;
          margin: 0 !important;
        }

        /* Ensure proper aspect ratio of the captured boxes */
        .gerencial-page {
          overflow: hidden;
          background: white;
        }
      `}} />
    </div>
  );
};
