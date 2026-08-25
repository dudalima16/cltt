import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { useCreateSale, useDeleteRow, useProducts, useSales } from "@/lib/data";
import { brl, errorMessage, fullDate, int, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Registre suas vendas e veja o lucro real de cada negociação.",
      },
      { property: "og:title", content: "Vendas — Gestão Sair do CLT" },
      {
        property: "og:description",
        content: "Registre suas vendas e veja o lucro real de cada negociação.",
      },
    ],
  }),
  component: Vendas,
});

function Vendas() {
  const products = useProducts();
  const sales = useSales();
  const create = useCreateSale();
  const remove = useDeleteRow("sales");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    quantity: "1",
    unit_price: "",
    unit_cost: "",
    sold_at: today(),
    channel: "",
    notes: "",
  });

  const names = new Map((products.data ?? []).map((p) => [p.id, p.name]));
  const revenue = (sales.data ?? []).reduce((s, v) => s + v.quantity * v.unit_price, 0);
  const profit = (sales.data ?? []).reduce(
    (s, v) => s + v.quantity * (v.unit_price - v.unit_cost),
    0,
  );

  const selectedProduct = (products.data ?? []).find((p) => p.id === form.product_id);
  const availableStock = selectedProduct?.stock ?? 0;
  const requestedQty = Math.max(Math.trunc(Number(form.quantity) || 0), 0);
  const exceedsStock = selectedProduct !== undefined && requestedQty > availableStock;

  function pick(id: string) {
    const p = (products.data ?? []).find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      product_id: id,
      unit_price: p ? String(p.sale_price) : f.unit_price,
      unit_cost: p ? String(p.cost_price + p.extra_cost) : f.unit_cost,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) {
      toast.error("Escolha um produto.");
      return;
    }
    const quantity = Math.max(Math.trunc(Number(form.quantity) || 0), 1);
    if (selectedProduct && quantity > selectedProduct.stock) {
      toast.error(
        `Estoque insuficiente: você tem ${selectedProduct.stock} unidade(s) de "${selectedProduct.name}".`,
      );
      return;
    }
    try {
      await create.mutateAsync({
        product_id: form.product_id,
        quantity,
        unit_price: Number(form.unit_price.replace(",", ".")) || 0,
        unit_cost: Number(form.unit_cost.replace(",", ".")) || 0,
        sold_at: form.sold_at,
        channel: form.channel.trim().slice(0, 60) || null,
        notes: form.notes.trim().slice(0, 200) || null,
      });
      toast.success("Venda registrada e estoque atualizado.");
      setOpen(false);
      setForm({ ...form, quantity: "1", notes: "" });
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao registrar."));
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendas"
        subtitle={`Receita total: ${brl(revenue)} · Lucro total: ${brl(profit)}`}
        action={
          <Button
            onClick={() => {
              if (!form.product_id && products.data?.[0]) pick(products.data[0].id);
              setOpen(true);
            }}
            disabled={(products.data ?? []).length === 0}
          >
            <Plus className="size-4" /> Nova venda
          </Button>
        }
      />

      <div className="panel overflow-hidden">
        {(sales.data ?? []).length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {(products.data ?? []).length === 0
              ? "Cadastre um produto primeiro para registrar vendas."
              : "Nenhuma venda registrada ainda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Qtd.</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Receita</th>
                  <th className="px-4 py-3 font-medium">Lucro</th>
                  <th className="px-4 py-3 font-medium">Canal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(sales.data ?? []).map((s) => {
                  const p = s.quantity * (s.unit_price - s.unit_cost);
                  return (
                    <tr key={s.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">{fullDate(s.sold_at)}</td>
                      <td className="px-4 py-3 font-medium">
                        {names.get(s.product_id) ?? "Produto removido"}
                      </td>
                      <td className="px-4 py-3">{int(s.quantity)}</td>
                      <td className="px-4 py-3">{brl(s.unit_price)}</td>
                      <td className="px-4 py-3">{brl(s.quantity * s.unit_price)}</td>
                      <td className="px-4 py-3">
                        <span className={p >= 0 ? "text-success" : "text-destructive"}>
                          {brl(p)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{s.channel ?? "—"}</div>
                        {s.notes && (
                          <div className="mt-0.5 max-w-[16rem] truncate text-xs italic text-muted-foreground/80">
                            {s.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Excluir esta venda? O estoque será devolvido.")) {
                              remove.mutate(s.id, {
                                onSuccess: () => toast.success("Venda excluída."),
                              });
                            }
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
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
            <DialogTitle>Nova venda</DialogTitle>
            <DialogDescription>
              O custo é preenchido pelo cadastro do produto para calcular o lucro real.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <select
                value={form.product_id}
                onChange={(e) => pick(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {(products.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {int(p.stock)} un.
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  aria-invalid={exceedsStock}
                  className={exceedsStock ? "border-destructive" : undefined}
                />
                <p
                  className={
                    exceedsStock
                      ? "text-xs font-medium text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {exceedsStock
                    ? `Só há ${int(availableStock)} unidade(s) em estoque.`
                    : `Disponível: ${int(availableStock)} unidade(s).`}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Preço de venda (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo unitário (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.unit_cost}
                  onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.sold_at}
                  onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Input
                value={form.channel}
                maxLength={60}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                placeholder="WhatsApp, Facebook Marketplace, Shopee, presencial…"
              />
            </div>
            <div className="space-y-2">
              <Label>Para quem / observação (opcional)</Label>
              <Input
                value={form.notes}
                maxLength={200}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex.: vendi pra uma amiga, cliente do grupo do bairro…"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending || exceedsStock || requestedQty < 1}>
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
