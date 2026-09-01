import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Package,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useProducts, usePurchases, useSales } from "@/lib/data";
import { brl, daysAgo, int, pct, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const RESTOCK_LOOKBACK_DAYS = 60;

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Visão geral do seu negócio: estoque, receita, lucro e investimento.",
      },
      { property: "og:title", content: "Painel — Gestão Sair do CLT" },
      {
        property: "og:description",
        content: "Visão geral do seu negócio: estoque, receita, lucro e investimento.",
      },
    ],
  }),
  component: Painel,
});

const periods = [
  { label: "Hoje", days: 0 },
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 28 dias", days: 28 },
  { label: "Últimos 90 dias", days: 90 },
  { label: "Todo período", days: -1 },
] as const;

function Painel() {
  const [periodIndex, setPeriodIndex] = useState(2);
  const period = periods[periodIndex]!;
  const products = useProducts();
  const sales = useSales();
  const purchases = usePurchases();

  const from = period.days < 0 ? "0000-01-01" : daysAgo(period.days);

  const metrics = useMemo(() => {
    const list = products.data ?? [];
    const periodSales = (sales.data ?? []).filter((s) => s.sold_at >= from);
    const periodPurchases = (purchases.data ?? []).filter((p) => p.purchased_at >= from);

    const revenue = periodSales.reduce((sum, s) => sum + s.quantity * s.unit_price, 0);
    const cogs = periodSales.reduce((sum, s) => sum + s.quantity * s.unit_cost, 0);
    const extraExpenses = periodSales.reduce((sum, s) => sum + s.extra_expense, 0);
    const spent = periodPurchases.reduce((sum, p) => sum + p.quantity * p.unit_cost, 0);
    const stockUnits = list.reduce((sum, p) => sum + p.stock, 0);
    const stockCost = list.reduce((sum, p) => sum + p.stock * p.cost_price, 0);
    const stockRevenue = list.reduce((sum, p) => sum + p.stock * (p.sale_price + p.extra_charge), 0);
    const catalogValue = list.reduce((sum, p) => sum + p.stock * p.cost_price, 0);
    // "Outros custos" (gasolina, entrega...) só pesam na hora da venda, não
    // na compra — por isso entram aqui no lucro projetado, não no investido.
    const stockExtraCost = list.reduce((sum, p) => sum + p.stock * p.extra_cost, 0);

    const byDay = new Map<string, { receita: number; lucro: number }>();
    const days = period.days < 0 ? 30 : Math.max(period.days, 1);
    for (let i = days - 1; i >= 0; i--) {
      byDay.set(daysAgo(i), { receita: 0, lucro: 0 });
    }
    for (const s of periodSales) {
      const entry = byDay.get(s.sold_at);
      if (!entry) continue;
      entry.receita += s.quantity * s.unit_price;
      entry.lucro += s.quantity * (s.unit_price - s.unit_cost) - s.extra_expense;
    }

    const projectedProfit = stockRevenue - stockCost - stockExtraCost;

    // Prioridade de reposição: entre os produtos com estoque baixo/zerado,
    // ranqueia pelo que mais vendeu de verdade nos últimos dias × a margem
    // que dá — ou seja, o que mais vale a pena comprar de novo primeiro.
    const lookbackFrom = daysAgo(RESTOCK_LOOKBACK_DAYS);
    const recentSoldByProduct = new Map<string, number>();
    for (const s of sales.data ?? []) {
      if (s.sold_at < lookbackFrom) continue;
      recentSoldByProduct.set(
        s.product_id,
        (recentSoldByProduct.get(s.product_id) ?? 0) + s.quantity,
      );
    }
    const restockSuggestions = list
      .filter((p) => p.stock <= p.min_stock)
      .map((p) => {
        const sold = recentSoldByProduct.get(p.id) ?? 0;
        const margin = p.sale_price + p.extra_charge - p.cost_price - p.extra_cost;
        const velocityPerMonth = sold / (RESTOCK_LOOKBACK_DAYS / 30);
        const suggestedQty = Math.max(Math.ceil(velocityPerMonth), p.min_stock, 1);
        return { ...p, sold, margin, suggestedQty, score: sold * margin };
      })
      .sort((a, b) => b.score - a.score);

    // Vendas por canal, dentro do período selecionado — pra saber onde
    // vale mais a pena focar energia entre WhatsApp, Marketplace, etc.
    const channelMap = new Map<string, { count: number; revenue: number; profit: number }>();
    for (const s of periodSales) {
      const key = s.channel?.trim() || "Sem canal registrado";
      const entry = channelMap.get(key) ?? { count: 0, revenue: 0, profit: 0 };
      entry.count += 1;
      entry.revenue += s.quantity * s.unit_price;
      entry.profit += s.quantity * (s.unit_price - s.unit_cost) - s.extra_expense;
      channelMap.set(key, entry);
    }
    const channelStats = [...channelMap.entries()]
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.profit - a.profit);

    return {
      revenue,
      profit: revenue - cogs - extraExpenses,
      margin: revenue > 0 ? ((revenue - cogs - extraExpenses) / revenue) * 100 : 0,
      spent,
      salesCount: periodSales.length,
      stockUnits,
      stockCost,
      stockRevenue,
      catalogValue,
      projectedProfit,
      projectedMargin: stockRevenue > 0 ? (projectedProfit / stockRevenue) * 100 : 0,
      roi: stockCost > 0 ? (projectedProfit / stockCost) * 100 : 0,
      lowStock: list.filter((p) => p.stock <= p.min_stock),
      restockSuggestions,
      channelStats,
      chart: [...byDay.entries()].map(([date, v]) => ({ date: shortDate(date), ...v })),
      productCount: list.length,
    };
  }, [products.data, sales.data, purchases.data, from, period.days]);

  return (
    <div>
      <PageHeader
        title="Painel"
        subtitle="Visão geral do seu negócio"
        action={
          <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
            {periods.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriodIndex(i)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  i === periodIndex
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Hero de investimento / retorno — destaque principal */}
      <section className="panel overflow-hidden">
        <div className="border-b border-border bg-gradient-to-br from-primary/15 to-transparent p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Wallet className="size-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Investimento &amp; retorno previsto</h2>
              <p className="text-sm text-muted-foreground">
                O que você tem em estoque hoje e quanto pode render
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          <HeroMetric
            label="Investido em estoque"
            value={brl(metrics.stockCost)}
            hint="Custo dos produtos que você comprou"
            tone="violet"
          />
          <HeroMetric
            label="Retorno se vender tudo"
            value={brl(metrics.stockRevenue)}
            hint="Receita potencial no preço cadastrado"
            tone="sky"
          />
          <HeroMetric
            label="Lucro previsto"
            value={brl(metrics.projectedProfit)}
            hint={`Margem prevista de ${pct(metrics.projectedMargin)}`}
            tone="emerald"
            highlight
          />
          <HeroMetric
            label="ROI do estoque"
            value={pct(metrics.roi)}
            hint="Retorno sobre o investimento atual"
            tone="amber"
            big
          />
        </div>
      </section>

      {/* KPIs secundários do período */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total de produtos"
          value={int(metrics.productCount)}
          hint={`${brl(metrics.catalogValue)} em valor`}
          icon={Package}
          tone="violet"
        />
        <StatCard
          label="Estoque disponível"
          value={int(metrics.stockUnits)}
          hint={`${brl(metrics.stockCost)} investidos em estoque`}
          icon={Boxes}
          tone="amber"
        />
        <StatCard
          label="Receita do período"
          value={brl(metrics.revenue)}
          hint={`${int(metrics.salesCount)} venda(s) · ${brl(metrics.spent)} em compras`}
          icon={DollarSign}
          tone="sky"
        />
        <StatCard
          label="Lucro do período"
          value={brl(metrics.profit)}
          hint={metrics.revenue > 0 ? `Margem de ${pct(metrics.margin)}` : "—"}
          icon={TrendingUp}
          tone="emerald"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Receita &amp; lucro</h2>
          <p className="text-sm text-muted-foreground">{period.label}</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chart}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v) => brl(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v: number | string) => brl(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="var(--chart-1)"
                  fill="url(#gRev)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro"
                  stroke="var(--chart-2)"
                  fill="url(#gProf)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="size-4 text-warning" />
            Prioridade de reposição
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Estoque baixo, ordenado pelo que mais vendeu nos últimos {RESTOCK_LOOKBACK_DAYS} dias.
          </p>
          {metrics.restockSuggestions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Todos os produtos estão bem abastecidos.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {metrics.restockSuggestions.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.sold > 0
                        ? `${int(p.sold)} vendida(s) em ${RESTOCK_LOOKBACK_DAYS} dias · estoque: ${int(p.stock)}`
                        : `Sem vendas recentes · estoque: ${int(p.stock)}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                    comprar ~{int(p.suggestedQty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 panel p-5">
        <h2 className="text-lg font-semibold">Vendas por canal</h2>
        <p className="text-sm text-muted-foreground">
          {period.label} · onde vale mais a pena focar
        </p>
        {metrics.channelStats.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma venda com canal registrado nesse período.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Canal</th>
                  <th className="pb-2 pr-4 font-medium">Vendas</th>
                  <th className="pb-2 pr-4 font-medium">Receita</th>
                  <th className="pb-2 font-medium">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {metrics.channelStats.map((c) => (
                  <tr key={c.channel} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">{c.channel}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{int(c.count)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{brl(c.revenue)}</td>
                    <td className="py-2.5 font-medium text-success">{brl(c.profit)}</td>
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

function HeroMetric({
  label,
  value,
  hint,
  tone,
  highlight,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "violet" | "sky" | "emerald" | "amber";
  highlight?: boolean;
  big?: boolean;
}) {
  const toneClasses = {
    violet: "bg-primary/10 text-primary",
    sky: "bg-sky-500/10 text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-3 font-display font-bold tracking-tight",
          big ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
          highlight ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className={cn("mt-2 text-xs font-medium", toneClasses[tone])}>{hint}</p>
      )}
    </div>
  );
}

