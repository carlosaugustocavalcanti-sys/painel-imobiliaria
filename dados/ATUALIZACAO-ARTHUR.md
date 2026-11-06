# Importação diária do site da Arthur Paraguay

Rotina de todo dia às 8h (tarefa agendada `importar-site-arthur-paraguay`). Ela traz, aos poucos, os imóveis à venda do site da Arthur Paraguay Investimentos Imobiliários (arthurparaguay.com.br, plataforma Praedium, o mesmo modelo do site da Lesan).

**Por que aos poucos.** O site é protegido por Cloudflare e bloqueia leitura em massa: depois de ~10 páginas seguidas, responde HTTP 405 e para de servir. O leitor baixa uma página a cada 2 s e para no primeiro bloqueio, **sem tentar contorná-lo** (nada de trocar User-Agent, resolver CAPTCHA ou fingir navegador). As páginas já baixadas ficam no cache (`dados/cache/site-arthur-paraguay/`, fora do git); a cada dia o leitor pula o que já tem e tenta buscar o próximo pedaço. Assim a listagem completa (1.768 anúncios) vai sendo montada ao longo de vários dias, e depois as fichas de cada anúncio.

**Trava de publicação.** Enquanto a listagem não fecha, o JSON (`dados/origem/site-arthur-paraguay.json`) vem com `"publicado": false` e o `unificar.mjs`/`validar.mjs` **ignoram** esta origem — o painel não muda. Quando os 1.768 anúncios estiverem todos capturados, o leitor grava `"publicado": true` e, a partir daí, a origem entra no painel. As fichas que ainda faltarem completam os cards nos dias seguintes, já publicadas.

Sem telefone nem endereço de proprietário: o site não mostra isso, e não se busca no cadastro interno de outra imobiliária. O contato de cada unidade é a própria Arthur Paraguay (parceria): Arthur Paraguay Investimentos Imobiliários, (13) 99796-5404.

## Roteiro

1. `export PATH=$HOME/.local/node-v24.21.0-darwin-arm64/bin:$PATH`, depois `node scripts/ler-site-arthur-paraguay.mjs`. O leitor retoma do cache, baixa o próximo pedaço (uma página a cada 2 s) e para no primeiro bloqueio. No fim, imprime quantos anúncios da listagem já entraram (ex.: "640 de 1768"), quantos têm ficha e se a listagem fechou.
2. Confira o progresso no resumo. Se não avançou nada em relação ao dia anterior (listagem travada no mesmo número e nenhuma ficha nova), registre "sem avanço hoje (site bloqueou cedo)" — é esperado em alguns dias.
3. `npm run dados` (o validador precisa passar), `npx ng build` e `npx ng test --watch=false`. Enquanto `publicado` é `false`, o `estoque.json` não muda; quando virar `true`, ele passa a incluir a Arthur Paraguay.
4. Commit e push para `main` sem pedir confirmação, só se validador, build e testes passarem. A mensagem do commit diz o progresso: "Site da Arthur Paraguay: importação parcial, N de 1768 anúncios" ou, no dia em que fechar, "Site da Arthur Paraguay: listagem completa (1768 anúncios), origem entra no painel". Se nada mudou no JSON, não faça commit.
5. Termine com um resumo curto em português: anúncios na listagem (N de 1768), fichas lidas, se publicou e o que falta.

Regras: nunca inventar valor; valor absurdo no site (acima de R$ 100 milhões) entra sem valor e marcado "Confirmar"; locação e terreno não entram. Se o site continuar bloqueando a mesma página por muitos dias (a importação não avança), avise no resumo — pode ser que a paginação além de certo ponto não seja mais servida a cliente automático, e aí o caminho é a parceria com o Arthur (acesso legítimo) ou outra fonte.
