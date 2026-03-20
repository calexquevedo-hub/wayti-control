import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { FileText } from "lucide-react";
import { GerencialReport } from "./GerencialReport";

interface Props {
  sprintId?: string;
  trigger?: React.ReactNode;
}

export const GerencialReportDialog: React.FC<Props> = ({ sprintId, trigger }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
            <FileText className="w-4 h-4" />
            Relatório Gerencial
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-auto bg-gray-100 flex flex-col">
        <GerencialReport sprintId={sprintId} />
      </DialogContent>
    </Dialog>
  );
};
