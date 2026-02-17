import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Asset, Contract, ExternalParty } from "@/types";

interface ContractsProps {
  token?: string;
  contracts: Contract[];
  assets: Asset[];
  vendors: ExternalParty[];
  onCreate: (payload: Partial<Contract>) => Promise<void>;
  onUpdate: (id: string, payload: Partial<Contract>) => Promise<void>;
}

const statusTone: Record<Contract["status"], "default" | "secondary" | "warning" | "success" | "outline"> = {
  Active: "success",
  Expired: "warning",
  Draft: "secondary",
  Canceled: "outline",
};

export function Contracts({ contracts, assets, vendors, onCreate, onUpdate }: ContractsProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    vendorId: "",
    status: "Active" as Contract["status"],
    costValue: "",
    currency: "BRL" as Contract["currency"],
    frequency: "Monthly" as Contract["frequency"],
    costCenter: "",
    startDate: "",
    endDate: "",
    noticePeriodDays: "30",
    autoRenew: false,
    relatedAssets: [] as string[],
    contractFileUrl: "",
  });

  const resolveVendorId = (vendor?: Contract["vendorId"]) => {
    if (!vendor) return "";
    return typeof vendor === "string" ? vendor : vendor.id;
  };

  const resolveVendorName = (vendor?: Contract["vendorId"]) => {
    if (!vendor) return "Fornecedor";
    if (typeof vendor === "string") {
      return vendors.find((item) => item.id === vendor)?.name ?? "Fornecedor";
    }
    return vendor.name;
  };

  const resolveAssetIds = (list?: Array<Asset | string>) => {
    if (!list) return [];
    return list.map((asset) => (typeof asset === "string" ? asset : asset.id));
  };

  const monthlyTotal = useMemo(() => {
    return contracts
      .filter((contract) => contract.status === "Active" && contract.frequency === "Monthly")
      .reduce((sum, contract) => sum + (contract.costValue ?? 0), 0);
  }, [contracts]);

  const criticalContracts = useMemo(() => {
    return contracts.filter((contract) => contract.renewalStatus === "Critical");
  }, [contracts]);

  const formatCurrency = (value: number, currency: Contract["currency"]) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/70">
          <CardHeader>
            <CardDescription>Custo Mensal Total (OpEx)</CardDescription>
            <CardTitle>{formatCurrency(monthlyTotal, "BRL")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Contratos ativos com cobrança mensal.
          </CardContent>
        </Card>
        <Card className="bg-card/70 border-destructive/40">
          <CardHeader>
            <CardDescription>Contratos vencendo em 30 dias</CardDescription>
            <CardTitle className="text-destructive">{criticalContracts.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Itens com aviso crítico para renovação.
          </CardContent>
        </Card>
      </section>

      <Card className="bg-card/70">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Contratos e Fornecedores</CardTitle>
            <CardDescription>Controle de custos e prazos.</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Novo contrato</Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {contracts.length === 0 ? (
            <p>Nenhum contrato cadastrado.</p>
          ) : (
            contracts.map((contract) => (
              <div
                key={contract.id}
                className="rounded-lg border border-border/60 bg-background/40 p-4"
                onClick={() => {
                  setSelected(contract);
                  setDraft({
                    title: contract.title,
                    vendorId: resolveVendorId(contract.vendorId),
                    status: contract.status,
                    costValue: String(contract.costValue ?? ""),
                    currency: contract.currency,
                    frequency: contract.frequency,
                    costCenter: contract.costCenter ?? "",
                    startDate: contract.startDate.toISOString().slice(0, 10),
                    endDate: contract.endDate ? contract.endDate.toISOString().slice(0, 10) : "",
                    noticePeriodDays: String(contract.noticePeriodDays ?? 30),
                    autoRenew: contract.autoRenew,
                    relatedAssets: resolveAssetIds(contract.relatedAssets),
                    contractFileUrl: contract.contractFileUrl ?? "",
                  });
                  setEditOpen(true);
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{contract.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {resolveVendorName(contract.vendorId)} • {contract.frequency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contract.renewalStatus === "Critical" ? (
                      <Badge variant="warning">Crítico</Badge>
                    ) : null}
                    <Badge variant={statusTone[contract.status]}>{contract.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>{formatCurrency(contract.costValue, contract.currency)}</span>
                  <span>Vence em: {contract.endDate ? contract.endDate.toLocaleDateString("pt-BR") : "Sem término"}</span>
                  <span>Auto-renovação: {contract.autoRenew ? "Sim" : "Não"}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo contrato</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <label>Título *</label>
              <Input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <label>Fornecedor *</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.vendorId}
                onChange={(event) => setDraft((p) => ({ ...p, vendorId: event.target.value }))}
              >
                <option value="">Selecione</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-1">
                <label>Valor *</label>
                <Input type="number" value={draft.costValue} onChange={(e) => setDraft((p) => ({ ...p, costValue: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Moeda</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.currency}
                  onChange={(event) => setDraft((p) => ({ ...p, currency: event.target.value as Contract["currency"] }))}
                >
                  {["BRL", "USD", "EUR"].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label>Frequência</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.frequency}
                  onChange={(event) => setDraft((p) => ({ ...p, frequency: event.target.value as Contract["frequency"] }))}
                >
                  {["Monthly", "Yearly", "One-time"].map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Início *</label>
                <Input type="date" value={draft.startDate} onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Fim</label>
                <Input type="date" value={draft.endDate} onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-1">
                <label>Centro de custo</label>
                <Input value={draft.costCenter} onChange={(e) => setDraft((p) => ({ ...p, costCenter: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Aviso (dias)</label>
                <Input type="number" value={draft.noticePeriodDays} onChange={(e) => setDraft((p) => ({ ...p, noticePeriodDays: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Status</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.status}
                  onChange={(event) => setDraft((p) => ({ ...p, status: event.target.value as Contract["status"] }))}
                >
                  {["Active", "Expired", "Draft", "Canceled"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-1">
              <label>Auto-renovação</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.autoRenew ? "true" : "false"}
                onChange={(event) => setDraft((p) => ({ ...p, autoRenew: event.target.value === "true" }))}
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label>Vincular ativos</label>
              <select
                multiple
                className="min-h-[120px] rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.relatedAssets}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                  setDraft((p) => ({ ...p, relatedAssets: values }));
                }}
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.tag} • {asset.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label>Arquivo do contrato (URL)</label>
              <Input value={draft.contractFileUrl} onChange={(e) => setDraft((p) => ({ ...p, contractFileUrl: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                await onCreate({
                  title: draft.title,
                  vendorId: draft.vendorId,
                  status: draft.status,
                  costValue: Number(draft.costValue),
                  currency: draft.currency,
                  frequency: draft.frequency,
                  costCenter: draft.costCenter || undefined,
                  startDate: new Date(draft.startDate),
                  endDate: draft.endDate ? new Date(draft.endDate) : null,
                  noticePeriodDays: Number(draft.noticePeriodDays),
                  autoRenew: draft.autoRenew,
                  relatedAssets: draft.relatedAssets,
                  contractFileUrl: draft.contractFileUrl || undefined,
                });
                setCreateOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar contrato</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <label>Título *</label>
              <Input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <label>Fornecedor *</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.vendorId}
                onChange={(event) => setDraft((p) => ({ ...p, vendorId: event.target.value }))}
              >
                <option value="">Selecione</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-1">
                <label>Valor *</label>
                <Input type="number" value={draft.costValue} onChange={(e) => setDraft((p) => ({ ...p, costValue: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Moeda</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.currency}
                  onChange={(event) => setDraft((p) => ({ ...p, currency: event.target.value as Contract["currency"] }))}
                >
                  {["BRL", "USD", "EUR"].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label>Frequência</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.frequency}
                  onChange={(event) => setDraft((p) => ({ ...p, frequency: event.target.value as Contract["frequency"] }))}
                >
                  {["Monthly", "Yearly", "One-time"].map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-1">
                <label>Início *</label>
                <Input type="date" value={draft.startDate} onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Fim</label>
                <Input type="date" value={draft.endDate} onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-1">
                <label>Centro de custo</label>
                <Input value={draft.costCenter} onChange={(e) => setDraft((p) => ({ ...p, costCenter: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Aviso (dias)</label>
                <Input type="number" value={draft.noticePeriodDays} onChange={(e) => setDraft((p) => ({ ...p, noticePeriodDays: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <label>Status</label>
                <select
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.status}
                  onChange={(event) => setDraft((p) => ({ ...p, status: event.target.value as Contract["status"] }))}
                >
                  {["Active", "Expired", "Draft", "Canceled"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-1">
              <label>Auto-renovação</label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.autoRenew ? "true" : "false"}
                onChange={(event) => setDraft((p) => ({ ...p, autoRenew: event.target.value === "true" }))}
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label>Vincular ativos</label>
              <select
                multiple
                className="min-h-[120px] rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.relatedAssets}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                  setDraft((p) => ({ ...p, relatedAssets: values }));
                }}
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.tag} • {asset.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label>Arquivo do contrato (URL)</label>
              <Input value={draft.contractFileUrl} onChange={(e) => setDraft((p) => ({ ...p, contractFileUrl: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!selected) return;
                await onUpdate(selected.id, {
                  title: draft.title,
                  vendorId: draft.vendorId,
                  status: draft.status,
                  costValue: Number(draft.costValue),
                  currency: draft.currency,
                  frequency: draft.frequency,
                  costCenter: draft.costCenter || undefined,
                  startDate: new Date(draft.startDate),
                  endDate: draft.endDate ? new Date(draft.endDate) : null,
                  noticePeriodDays: Number(draft.noticePeriodDays),
                  autoRenew: draft.autoRenew,
                  relatedAssets: draft.relatedAssets,
                  contractFileUrl: draft.contractFileUrl || undefined,
                });
                setEditOpen(false);
              }}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
