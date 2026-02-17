import { useEffect, useState } from "react";

import {
  addDemandComment,
  createDemand,
  deleteDemand,
  fetchDemands,
  fetchReportSummary,
  updateDemand,
  updateDemandStatus,
} from "@/lib/api";
import type { Demand, ProfilePermissions, ReportSnapshot } from "@/types";

interface DemandDataState {
  demands: Demand[];
  reportSnapshots: ReportSnapshot[];
  loading: boolean;
  error: string | null;
}

interface DemandActions {
  create: (payload: Omit<Demand, "id">) => Promise<{ ok: boolean; message?: string }>;
  update: (id: string, payload: Partial<Demand>) => Promise<{ ok: boolean; message?: string }>;
  remove: (id: string, reason: string) => Promise<{ ok: boolean; message?: string }>;
  addComment: (id: string, message: string) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
}

interface DemandDataOptions {
  onNotify?: (message: string) => void;
  permissions?: ProfilePermissions;
}

// Loads data from API and falls back to mock if API is offline.
export function useDemandData(token: string | undefined, options: DemandDataOptions = {}) {
  const [state, setState] = useState<DemandDataState>({
    demands: [],
    reportSnapshots: [],
    loading: true,
    error: null,
  });
  const [apiAvailable, setApiAvailable] = useState(false);

  useEffect(() => {
    const authToken = token;
    if (!authToken || !options.permissions?.demands?.view) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    let active = true;

    async function load(activeToken: string) {
      try {
        const [demands, summary] = await Promise.all([
          fetchDemands(activeToken),
          fetchReportSummary(activeToken),
        ]);

        const snapshot: ReportSnapshot = {
          period: "Atual",
          totalBudget: summary.totalBudget,
          totalSpent: summary.totalSpent,
          riskCount: summary.riskCount,
          onTimePercentage: summary.onTimePercentage,
        };

        if (active) {
          setApiAvailable(true);
          setState({
            demands,
            reportSnapshots: [snapshot],
            loading: false,
            error: null,
          });
        }
      } catch (error: any) {
        if (active) {
          setApiAvailable(false);
          const message = typeof error?.message === "string" ? error.message : "";
          if (message.startsWith("403:") && message.includes("Atualize sua senha")) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: "Acesso bloqueado: atualize sua senha para continuar.",
            }));
            return;
          }
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "API offline. Nenhum dado carregado.",
          }));
        }
      }
    }

    load(authToken);

    return () => {
      active = false;
    };
  }, [token]);

  const actions: DemandActions = {
    create: async (payload) => {
      if (!token || !apiAvailable) {
        return { ok: false, message: "API offline. Não foi possível criar." };
      }
      try {
        const created = await createDemand(token, payload);
        setState((prev) => ({
          ...prev,
          demands: [created, ...prev.demands],
        }));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: "Falha ao criar demanda." };
      }
    },
    update: async (id, payload) => {
      if (!token || !apiAvailable) {
        return { ok: false, message: "API offline. Não foi possível atualizar." };
      }
      try {
        const payloadKeys = Object.keys(payload);
        const updated =
          payloadKeys.length === 1 && payload.status
            ? await updateDemandStatus(token, id, payload.status)
            : await updateDemand(token, id, payload);
        setState((prev) => ({
          ...prev,
          demands: prev.demands.map((item) => (item.id === id ? updated : item)),
        }));
        if (payload.status) {
          options.onNotify?.(`Status da demanda ${updated.name} alterado para ${payload.status}.`);
        }
        if (payload.approvalStatus) {
          options.onNotify?.(
            `Aprovação da demanda ${updated.name} mudou para ${payload.approvalStatus}.`
          );
        }
        if (payload.approvalStages) {
          options.onNotify?.(
            `Workflow de aprovacao da demanda ${updated.name} foi atualizado.`
          );
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, message: "Falha ao atualizar demanda." };
      }
    },
    remove: async (id, reason) => {
      if (!token || !apiAvailable) {
        return { ok: false, message: "API offline. Não foi possível excluir." };
      }
      try {
        await deleteDemand(token, id, reason);
        setState((prev) => ({
          ...prev,
          demands: prev.demands.filter((item) => item.id !== id),
        }));
        return { ok: true };
      } catch (error: any) {
        return {
          ok: false,
          message: typeof error?.message === "string" ? error.message : "Falha ao excluir demanda.",
        };
      }
    },
    addComment: async (id, message) => {
      if (!token || !apiAvailable) {
        return { ok: false, message: "API offline. Não foi possível comentar." };
      }
      try {
        const updated = await addDemandComment(token, id, message);
        setState((prev) => ({
          ...prev,
          demands: prev.demands.map((item) => (item.id === id ? updated : item)),
        }));
        return { ok: true };
      } catch (error: any) {
        return {
          ok: false,
          message:
            typeof error?.message === "string" ? error.message : "Falha ao registrar comentário.",
        };
      }
    },
    refresh: async () => {
      const authToken = token;
      if (!authToken) return;
      try {
        const [demands, summary] = await Promise.all([
          fetchDemands(authToken),
          fetchReportSummary(authToken),
        ]);
        const snapshot: ReportSnapshot = {
          period: "Atual",
          totalBudget: summary.totalBudget,
          totalSpent: summary.totalSpent,
          riskCount: summary.riskCount,
          onTimePercentage: summary.onTimePercentage,
        };
        setState((prev) => ({
          ...prev,
          demands,
          reportSnapshots: [snapshot],
          loading: false,
          error: null,
        }));
      } catch (error: any) {
        const message = typeof error?.message === "string" ? error.message : "";
        if (message.startsWith("403:") && message.includes("Atualize sua senha")) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Acesso bloqueado: atualize sua senha para continuar.",
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "API offline. Nenhum dado carregado.",
        }));
      }
    },
  };

  return { ...state, actions };
}
