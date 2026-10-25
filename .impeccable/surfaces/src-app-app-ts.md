---
version: 1
slug: "src-app-app-ts"
primary_target: "src/app/app.ts"
related_targets: ["src/app"]
---

# Painel unificado de estoque

Scope: a tela única do app Angular que substitui os painéis Vista Mar, Usados e Lançamentos. Visitor mode: Operate.

Audience and job: o Carlos, sozinho, no celular ou notebook, muitas vezes ao lado do cliente. Precisa achar em segundos as unidades que cabem no perfil e ver a origem de cada número. Constraints: só as 6 cores da marca, Hanken Grotesk, nenhum dado de tabela perdido, divergências entre tabelas visíveis (reservado tem prioridade).

## Direction contract

THESIS: A praia é a navegação. O estoque inteiro é lido como a orla de Praia Grande, do Canto do Forte a Solemar e Mongaguá, e cada bairro mostra seu volume e sua fatia vista mar. Recusa o painel padrão de KPIs + gráfico de barras + grade de cartões repetido em três abas.

OWN-WORLD: faixa preta #1C1C1C com a linha do mar em amarelo; barras de estoque brancas translúcidas com a fatia vista mar em amarelo; páginas cinza-gelo; tabela branca com cabeçalho cinza claro; etiquetas com cantos de 6px; caixas de 24px; títulos Black caixa alta; amarelo só como marca-texto no claro.

STORY: o Carlos entende onde está o estoque, toca um trecho da orla ou usa os segmentos (Usados, Lançamentos, Em obra, Vista mar) e a busca, e chega à lista de unidades com valor, condição e tabela de origem. Abre a unidade ou o prédio para ver tudo e confirmar.

FIRST VIEWPORT: barra preta com o nome, a busca e os segmentos; logo abaixo, a faixa da orla com 13 trechos em ordem geográfica, cada um com uma barra de unidades disponíveis e a fatia vista mar; o mar marcado embaixo. Depois, os indicadores do recorte e a lista de prédios e unidades. A ação principal é tocar um trecho ou um segmento; filtros finos ficam num painel "Mais filtros".

FORM: estrutura 6 de 7 da lista ordenada (a orla como navegação), dealt lead. seed:45cfea369642699f

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: tocar um trecho da orla filtra todo o painel e o trecho fica marcado em marca-texto; segurar Shift ou arrastar seleciona um intervalo contíguo de bairros. Motion: as barras crescem para o novo recorte em 200ms; nada mais anima.

Unresolved: posição de Imperador na faixa (entre Caiçara e Real, deduzida pela numeração da Av. Castelo Branco). Vila Assunção fica no interior, em "Outros" (confirmado pelo Carlos em 24/10/2026).
