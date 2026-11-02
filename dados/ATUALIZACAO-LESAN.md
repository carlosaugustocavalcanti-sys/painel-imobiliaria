# Atualização semanal do site da Lesan

Rotina de toda quarta às 9h (tarefa agendada `atualizar-site-lesan`). Ela mantém no painel os imóveis à venda do site da Lesan Imóveis (www.lesanimoveis.com.br). Anúncio sem mudança fica como está. Mudam só os anúncios com valor alterado, os anúncios novos e os que saíram do site.

1. `export PATH=$HOME/.local/node-v24.21.0-darwin-arm64/bin:$PATH`, depois `node scripts/ler-site-lesan.mjs --atualizar`. O leitor baixa a listagem de novo e as fichas só dos anúncios novos (uma página a cada 6 s). No fim, ele lista os anúncios **novos**, os **retirados do site** e os de **valor alterado**, comparando com o `dados/origem/site-lesan.json` anterior.
   - Se o site pedir verificação anti-robô no meio da listagem, o leitor para sem gravar nada. Não tente contornar: registre "listagem bloqueada pelo site" no resumo e pare (sem commit).
   - Se nada mudou (as três listas vazias), desfaça o `lidoEm` (`git checkout -- dados/origem/site-lesan.json`) e pare sem commit.
2. **Anúncios novos**: o site não mostra endereço nem nome do prédio. Eles vêm do cadastro interno da Praedium (app.praedium.com.br, imóveis ativos da Lesan), aberto com o login do Carlos: tente primeiro o navegador embutido do app e, se ele cair na tela de login, o Chrome do Carlos (Claude in Chrome). Para cada código novo, acrescente em `dados/origem/lesan-praedium.json` (`enderecos`) a linha de endereço no mesmo formato das outras ("Bairro, Praia Grande/SP - Rua X, 123, Apto 45 - 4º Andar - Edifício Y"). Nunca copie dados de proprietário. Nunca digite senha: se a Praedium pedir login nos dois navegadores, o anúncio entra sem endereço (o prédio fica "Lesan cód. N") e vai para as pendências. Depois rode `node scripts/ler-site-lesan.mjs --sem-baixar` para o endereço entrar.
   - Ficha não lida (o leitor avisa "sem ficha lida"): o anúncio entra só com os dados da listagem. A próxima execução completa.
3. **Valor alterado**: entra direto, com a data de hoje na tabela da unidade.
4. **Retirados do site**: saem do painel (vendidos ou suspensos pela Lesan). Liste os códigos no histórico.
5. `npm run dados` (o validador precisa passar), `npx ng build` e `npx ng test --watch=false`. Se algo falhar, desfaça (`git checkout -- dados public`), registre o motivo e não publique.
6. Acrescente uma linha em `historico` de `dados/sincronizacao.json`, com `"data"` de hoje e um `resumo` que comece com "Site da Lesan:": quantos novos, retirados e com valor alterado (código, prédio, valor antigo → novo), mais as pendências. Commit e push para `main` (publica no GitHub Pages).

Regras: nunca inventar valor nem endereço; valor absurdo no site (acima de R$ 100 milhões) já entra sem valor e marcado "Confirmar"; locação não entra.
