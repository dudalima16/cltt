import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  useCreateSale,
  useDeleteRow,
  useProducts,
  useSales,
  useUpdateSale,
  type Sale,
} from "@/lib/data";
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
  const update = useUpdateSale();
  const remove = useDeleteRow("sales");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    quantity: "1",
    unit_price: "",
    unit_cost: "",
    discount: "0",
    hasExtraExpense: false,
    extra_expense: "",
    sold_at: today(),
    channel: "",
    notes: "",
  });

  const productMap = new Map((products.data ?? []).map((p) => [p.id, p]));
  const names = new Map((products.data ?? []).map((p) => [p.id, p.name]));
  const revenue = (sales.data ?? []).reduce((s, v) => s + v.quantity * v.unit_price, 0);
  const profit = (sales.data ?? []).reduce(
    (s, v) => s + v.quantity * (v.unit_price - v.unit_cost) - v.extra_expense,
    0,
  );

  const selectedProduct = productMap.get(form.product_id);
  // Editando a mesma venda no mesmo produto, a quantidade antiga já está
  // "reservada" (vai voltar pro estoque), então soma de volta na conta.
  const alreadyReserved = editing && editing.product_id === form.product_id ? editing.quantity : 0;
  const availableStock = (selectedProduct?.stock ?? 0) + alreadyReserved;
  const requestedQty = Math.max(Math.trunc(Number(form.quantity) || 0), 0);
  const exceedsStock = selectedProduct !== undefined && requestedQty > availableStock;

  function pick(id: string) {
    const p = productMap.get(id);
    setForm((f) => ({
      ...f,
      product_id: id,
      unit_price: p ? String(p.sale_price + p.extra_charge) : f.unit_price,
      unit_cost: p ? String(p.cost_price + p.extra_cost) : f.unit_cost,
    }));
  }

  function openNew() {
    setEditing(null);
    setForm({
      product_id: "",
      quantity: "1",
      unit_price: "",
      unit_cost: "",
      discount: "0",
      hasExtraExpense: false,
      extra_expense: "",
      sold_at: today(),
      channel: "",
      notes: "",
    });
    if (products.data?.[0]) pick(products.data[0].id);
    setOpen(true);
  }

  function openEdit(s: Sale) {
    setEditing(s);
    setForm({
      product_id: s.product_id,
      quantity: String(s.quantity),
      unit_price: String(s.unit_price),
      unit_cost: String(s.unit_cost),
      discount: String(s.discount),
      hasExtraExpense: s.extra_expense > 0,
      extra_expense: s.extra_expense > 0 ? String(s.extra_expense) : "",
      sold_at: s.sold_at,
      channel: s.channel ?? "",
      notes: s.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) {
      toast.error("Escolha um produto.");
      return;
    }
    const quantity = Math.max(Math.trunc(Number(form.quantity) || 0), 1);
    if (quantity > availableStock) {
      toast.error(`Estoque insuficiente: disponível ${availableStock} unidade(s).`);
      return;
    }
    const values = {
      product_id: form.product_id,
      quantity,
      unit_price: Number(form.unit_price.replace(",", ".")) || 0,
      unit_cost: Number(form.unit_cost.replace(",", ".")) || 0,
      discount: Math.max(Number(form.discount.replace(",", ".")) || 0, 0),
      extra_expense: form.hasExtraExpense
        ? Math.max(Number(form.extra_expense.replace(",", ".")) || 0, 0)
        : 0,
      sold_at: form.sold_at,
      channel: form.channel.trim().slice(0, 60) || null,
      notes: form.notes.trim().slice(0, 200) || null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, values });
        toast.success("Venda atualizada.");
      } else {
        await create.mutateAsync(values);
        toast.success("Venda registrada e estoque atualizado.");
      }
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar."));
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendas"
        subtitle={`Receita total: ${brl(revenue)} · Lucro total: ${brl(profit)}`}
        action={
          <Button onClick={openNew} disabled={(products.data ?? []).length === 0}>
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
                  <th className="px-4 py-3 font-medium">Dias até vender</th>
                  <th className="px-4 py-3 font-medium">Canal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(sales.data ?? []).map((s) => {
                  const p = s.quantity * (s.unit_price - s.unit_cost) - s.extra_expense;
                  const product = productMap.get(s.product_id);
                  const daysToSell = product
                    ? Math.round(
                        (new Date(`${s.sold_at}T12:00:00`).getTime() -
                          new Date(`${product.registered_at}T12:00:00`).getTime()) /
                          86_400_000,
                      )
                    : null;
                  return (
                    <tr key={s.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">{fullDate(s.sold_at)}</td>
                      <td className="px-4 py-3 font-medium">
                        {names.get(s.product_id) ?? "Produto removido"}
                      </td>
                      <td className="px-4 py-3">{int(s.quantity)}</td>
                      <td className="px-4 py-3">
                        {brl(s.unit_price)}
                        {s.discount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            −{brl(s.discount)} desconto
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">{brl(s.quantity * s.unit_price)}</td>
                      <td className="px-4 py-3">
                        <span className={p >= 0 ? "text-success" : "text-destructive"}>
                          {brl(p)}
                        </span>
                        {s.extra_expense > 0 && (
                          <p className="text-xs text-muted-foreground">
                            −{brl(s.extra_expense)} entrega/gasolina
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {daysToSell !== null && daysToSell >= 0 ? `${int(daysToSell)} dia(s)` : "—"}
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
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                            <Pencil className="size-4" />
                          </Button>
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
            <DialogTitle>{editing ? "Editar venda" : "Nova venda"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Ajuste os dados dessa venda — o estoque se recalcula sozinho."
                : "O custo é preenchido pelo cadastro do produto para calcular o lucro real."}
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
                <Label>Desconto aplicado (R$, opcional)</Label>
                <Input
                  inputMode="decimal"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Só pra registro — ajuste o "Preço de venda" acima se o desconto já mudou
                  o valor final.
                </p>
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
                <Label>Data da venda</Label>
                <Input
                  type="date"
                  value={form.sold_at}
                  onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.hasExtraExpense}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hasExtraExpense: e.target.checked,
                      extra_expense: e.target.checked ? form.extra_expense : "",
                    })
                  }
                  className="size-4 rounded border-input"
                />
                Tive outro gasto nessa venda (entrega, gasolina…)
                {form.hasExtraExpense && (
                  <Input
                    inputMode="decimal"
                    autoFocus
                    value={form.extra_expense}
                    onChange={(e) => setForm({ ...form, extra_expense: e.target.value })}
                    placeholder="Valor (R$)"
                    className="ml-auto h-8 w-28"
                  />
                )}
              </label>
              {form.hasExtraExpense && (
                <p className="text-xs text-muted-foreground">
                  Esse valor abate do lucro dessa venda — é dinheiro que realmente saiu do
                  seu bolso.
                </p>
              )}
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
              <Button
                type="submit"
                disabled={
                  (editing ? update.isPending : create.isPending) ||
                  exceedsStock ||
                  requestedQty < 1
                }
              >
                {editing ? "Salvar alterações" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
