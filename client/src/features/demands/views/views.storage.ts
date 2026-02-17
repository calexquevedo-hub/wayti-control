import { ViewsState, SavedView, ViewScope } from "./views.types";
import { DEMAND_DEFAULT_VIEWS, TICKET_DEFAULT_VIEWS } from "./views.defaults";

const STORAGE_KEY = "tiDemand.savedViews.v1";

const initialState = (): ViewsState => ({
  version: 1,
  views: [...DEMAND_DEFAULT_VIEWS, ...TICKET_DEFAULT_VIEWS],
  activeByScope: { demands: "v_overdue", tickets: "t_open" },
});

export function loadViewsState(): ViewsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();

    const parsed = JSON.parse(raw) as ViewsState;

    // merge defaults (garante que sempre existam)
    const defaults = [...DEMAND_DEFAULT_VIEWS, ...TICKET_DEFAULT_VIEWS];
    const byId = new Map<string, SavedView>();

    defaults.forEach((v) => byId.set(v.id, v));
    (parsed.views || []).forEach((v) => byId.set(v.id, v));

    const merged: ViewsState = {
      version: 1,
      views: Array.from(byId.values()),
      activeByScope: parsed.activeByScope || initialState().activeByScope,
    };

    // garante que active exista
    const activeDemands = merged.activeByScope.demands;
    if (activeDemands && !merged.views.some((v) => v.id === activeDemands)) {
      merged.activeByScope.demands = "v_overdue";
    }

    const activeTickets = merged.activeByScope.tickets;
    if (activeTickets && !merged.views.some((v) => v.id === activeTickets)) {
      merged.activeByScope.tickets = "t_open";
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return initialState();
  }
}

export function saveViewsState(state: ViewsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setActiveView(scope: ViewScope, viewId: string | null) {
  const state = loadViewsState();
  state.activeByScope[scope] = viewId;
  saveViewsState(state);
  return state;
}

export function upsertView(view: SavedView) {
  const state = loadViewsState();
  const idx = state.views.findIndex((v) => v.id === view.id);
  const withStamp = { ...view, updatedAt: new Date().toISOString() };
  if (idx >= 0) state.views[idx] = withStamp;
  else state.views.push(withStamp);
  saveViewsState(state);
  return state;
}

export function deleteView(viewId: string) {
  const state = loadViewsState();
  const target = state.views.find((v) => v.id === viewId);
  if (target?.isDefault) return state; // não apaga default

  state.views = state.views.filter((v) => v.id !== viewId);

  // limpar active se deletou a ativa
  (Object.keys(state.activeByScope) as ViewScope[]).forEach((s) => {
    if (state.activeByScope[s] === viewId) state.activeByScope[s] = null;
  });

  saveViewsState(state);
  return state;
}

export function exportViewsJson() {
  const state = loadViewsState();
  return JSON.stringify(state, null, 2);
}

export function importViewsJson(json: string) {
  const incoming = JSON.parse(json) as ViewsState;
  if (!incoming?.views?.length) throw new Error("JSON inválido (sem views).");

  const state = loadViewsState();
  // Importa como custom: não sobrescreve defaults com o mesmo id
  const defaultsIds = new Set(DEMAND_DEFAULT_VIEWS.map((v) => v.id));
  incoming.views.forEach((v) => {
    if (defaultsIds.has(v.id)) return; // ignora defaults importados
    state.views.push({ ...v, isDefault: false, updatedAt: new Date().toISOString() });
  });

  saveViewsState(state);
  return state;
}

export function resetViewsToDefault() {
  const state = initialState();
  saveViewsState(state);
  return state;
}
