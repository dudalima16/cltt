# Redesign do Painel — "Gestão Sair do CLT"

## Contexto
A tela atual do painel empilha as informações verticalmente: cards de resumo, gráfico + estoque baixo, e só depois o bloco **Investimento & retorno previsto**. O usuário relatou que essa visualização não está legal e que o retorno sobre investimento aparece "bem embaixo", dificultando a leitura do indicador mais importante para quem está saindo do CLT.

## Objetivo
Reorganizar o painel para dar destaque imediato ao investimento e retorno, melhorar a hierarquia visual e garantir que as métricas-chave sejam lidas de um só olhar.

## O que será feito

### 1. Hero de investimento no topo
- Criar uma seção destacada no topo do painel com os três números principais:
  - **Investido em estoque** (custo total em estoque)
  - **Retorno se vender tudo** (receita potencial)
  - **Lucro previsto** (diferença) e a **margem / ROI** (%)
- Usar cards maiores, cores de destaque (violeta e esmeralda) e tipografia em destaque para transformar essa seção no "resumo do negócio".

### 2. Cards de resumo logo abaixo
- Manter os quatro cards atuais (Total de produtos, Estoque disponível, Receita do período, Lucro do período) mas com visual mais compacto, como linha secundária de KPIs.

### 3. Reorganização do gráfico e estoque baixo
- Manter o gráfico Receita × Lucro e o alerta de estoque baixo em uma segunda linha.
- Garantir que o bloco de estoque baixo continue visível, mas sem roubar o protagonismo do investimento.

### 4. Melhorias de UX
- Adicionar um tooltip/legenda explicando que o retorno previsto é baseado no preço de venda cadastrado e no estoque atual.
- Adicionar a porcentagem de retorno sobre investimento (ROI) no card de destaque.
- Garantir que a tela continue responsiva (mobile → desktop).

### 5. Nada de backend
- Apenas reorganização e cálculo de `metrics` já existentes no `src/routes/_authenticated/painel.tsx`.
- Não serão criadas novas tabelas, rotas ou server functions.

## Arquivos alterados
- `src/routes/_authenticated/painel.tsx` — reestruturação do layout e cálculo do ROI.

## Critério de conclusão
- O painel mostra o bloco de investimento/retorno no topo, com ROI percentual visível.
- Os cards originais continuam funcionando.
- O gráfico e o alerta de estoque baixo continuam presentes.
- Build passa e visualização no preview fica clara.
