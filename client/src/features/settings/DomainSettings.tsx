import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDomainItem, deleteDomainItem, fetchDomainItems, updateDomainItem } from "@/lib/api";
import type { DomainItem, DomainType } from "@/types";

interface DomainSettingsProps {
  token?: string;
}

const COLORS = [
  "#2563EB",
  "#16A34A",
  "#EA580C",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
] as const;

export function DomainSettings({ token }: DomainSettingsProps) {
  const [activeType, setActiveType] = useState<DomainType>("CATEGORY");
  const [categories, setCategories] = useState<DomainItem[]>([]);
  const [epics, setEpics] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [colorDraft, setColorDraft] = useState<string>(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameDraft, setEditNameDraft] = useState("");
  const [editColorDraft, setEditColorDraft] = useState<string>(COLORS[0]);

  const currentItems = useMemo(
    () => (activeType === "CATEGORY" ? categories : epics),
    [activeType, categories, epics]
  );

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [categoryItems, epicItems] = await Promise.all([
        fetchDomainItems(token, "CATEGORY", { includeInactive: true }),
        fetchDomainItems(token, "EPIC", { includeInactive: true }),
      ]);
      setCategories(categoryItems);
      setEpics(epicItems);
      setStatus(null);
    } catch (error: any) {
      setStatus(error?.message ?? "Falha ao carregar domínios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const addItem = async () => {
    if (!token) return;
    if (!nameDraft.trim()) {
      setStatus("Informe um nome.");
      return;
    }
    try {
      const created = await createDomainItem(token, {
        type: activeType,
        label: nameDraft.trim(),
        color: colorDraft,
      });
      if (activeType === "CATEGORY") {
        setCategories((prev) => [...prev, created].sort((a, b) => a.label.localeCompare(b.label)));
      } else {
        setEpics((prev) => [...prev, created].sort((a, b) => a.label.localeCompare(b.label)));
      }
      setNameDraft("");
      setStatus("Item adicionado.");
    } catch (error: any) {
      setStatus(error?.message ?? "Falha ao adicionar item.");
    }
  };

  const removeItem = async (id: string) => {
    if (!token) return;
    try {
      await deleteDomainItem(token, id);
      if (activeType === "CATEGORY") {
        setCategories((prev) => prev.filter((item) => item.id !== id));
      } else {
        setEpics((prev) => prev.filter((item) => item.id !== id));
      }
      setStatus("Item removido.");
    } catch (error: any) {
      setStatus(error?.message ?? "Falha ao remover item.");
    }
  };

  const startEdit = (item: DomainItem) => {
    setEditingId(item.id);
    setEditNameDraft(item.label);
    setEditColorDraft(item.color || COLORS[0]);
    setStatus(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNameDraft("");
    setEditColorDraft(COLORS[0]);
  };

  const saveEdit = async () => {
    if (!token || !editingId) return;
    if (!editNameDraft.trim()) {
      setStatus("Informe um nome.");
      return;
    }
    try {
      const updated = await updateDomainItem(token, editingId, {
        label: editNameDraft.trim(),
        color: editColorDraft,
      });
      if (activeType === "CATEGORY") {
        setCategories((prev) =>
          prev
            .map((item) => (item.id === editingId ? updated : item))
            .sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label))
        );
      } else {
        setEpics((prev) =>
          prev
            .map((item) => (item.id === editingId ? updated : item))
            .sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label))
        );
      }
      cancelEdit();
      setStatus("Item atualizado.");
    } catch (error: any) {
      setStatus(error?.message ?? "Falha ao atualizar item.");
    }
  };

  return (
    <Card className="bg-card/70 lg:col-span-12">
      <CardHeader>
        <CardTitle>Configurações de Domínio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={activeType}
          onValueChange={(value) => {
            setActiveType(value as DomainType);
            setStatus(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="CATEGORY">Categorias</TabsTrigger>
            <TabsTrigger value="EPIC">Épicos</TabsTrigger>
          </TabsList>
          <TabsContent value="CATEGORY" />
          <TabsContent value="EPIC" />
        </Tabs>

        <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            placeholder={activeType === "CATEGORY" ? "Nova categoria" : "Novo épico"}
          />
          <Select value={colorDraft} onValueChange={setColorDraft}>
            <SelectTrigger>
              <SelectValue placeholder="Cor" />
            </SelectTrigger>
            <SelectContent>
              {COLORS.map((hex) => (
                <SelectItem key={hex} value={hex}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: hex }} />
                    {hex}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : currentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          ) : (
            currentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.label}</Badge>
                  <span className="text-xs text-muted-foreground">{item.value}</span>
                  {!item.active ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Inativo
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {item.color ? (
                    <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.color }} />
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                    Editar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {editingId ? (
          <div className="rounded-md border border-border/60 bg-background/50 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Editando item</p>
            <div className="grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
              <Input value={editNameDraft} onChange={(event) => setEditNameDraft(event.target.value)} />
              <Select value={editColorDraft} onValueChange={setEditColorDraft}>
                <SelectTrigger>
                  <SelectValue placeholder="Cor" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((hex) => (
                    <SelectItem key={hex} value={hex}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: hex }} />
                        {hex}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={saveEdit}>
                <Check className="mr-2 h-4 w-4" />
                Salvar
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
