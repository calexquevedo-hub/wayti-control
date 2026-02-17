import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Shield, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { Profile, ProfilePermissions, User } from "@/types";
import {
  createProfile,
  createUser,
  deleteProfile,
  fetchProfiles,
  fetchUsers,
  resetUserPassword,
  updateProfile,
  updateUser,
} from "@/lib/api";

type PermissionMatrix = Record<string, Record<string, boolean>>;

const MODULES: Array<{ key: string; label: string; actions: string[] }> = [
  { key: "tickets", label: "Chamados", actions: ["view", "create", "edit", "delete"] },
  { key: "demands", label: "Demandas", actions: ["view", "create", "edit", "delete"] },
  { key: "assets", label: "Ativos", actions: ["view", "create", "edit", "delete"] },
  { key: "contracts", label: "Contratos", actions: ["view", "create", "edit", "delete"] },
  { key: "users", label: "Usuários", actions: ["view", "manage"] },
  { key: "reports", label: "Relatórios", actions: ["view"] },
  { key: "settings", label: "Configurações", actions: ["manage"] },
];

const buildEmptyPermissions = (): PermissionMatrix => {
  const permissions: PermissionMatrix = {};
  MODULES.forEach((mod) => {
    permissions[mod.key] = {};
    mod.actions.forEach((action) => {
      permissions[mod.key][action] = false;
    });
  });
  return permissions;
};

const normalizePermissions = (input?: Partial<ProfilePermissions>): PermissionMatrix => {
  const base = buildEmptyPermissions();
  if (!input) return base;
  MODULES.forEach((mod) => {
    mod.actions.forEach((action) => {
      const value = (input as any)?.[mod.key]?.[action];
      if (typeof value === "boolean") {
        base[mod.key][action] = value;
      }
    });
  });
  return base;
};

interface AccessControlProps {
  token?: string;
}

interface ProfileDraft {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: PermissionMatrix;
}

