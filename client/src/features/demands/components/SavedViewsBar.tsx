import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import type { SavedView, ViewScope, ViewsState } from "../views/views.types";
import {
  loadViewsState,
  saveViewsState,
  setActiveView,
  upsertView,
  deleteView,
  exportViewsJson,
  importViewsJson,
  resetViewsToDefault,
} from "../views/views.storage";

type Props = {
  scope: ViewScope; // "demands"
  activeViewId: string | null;
  onChangeActive: (viewId: string | null) => void;

  // opcional: para permitir "Salvar view atual"
  getCurrentDraftView?: () => Omit<SavedView, "updatedAt">;
};

function groupPinnedFirst(views: SavedView[]) {
  const pinned = views.filter((v) => v.isPinned);
  const others = views.filter((v) => !v.isPinned);
  return [...pinned, ...others];
}

export function SavedViewsBar({
  scope,
  activeViewId,
  onChangeActive,
  getCurrentDraftView,
}: Props) {
  const [state, setState] = React.useState<ViewsState>(() => loadViewsState());

  const views = React.useMemo(() => {
    const scoped = state.views.filter((v) => v.scope === scope);
    return groupPinnedFirst(scoped);
  }, [state.views, scope]);

  // --- Import/Export dialogs ---
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [importText, setImportText] = React.useState("");

  // --- Create/Edit dialog (mínimo) ---
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  function refresh() {
    setState(loadViewsState());
  }

  function handleSelect(viewId: string) {
    setActiveView(scope, viewId);
    onChangeActive(viewId);
    refresh();
  }

  function handleTogglePin(view: SavedView) {
    upsertView({ ...view, isPinned: !view.isPinned, isDefault: !!view.isDefault });
    refresh();
  }

  function handleDelete(view: SavedView) {
    deleteView(view.id);
    // se deletou a ativa, zera
    if (activeViewId === view.id) onChangeActive(null);
    refresh();
  }

  function openCreateFromDraft() {
    if (!getCurrentDraftView) return;
    const draft = getCurrentDraftView();

    // id simples (sem libs): v_custom_<timestamp>
    const newId = `v_custom_${Date.now()}`;
    setEditId(newId);
    setEditName(draft.name || "Nova view");
    setEditDesc(draft.description || "");
    setIsEditOpen(true);
  }

  function openEdit(view: SavedView) {
    if (view.isDefault) {
      // defaults: edita via clone (boa prática)
      const cloneId = `v_custom_${Date.now()}`;
      upsertView({
        ...view,
        id: cloneId,
        name: `${view.name} (cópia)`,
        isDefault: false,
        isPinned: true,
        updatedAt: new Date().toISOString(),
      });
      setActiveView(scope, cloneId);
      onChangeActive(cloneId);
      refresh();
      return;
    }

    setEditId(view.id);
    setEditName(view.name);
    setEditDesc(view.description || "");
    setIsEditOpen(true);
  }

  function saveEdit() {
    if (!editId) return;

    const existing = state.views.find((v) => v.id === editId);
    if (!existing) {
      // criação: requer draft
      if (!getCurrentDraftView) return;
      const draft = getCurrentDraftView();
      upsertView({
        ...draft,
        id: editId,
        scope,
        name: editName.trim() || "Nova view",
        description: editDesc.trim(),
        isDefault: false,
        isPinned: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      upsertView({
        ...existing,
        name: editName.trim() || existing.name,
        description: editDesc.trim(),
        updatedAt: new Date().toISOString(),
      });
    }

    setIsEditOpen(false);
    refresh();
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function handleExportAll() {
    const json = exportViewsJson();
    await copyToClipboard(json);
  }

  async function handleExportOne(view: SavedView) {
    const json = JSON.stringify(view, null, 2);
    await copyToClipboard(json);
  }

  function handleImport() {
    try {
      importViewsJson(importText);
      setImportText("");
      setIsImportOpen(false);
      refresh();
    } catch (e: any) {
      alert(e?.message ?? "Falha ao importar JSON.");
    }
  }

  function handleResetDefaults() {
    resetViewsToDefault();
    onChangeActive("v_overdue");
    refresh();
  }

  // toolbar compacta
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {views.map((v) => {
          const isActive = v.id === activeViewId;
          return (
            <Button
              key={v.id}
              variant={isActive ? "default" : "secondary"}
              size="sm"
              onClick={() => handleSelect(v.id)}
              className="gap-2"
              title={v.description || v.name}
            >
              <span className="truncate max-w-[180px]">{v.name}</span>

              {/* Badge contextual */}
              {v.isDefault ? (
                <Badge variant={isActive ? "secondary" : "outline"}>Default</Badge>
              ) : (
                <Badge variant={isActive ? "secondary" : "outline"}>Custom</Badge>
              )}
              {v.isPinned ? <Badge variant={isActive ? "secondary" : "outline"}>📌</Badge> : null}
            </Button>
          );
        })}

        <div className="flex-1" />

        {/* Ações */}
        {getCurrentDraftView ? (
          <Button variant="outline" size="sm" onClick={openCreateFromDraft}>
            Salvar view atual
          </Button>
        ) : null}

        <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
          Importar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await handleExportAll();
            setIsExportOpen(true);
          }}
        >
          Exportar
        </Button>
        <Button variant="destructive" size="sm" onClick={handleResetDefaults}>
          Resetar padrões
        </Button>
      </div>

      {/* Painel de ações da view ativa */}
      {activeView ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <div className="text-sm opacity-80">
            Ativa: <span className="font-medium">{activeView.name}</span>
            {activeView.description ? (
              <span className="opacity-70"> — {activeView.description}</span>
            ) : null}
          </div>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={() => openEdit(activeView)}>
            {activeView.isDefault ? "Clonar" : "Editar"}
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleTogglePin(activeView)}>
            {activeView.isPinned ? "Desafixar" : "Fixar"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await handleExportOne(activeView);
              alert("JSON da view copiado!");
            }}
          >
            Copiar JSON da view
          </Button>

          {!activeView.isDefault ? (
            <Button variant="destructive" size="sm" onClick={() => handleDelete(activeView)}>
              Apagar
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Export feedback */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportação</DialogTitle>
          </DialogHeader>
          <p className="text-sm opacity-80">
            As views foram copiadas para a área de transferência. Cole onde quiser (backup ou em
            outro PC).
          </p>
          <DialogFooter>
            <Button onClick={() => setIsExportOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar views</DialogTitle>
          </DialogHeader>
          <p className="text-sm opacity-80">
            Cole aqui o JSON exportado (estado inteiro) para adicionar views custom.
          </p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Cole o JSON aqui..."
            className="min-h-[220px]"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsImportOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog (nome/descrição) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {state.views.some((v) => v.id === editId) ? "Editar view" : "Salvar nova view"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm opacity-80">Nome</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label className="text-sm opacity-80">Descrição (opcional)</label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
