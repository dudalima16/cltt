import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FlaskConical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useApproveResearch,
  useDeleteRow,
  useProductResearch,
  useSaveProductResearch,
  useSetResearchStatus,
  type ProductResearch,
} from "@/lib/data";
import { brl, errorMessage, fullDate, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mineracao")({
  head: () => ({
    meta: [
      { title: "Mineração de Produto — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Anote os produtos que está testando antes de investir de verdade.",
      },
    ],
  }),
  component: Mineracao,
});

const empty = {
  name: "",
  source: "",
  estimated_cost: "",
  estimated_price: "",
  marketplace_fee_pct: "0",
  marketplace_fixed_fee: "0",
  tax_pct: "0",
  ads_cost: "0",
  notes: "",
};

const TARGET_MARGIN = 50; // referência: veja a recomendação dada no chat

// Referência de mercado (2026) — comissão % e taxa fixa por unidade.
// Comissão do Mercado Livre varia dentro da faixa por categoria; abaixo de
// R$79 a taxa fixa depende de peso/dimensão (aqui é uma média). Confira o
// valor exato no seu anúncio antes de decidir. Mesma referência da
// Calculadora de Margem.
const marketplacePresets = [
  { label: "ML Clássico · até R$79", feePct: 12, fixedFee: 6 },
  { label: "ML Clássico · R$79+", feePct: 12, fixedFee: 0 },
  { label: "ML Premium · até R$79", feePct: 17, fixedFee: 6 },
  { label: "ML Premium · R$79+", feePct: 17, fixedFee: 0 },
  { label: "Shopee · até R$79", feePct: 20, fixedFee: 4 },
  { label: "Shopee · R$80–99", feePct: 14, fixedFee: 16 },
  { label: "Shopee · R$100–199", feePct: 14, fixedFee: 20 },
  { label: "Shopee · R$200+", feePct: 14, fixedFee: 26 },
  { label: "TikTok Shop · até R$50", feePct: 10, fixedFee: 4 },
  { label: "TikTok Shop · R$50+", feePct: 6, fixedFee: 6 },
];

const tabs = [
  { key: "testando", label: "Testando" },
  { key: "aprovado", label: "Aprovados" },
  { key: "reprovado", label: "Reprovados" },
  { key: "all", label: "Todos" },
] as const;

