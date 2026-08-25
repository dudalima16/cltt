import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_purchase",
  title: "Registrar compra",
  description:
    "Registra uma compra (entrada de estoque) de um produto. O estoque é atualizado automaticamente.",
  inputSchema: {
    product_id: z.string().uuid().describe("ID do produto (use list_products)."),
    quantity: z.number().int().min(1).describe("Quantidade comprada."),
    unit_cost: z.number().min(0).describe("Custo unitário pago (R$)."),
    purchased_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Data da compra (AAAA-MM-DD). Padrão: hoje."),
    notes: z.string().trim().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("purchases")
      .insert({
        user_id: ctx.getUserId(),
        product_id: input.product_id,
        quantity: input.quantity,
        unit_cost: input.unit_cost,
        purchased_at: input.purchased_at ?? new Date().toISOString().slice(0, 10),
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { purchase: data },
    };
  },
});
