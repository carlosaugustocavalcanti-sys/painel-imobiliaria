# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Angular 22 (escolha do Carlos), com Node instalado em `~/.local/node`. Dados estáticos versionados no repositório; sem backend.

## Users

Carlos Cavalcanti, corretor (Carlos Cavalcanti Imóveis, Praia Grande, CRECI 331032), é o único usuário. Consulta o painel no celular ou no notebook, muitas vezes na frente do cliente, para achar unidades que cabem no perfil (valor, dormitórios, bairro, vista, entrada/renda) e copiar os dados para enviar.

## Product Purpose

Reunir num só lugar o estoque que o Carlos trabalha: apartamentos usados de revenda (tabelas de imobiliárias parceiras), lançamentos e obras (tabelas de construtoras) e o recorte de unidades com vista para o mar. Sucesso é responder em segundos "o que eu tenho para este cliente?" sem abrir três painéis, e sem perder nenhum dado que estava nas tabelas de origem.

## Positioning

Um estoque cruzado de várias imobiliárias e construtoras parceiras, com a origem (tabela, data, contato) de cada unidade sempre à vista, que nenhum portal público mostra.

## Operating Context

- Os dados vêm de PDFs, fotos e planilhas enviados por imobiliárias e construtoras, transcritos para o painel. Leituras ambíguas ficam marcadas "Confirmar".
- A mesma unidade pode aparecer em mais de uma tabela. Quando os valores ou o status divergem, o registro reservado tem prioridade, o painel indica a divergência e mostra os outros valores.
- Lançamentos têm um fluxo interno de produção de conteúdo: gravação do vídeo (pendente, gravado, tráfego no ar), cadastro no site e ordem no roteiro.
- Antes de enviar ao cliente, o Carlos confirma valor e disponibilidade na fonte.

## Capabilities and Constraints

- Filtros: segmento (usado, lançamento, em obra), vista mar, cidade (Praia Grande, Mongaguá), bairro, valor, dormitórios, acesso (elevador/escada), tabela de origem, financiamento (bancário/direto), ano de entrega e gravação.
- Por unidade: valor à vista, valor a prazo/banco/permuta, entrada, renda estimada, laudo Caixa, fluxo de pagamento, condomínio, IPTU, vagas, vista, status (disponível, reservado, vendido, suspenso) e observações.
- Renda estimada: 1ª parcela SAC (Caixa SBPE ~11,49% a.a. + TR, 420 meses) comprometendo até 30% da renda; é estimativa, não aprovação.
- Uso interno: comissão, contatos de tabela e status de gravação podem aparecer.

## Brand Commitments

Marca pessoal Carlos Cavalcanti Imóveis (skill `marca-carlos-cavalcanti`): só 6 cores (#F2B300, #1C1C1C, #F2F2F0, #E2E2DF, #5C5C5C, #FFFFFF), amarelo nunca como texto sobre fundo claro (vira marca-texto), Hanken Grotesk, títulos em caixa alta Black 900, etiquetas com cantos de 6px, caixas com 24px, sem logotipo. Assinatura: Carlos Cavalcanti, CRECI 331032, @carlos_cavalcanti_imoveis_. Toda tabela e todo gráfico citam a fonte dos dados.

## Evidence on Hand

Histórico git (commit `cdf415c`): painéis antigos `vista-mar/`, `apartamentos-usados/` e `lancamentos/`, cada um com os dados embutidos (tabelas de 26/09 a 08/10/2026). Não há foto oficial do Carlos no repositório; o círculo da assinatura fica marcado "FOTO".

## Product Principles

1. Nenhum dado de tabela se perde: divergências ficam visíveis, nunca resolvidas em silêncio.
2. A origem de cada número (tabela, data, contato) está a um toque de distância.
3. Velocidade na frente do cliente vale mais que ornamento: filtro, resultado, unidade.
4. Avisar o que precisa de confirmação, sem esconder.
