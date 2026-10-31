# Sincronização com o Google Drive

Rotina diária (tarefa agendada `sincronizar-drive-painel`) que mantém o painel igual às tabelas do Drive. Passos:

1. Ler `dados/sincronizacao.json`. No Drive existe sempre uma pasta do mês vigente ("Outubro - Tabelas", "Novembro - Tabelas"...). Descubra o mês de hoje e procure a pasta pelo nome (`title contains '<Mês> - Tabelas'`, só pastas). Se `pastaDoMes.mesDoId` não for o mês atual, troque `idConhecido` e `mesDoId` pelos da pasta nova. Se a pasta do mês novo ainda não existir, use a do mês anterior.
2. **Primeiro**, processe os itens de `pendentes` em `dados/sincronizacao.json` (apartamentos, depois casas e comerciais); a cada arquivo concluído, tire-o da lista. Depois, pelo conector do Drive, buscar PDFs com `modifiedTime > ultimaVarredura` (`mimeType = 'application/pdf'`). Para cada resultado, subir pelo `parentId` até a pasta do mês; descartar os que estão fora dela. Os PDFs das subpastas mapeadas (`subpastasMapeadas`, achadas pelo nome, porque o ID muda a cada mês) são lidos e entram na origem indicada. PDFs de outras subpastas (investidores, construtores etc.) não têm origem mapeada: não leia nem altere nada, só liste os nomes em `historico` como "sem origem mapeada". Sem arquivo novo: só atualizar `ultimaVarredura`, commitar e parar.
3. Para cada PDF alterado, ler o conteúdo e comparar com o prédio/unidades já na origem (`dados/origem/lancamentos-drive.json` para a pasta 7; `dados/origem/frente-mar.json` e `scripts/ler-pasta-frente-mar.mjs` para a pasta 5; prédios que vêm de outras origens se atualizam na origem a que pertencem, conforme o README). Atualizar valores, status (disponível/reservado/vendido), entrada, fluxo, data da tabela e prédios/unidades novas, sempre no formato já usado.
4. Reservado/vendido que só aparece por cor ou carimbo: conferir a imagem da página. Se não der para ter certeza, **não alterar** a unidade e registrar em `historico` como "pendente de conferência".
5. `export PATH=$HOME/.local/node-v24.21.0-darwin-arm64/bin:$PATH`, depois `npm run dados`. Se o validador falhar, desfazer as alterações (`git checkout -- dados public`), registrar o motivo em `historico` e não publicar.
6. `npx ng build` e `npx ng test --watch=false` devem passar.
7. Atualizar `ultimaVarredura` para o horário do início da execução, acrescentar uma linha em `historico` (data, arquivos lidos, resumo, pendências), commit e push para `main` (publica no GitHub Pages).

Regras: nunca apagar unidade que sumiu de uma tabela sem registrar em `historico`; nunca inventar valor; arquivo ilegível vira pendência, não palpite.

Casas, sobrados e imóveis comerciais entram com `categoria: 'casa'` ou `'comercial'` (registro sem o campo é apartamento). Locação não entra. Prédio repetido em dois corretores vira um só dentro de `scripts/ler-drive-mes.mjs`; se o mesmo prédio já existir em outra origem com nome ou endereço diferente, acrescente o par em `FUNDIR_MANUAL` (`scripts/unificar.mjs`).

Prédio novo com a construtora na tabela ou no book: acrescente o id dele em `dados/construtoras.json`, no nome curto da construtora. O `npm run dados` avisa quantos prédios com tabela de construtora ainda estão sem nome e se algum id do arquivo não existe mais.
