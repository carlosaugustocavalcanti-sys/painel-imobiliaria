# Design

Mundo visual herdado da marca pessoal Carlos Cavalcanti Imóveis (skill `marca-carlos-cavalcanti`). Tokens em `src/styles.css`.

## Cores (só estas 6)

| Token | Valor | Uso |
|---|---|---|
| `--amarelo` | #F2B300 | marca-texto atrás de números-chave, filtro ligado (vista mar), fatia vista mar na orla, aba atual |
| `--preto` | #1C1C1C | topo e faixa da orla, texto, botões, chip selecionado |
| `--gelo` | #F2F2F0 | fundo da página e da ficha |
| `--claro` | #E2E2DF | bordas, cabeçalho de tabela, etiquetas |
| `--cinza` | #5C5C5C | texto secundário, rótulos, fonte dos dados |
| `--branco` | #FFFFFF | texto sobre preto, cartões, campos |

Regra do amarelo: sobre fundo claro ele nunca é cor de texto, só bloco de marca-texto (`.mk`) com texto preto. Texto amarelo só sobre preto.

## Tipografia

Hanken Grotesk 500/700/800/900. Títulos em caixa alta, Black 900, tracking -0,04em. Rótulos em 10,5px ExtraBold, caixa alta, tracking +0,12em. Números em `tabular-nums`.

## Formas

Etiquetas e controles com cantos de 6px (`--r-tag`); caixas e cartões com 24px (`--r-caixa`); linhas de unidade com 14px. Bordas de 1,5px em `--claro`. Sem sombras.

## Estrutura (direção "A Orla")

1. **Topo preto**: título, assinatura (nome, CRECI 331032, @carlos_cavalcanti_imoveis_), busca grande, segmentos Todos/Usados/Lançamentos com contagem e a chave "Só vista mar".
2. **Faixa da orla**: um botão por bairro de praia, do Canto do Forte a Mongaguá na ordem da costa, mais "Outros". A altura da barra é a raiz das unidades do filtro atual; a fatia amarela são as unidades com vista mar. Tocar liga/desliga o bairro (multisseleção). Linha amarela = o mar.
3. **Filtros**: dormitórios em chips com contagem, faixa de valor De/Até, área útil/privativa De/Até (m²), vagas de garagem ("1 ou mais", "2 ou mais", "3 ou mais") em chips com contagem, construtora em select com contagem por nome, "Mais filtros" inline (fase, entrega, acesso, pagamento, tabela, gravação, painel antigo, reservadas/vendidas).
4. **Resultado em frase**: "N unidades disponíveis em M prédios · faixa · R$/m²", com os filtros ativos removíveis por ×.
5. **Abas**: Unidades (padrão), Prédios, Comparar bairros, Entregas, Entrada e renda.
6. **Ficha do prédio** (`<dialog>` lateral): números, condições, tabela de unidades com colunas que só aparecem quando há dado, divergências entre tabelas, botão "Copiar p/ cliente" (sem número de unidade nem dados internos), bloco de lançamento e "De onde vêm os dados".

## Movimento

Só para estado: barras da orla 220ms, chave vista mar 200ms, ficha entra 220ms. `prefers-reduced-motion` desliga tudo.
