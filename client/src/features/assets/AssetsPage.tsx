import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Laptop, Monitor, Plus, Search, Server, Smartphone } from "lucide-react";

import {
  getAssets,
  type InventoryAsset,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AssetModal } from "./AssetModal";

interface AssetsPageProps {
  token?: string;
}

const statusTone: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "In Use": "bg-blue-100 text-blue-700 border-blue-200",
  Maintenance: "bg-orange-100 text-orange-700 border-orange-200",
  Lost: "bg-red-100 text-red-700 border-red-200",
  Retired: "bg-slate-100 text-slate-700 border-slate-200",
};

const typeIcon: Record<string, ReactNode> = {
  Computer: <Laptop className="h-4 w-4 text-slate-500" />,
  Mobile: <Smartphone className="h-4 w-4 text-slate-500" />,
  Peripheral: <Monitor className="h-4 w-4 text-slate-500" />,
  Infrastructure: <Server className="h-4 w-4 text-slate-500" />,
};

function getId(asset: InventoryAsset) {
  return asset.id ?? asset._id ?? "";
}

function getUserName(asset: InventoryAsset) {
  return asset.currentAssignment?.user?.name ?? asset.currentAssignment?.snapshot?.name ?? "";
}

export function AssetsPage({ token }: AssetsPageProps) {
  const [assets, setAssets] = useState<InventoryAsset[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<InventoryAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAssets(token, search, statusFilter, typeFilter);
      setAssets(data);
    } catch (error) {
      console.error(error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, typeFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const visibleAssets = useMemo(() => assets, [assets]);

  const openNew = () => {
    setSelectedAsset(null);
    setIsModalOpen(true);
  };

  const openEdit = (asset: InventoryAsset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50 p-6 dark:bg-slate-900/50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventário de TI</h1>
          <p className="text-sm text-slate-500">Gestão de hardware, licenças e custódia.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Ativo
        </Button>
      </div>

      <div className="mb-6 flex gap-3 rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-950">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por tag, serial ou modelo..."
            className="bg-slate-50 pl-9 dark:bg-slate-900"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-slate-50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Todos os Status</SelectItem>
            <SelectItem value="Available">Disponível</SelectItem>
            <SelectItem value="In Use">Em Uso</SelectItem>
            <SelectItem value="Maintenance">Manutenção</SelectItem>
            <SelectItem value="Lost">Perdido</SelectItem>
            <SelectItem value="Retired">Baixado (Descarte)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] bg-slate-50">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Todos os Tipos</SelectItem>
            <SelectItem value="Computer">Computador</SelectItem>
            <SelectItem value="Mobile">Mobile</SelectItem>
            <SelectItem value="Peripheral">Periférico</SelectItem>
            <SelectItem value="Infrastructure">Infraestrutura</SelectItem>
            <SelectItem value="Software">Software</SelectItem>
            <SelectItem value="Furniture">Mobiliário</SelectItem>
            <SelectItem value="Other">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border bg-white shadow-sm dark:bg-slate-950">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-900/80">
            <tr>
              <th className="w-[120px] p-3 text-left text-xs font-semibold text-slate-500">Patrimônio</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-500">Equipamento</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-500">Status</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-500">Custódia (Em posse de)</th>
              <th className="p-3 text-right text-xs font-semibold text-slate-500">Fim Garantia</th>
            </tr>
          </thead>
          <tbody>
            {!loading && visibleAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  Nenhum ativo encontrado.
                </td>
              </tr>
            ) : null}

            {visibleAssets.map((asset) => {
              const id = getId(asset);
              const userName = getUserName(asset);
              return (
                <tr
                  key={id}
                  className="cursor-pointer border-t hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  onClick={() => openEdit(asset)}
                >
                  <td className="p-3 font-mono text-xs font-semibold text-slate-600">
                    {asset.assetTag || "S/ TAG"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {typeIcon[asset.type] || <Laptop className="h-4 w-4 text-slate-500" />}
                      <div>
                        <div className="text-sm font-semibold">{asset.name}</div>
                        <div className="text-xs text-slate-500">
                          {asset.manufacturer || ""} {asset.modelName || ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={statusTone[asset.status] || "bg-slate-100 text-slate-700 border-slate-200"}
                    >
                      {asset.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {asset.status === "In Use" && userName ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                          {userName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{userName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right text-sm text-slate-600">
                    {asset.warrantyEnd ? new Date(asset.warrantyEnd).toLocaleDateString("pt-BR") : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        token={token || ""}
        asset={selectedAsset}
        onSaved={() => {
          void fetchList();
        }}
      />
    </div>
  );
}