export function AccessControl({ token }: AccessControlProps) {
  const [activeTab, setActiveTab] = useState("users");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersStatus, setUsersStatus] = useState<string | null>(null);
  const [profilesStatus, setProfilesStatus] = useState<string | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userMode, setUserMode] = useState<"create" | "edit">("create");
  const [userDraft, setUserDraft] = useState({
    id: "",
    name: "",
    email: "",
    profileId: "",
    isActive: true,
  });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    id: "",
    name: "",
    description: "",
    isSystem: false,
    permissions: buildEmptyPermissions(),
  });
  const isAdminProfile =
    profileDraft.isSystem && profileDraft.name.trim().toLowerCase() === "administrador";

  useEffect(() => {
    if (!token) return;
    fetchUsers(token)
      .then((data) => setUsers(data))
      .catch(() => setUsers([]));
  }, [token]);

  const loadProfiles = async () => {
    if (!token) return;
    try {
      const data = await fetchProfiles(token);
      setProfiles(data);
    } catch {
      setProfiles([]);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [token]);

  const profileNameById = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((profile) => {
      map.set(profile.id, profile.name);
    });
    return map;
  }, [profiles]);

  const openCreateUser = () => {
    setUserMode("create");
    setUserDraft({ id: "", name: "", email: "", profileId: "", isActive: true });
    setTempPassword(null);
    setUserDialogOpen(true);
  };

  const openEditUser = (user: User) => {
    setUserMode("edit");
    const profileId =
      typeof user.profile === "string" ? user.profile : user.profile?.id ?? "";
    setUserDraft({
      id: user.id,
      name: user.name,
      email: user.email,
      profileId,
      isActive: user.isActive,
    });
    setTempPassword(null);
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!token) return;
    if (!userDraft.name.trim() || !userDraft.email.trim() || !userDraft.profileId) {
      setUsersStatus("Preencha todos os campos obrigatórios.");
      return;
    }
    try {
      if (userMode === "create") {
        const data = await createUser(token, {
          name: userDraft.name.trim(),
          email: userDraft.email.trim(),
          profileId: userDraft.profileId,
        });
        setUsers((prev) => [data.user, ...prev]);
        setTempPassword(data.tempPassword);
        setUsersStatus("Usuário criado com sucesso.");
      } else {
        const updated = await updateUser(token, userDraft.id, {
          name: userDraft.name.trim(),
          profileId: userDraft.profileId,
          isActive: userDraft.isActive,
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setUsersStatus("Usuário atualizado.");
        setUserDialogOpen(false);
      }
    } catch (error: any) {
      setUsersStatus(error?.message ?? "Falha ao salvar usuário.");
    }
  };

  const openCreateProfile = () => {
    setProfileDraft({
      id: "",
      name: "",
      description: "",
      isSystem: false,
      permissions: buildEmptyPermissions(),
    });
    setProfilesStatus(null);
    setProfileDialogOpen(true);
  };

  const openEditProfile = (profile: Profile) => {
    setProfileDraft({
      ...profile,
      permissions: normalizePermissions(profile.permissions),
    });
    setProfilesStatus(null);
    setProfileDialogOpen(true);
  };

  const togglePermission = (moduleKey: string, action: string) => {
    setProfileDraft((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: {
          ...prev.permissions[moduleKey],
          [action]: !prev.permissions[moduleKey]?.[action],
        },
      },
    }));
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    if (!profileDraft.name.trim()) {
      setProfilesStatus("Informe o nome do perfil.");
      return;
    }
    try {
      if (profileDraft.id) {
        const updated = await updateProfile(token, profileDraft.id, {
          name: profileDraft.name.trim(),
          description: profileDraft.description?.trim() ?? "",
          permissions: profileDraft.permissions as unknown as ProfilePermissions,
        });
        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setProfilesStatus("Perfil atualizado.");
      } else {
        const created = await createProfile(token, {
          name: profileDraft.name.trim(),
          description: profileDraft.description?.trim() ?? "",
          permissions: profileDraft.permissions as unknown as ProfilePermissions,
        });
        setProfiles((prev) => [created, ...prev]);
        setProfilesStatus("Perfil criado.");
      }
      setProfileDialogOpen(false);
    } catch (error: any) {
      setProfilesStatus(error?.message ?? "Falha ao salvar perfil.");
    }
  };

  const handleDeleteProfile = async (id?: string) => {
    if (!token) return;
    if (!id) return;
    if (!confirm("Tem certeza que deseja excluir este perfil?")) return;
    try {
      await deleteProfile(token, id);
      setProfiles((currentList) =>
        currentList.filter((profile) => ((profile as any)._id || profile.id) !== id)
      );
      setProfilesStatus("Perfil removido.");
    } catch (error: any) {
      console.error("Erro ao deletar:", error);
      setProfilesStatus(error?.message ?? "Falha ao remover perfil.");
      alert(error?.message || "Erro ao excluir perfil");
      loadProfiles();
    }
  };

  return (
    <Card className="bg-card/70 lg:col-span-12">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Controle de Acesso</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários e perfis com permissão granular.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-[420px] grid-cols-2">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="profiles">Perfis de Acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {users.length} usuário(s)
              </div>
              <Button onClick={openCreateUser}>
                <Plus className="mr-2 h-4 w-4" />
                Novo usuário
              </Button>
            </div>
            {usersStatus ? <p className="text-xs text-amber-300">{usersStatus}</p> : null}
            {users.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                Nenhum usuário cadastrado.
              </div>
            ) : (
              <div className="grid gap-3">
                {users.map((user) => (
                  <div key={user.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-xs">
                        {typeof user.profile === "string"
                          ? profileNameById.get(user.profile) ?? "Sem perfil"
                          : user.profile?.name ?? "Sem perfil"}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Status: {user.isActive ? "Ativo" : "Inativo"}
                      {user.mustChangePassword ? " • Trocar senha" : ""}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditUser(user)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!token) return;
                          try {
                            const data = await resetUserPassword(token, user.id);
                            setUsers((prev) =>
                              prev.map((u) => (u.id === data.user.id ? data.user : u))
                            );
                            setTempPassword(data.tempPassword);
                            setUsersStatus("Senha temporária gerada.");
                            setUserDialogOpen(true);
                            setUserMode("edit");
                            setUserDraft({
                              id: data.user.id,
                              name: data.user.name,
                              email: data.user.email,
                              profileId:
                                typeof data.user.profile === "string"
                                  ? data.user.profile
                                  : data.user.profile?.id ?? "",
                              isActive: data.user.isActive,
                            });
                          } catch (error: any) {
                            setUsersStatus(error?.message ?? "Falha ao resetar senha.");
                          }
                        }}
                      >
                        Resetar senha
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profiles" className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                {profiles.length} perfil(is)
              </div>
              <Button onClick={openCreateProfile}>
                <Plus className="mr-2 h-4 w-4" />
                Criar novo perfil
              </Button>
            </div>
            {profilesStatus ? <p className="text-xs text-amber-300">{profilesStatus}</p> : null}
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                Nenhum perfil cadastrado.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {profiles.map((profile) => {
                  const isAdmin = profile.isSystem && profile.name === "Administrador";
                  return (
                    <Card key={profile.id} className="border-border/60 bg-background/40">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{profile.name}</p>
                            {profile.description ? (
                              <p className="text-xs text-muted-foreground">{profile.description}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isAdmin ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditProfile(profile)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {!profile.isSystem ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteProfile((profile as any)._id || profile.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.isSystem ? (
                          <Badge variant="secondary">Sistema</Badge>
                        ) : (
                          <Badge variant="outline">Personalizado</Badge>
                        )}
                      </div>
                      {!isAdmin ? (
                        <Button size="sm" variant="outline" onClick={() => openEditProfile(profile)}>
                          Configurar permissões
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                    );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{userMode === "create" ? "Novo usuário" : "Editar usuário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="grid gap-1">
              <Label>Nome</Label>
              <Input
                value={userDraft.name}
                onChange={(event) => setUserDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label>E-mail</Label>
              <Input
                value={userDraft.email}
                onChange={(event) => setUserDraft((prev) => ({ ...prev, email: event.target.value }))}
                disabled={userMode === "edit"}
              />
            </div>
            <div className="grid gap-1">
              <Label>Perfil</Label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={userDraft.profileId}
                onChange={(event) =>
                  setUserDraft((prev) => ({ ...prev, profileId: event.target.value }))
                }
              >
                <option value="">Selecione um perfil</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label>Status</Label>
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={userDraft.isActive ? "true" : "false"}
                onChange={(event) =>
                  setUserDraft((prev) => ({ ...prev, isActive: event.target.value === "true" }))
                }
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            {tempPassword ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                Senha temporária: <span className="font-semibold">{tempPassword}</span>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{profileDraft.id ? "Editar perfil" : "Novo perfil de acesso"}</DialogTitle>
          </DialogHeader>
          {isAdminProfile ? (
            <div className="rounded-md border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 text-amber-500" />
                <p>
                  <strong>Perfil de sistema protegido:</strong> o Administrador possui acesso total
                  irrestrito. As permissões não podem ser removidas.
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <Label>Nome do perfil</Label>
                <Input
                  value={profileDraft.name}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  disabled={isAdminProfile}
                />
              </div>
              <div className="grid gap-1">
                <Label>Descrição</Label>
                <Input
                  value={profileDraft.description ?? ""}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
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
                <tbody className="divide-y divide-border/60">
                  {MODULES.map((mod) => (
                    <tr key={mod.key} className="hover:bg-muted/20">
                      <td className="p-3 font-medium">{mod.label}</td>
                      {(["view", "create", "edit", "delete"] as const).map((action) => {
                        const actionAvailable =
                          mod.actions.includes(action) ||
                          (action === "delete" && mod.actions.includes("manage"));
                        if (!actionAvailable) {
                          return (
                            <td key={action} className="p-3 text-center text-muted-foreground/30">
                              -
                            </td>
                          );
                        }
                        const realAction =
                          action === "delete" && mod.actions.includes("manage")
                            ? "manage"
                            : action;
                        const checked = isAdminProfile
                          ? true
                          : profileDraft.permissions?.[mod.key]?.[realAction] ?? false;
                        return (
                          <td key={action} className="p-3 text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={checked}
                                onCheckedChange={() =>
                                  !isAdminProfile && togglePermission(mod.key, realAction)
                                }
                                disabled={isAdminProfile}
                                className={
                                  isAdminProfile
                                    ? "cursor-not-allowed opacity-50 data-[state=checked]:bg-emerald-500"
                                    : ""
                                }
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile}>Salvar perfil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
