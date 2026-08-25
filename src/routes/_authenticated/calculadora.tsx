import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de Margem — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Calcule margem, markup e lucro por unidade antes de definir o preço de venda.",
      },
      { property: "og:title", content: "Calculadora de Margem — Gestão Sair do CLT" },
      {
        property: "og:description",
        content: "Calcule margem, markup e lucro por unidade antes de definir o preço de venda.",
      },
    ],
  }),
  component: Calculadora,
});

// Referência de mercado (2026) — comissão % e custo fixo por unidade.
// Muda por categoria e pode ser atualizada pelas plataformas a qualquer
// momento; o usuário deve conferir o valor exato no painel de vendedor.
const marketplacePresets = [
  { label: "Mercado Livre · Clássico", feePct: 12, fixedFee: 6.5 },
  { label: "Mercado Livre · Premium", feePct: 17, fixedFee: 6.5 },
  { label: "TikTok Shop · produto < R$50", feePct: 10, fixedFee: 6 },
  { label: "TikTok Shop · produto ≥ R$50", feePct: 6, fixedFee: 6 },
];

function Calculadora() {
  const [cost, setCost] = useState("50");
  const [price, setPrice] = useState("99,90");
  const [extra, setExtra] = useState("0");
  const [feePct, setFeePct] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [targetMargin, setTargetMargin] = useState("40");

  const parse = (v: string) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const r = useMemo(() => {
    const c = parse(cost);
    const p = parse(price);
    const e = parse(extra);
    const fee = (p * parse(feePct)) / 100;
    const qty = Math.max(parse(quantity), 0);
    const totalCost = c + e + fee;
    const profit = p - totalCost;
    const margin = p > 0 ? (profit / p) * 100 : 0;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const tm = parse(targetMargin);
    const suggested = tm < 100 ? (c + e) / (1 - tm / 100 - parse(feePct) / 100) : 0;
    return {
      totalCost,
      profit,
      margin,
      markup,
      qty,
      totalProfit: profit * qty,
      totalRevenue: p * qty,
      totalInvested: totalCost * qty,
      suggested: Number.isFinite(suggested) && suggested > 0 ? suggested : 0,
    };
  }, [cost, price, extra, feePct, quantity, targetMargin]);

  return (
    <div>
      <PageHeader
        title="Calculadora de Margem"
        subtitle="Descubra quanto sobra em cada venda antes de comprar"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-4 p-6">
          <h2 className="text-lg font-semibold">Dados do produto</h2>
          <Field label="Preço de custo (R$)" value={cost} onChange={setCost} />
          <Field label="Preço de venda (R$)" value={price} onChange={setPrice} />
          <Field
            label="Custos extras por unidade (frete, embalagem, taxa fixa)"
            value={extra}
            onChange={setExtra}
          />
          <Field label="Taxa da plataforma (%)" value={feePct} onChange={setFeePct} />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Preencher com taxa do marketplace
            </Label>
            <div className="flex flex-wrap gap-2">
              {marketplacePresets.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => {
                    setFeePct(String(m.feePct));
                    setExtra(String(m.fixedFee));
                  }}
                  className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Valores de referência (2026) — a comissão exata varia por categoria. Confira o
              percentual certo no painel de vendedor de cada plataforma antes de precificar.
            </p>
          </div>

          <Field label="Quantidade" value={quantity} onChange={setQuantity} />
          <Field label="Margem desejada (%)" value={targetMargin} onChange={setTargetMargin} />
        </div>

        <div className="space-y-4">
          <div className="panel stat-emerald p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Lucro por unidade
            </p>
            <p
              className={cn(
                "mt-2 font-display text-4xl font-bold",
                r.profit >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {brl(r.profit)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Result label="Margem" value={pct(r.margin)} />
              <Result label="Markup" value={pct(r.markup)} />
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-lg font-semibold">Resultado no lote</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Custo total por unidade" value={brl(r.totalCost)} />
              <Row label="Investimento total" value={brl(r.totalInvested)} />
              <Row label="Faturamento total" value={brl(r.totalRevenue)} />
              <Row label="Lucro total" value={brl(r.totalProfit)} strong />
            </div>
          </div>

          <div className="panel stat-violet p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Preço sugerido para a margem desejada
            </p>
            <p className="mt-2 font-display text-3xl font-bold">{brl(r.suggested)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        inputMode="decimal"
        maxLength={15}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", strong && "text-success")}>{value}</span>
    </div>
  );
}
