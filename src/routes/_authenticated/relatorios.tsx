import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import { useProducts, usePurchases, useSales } from "@/lib/data";
import { brl, int, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Veja investimento, retorno previsto e os produtos que mais dão lucro.",
      },
      { property: "og:title", content: "Relatórios — Gestão Sair do CLT" },
      {
        property: "og:description",
        content: "Veja investimento, retorno previsto e os produtos que mais dão lucro.",
      },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const products = useProducts();
  const sales = useSales();
  const purchases = usePurchases();

  const data = useMemo(() => {
    const list = products.data ?? [];
    const allSales = sales.data ?? [];
    const allPurchases = purchases.data ?? [];

    const invested = allPurchases.reduce((s, p) => s + p.quantity * p.unit_cost, 0);
    const revenue = allSales.reduce((s, v) => s + v.quantity * v.unit_price, 0);
    const profit = allSales.reduce((s, v) => s + v.quantity * (v.unit_price - v.unit_cost), 0);
    const stockCost = list.reduce((s, p) => s + p.stock * p.cost_price, 0);
    const stockRevenue = list.reduce((s, p) => s + p.stock * p.sale_price, 0);

    const perProduct = list
      .map((p) => {
        const rows = allSales.filter((s) => s.product_id === p.id);
        const sold = rows.reduce((s, v) => s + v.quantity, 0);
        const rev = rows.reduce((s, v) => s + v.quantity * v.unit_price, 0);
        const prof = rows.reduce((s, v) => s + v.quantity * (v.unit_price - v.unit_cost), 0);
        return {
          id: p.id,
          name: p.name,
          sold,
          rev,
          prof,
          stock: p.stock,
          potential: p.stock * (p.sale_price - p.cost_price),
        };
      })
      .sort((a, b) => b.prof - a.prof);

    return {
      invested,
      revenue,
      profit,
      stockCost,
      stockRevenue,
      recovered: invested > 0 ? (revenue / invested) * 100 : 0,
      perProduct,
      chart: perProduct.slice(0, 8).map((p) => ({
        name: p.name.length > 14 ? `${p.name.slice(0, 14)}…` : p.name,
        Lucro: Number(p.prof.toFixed(2)),
        Potencial: Number(p.potential.toFixed(2)),
      })),
    };
  }, [products.data, sales.data, purchases.data]);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Quanto entrou, quanto saiu e o que ainda pode virar lucro"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Box label="Investimento total" value={brl(data.invested)} />
        <Box label="Receita total" value={brl(data.revenue)} />
        <Box label="Lucro realizado" value={brl(data.profit)} tone="success" />
        <Box
          label="Lucro parado no estoque"
          value={brl(data.stockRevenue - data.stockCost)}
          tone="warning"
        />
      </div>

      <div className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Retorno do investimento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Você já recuperou {pct(data.recovered)} do valor investido em compras.
        </p>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="brand-gradient h-full rounded-full transition-all"
            style={{ width: `${Math.min(data.recovered, 100)}%` }}
          />
        </div>
      </div>

      <div className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Lucro por produto</h2>
        <p className="text-sm text-muted-foreground">
          Realizado nas vendas x potencial ainda em estoque
        </p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v) => brl(Number(v))}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                }}
                formatter={(v: number | string) => brl(Number(v))}
              />
              <Bar dataKey="Lucro" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Potencial" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel mt-6 overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Desempenho por produto</h2>
        </div>
        {data.perProduct.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Cadastre produtos para ver os relatórios.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Vendidos</th>
                  <th className="px-4 py-3 font-medium">Receita</th>
                  <th className="px-4 py-3 font-medium">Lucro</th>
                  <th className="px-4 py-3 font-medium">Em estoque</th>
                  <th className="px-4 py-3 font-medium">Lucro potencial</th>
                </tr>
              </thead>
              <tbody>
                {data.perProduct.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{int(p.sold)}</td>
                    <td className="px-4 py-3">{brl(p.rev)}</td>
                    <td className="px-4 py-3 text-success">{brl(p.prof)}</td>
                    <td className="px-4 py-3">{int(p.stock)}</td>
                    <td className="px-4 py-3 text-primary">{brl(p.potential)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Box({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="panel p-5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-3 font-display text-2xl font-bold",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
