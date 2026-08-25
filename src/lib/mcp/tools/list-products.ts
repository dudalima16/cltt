import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description:
    "Lista os produtos do usuário com custo, preço de venda, estoque, estoque mínimo e margem.",
  inputSchema: {
    search: z.string().trim().optional().describe("Filtra pelo nome do produto."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de itens (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    let query = supabaseForUser(ctx)
      .from("products")
      .select("id,name,sku,category,cost_price,sale_price,stock,min_stock")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((r) => {
      const cost = Number(r.cost_price);
      const price = Number(r.sale_price);
      return {
        ...r,
        cost_price: cost,
        sale_price: price,
        margin_pct: price > 0 ? Number((((price - cost) / price) * 100).toFixed(1)) : 0,
      };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { products: rows },
    };
  },
});
