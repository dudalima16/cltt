import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, today } from "@/lib/format";

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  cost_price: number;
  extra_cost: number;
  sale_price: number;
  extra_charge: number;
  stock: number;
  min_stock: number;
  registered_at: string;
  notes: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  purchased_at: string;
  refund_deadline: string | null;
  refund_status: "nao_solicitado" | "solicitado" | "reembolsado";
  notes: string | null;
};

export type Sale = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  extra_expense: number;
  sold_at: string;
  channel: string | null;
  notes: string | null;
};

export type ProductResearch = {
  id: string;
  name: string;
  source: string | null;
  estimated_cost: number;
  estimated_price: number;
  status: "testando" | "aprovado" | "reprovado";
  notes: string | null;
  created_at: string;
};

const num = <T extends Record<string, unknown>>(row: T, keys: string[]) => {
  const out: Record<string, unknown> = { ...row };
  for (const k of keys) out[k] = Number(row[k] ?? 0);
  return out;
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r) =>
          num(r, [
            "cost_price",
            "extra_cost",
            "sale_price",
            "extra_charge",
            "stock",
            "min_stock",
          ]) as unknown as Product,
      );
    },
  });
}

export function usePurchases() {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async (): Promise<Purchase[]> => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r) => num(r, ["quantity", "unit_cost"]) as unknown as Purchase,
      );
    },
  });
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async (): Promise<Sale[]> => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("sold_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r) =>
          num(r, [
            "quantity",
            "unit_price",
            "unit_cost",
            "discount",
            "extra_expense",
          ]) as unknown as Sale,
      );
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["purchases"] });
    qc.invalidateQueries({ queryKey: ["sales"] });
  };
}

export type ProductInput = {
  name: string;
  sku: string | null;
  category: string | null;
  cost_price: number;
  extra_cost: number;
  sale_price: number;
  extra_charge: number;
  stock: number;
  min_stock: number;
  registered_at: string;
};

export function useSaveProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      previousStock,
      returnWindowDays,
    }: {
      id?: string | undefined;
      values: ProductInput;
      previousStock?: number;
      returnWindowDays?: number | null;
    }) => {
      const user_id = await currentUserId();
      const deadline =
        returnWindowDays != null ? addDays(today(), returnWindowDays) : null;

      if (id) {
        const delta = previousStock !== undefined ? values.stock - previousStock : 0;

        if (delta > 0) {
          // Subiu o estoque editando o produto: registra como compra (o
          // gatilho no banco soma a quantidade sozinho), então não
          // sobrescrevemos o campo "stock" aqui — evita contar em dobro.
          const { stock: _stock, ...rest } = values;
          const { error } = await supabase.from("products").update(rest).eq("id", id);
          if (error) throw error;
          const { error: purchaseError } = await supabase.from("purchases").insert({
            user_id,
            product_id: id,
            quantity: delta,
            unit_cost: values.cost_price,
            purchased_at: today(),
            refund_deadline: deadline,
            notes: "Reposição de estoque (editado em Produtos)",
          });
          if (purchaseError) throw purchaseError;
        } else {
          // Diminuiu ou manteve: é uma correção manual (perda, avaria,
          // ajuste de contagem), não uma compra — atualiza direto.
          const { error } = await supabase.from("products").update(values).eq("id", id);
          if (error) throw error;
        }
        return;
      }

      // O estoque inicial entra como uma compra (não como um número solto no
      // produto), para que o valor investido apareça certo em Compras e em
      // Relatórios, mesmo quando o cadastro é feito só pela tela Produtos.
      const initialStock = values.stock;
      const { data: product, error } = await supabase
        .from("products")
        .insert({ ...values, stock: 0, user_id })
        .select("id")
        .single();
      if (error) throw error;

      if (initialStock > 0) {
        const { error: purchaseError } = await supabase.from("purchases").insert({
          user_id,
          product_id: product.id,
          quantity: initialStock,
          unit_cost: values.cost_price,
          purchased_at: today(),
          refund_deadline: deadline,
          notes: "Estoque inicial (cadastro do produto)",
        });
        if (purchaseError) throw purchaseError;
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRow(table: "products" | "purchases" | "sales" | "product_research") {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCreatePurchase() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: {
      product_id: string;
      quantity: number;
      unit_cost: number;
      purchased_at: string;
      refund_deadline?: string | null;
      notes: string | null;
    }) => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("purchases").insert({
        ...values,
        refund_deadline: values.refund_deadline ?? addDays(values.purchased_at, 7),
        user_id,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePurchaseRefund() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      purchase,
      refund_deadline,
      refund_status,
    }: {
      purchase: Purchase;
      refund_deadline: string | null;
      refund_status: Purchase["refund_status"];
    }) => {
      const { error } = await supabase
        .from("purchases")
        .update({ refund_deadline, refund_status })
        .eq("id", purchase.id);
      if (error) throw error;

      // Quando o status muda PRA "reembolsado", o produto voltou pro
      // fornecedor: tira do estoque e o dinheiro deixa de contar como
      // investido (Painel e Relatórios recalculam sozinhos a partir do
      // estoque atual). Se você desfizer o reembolso, devolve a quantidade.
      const wasRefunded = purchase.refund_status === "reembolsado";
      const isRefunded = refund_status === "reembolsado";
      if (wasRefunded === isRefunded) return;

      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", purchase.product_id)
        .single();
      if (fetchError) throw fetchError;

      const newStock = isRefunded
        ? Math.max(product.stock - purchase.quantity, 0)
        : product.stock + purchase.quantity;

      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", purchase.product_id);
      if (stockError) throw stockError;
    },
    onSuccess: invalidate,
  });
}

