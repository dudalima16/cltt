import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { useProducts, usePurchases, useUpdatePurchaseRefund, type Purchase } from "@/lib/data";
import { brl, errorMessage, fullDate, today } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reembolsos")({
  head: () => ({
    meta: [
      { title: "Reembolsos — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Acompanhe o prazo de devolução de cada compra antes que ele vença.",
      },
    ],
  }),
  component: Reembolsos,
});

const tabs = [
  { key: "pendentes", label: "Pendentes" },
  { key: "solicitado", label: "Solicitados" },
  { key: "reembolsado", label: "Reembolsados" },
  { key: "all", label: "Todos" },
] as const;

function urgency(p: Purchase): { label: string; tone: "destructive" | "warning" | "muted" } {
  if (p.refund_status !== "nao_solicitado" || !p.refund_deadline) {
    return { label: "", tone: "muted" };
  }
  const days = Math.ceil(
    (new Date(`${p.refund_deadline}T12:00:00`).getTime() - new Date(`${today()}T12:00:00`).getTime()) /
      86_400_000,
  );
  if (days < 0) return { label: "Prazo vencido", tone: "destructive" };
  if (days === 0) return { label: "Vence hoje", tone: "warning" };
  if (days <= 2) return { label: `Vence em ${days}d`, tone: "warning" };
  return { label: `Vence em ${days}d`, tone: "muted" };
}

function Reembolsos() {
  const purchases = usePurchases();
  const products = useProducts();
  const updateRefund = useUpdatePurchaseRefund();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("pendentes");

  const names = new Map((products.data ?? []).map((p) => [p.id, p.name]));

  const list = useMemo(() => {
    const all = purchases.data ?? [];
    const filtered =
      tab === "all"
        ? all
        : tab === "pendentes"
          ? all.filter((p) => p.refund_status === "nao_solicitado")
          : all.filter((p) => p.refund_status === tab);
    return [...filtered].sort((a, b) => {
      if (!a.refund_deadline) return 1;
      if (!b.refund_deadline) return -1;
      return a.refund_deadline.localeCompare(b.refund_deadline);
    });
  }, [purchases.data, tab]);

  async function updateField(
    p: Purchase,
    patch: Partial<Pick<Purchase, "refund_deadline" | "refund_status">>,
  ) {
    try {
      await updateRefund.mutateAsync({
        id: p.id,
        refund_deadline: patch.refund_deadline ?? p.refund_deadline,
        refund_status: patch.refund_status ?? p.refund_status,
      });
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao atualizar."));
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <PageHeader
        title="Reembolsos"
        subtitle="Prazo de devolução de cada compra — antes que ele vença"
      />

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        {list.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {tab === "pendentes"
              ? "Nenhum reembolso pendente — tudo em dia."
              : "Nada por aqui ainda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Comprado em</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Prazo pra devolver</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const u = urgency(p);
                  return (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{names.get(p.product_id) ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.quantity} un.</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fullDate(p.purchased_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {brl(p.quantity * p.unit_cost)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={p.refund_deadline ?? ""}
                          onChange={(e) => updateField(p, { refund_deadline: e.target.value })}
                          className="rounded-md border border-border bg-secondary/40 px-2 py-1 text-sm"
                        />
                        {u.label && (
                          <p
                            className={cn(
                              "mt-1 text-xs font-medium",
                              u.tone === "destructive" && "text-destructive",
                              u.tone === "warning" && "text-warning",
                              u.tone === "muted" && "text-muted-foreground",
                            )}
                          >
                            {u.label}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.refund_status}
                          onChange={(e) =>
                            updateField(p, {
                              refund_status: e.target.value as Purchase["refund_status"],
                            })
                          }
                          className="rounded-md border border-border bg-secondary/40 px-2 py-1 text-sm"
                        >
                          <option value="nao_solicitado">Não solicitado</option>
                          <option value="solicitado">Solicitado</option>
                          <option value="reembolsado">Reembolsado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
