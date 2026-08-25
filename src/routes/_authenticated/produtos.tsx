import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { useDeleteRow, useProducts, useSaveProduct, type Product } from "@/lib/data";
import { brl, errorMessage, int, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Gestão Sair do CLT" },
      {
        name: "description",
        content: "Cadastre seus produtos com preço de compra, preço de venda e estoque mínimo.",
      },
      { property: "og:title", content: "Produtos — Gestão Sair do CLT" },
      {
        property: "og:description",
        content: "Cadastre seus produtos com preço de compra, preço de venda e estoque mínimo.",
      },
    ],
  }),
  component: Produtos,
});

const empty = {
  name: "",
  sku: "",
  category: "",
  cost_price: "",
  extra_cost: "",
  sale_price: "",
  stock: "0",
  min_stock: "0",
};

function Produtos() {
  const products = useProducts();
  const save = useSaveProduct();
  const remove = useDeleteRow("products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products.data ?? []).filter(
      (p) =>
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.sku ?? "").toLowerCase().includes(term) ||
        (p.category ?? "").toLowerCase().includes(term),
    );
  }, [products.data, search]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      category: p.category ?? "",
      cost_price: String(p.cost_price),
      extra_cost: String(p.extra_cost),
      sale_price: String(p.sale_price),
      stock: String(p.stock),
      min_stock: String(p.min_stock),
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome do produto.");
      return;
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        previousStock: editing?.stock,
        values: {
          name: name.slice(0, 120),
          sku: form.sku.trim().slice(0, 60) || null,
          category: form.category.trim().slice(0, 60) || null,
          cost_price: Number(form.cost_price.replace(",", ".")) || 0,
          extra_cost: Number(form.extra_cost.replace(",", ".")) || 0,
          sale_price: Number(form.sale_price.replace(",", ".")) || 0,
          stock: Math.max(Math.trunc(Number(form.stock) || 0), 0),
          min_stock: Math.max(Math.trunc(Number(form.min_stock) || 0), 0),
        },
      });
      toast.success(editing ? "Produto atualizado." : "Produto cadastrado.");
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar."));
    }
  }

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Quanto você pagou e por quanto pode vender"
        action={
          <Button onClick={openNew}>
            <Plus className="size-4" /> Novo produto
          </Button>
        }
      />

      <div className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou categoria"
            maxLength={80}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {list.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado ainda. Comece adicionando o que você comprou.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Custo</th>
                  <th className="px-4 py-3 font-medium">Venda</th>
                  <th className="px-4 py-3 font-medium">Margem</th>
                  <th className="px-4 py-3 font-medium">Estoque</th>
                  <th className="px-4 py-3 font-medium">Retorno previsto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const totalCost = p.cost_price + p.extra_cost;
                  const margin =
                    p.sale_price > 0 ? ((p.sale_price - totalCost) / p.sale_price) * 100 : 0;
                  return (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[p.sku, p.category].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {brl(totalCost)}
                        {p.extra_cost > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {brl(p.cost_price)} + {brl(p.extra_cost)} outros
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">{brl(p.sale_price)}</td>
                      <td className="px-4 py-3">
                        <span className={margin >= 0 ? "text-success" : "text-destructive"}>
                          {pct(margin)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            p.stock <= p.min_stock ? "font-medium text-warning" : undefined
                          }
                        >
                          {int(p.stock)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{brl(p.stock * p.sale_price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Excluir "${p.name}" e seu histórico?`)) {
                                remove.mutate(p.id, {
                                  onSuccess: () => toast.success("Produto excluído."),
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>
              Informe o valor que você pagou e por quanto pretende revender.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do produto</Label>
              <Input
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código / SKU</Label>
                <Input
                  value={form.sku}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de custo (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de venda (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.sale_price}
                  onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Outros custos por unidade (R$, opcional)</Label>
                <Input
                  inputMode="decimal"
                  value={form.extra_cost}
                  onChange={(e) => setForm({ ...form, extra_cost: e.target.value })}
                  placeholder="Ex.: gasolina, taxa de entrega que você paga…"
                />
                <p className="text-xs text-muted-foreground">
                  Some no custo do produto pra margem e lucro ficarem certos. Não é a taxa
                  de marketplace (essa você calcula na Calculadora de Margem).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">{editing ? "Estoque atual" : "Estoque inicial"}</Label>
                <Input
                  id="stock"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {editing
                    ? "Aumentar esse número conta como uma nova compra (investimento) automaticamente. Diminuir é tratado como correção manual (perda, avaria, contagem)."
                    : "Quantidade que você já tem. Isso conta como investimento automaticamente nos Relatórios."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Estoque mínimo de alerta</Label>
                <Input
                  id="min_stock"
                  inputMode="numeric"
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Quando o estoque atual chegar nesse número, o painel avisa que está acabando.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