export function useCreateSale() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: {
      product_id: string;
      quantity: number;
      unit_price: number;
      unit_cost: number;
      discount: number;
      extra_expense: number;
      sold_at: string;
      channel: string | null;
      notes: string | null;
    }) => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("sales").insert({ ...values, user_id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSale() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        product_id: string;
        quantity: number;
        unit_price: number;
        unit_cost: number;
        discount: number;
        extra_expense: number;
        sold_at: string;
        channel: string | null;
        notes: string | null;
      };
    }) => {
      // A alteração de quantidade/produto é tratada pelo próprio gatilho no
      // banco (ele ajusta o estoque comparando o valor antigo com o novo).
      const { error } = await supabase.from("sales").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useProductResearch() {
  return useQuery({
    queryKey: ["product_research"],
    queryFn: async (): Promise<ProductResearch[]> => {
      const { data, error } = await supabase
        .from("product_research")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r) => num(r, ["estimated_cost", "estimated_price"]) as unknown as ProductResearch,
      );
    },
  });
}

export type ProductResearchInput = {
  name: string;
  source: string | null;
  estimated_cost: number;
  estimated_price: number;
  notes: string | null;
};

export function useSaveProductResearch() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["product_research"] });
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: ProductResearchInput;
    }) => {
      const user_id = await currentUserId();
      if (id) {
        const { error } = await supabase.from("product_research").update(values).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("product_research")
        .insert({ ...values, user_id, status: "testando" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetResearchStatus() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["product_research"] });
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ProductResearch["status"];
    }) => {
      const { error } = await supabase.from("product_research").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// Aprova um item mineirado e já cria o produto real (estoque 0, pra você
// registrar a compra de verdade quando decidir investir). Marca o item de
// mineração como "aprovado" — ele continua no histórico, não some.
export function useApproveResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ProductResearch) => {
      const user_id = await currentUserId();
      const { error: productError } = await supabase.from("products").insert({
        user_id,
        name: item.name,
        cost_price: item.estimated_cost,
        sale_price: item.estimated_price,
        stock: 0,
        min_stock: 0,
        registered_at: today(),
        notes: item.source ? `Vindo da mineração · fonte: ${item.source}` : "Vindo da mineração",
      });
      if (productError) throw productError;
      const { error: statusError } = await supabase
        .from("product_research")
        .update({ status: "aprovado" })
        .eq("id", item.id);
      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product_research"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

