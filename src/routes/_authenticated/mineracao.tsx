import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
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

const empty = { name: "", source: "", estimated_cost: "", estimated_price: "", notes: "" };

const TARGET_MARGIN = 50; // referência: veja a recomendação dada no chat

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
  const [form, setForm] = useState(empty);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("testando");

  const list = useMemo(() => {
    const all = research.data ?? [];
    return tab === "all" ? all : all.filter((r) => r.status === tab);
  }, [research.data, tab]);

  const estCost = Number(form.estimated_cost.replace(",", ".")) || 0;
  const estPrice = Number(form.estimated_price.replace(",", ".")) || 0;
  const estMargin = estPrice > 0 ? ((estPrice - estCost) / estPrice) * 100 : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Dá um nome pro produto.");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          name: name.slice(0, 120),
          source: form.source.trim().slice(0, 200) || null,
          estimated_cost: estCost,
          estimated_price: estPrice,
          notes: form.notes.trim().slice(0, 300) || null,
        },
      });
      toast.success("Anotado.");
      setOpen(false);
      setForm(empty);
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar."));
    }
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
          <Button onClick={() => (setForm(empty), setOpen(true))}>
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
                  <th className="px-4 py-3 font-medium">Margem estimada</th>
                  <th className="px-4 py-3 font-medium">Anotado em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const margin =
                    r.estimated_price > 0
                      ? ((r.estimated_price - r.estimated_cost) / r.estimated_price) * 100
                      : 0;
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
              Novo produto testado
            </DialogTitle>
            <DialogDescription>
              Anote antes de comprar — pra não esquecer o que já pesquisou.
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
            {(estCost > 0 || estPrice > 0) && (
              <p
                className={cn(
                  "text-sm",
                  estMargin >= TARGET_MARGIN
                    ? "text-success"
                    : estMargin >= 30
                      ? "text-warning"
                      : "text-destructive",
                )}
              >
                Margem estimada: {pct(estMargin)}{" "}
                {estMargin >= TARGET_MARGIN
                  ? "— boa margem, bate a meta de 50%+."
                  : estMargin >= 30
                    ? "— no limite, dá pra seguir mas sem muita folga."
                    : "— abaixo do saudável (30%+), qualquer imprevisto já zera o lucro."}
              </p>
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
