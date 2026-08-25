import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "business_summary",
  title: "Resumo do negócio",
  description:
    "Resumo financeiro: investido em compras, receita, lucro realizado, estoque atual, lucro parado no estoque e produtos com estoque baixo.",
  inputSchema: {
    since: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Considera apenas compras/vendas a partir desta data (AAAA-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ since }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);

    let purchasesQuery = supabase.from("purchases").select("quantity,unit_cost");
    let salesQuery = supabase.from("sales").select("quantity,unit_price,unit_cost");
    if (since) {
      purchasesQuery = purchasesQuery.gte("purchased_at", since);
      salesQuery = salesQuery.gte("sold_at", since);
    }

    const [products, purchases, sales] = await Promise.all([
      supabase.from("products").select("name,cost_price,sale_price,stock,min_stock"),
      purchasesQuery,
      salesQuery,
    ]);
    const failure = products.error ?? purchases.error ?? sales.error;
    if (failure) return { content: [{ type: "text", text: failure.message }], isError: true };

    const round = (n: number) => Number(n.toFixed(2));
    const invested = (purchases.data ?? []).reduce(
      (sum, r) => sum + Number(r.quantity) * Number(r.unit_cost),
      0,
    );
    const revenue = (sales.data ?? []).reduce(
      (sum, r) => sum + Number(r.quantity) * Number(r.unit_price),
      0,
    );
    const profit = (sales.data ?? []).reduce(
      (sum, r) => sum + Number(r.quantity) * (Number(r.unit_price) - Number(r.unit_cost)),
      0,
    );
    const rows = products.data ?? [];
    const stockUnits = rows.reduce((sum, r) => sum + Number(r.stock), 0);
    const stockCost = rows.reduce((sum, r) => sum + Number(r.stock) * Number(r.cost_price), 0);
    const stockPotential = rows.reduce(
      (sum, r) => sum + Number(r.stock) * Number(r.sale_price),
      0,
    );

    const summary = {
      total_products: rows.length,
      stock_units: stockUnits,
      invested: round(invested),
      revenue: round(revenue),
      profit: round(profit),
      margin_pct: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
      stock_cost: round(stockCost),
      stock_potential_revenue: round(stockPotential),
      stock_potential_profit: round(stockPotential - stockCost),
      low_stock: rows
        .filter((r) => Number(r.stock) <= Number(r.min_stock))
        .map((r) => ({ name: r.name, stock: Number(r.stock), min_stock: Number(r.min_stock) })),
      period_since: since ?? null,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});
