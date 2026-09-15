import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  BarChart3,
  Calculator,
  FlaskConical,
  RotateCcw,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/painel", label: "Painel", icon: LayoutGrid },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/mineracao", label: "Mineração de Produto", icon: FlaskConical },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/reembolsos", label: "Reembolsos", icon: RotateCcw },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/calculadora", label: "Calculadora de Margem", icon: Calculator },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const email = user?.email ?? "";
  const initial = email.slice(0, 1).toUpperCase() || "?";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-lg font-display text-lg font-bold text-primary-foreground">
            S
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-sidebar-foreground">Gestão Sair do CLT</p>
            <p className="text-[11px] text-muted-foreground">Estoque &amp; Revenda</p>
          </div>
          <button
            className="ml-auto text-muted-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Área de trabalho
          </p>
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <button
            className="text-muted-foreground lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
            <span className="brand-gradient flex size-8 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground">
              {initial}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
