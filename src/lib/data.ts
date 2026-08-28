import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { today } from "@/lib/format";

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
  notes: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  purchased_at: string;
  notes: string | null;
};

export type Sale = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  sold_at: string;
  channel: string | null;
  notes: string | null;
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
        (r) => num(r, ["quantity", "unit_price", "unit_cost"]) as unknown as Sale,
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
};

export function useSaveProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      previousStock,
    }: {
      id?: string | undefined;
      values: ProductInput;
      previousStock?: number;
    }) => {
      const user_id = await currentUserId();

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
          notes: "Estoque inicial (cadastro do produto)",
        });
        if (purchaseError) throw purchaseError;
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRow(table: "products" | "purchases" | "sales") {
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
      notes: string | null;
    }) => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("purchases").insert({ ...values, user_id });
      if (error) throw error;
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