function Mineracao() {
  const research = useProductResearch();
  const save = useSaveProductResearch();
  const setStatus = useSetResearchStatus();
  const approve = useApproveResearch();
  const del = useDeleteRow("product_research");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResearch | null>(null);
  const [form, setForm] = useState(empty);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("testando");

  const list = useMemo(() => {
    const all = research.data ?? [];
    return tab === "all" ? all : all.filter((r) => r.status === tab);
  }, [research.data, tab]);

  const estCost = Number(form.estimated_cost.replace(",", ".")) || 0;
  const estPrice = Number(form.estimated_price.replace(",", ".")) || 0;
  const feePct = Number(form.marketplace_fee_pct.replace(",", ".")) || 0;
  const fixedFee = Number(form.marketplace_fixed_fee.replace(",", ".")) || 0;
  const taxPct = Number(form.tax_pct.replace(",", ".")) || 0;
  const adsCost = Number(form.ads_cost.replace(",", ".")) || 0;
  const estFees = estPrice * (feePct / 100) + fixedFee;
  const estTax = estPrice * (taxPct / 100);
  const estNetProfit = estPrice - estCost - estFees - estTax - adsCost;
  const estMargin = estPrice > 0 ? (estNetProfit / estPrice) * 100 : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Dá um nome pro produto.");
      return;
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        values: {
          name: name.slice(0, 120),
          source: form.source.trim().slice(0, 200) || null,
          estimated_cost: estCost,
          estimated_price: estPrice,
          marketplace_fee_pct: feePct,
          marketplace_fixed_fee: fixedFee,
          tax_pct: taxPct,
          ads_cost: adsCost,
          notes: form.notes.trim().slice(0, 300) || null,
        },
      });
      toast.success("Anotado.");
      setOpen(false);
      setEditing(null);
      setForm(empty);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar."));
    }
  }

  function openEdit(r: ProductResearch) {
    setEditing(r);
    setForm({
      name: r.name,
      source: r.source ?? "",
      estimated_cost: String(r.estimated_cost),
      estimated_price: String(r.estimated_price),
      marketplace_fee_pct: String(r.marketplace_fee_pct),
      marketplace_fixed_fee: String(r.marketplace_fixed_fee),
      tax_pct: String(r.tax_pct),
      ads_cost: String(r.ads_cost),
      notes: r.notes ?? "",
    });
    setOpen(true);
  }

  async function onApprove(item: ProductResearch) {
    try {
      await approve.mutateAsync(item);
      toast.success(`"${item.name}" virou produto — vá em Produtos pra registrar a compra.`);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao aprovar."));
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <PageHeader
        title="Mineração de Produto"
        subtitle="Anote o que está testando antes de comprar em quantidade"
        action={
          <Button onClick={() => (setEditing(null), setForm(empty), setOpen(true))}>
            <Plus className="mr-1.5 size-4" />
            Novo produto testado
          </Button>
        }
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
            {tab === "testando"
              ? "Nada em teste agora. Cadastra aqui toda ideia de produto antes de comprar, pra não esquecer."
              : "Nada por aqui ainda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Custo estimado</th>
                  <th className="px-4 py-3 font-medium">Venda estimada</th>
                  <th className="px-4 py-3 font-medium">Lucro líquido</th>
                  <th className="px-4 py-3 font-medium">Margem líquida</th>
                  <th className="px-4 py-3 font-medium">Anotado em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const fees =
                    r.estimated_price * (r.marketplace_fee_pct / 100) + r.marketplace_fixed_fee;
                  const tax = r.estimated_price * (r.tax_pct / 100);
                  const netProfit = r.estimated_price - r.estimated_cost - fees - tax - r.ads_cost;
                  const margin = r.estimated_price > 0 ? (netProfit / r.estimated_price) * 100 : 0;
                  return (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.name}</p>
                        {r.source && (
                          <p className="text-xs text-muted-foreground">{r.source}</p>
                        )}
                        {r.notes && (
                          <p className="mt-0.5 text-xs italic text-muted-foreground/80">
                            {r.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {brl(r.estimated_cost)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {brl(r.estimated_price)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={netProfit >= 0 ? "text-success" : "text-destructive"}>
                          {brl(netProfit)}
                        </span>
                        {(r.marketplace_fee_pct > 0 ||
                          r.marketplace_fixed_fee > 0 ||
                          r.tax_pct > 0 ||
                          r.ads_cost > 0) && (
                          <p className="text-xs text-muted-foreground">
                            taxa {brl(fees)} · imposto {brl(tax)} · ads {brl(r.ads_cost)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            margin >= TARGET_MARGIN
                              ? "text-success"
                              : margin >= 30
                                ? "text-warning"
                                : "text-destructive"
                          }
                        >
                          {pct(margin)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fullDate(r.created_at.slice(0, 10))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === "testando" && (
                            <>
                              <button
                                onClick={() => onApprove(r)}
                                className="rounded-lg bg-success/15 px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-success/25"
                              >
                                Aprovar → cadastrar
                              </button>
                              <button
                                onClick={() =>
                                  setStatus.mutate({ id: r.id, status: "reprovado" })
                                }
                                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              >
                                Reprovar
                              </button>
                            </>
                          )}
                          {r.status === "aprovado" && (
                            <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                              Virou produto
                            </span>
                          )}
                          {r.status === "reprovado" && (
                            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                              Não vale a pena
                            </span>
                          )}
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => del.mutate(r.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="size-4" />
              {editing ? "Editar produto testado" : "Novo produto testado"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Ajuste os valores conforme for descobrindo mais."
                : "Anote antes de comprar — pra não esquecer o que já pesquisou."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do produto</Label>
              <Input
                autoFocus
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Onde encontrou (fornecedor, link — opcional)</Label>
              <Input
                value={form.source}
                maxLength={200}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Ex.: AliExpress, fornecedor tal, link do anúncio…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo estimado (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.estimated_cost}
                  onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Venda estimada (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.estimated_price}
                  onChange={(e) => setForm({ ...form, estimated_price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Preencher com taxa do marketplace (opcional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {marketplacePresets.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        marketplace_fee_pct: String(m.feePct),
                        marketplace_fixed_fee: String(m.fixedFee),
                      })
                    }
                    className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Valores de referência (2026) — a taxa exata varia por categoria/faixa de
                preço. Se não souber a taxa certa, preenche direto os campos abaixo. No
                TikTok Shop, todo vendedor no Brasil já entra automaticamente no Programa de
                Taxa de Envio — mais 6% do preço (até R$50 por item) some do repasse, não é
                opcional; soma na taxa fixa se quiser refletir isso. Vendedor novo pode ter
                isenção de comissão por 60 dias (até R$17.000 em vendas) — confira na Central
                do Vendedor.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa do marketplace (%)</Label>
                <Input
                  inputMode="decimal"
                  value={form.marketplace_fee_pct}
                  onChange={(e) => setForm({ ...form, marketplace_fee_pct: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa fixa do marketplace (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.marketplace_fixed_fee}
                  onChange={(e) => setForm({ ...form, marketplace_fixed_fee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Imposto (%)</Label>
                <Input
                  inputMode="decimal"
                  value={form.tax_pct}
                  onChange={(e) => setForm({ ...form, tax_pct: e.target.value })}
                  placeholder="0 se MEI"
                />
                <p className="text-xs text-muted-foreground">
                  Como MEI, geralmente 0 (você paga o DAS fixo à parte). Preencha se migrar
                  pro Simples Nacional.
                </p>
              </div>
              <div className="space-y-2">
                <Label>ADS por unidade (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.ads_cost}
                  onChange={(e) => setForm({ ...form, ads_cost: e.target.value })}
                  placeholder="Ex.: impulsionamento, tráfego pago…"
                />
              </div>
            </div>
            {(estCost > 0 || estPrice > 0) && (
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Venda estimada</span>
                  <span>{brl(estPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>− Custo</span>
                  <span>{brl(estCost)}</span>
                </div>
                {estFees > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>− Taxa marketplace</span>
                    <span>{brl(estFees)}</span>
                  </div>
                )}
                {estTax > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>− Imposto</span>
                    <span>{brl(estTax)}</span>
                  </div>
                )}
                {adsCost > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>− ADS</span>
                    <span>{brl(adsCost)}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                  <span>Lucro líquido</span>
                  <span className={estNetProfit >= 0 ? "text-success" : "text-destructive"}>
                    {brl(estNetProfit)}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    estMargin >= TARGET_MARGIN
                      ? "text-success"
                      : estMargin >= 30
                        ? "text-warning"
                        : "text-destructive",
                  )}
                >
                  Margem líquida: {pct(estMargin)}{" "}
                  {estMargin >= TARGET_MARGIN
                    ? "— boa margem, bate a meta de 50%+."
                    : estMargin >= 30
                      ? "— no limite, dá pra seguir mas sem muita folga."
                      : "— abaixo do saudável (30%+), qualquer imprevisto já zera o lucro."}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                value={form.notes}
                maxLength={300}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Concorrência, demanda, o que achou…"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => (setOpen(false), setEditing(null))}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
