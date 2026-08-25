import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import createProduct from "./tools/create-product";
import recordPurchase from "./tools/record-purchase";
import recordSale from "./tools/record-sale";
import businessSummary from "./tools/business-summary";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "gestao-sair-do-clt",
  title: "Gestão Sair do CLT",
  version: "0.1.0",
  instructions:
    "Ferramentas do app Gestão Sair do CLT (controle de estoque, compras, vendas e lucro). Use `list_products` para achar o ID de um produto antes de `record_purchase` ou `record_sale`. Use `business_summary` para investido, receita, lucro e estoque. Valores em reais (BRL) e datas no formato AAAA-MM-DD.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, createProduct, recordPurchase, recordSale, businessSummary] as never,
});
