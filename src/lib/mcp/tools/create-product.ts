import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_product",
  title: "Cadastrar produto",
  description:
    "Cadastra um produto com preço de custo, preço de venda e estoque inicial para o usuário autenticado.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Nome do produto."),
    cost_price: z.number().min(0).describe("Quanto você pagou por unidade (R$)."),
    extra_cost: z
      .number()
      .min(0)
      .optional()
      .describe("Outros custos por unidade, ex.: gasolina, taxa de entrega (padrão 0)."),
    sale_price: z.number().min(0).describe("Por quanto pretende vender por unidade (R$)."),
    extra_charge: z
      .number()
      .min(0)
      .optional()
      .describe("Cobrança extra por unidade, ex.: taxa de entrega cobrada do cliente (padrão 0)."),
    stock: z.number().int().min(0).optional().describe("Estoque inicial (padrão 0)."),
    min_stock: z.number().int().min(0).optional().describe("Estoque mínimo de alerta (padrão 0)."),
    sku: z.string().trim().optional(),
    category: z.string().trim().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const initialStock = input.stock ?? 0;

    // O estoque inicial vira uma compra (mesma regra da tela Produtos), para
    // que o investimento apareça certo em Compras e Relatórios.
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id: userId,
        name: input.name,
        sku: input.sku ?? null,
        category: input.category ?? null,
        cost_price: input.cost_price,
        extra_cost: input.extra_cost ?? 0,
        sale_price: input.sale_price,
        extra_charge: input.extra_charge ?? 0,
        stock: 0,
        min_stock: input.min_stock ?? 0,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    if (initialStock > 0) {
      const { error: purchaseError } = await supabase.from("purchases").insert({
        user_id: userId,
        product_id: data.id,
        quantity: initialStock,
        unit_cost: input.cost_price,
        purchased_at: new Date().toISOString().slice(0, 10),
        notes: "Estoque inicial (cadastro do produto)",
      });
      if (purchaseError)
        return { content: [{ type: "text", text: purchaseError.message }], isError: true };
      data.stock = initialStock;
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { product: data },
    };
  },
});
