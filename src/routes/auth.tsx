import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = search['next'];
    return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? { next }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Entrar — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Acesse sua conta do Gestão Sair do CLT para controlar estoque, vendas e lucro.",
      },
      { property: "og:title", content: "Entrar — Gestão Sair do CLT" },
      {
        property: "og:description",
        content: "Acesse sua conta do Gestão Sair do CLT para controlar estoque, vendas e lucro.",
      },
    ],
  }),
  component: AuthPage,
});

function authErrorPt(err: unknown) {
  const raw = err instanceof Error ? err.message : "";
  const m = raw.toLowerCase();
  if (m.includes("leaked") || m.includes("pwned"))
    return "Essa senha aparece em vazamentos conhecidos. Escolha uma senha mais forte.";
  if (m.includes("password") && m.includes("short"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email address") && m.includes("invalid"))
    return "Esse e-mail não é aceito. Use um e-mail válido (ex.: Gmail, Outlook).";
  if (m.includes("already registered") || m.includes("already exists"))
    return "Já existe uma conta com esse e-mail. Faça login.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns instantes e tente de novo.";
  return raw || "Não foi possível continuar.";
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  useEffect(() => {
    if (loading || !session) return;
    if (next) window.location.replace(next);
    else navigate({ to: "/painel", replace: true });
  }, [loading, session, navigate, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: next ? window.location.origin + next : window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme o e-mail que enviamos para entrar.");
          return;
        }
        toast.success("Conta criada com sucesso!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(authErrorPt(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: next ? window.location.origin + next : window.location.origin,
      },
    });
    if (error) {
      setBusy(false);
      console.error("[Google OAuth]", error);
      toast.error(`Não foi possível entrar com o Google: ${error.message}`);
      return;
    }
    // O Supabase redireciona a página para o Google a partir daqui.
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="brand-gradient flex size-10 items-center justify-center rounded-xl font-display text-xl font-bold text-primary-foreground">
            S
          </span>
          <span className="font-display text-xl font-bold">Gestão Sair do CLT</span>
        </Link>

        <div className="panel p-7">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle estoque, vendas e lucro em um só lugar.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            Continuar com Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Criar agora" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
