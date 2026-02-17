import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Asset, Ticket, User } from "@/types";

interface AssetsProps {
  token?: string;
  assets: Asset[];
  tickets: Ticket[];
  users?: User[];
  onCreate: (payload: Partial<Asset>) => Promise<void>;
  onUpdate: (id: string, payload: Partial<Asset>) => Promise<void>;
}

const statusTone: Record<Asset["status"], "default" | "secondary" | "warning" | "success" | "outline"> = {
  InUse: "default",
  InStock: "secondary",
  Maintenance: "warning",
  Retired: "outline",
  Lost: "warning",
};

export function Assets({ assets, tickets, users = [], onCreate, onUpdate }: AssetsProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Asset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState({
    tag: "",
    name: "",
    serialNumber: "",
    type: "Hardware" as Asset["type"],
    brand: "",
    model: "",
    purchaseDate: "",
    purchaseValue: "",
    warrantyExpiresAt: "",
    status: "InUse" as Asset["status"],
    location: "",
    assignedToId: "",
  });

  const filtered = useMemo(() => {
    return assets.filter((asset) => {
      const matchSearch =
        !search.trim() ||
        `${asset.tag} ${asset.name} ${asset.serialNumber ?? ""} ${asset.assignedTo?.name ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || asset.status === statusFilter;
      const matchType = typeFilter === "all" || asset.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [assets, search, statusFilter, typeFilter]);

  const relatedTickets = useMemo(() => {
    if (!selected) return [];
    return tickets.filter((ticket) => ticket.relatedAssetId === selected.id);
  }, [tickets, selected]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="bg-card/70">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Ativos</CardTitle>
              <CardDescription>Inventário de hardware e licenças.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Novo ativo
            </Button>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="🔍 Buscar por nome, tag ou serial..."
            />
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todas as situações</option>
              {["InUse", "InStock", "Maintenance", "Retired", "Lost"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Todos os tipos</option>
              {["Hardware", "Software", "License", "Peripheral", "Mobile"].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {filtered.length === 0 ? (
            <p>Nenhum ativo encontrado.</p>
          ) : (
            filtered.map((asset) => (
              <div
                key={asset.id}
                className={`rounded-lg border p-4 transition ${
                  selected?.id === asset.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/60 bg-background/40 hover:border-border"
                }`}
                onClick={() => {
                  setSelected(asset);
                  setEditMode(false);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {asset.tag} • {asset.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.brand ?? "-"} {asset.model ?? ""}
                    </p>
                  </div>
                  <Badge variant={statusTone[asset.status]}>{asset.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Tipo: {asset.type}</span>
                  <span>Serial: {asset.serialNumber ?? "-"}</span>
                  <span>Usuário: {asset.assignedTo?.name ?? "Não atribuído"}</span>
                  <span>Local: {asset.location ?? "-"}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardTitle>Detalhe do ativo</CardTitle>
            {selected ? (
              <Button size="sm" variant="outline" onClick={() => setEditMode((prev) => !prev)}>
                {editMode ? "Fechar edição" : "Editar"}
              </Button>
            ) : null}
          </div>
          <CardDescription>
            {selected ? `${selected.tag} • ${selected.name}` : "Selecione um ativo para ver detalhes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {!selected ? null : (
            <Tabs defaultValue="geral">
              <TabsList>
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="chamados">Chamados</TabsTrigger>
              </TabsList>
              <TabsContent value="geral">
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-2 text-xs"
                      value={selected.status}
                      onChange={async (event) => {
                        const status = event.target.value as Asset["status"];
                        await onUpdate(selected.id, { status });
                        setSelected({ ...selected, status });
                      }}
                      disabled={!editMode}
                    >
                      {["InUse", "InStock", "Maintenance", "Retired", "Lost"].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Localização</label>
                    <Input
                      value={selected.location ?? ""}
                      onChange={(event) => setSelected({ ...selected, location: event.target.value })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Usuário atual</label>
                    {editMode ? (
                      <select
                        className="h-9 rounded-md border border-input bg-transparent px-2 text-xs"
                        value={selected.assignedTo?.id ?? ""}
                        onChange={async (event) => {
                          const id = event.target.value || undefined;
                          await onUpdate(selected.id, { assignedToId: id });
                          const name = users.find((user) => user.id === id)?.name;
                          setSelected({
                            ...selected,
                            assignedTo: id ? { id, name: name ?? id, email: "" } : undefined,
                          });
                        }}
                      >
                        <option value="">Não atribuído</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input value={selected.assignedTo?.name ?? "Não atribuído"} disabled />
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="historico">
                <div className="space-y-3">
                  {selected.assignmentHistory?.length ? (
                    selected.assignmentHistory
                      .slice()
                      .reverse()
                      .map((entry, idx) => (
                        <div key={`${entry.at}-${idx}`} className="rounded-md border border-border/60 bg-background/40 p-3">
                          <p className="text-sm font-medium text-foreground">
                            {entry.userName ?? "Sem usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.at.toLocaleString("pt-BR")} • {entry.notes ?? "Movimentação"}
                          </p>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem histórico registrado.</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="chamados">
                <div className="space-y-3">
                  {relatedTickets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum chamado vinculado.</p>
                  ) : (
                    relatedTickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-md border border-border/60 bg-background/40 p-3">
                        <p className="text-sm font-medium text-foreground">
                          {ticket.code} • {ticket.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {ticket.status} • Prioridade: {ticket.priority}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo ativo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <label>Tag *</label>
              <Input value={draft.tag} onChange={(event) => setDraft((prev) => ({ ...prev, tag: event.target.value }))} />
            </div>
            <div className="grid gap-1">
              <label>Nome *</label>
              <Input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Tipo *</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, type: event.target.value as Asset["type"] }))
                  }
                >
                  {["Hardware", "Software", "License", "Peripheral", "Mobile"].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label>Status</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, status: event.target.value as Asset["status"] }))
                  }
                >
                  {["InUse", "InStock", "Maintenance", "Retired", "Lost"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Marca</label>
                <Input value={draft.brand} onChange={(event) => setDraft((prev) => ({ ...prev, brand: event.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Modelo</label>
                <Input value={draft.model} onChange={(event) => setDraft((prev) => ({ ...prev, model: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Número de série</label>
                <Input value={draft.serialNumber} onChange={(event) => setDraft((prev) => ({ ...prev, serialNumber: event.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Localização</label>
                <Input value={draft.location} onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1">
              <label>Usuário atual</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.assignedToId}
                onChange={(event) => setDraft((prev) => ({ ...prev, assignedToId: event.target.value }))}
                disabled={users.length === 0}
              >
                <option value="">Não atribuído</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              {users.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Disponível apenas para administradores.
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-1">
                <label>Compra</label>
                <Input type="date" value={draft.purchaseDate} onChange={(event) => setDraft((prev) => ({ ...prev, purchaseDate: event.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Valor</label>
                <Input type="number" value={draft.purchaseValue} onChange={(event) => setDraft((prev) => ({ ...prev, purchaseValue: event.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Garantia</label>
                <Input type="date" value={draft.warrantyExpiresAt} onChange={(event) => setDraft((prev) => ({ ...prev, warrantyExpiresAt: event.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!draft.tag.trim() || !draft.name.trim()) return;
                await onCreate({
                  tag: draft.tag.trim(),
                  name: draft.name.trim(),
                  serialNumber: draft.serialNumber || undefined,
                  type: draft.type,
                  brand: draft.brand || undefined,
                  model: draft.model || undefined,
                  purchaseDate: draft.purchaseDate ? new Date(draft.purchaseDate) : undefined,
                  purchaseValue: draft.purchaseValue ? Number(draft.purchaseValue) : undefined,
                  warrantyExpiresAt: draft.warrantyExpiresAt ? new Date(draft.warrantyExpiresAt) : undefined,
                  status: draft.status,
                  location: draft.location || undefined,
                  assignedToId: draft.assignedToId || undefined,
                });
                setDraft({
                  tag: "",
                  name: "",
                  serialNumber: "",
                  type: "Hardware",
                  brand: "",
                  model: "",
                  purchaseDate: "",
                  purchaseValue: "",
                  warrantyExpiresAt: "",
                  status: "InUse",
                  location: "",
                  assignedToId: "",
                });
                setCreateOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
