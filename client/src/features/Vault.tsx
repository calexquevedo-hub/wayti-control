import { useEffect, useMemo, useState } from "react";
import { KeyRound, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExternalParty, VaultItem, VaultItemDetail } from "@/types";
import {
  createVaultItem,
  deleteVaultItem,
  fetchVaultItem,
  fetchVaultItems,
  reauthVault,
  revealVaultSecret,
  updateVaultItem,
} from "@/lib/api";

interface VaultProps {
  token?: string;
  externalParties: ExternalParty[];
}

type ReauthAction = { type: "VIEW" | "COPY"; id: string } | null;

export function Vault({ token, externalParties }: VaultProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [externalFilter, setExternalFilter] = useState("all");
  const [active, setActive] = useState<VaultItemDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretValue, setSecretValue] = useState("");
  const [secretTimer, setSecretTimer] = useState<number | null>(null);
  const [lastAuthAt, setLastAuthAt] = useState<number | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthAction, setReauthAction] = useState<ReauthAction>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    id: "",
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tags: "",
    externalOwnerId: "",
    rotationPeriodDays: "",
  });

  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.username.toLowerCase().includes(search.toLowerCase()) ||
        (item.url ?? "").toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      const matchTag = tagFilter === "all" || item.tags.includes(tagFilter);
      const matchExternal =
        externalFilter === "all" || item.externalOwnerId === externalFilter;
      return matchSearch && matchTag && matchExternal;
    });
  }, [items, search, tagFilter, externalFilter]);

  const rotationStatus = (item: VaultItem) => {
    if (!item.rotationPeriodDays || !item.lastRotatedAt) return null;
    const due = new Date(item.lastRotatedAt.getTime() + item.rotationPeriodDays * 24 * 60 * 60 * 1000);
    if (Date.now() > due.getTime()) return "Rotação vencida";
    return null;
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchVaultItems(token)
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!secretVisible) return;
    if (secretTimer) window.clearTimeout(secretTimer);
    const timer = window.setTimeout(() => {
      setSecretVisible(false);
      setSecretValue("");
    }, 15000);
    setSecretTimer(timer);
    return () => window.clearTimeout(timer);
  }, [secretVisible]);

  function refresh() {
    if (!token) return;
    fetchVaultItems(token)
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }

  function openCreate() {
    setEditMode("create");
    setDraft({
      id: "",
      title: "",
      username: "",
      password: "",
      url: "",
      notes: "",
      tags: "",
      externalOwnerId: "",
      rotationPeriodDays: "",
    });
    setEditOpen(true);
  }

  function openEdit(item: VaultItemDetail) {
    setEditMode("edit");
    setDraft({
      id: item.id,
      title: item.title,
      username: item.username,
      password: "",
      url: item.url ?? "",
      notes: item.notes ?? "",
      tags: item.tags.join(", "),
      externalOwnerId: item.externalOwnerId ?? "",
      rotationPeriodDays: item.rotationPeriodDays ? String(item.rotationPeriodDays) : "",
    });
    setEditOpen(true);
  }

  async function openDetail(item: VaultItem) {
    if (!token) return;
    const detail = await fetchVaultItem(token, item.id);
    setActive(detail);
    setSecretVisible(false);
    setSecretValue("");
    setDetailOpen(true);
  }

  function needsReauth() {
    if (!lastAuthAt) return true;
    return Date.now() - lastAuthAt > 5 * 60 * 1000;
  }

  async function handleReveal(action: "VIEW" | "COPY", id: string) {
    if (!token) return;
    if (needsReauth()) {
      setReauthAction({ type: action, id });
      setReauthOpen(true);
      return;
    }
    const data = await revealVaultSecret(token, id, action === "COPY" ? "COPY_SECRET" : "VIEW_SECRET");
    if (action === "COPY") {
      await navigator.clipboard.writeText(data.password);
      setStatus("Senha copiada com sucesso.");
    } else {
      setSecretValue(data.password);
      setSecretVisible(true);
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="bg-card/70">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Cofre de Senhas
            </CardTitle>
            <CardDescription>Credenciais críticas protegidas com criptografia.</CardDescription>
          </div>
          <Button onClick={openCreate}>Novo registro</Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, login, URL ou tag"
                className="border-0 px-0 focus-visible:ring-0"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
            >
              <option value="all">Todas as tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={externalFilter}
              onChange={(event) => setExternalFilter(event.target.value)}
            >
              <option value="all">Todos os responsáveis</option>
              {externalParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? <p>Carregando...</p> : null}
          {!loading && filtered.length === 0 ? <p>Nenhum registro encontrado.</p> : null}

          <div className="grid gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.username}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {item.url ? <p>{item.url}</p> : null}
                  {item.rotationPeriodDays ? (
                    <p>Rotação: {item.rotationPeriodDays} dias</p>
                  ) : null}
                  {rotationStatus(item) ? (
                    <p className="text-amber-300">{rotationStatus(item)}</p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDetail(item)}>
                    Detalhes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReveal("COPY", item.id)}
                  >
                    Copiar senha
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do registro</DialogTitle>
          </DialogHeader>
          {active ? (
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Título</p>
                <p className="text-base font-semibold text-foreground">{active.title}</p>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Login</p>
                  <p>{active.username}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={async () => {
                      await navigator.clipboard.writeText(active.username);
                      setStatus("Login copiado com sucesso.");
                    }}
                  >
                    Copiar login
                  </Button>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">URL</p>
                  <p>{active.url ?? "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Notas</p>
                <p>{active.notes ?? "-"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {active.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="rounded-md border border-border/60 bg-background/40 p-3">
                <p className="text-xs uppercase text-muted-foreground">Senha</p>
                <p className="text-base font-semibold text-foreground">
                  {secretVisible ? secretValue : "••••••••"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReveal("VIEW", active.id)}>
                    Revelar por 15s
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReveal("COPY", active.id)}>
                    Copiar senha
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex flex-wrap justify-between gap-2">
            <Button
              variant="destructive"
              onClick={async () => {
                if (!token || !active) return;
                await deleteVaultItem(token, active.id);
                setDetailOpen(false);
                setStatus("Registro removido.");
                refresh();
              }}
            >
              Excluir
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!active) return;
                  openEdit(active);
                }}
              >
                Editar
              </Button>
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode === "create" ? "Novo registro" : "Editar registro"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <label>Título *</label>
              <Input
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <label>Login *</label>
              <Input
                value={draft.username}
                onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <label>Senha {editMode === "edit" ? "(opcional)" : "*"}</label>
              <Input
                type="password"
                value={draft.password}
                onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <label>URL</label>
              <Input
                value={draft.url}
                onChange={(event) => setDraft((prev) => ({ ...prev, url: event.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <label>Notas</label>
              <Textarea
                value={draft.notes}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <label>Tags (separadas por vírgula)</label>
              <Input
                value={draft.tags}
                onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Responsável externo</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.externalOwnerId}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, externalOwnerId: event.target.value }))
                  }
                >
                  <option value="">Não definido</option>
                  {externalParties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label>Rotação (dias)</label>
                <Input
                  type="number"
                  value={draft.rotationPeriodDays}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, rotationPeriodDays: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!token) return;
                if (!draft.title || !draft.username || (editMode === "create" && !draft.password)) {
                  setStatus("Preencha os campos obrigatórios.");
                  return;
                }
                try {
                  const payload = {
                    title: draft.title,
                    username: draft.username,
                    password: draft.password || undefined,
                    url: draft.url || undefined,
                    notes: draft.notes || "",
                    tags: draft.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                    externalOwnerId: draft.externalOwnerId || undefined,
                    rotationPeriodDays: draft.rotationPeriodDays
                      ? Number(draft.rotationPeriodDays)
                      : undefined,
                  };
                  if (editMode === "create") {
                    await createVaultItem(token, payload);
                  } else {
                    await updateVaultItem(token, draft.id, payload);
                  }
                  setEditOpen(false);
                  setStatus("Registro salvo.");
                  refresh();
                } catch (error: any) {
                  setStatus(error?.message ?? "Falha ao salvar registro.");
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reauthOpen} onOpenChange={setReauthOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reautenticação necessária</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>Digite sua senha para continuar.</p>
            <Input
              type="password"
              value={reauthPassword}
              onChange={(event) => setReauthPassword(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReauthOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!token) return;
                try {
                  await reauthVault(token, reauthPassword);
                  setLastAuthAt(Date.now());
                  setReauthPassword("");
                  setReauthOpen(false);
                  if (reauthAction) {
                    handleReveal(reauthAction.type, reauthAction.id);
                    setReauthAction(null);
                  }
                } catch (error: any) {
                  setStatus(error?.message ?? "Senha inválida.");
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {status ? (
        <p className="text-sm text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}
