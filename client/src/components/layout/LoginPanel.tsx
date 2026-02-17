import { useState, type FormEvent } from "react";
import { Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface LoginPanelProps {
  onLogin: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
}

export function LoginPanel({ onLogin }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await onLogin(email, password);
    if (!result.ok) {
      setError(result.message ?? "Falha no login.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-xl backdrop-blur">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Acesso Seguro</CardTitle>
          <CardDescription>
            Entre para acompanhar demandas, contratos e follow-ups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu.nome@empresa.com.br"
                type="email"
                autoComplete="username"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                type="password"
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="gap-2" disabled={loading} type="submit">
              <Lock className="h-4 w-4" />
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                localStorage.removeItem("tiDemand.auth");
                localStorage.removeItem("ti-demand-auth");
                setEmail("");
                setPassword("");
                setError(null);
              }}
            >
              Limpar sessão
            </Button>
            <p className="text-xs text-muted-foreground">
              Use seu e-mail corporativo e a senha do sistema.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
