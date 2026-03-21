import { useState, useEffect } from "react";
import { fetchGerencialReport } from "../../../lib/api";

export interface GerencialData {
  coverInfo: {
    title: string;
    organization: string;
    sprintName: string;
    period: string;
    status: string;
    generatedAt: string;
  };
  executiveSummary: {
    totalEpics: number;
    activeSprint: string;
    openTasks: number;
    deliveries: number;
    carryoverRate: number;
    criticalCarryover: number;
    epicTable: Array<{
      area: string;
      label: string;
      activeDeliverables: number;
      currentSprint: string;
      status: string;
    }>;
  };
  sprintHistory: Array<{
    name: string;
    period: string;
    taskCount: number;
    status: string;
  }>;
  sprintSummary: {
    name: string;
    dates: string;
    status: string;
    carryoverFromLast: number;
    carryoverRate: number;
    carryoverCriticalCount: number;
    newTasks: number;
    totalOpen: number;
    daysRemaining: number;
    endDate: string;
    tasks: Array<{
      id: number;
      title: string;
      epic: string;
      responsible: string;
      category: string;
      done: boolean;
      gate: string;
      isCarryover?: boolean;
      carryoverCount?: number;
    }>;
  };
  tasksByEpic: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  risks: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    impact: string;
    ownerInternal: string;
    status: string;
  }>;
  nextSteps: Array<{
    id: string;
    order: number;
    title: string;
    priorityColor: string;
    responsible: string;
    dueLabel: string;
  }>;
}

export function useGerencialData(token?: string, sprintId?: string) {
  const [data, setData] = useState<GerencialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetchGerencialReport(token, sprintId);
        setData(res);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados do relatório");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, sprintId]);

  return { data, loading, error };
}
