# Gastos extras (gasolina, Uber, embalagem...)

## O que vamos construir

Hoje o app só registra dinheiro ligado a produtos (compras e vendas). Vamos adicionar os **gastos do negócio** que não são mercadoria: gasolina, Uber, embalagem, taxas, etc.

### 1. Nova aba "Gastos" no menu
- Botão **"Novo gasto"** abrindo um formulário simples:
  - Descrição (ex.: "Gasolina para entrega")
  - Categoria: Gasolina, Transporte/Uber, Embalagem, Marketing, Taxas, Outros
  - Valor (R$)
  - Data
  - Observação (opcional)
- Lista dos gastos com **total do período** e **total por categoria** no topo
- Opção de excluir um gasto lançado errado

### 2. Painel mostra quanto realmente sobra
- Novo cartão **"Gastos do período"** ao lado de receita e lucro
- O card de lucro passa a mostrar também o **lucro líquido** (lucro das vendas − gastos extras), respeitando o filtro de período (hoje, 7 dias, 28 dias...)

### 3. Relatórios
- Gastos extras entram no resumo: receita, lucro bruto, gastos e **lucro líquido real**

## Detalhes técnicos
- Nova tabela `expenses` no banco (descrição, categoria, valor, data, observação) com as mesmas regras de segurança das outras: cada usuário só vê e edita os próprios gastos
- Hooks novos em `src/lib/data.ts` (`useExpenses`, `useCreateExpense`) e exclusão reaproveitando o `useDeleteRow`
- Nova rota `src/routes/_authenticated/gastos.tsx` seguindo o mesmo padrão visual da tela de Vendas (formulário em dialog + tabela)
- Item "Gastos" no menu lateral com ícone de recibo
- Nada muda nas telas de Produtos, Compras, Vendas e Calculadora
