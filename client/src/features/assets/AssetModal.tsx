import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Download, History, Laptop, Trash2, UserCheck } from "lucide-react";

import {
  checkinAsset,
  checkoutAsset,
  createAsset,
  downloadAssetTerm,
  fetchUsers,
  getAssetHistory,
  retireAsset,
  updateAsset,
  type InventoryAsset,
  type InventoryAssignment,
} from "@/lib/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  asset: InventoryAsset | null;
  onSaved: () => void;
}

interface AssetUser {
  id: string;
  name: string;
  email?: string;
}

interface AssetFormData {
  name: string;
  assetTag: string;
  serialNumber: string;
  type: InventoryAsset["type"];
  manufacturer: string;
  modelName: string;
  warrantyEnd: string;
  condition: NonNullable<InventoryAsset["condition"]>;
  notes: string;
}

interface CheckoutData {
  userId: string;
  name: string;
  cpf: string;
  condition: string;
  expectedReturnDate: string;
  notes: string;
}

interface CheckinData {
  returnCondition: string;
  notes: string;
}

interface RetireData {
  reason: string;
}

function getAssetId(asset: InventoryAsset | null) {
  if (!asset) return "";
  return asset.id ?? asset._id ?? "";
}

function initFormData(asset: InventoryAsset | null): AssetFormData {
  if (!asset) {
    return {
      name: "",
      assetTag: "",
      serialNumber: "",
      type: "Computer",
      manufacturer: "",
      modelName: "",
      warrantyEnd: "",
      condition: "New",
      notes: "",
    };
  }

  return {
    name: asset.name || "",
    assetTag: asset.assetTag || "",
    serialNumber: asset.serialNumber || "",
    type: asset.type || "Computer",
    manufacturer: asset.manufacturer || "",
    modelName: asset.modelName || "",
    warrantyEnd: asset.warrantyEnd ? String(asset.warrantyEnd).slice(0, 10) : "",
    condition: asset.condition || "Good",
    notes: asset.notes || "",
  };
}

