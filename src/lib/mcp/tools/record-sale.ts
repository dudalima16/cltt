import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_sale",
  title: "Registrar venda",
  description:
    "Registra uma venda de um produto. Baixa o estoque e guarda o custo unitário para calcular o lucro real.",
  inputSchema: {
    product_id: z.string().uuid().describe("ID do produto (use list_products)."),
    quantity: z.number().int().min(1).describe("Quantidade vendida."),
    unit_price: z.number().min(0).describe("Preço unitário de venda (R$)."),
    unit_cost: z
      .number()
      .min(0)
      .optional()
      .describe("Custo unitário. Se omitido, usa o custo cadastrado no produto."),
    sold_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Data da venda (AAAA-MM-DD). Padrão: hoje."),
    discount: z
      .number()
      .min(0)
      .optional()
      .describe("Desconto aplicado nessa venda, só pra registro (padrão 0)."),
    extra_expense: z
      .number()
      .min(0)
      .optional()
      .describe("Gasto extra na venda, ex.: entrega ou gasolina — abate do lucro (padrão 0)."),
    channel: z.string().trim().optional().describe("Canal de venda (ex.: Instagram, Shopee)."),
    notes: z.string().trim().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);

    let unitCost = input.unit_cost;
    if (unitCost === undefined) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("cost_price")
        .eq("id", input.product_id)
        .single();
      if (productError)
        return { content: [{ type: "text", text: productError.message }], isError: true };
      unitCost = Number(product.cost_price);
    }

    const { data, error } = await supabase
      .from("sales")
      .insert({
        user_id: ctx.getUserId(),
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: input.unit_price,
        unit_cost: unitCost,
        sold_at: input.sold_at ?? new Date().toISOString().slice(0, 10),
        discount: input.discount ?? 0,
        extra_expense: input.extra_expense ?? 0,
        channel: input.channel ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { sale: data },
    };
  },
});
