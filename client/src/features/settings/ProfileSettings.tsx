import { useEffect, useState } from "react";
import { Plus, Shield, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Profile, ProfilePermissions } from "@/types";
import { createProfile, deleteProfile, fetchProfiles, updateProfile } from "@/lib/api";

interface ProfileSettingsProps {
  token?: string;
}

const MODULES = [
  { key: "tickets", label: "Chamados", actions: ["view", "create", "edit", "delete"] },
  { key: "demands", label: "Demandas", actions: ["view", "create", "edit", "delete"] },
  { key: "assets", label: "Ativos", actions: ["view", "create", "edit", "delete"] },
  { key: "contracts", label: "Contratos", actions: ["view", "create", "edit", "delete"] },
  { key: "users", label: "Usuários", actions: ["view", "manage"] },
  { key: "reports", label: "Relatórios", actions: ["view"] },
  { key: "settings", label: "Configurações", actions: ["manage"] },
];

function buildEmptyPermissions(): ProfilePermissions {
  return {
    tickets: { view: false, create: false, edit: false, delete: false },
    demands: { view: false, create: false, edit: false, delete: false },
    assets: { view: false, create: false, edit: false, delete: false },
    contracts: { view: false, create: false, edit: false, delete: false },
    users: { view: false, manage: false },
    reports: { view: false },
    settings: { manage: false },
  };
}

export function ProfileSettings({ token }: ProfileSettingsProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchProfiles(token)
      .then((data) => setProfiles(data))
      .catch(() => setProfiles([]));
  }, [token]);

  const togglePermission = async (profileIndex: number, module: string, action: string) => {
    if (!token) return;
    const updatedProfiles = [...profiles];
    const current = updatedProfiles[profileIndex];
    const permissions = { ...current.permissions } as any;
    permissions[module] = { ...permissions[module], [action]: !permissions[module][action] };
    updatedProfiles[profileIndex] = { ...current, permissions };
    setProfiles(updatedProfiles);
    try {
      const updated = await updateProfile(token, current.id, { permissions });
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStatus("Permissões atualizadas.");
    } catch {
      setStatus("Falha ao atualizar permissões.");
    }
  };

  const handleCreate = async () => {
    if (!token || !name.trim()) return;
    try {
      const created = await createProfile(token, {
        name: name.trim(),
        description: description.trim(),
        isSystem: false,
        permissions: buildEmptyPermissions(),
      });
      setProfiles((prev) => [created, ...prev]);
      setName("");
      setDescription("");
      setStatus("Perfil criado.");
    } catch {
      setStatus("Falha ao criar perfil.");
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (!token || profile.isSystem) return;
    try {
      await deleteProfile(token, profile.id);
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      setStatus("Perfil removido.");
    } catch {
      setStatus("Falha ao remover perfil.");
    }
  };

  return (
    <Card className="bg-card/70 lg:col-span-12">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Perfis de Acesso</CardTitle>
          <p className="text-sm text-muted-foreground">
            Defina o que cada função pode fazer no sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do perfil"
          />
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição"
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Perfil
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? <p className="text-xs text-amber-300">{status}</p> : null}
        <div className="grid gap-6">
          {profiles.map((profile, idx) => (
            <Card key={profile.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{profile.name}</CardTitle>
                  {profile.isSystem ? (
                    <span className="text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-500">
                      Sistema
                    </span>
                  ) : null}
                </div>
                {!profile.isSystem ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(profile)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left font-medium">Módulo</th>
                        <th className="p-3 text-center">Visualizar</th>
                        <th className="p-3 text-center">Criar</th>
                        <th className="p-3 text-center">Editar</th>
                        <th className="p-3 text-center">Excluir/Gerir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {MODULES.map((mod) => (
                        <tr key={mod.key} className="hover:bg-slate-50/50">
                          <td className="p-3 font-medium">{mod.label}</td>
                          {["view", "create", "edit", "delete"].map((action) => {
                            const hasAction =
                              mod.actions.includes(action) ||
                              (action === "delete" && mod.actions.includes("manage"));
                            if (!hasAction) {
                              return (
                                <td key={action} className="p-3 text-center text-slate-300">
                                  -
                                </td>
                              );
                            }
                            const realAction =
                              action === "delete" && mod.actions.includes("manage")
                                ? "manage"
                                : action;
                            return (
                              <td key={action} className="p-3 text-center">
                                <Switch
                                  checked={(profile.permissions as any)?.[mod.key]?.[realAction]}
                                  onCheckedChange={() =>
                                    togglePermission(idx, mod.key, realAction)
                                  }
                                  disabled={profile.isSystem && profile.name === "Administrador"}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