export function AssetModal({ isOpen, onClose, token, asset, onSaved }: AssetModalProps) {
  const isEdit = Boolean(getAssetId(asset));
  const [users, setUsers] = useState<AssetUser[]>([]);
  const [history, setHistory] = useState<InventoryAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"details" | "checkout" | "checkin" | "retire">("details");

  const [formData, setFormData] = useState<AssetFormData>(() => initFormData(null));
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    userId: "",
    name: "",
    cpf: "",
    condition: "",
    expectedReturnDate: "",
    notes: "",
  });
  const [checkinData, setCheckinData] = useState<CheckinData>({ returnCondition: "", notes: "" });
  const [retireData, setRetireData] = useState<RetireData>({ reason: "" });

  const assetId = useMemo(() => getAssetId(asset), [asset]);

  useEffect(() => {
    if (!isOpen || !token) return;

    void fetchUsers(token)
      .then((data) => {
        const mapped = data.map((item) => ({
          id: item.id,
          name: item.name,
          email: item.email,
        }));
        setUsers(mapped);
      })
      .catch(() => setUsers([]));

    setSidebarMode("details");
    setFormData(initFormData(asset));
    setCheckoutData({
      userId: "",
      name: "",
      cpf: "",
      condition: asset?.condition || "Good",
      expectedReturnDate: "",
      notes: "",
    });
    setCheckinData({ returnCondition: asset?.condition || "Good", notes: "" });
    setRetireData({ reason: "" });

    if (!assetId) {
      setHistory([]);
      return;
    }

    void getAssetHistory(token, assetId)
      .then((data) => setHistory(data))
      .catch(() => setHistory([]));
  }, [asset, assetId, isOpen, token]);

  const assetStatus = asset?.status || "Available";

  async function handleSaveAsset() {
    if (!token) return;
    setSaving(true);
    try {
      if (isEdit && assetId) {
        await updateAsset(token, assetId, {
          name: formData.name,
          assetTag: formData.assetTag,
          serialNumber: formData.serialNumber,
          type: formData.type,
          manufacturer: formData.manufacturer,
          modelName: formData.modelName,
          warrantyEnd: formData.warrantyEnd || undefined,
          condition: formData.condition,
          notes: formData.notes,
        } as any);
      } else {
        await createAsset(token, {
          name: formData.name,
          assetTag: formData.assetTag,
          serialNumber: formData.serialNumber,
          type: formData.type,
          manufacturer: formData.manufacturer,
          modelName: formData.modelName,
          warrantyEnd: formData.warrantyEnd || undefined,
          condition: formData.condition,
          notes: formData.notes,
          status: "Available",
        } as any);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar ativo");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction() {
    if (!token || !assetId) return;
    setSaving(true);
    try {
      if (sidebarMode === "checkout") {
        await checkoutAsset(token, {
          assetId,
          userId: checkoutData.userId,
          name: checkoutData.name,
          cpf: checkoutData.cpf,
          condition: checkoutData.condition || formData.condition,
          expectedReturnDate: checkoutData.expectedReturnDate || undefined,
          notes: checkoutData.notes || undefined,
        });
      }

      if (sidebarMode === "checkin") {
        await checkinAsset(token, {
          assetId,
          returnCondition: checkinData.returnCondition || "Good",
          notes: checkinData.notes || undefined,
        });
      }

      if (sidebarMode === "retire") {
        await retireAsset(token, {
          assetId,
          reason: retireData.reason,
        });
      }

      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro na operação";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="flex h-[85vh] max-w-6xl flex-col overflow-hidden bg-slate-50 p-0 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b bg-white px-6 py-4 dark:bg-slate-950">
          <DialogTitle className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-slate-500" />
            {isEdit ? formData.name : "Novo Ativo"}
            {isEdit ? <Badge variant="secondary">{assetStatus}</Badge> : null}
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            {sidebarMode === "details" ? (
              <Button size="sm" onClick={() => void handleSaveAsset()} disabled={saving}>
                Salvar Ficha
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-12 overflow-hidden">
          <div className="col-span-8 h-full overflow-y-auto border-r bg-white p-6 dark:bg-slate-950">
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Nome/Descrição *</label>
                  <Input
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Tipo *</label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: AssetFormData["type"]) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Patrimônio (Tag)</label>
                  <Input
                    className="font-mono"
                    value={formData.assetTag}
                    onChange={(event) => setFormData((prev) => ({ ...prev, assetTag: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Número de Série</label>
                  <Input
                    className="font-mono"
                    value={formData.serialNumber}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, serialNumber: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Fabricante</label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, manufacturer: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Modelo</label>
                  <Input
                    value={formData.modelName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, modelName: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Fim da Garantia</label>
                  <Input
                    type="date"
                    value={formData.warrantyEnd}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, warrantyEnd: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Condição Física</label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value: AssetFormData["condition"]) =>
                      setFormData((prev) => ({ ...prev, condition: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">Novo</SelectItem>
                      <SelectItem value="Good">Bom</SelectItem>
                      <SelectItem value="Fair">Razoável</SelectItem>
                      <SelectItem value="Poor">Ruim</SelectItem>
                      <SelectItem value="Broken">Quebrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Observações</label>
                <Textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="col-span-4 h-full overflow-y-auto border-l bg-slate-50/50 p-6 dark:bg-slate-900/50">
            {!isEdit ? (
              <div className="mt-10 text-center text-sm text-slate-400">Salve o ativo para habilitar a custódia.</div>
            ) : (
              <div className="space-y-6">
                {sidebarMode === "details" ? (
                  <div className="space-y-2">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Ações de Custódia</h3>
                    {assetStatus === "Available" ? (
                      <>
                        <Button
                          className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => setSidebarMode("checkout")}
                        >
                          <UserCheck className="mr-2 h-4 w-4" /> Entregar (Checkout)
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-red-600 hover:bg-red-50"
                          onClick={() => setSidebarMode("retire")}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Dar Baixa (Descartar)
                        </Button>
                      </>
                    ) : null}

                    {assetStatus === "In Use" ? (
                      <Button
                        className="w-full justify-start bg-orange-500 text-white hover:bg-orange-600"
                        onClick={() => setSidebarMode("checkin")}
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Devolver (Check-in)
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {sidebarMode === "checkout" ? (
                  <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-950">
                    <h4 className="flex items-center gap-2 font-semibold text-blue-700">
                      <UserCheck className="h-4 w-4" /> Termo de Entrega
                    </h4>
                    <div>
                      <label className="text-xs text-slate-500">Usuário do Sistema</label>
                      <Select
                        value={checkoutData.userId || undefined}
                        onValueChange={(value) => {
                          const selectedUser = users.find((item) => item.id === value);
                          setCheckoutData((prev) => ({
                            ...prev,
                            userId: value,
                            name: selectedUser?.name || "",
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">CPF do Responsável *</label>
                      <Input
                        placeholder="000.000.000-00"
                        value={checkoutData.cpf}
                        onChange={(event) =>
                          setCheckoutData((prev) => ({ ...prev, cpf: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Condição de Entrega</label>
                      <Input
                        value={checkoutData.condition}
                        onChange={(event) =>
                          setCheckoutData((prev) => ({ ...prev, condition: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Devolução prevista</label>
                      <Input
                        type="date"
                        value={checkoutData.expectedReturnDate}
                        onChange={(event) =>
                          setCheckoutData((prev) => ({ ...prev, expectedReturnDate: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Notas</label>
                      <Textarea
                        rows={3}
                        value={checkoutData.notes}
                        onChange={(event) =>
                          setCheckoutData((prev) => ({ ...prev, notes: event.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSidebarMode("details")}
                      >
                        Voltar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => void handleAction()}
                        disabled={saving}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                ) : null}

                {sidebarMode === "checkin" ? (
                  <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-950">
                    <h4 className="flex items-center gap-2 font-semibold text-orange-600">
                      <ArrowRightLeft className="h-4 w-4" /> Devolução
                    </h4>
                    <p className="text-xs text-slate-500">
                      Recebendo de: <b>{asset?.currentAssignment?.user?.name || asset?.currentAssignment?.snapshot?.name}</b>
                    </p>
                    <div>
                      <label className="text-xs text-slate-500">Condição na Devolução *</label>
                      <Select
                        value={checkinData.returnCondition || undefined}
                        onValueChange={(value) =>
                          setCheckinData((prev) => ({ ...prev, returnCondition: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Como o item voltou?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Bom (Inteiro)</SelectItem>
                          <SelectItem value="Fair">Razoável (Marcas de uso)</SelectItem>
                          <SelectItem value="Broken">Quebrado/Danificado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Avarias / Notas</label>
                      <Textarea
                        placeholder="Descreva danos se houver..."
                        value={checkinData.notes}
                        onChange={(event) =>
                          setCheckinData((prev) => ({ ...prev, notes: event.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSidebarMode("details")}
                      >
                        Voltar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                        onClick={() => void handleAction()}
                        disabled={saving}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                ) : null}

                {sidebarMode === "retire" ? (
                  <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-950">
                    <h4 className="flex items-center gap-2 font-semibold text-red-700">
                      <Trash2 className="h-4 w-4" /> Baixa de Ativo
                    </h4>
                    <p className="text-xs text-slate-500">Informe o motivo para descarte.</p>
                    <Textarea
                      rows={4}
                      placeholder="Ex: obsolescência, dano irreparável..."
                      value={retireData.reason}
                      onChange={(event) => setRetireData({ reason: event.target.value })}
                    />
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSidebarMode("details")}
                      >
                        Voltar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => void handleAction()}
                        disabled={saving}
                      >
                        Confirmar Baixa
                      </Button>
                    </div>
                  </div>
                ) : null}

                {sidebarMode === "details" && history.length > 0 ? (
                  <div className="mt-6 border-t pt-4">
                    <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <History className="h-4 w-4" /> Histórico (Termos)
                    </h3>
                    <div className="space-y-4">
                      {history.map((entry) => {
                        const key = entry.id || entry._id || `${entry.snapshot?.cpf}-${entry.checkoutDate}`;
                        return (
                          <div key={key} className="border-l-2 border-slate-200 py-1 pl-3 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                  {entry.snapshot?.name || "Sem nome"}{" "}
                                  <span className="text-xs font-normal text-slate-400">({entry.snapshot?.cpf || "-"})</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                  Retirou:{" "}
                                  {entry.checkoutDate
                                    ? new Date(entry.checkoutDate).toLocaleDateString("pt-BR")
                                    : "-"}
                                </p>
                                {entry.checkinDate ? (
                                  <p className="text-xs text-emerald-600">
                                    Devolveu: {new Date(entry.checkinDate).toLocaleDateString("pt-BR")}
                                  </p>
                                ) : (
                                  <p className="text-xs font-semibold text-blue-600">Em posse atual</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Baixar termo em PDF"
                                onClick={async () => {
                                  if (!token) return;
                                  const assignmentId = entry.id || entry._id;
                                  if (!assignmentId) return;
                                  try {
                                    await downloadAssetTerm(token, assignmentId);
                                  } catch (error) {
                                    const message =
                                      error instanceof Error ? error.message : "Erro ao baixar termo";
                                    alert(message);
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
