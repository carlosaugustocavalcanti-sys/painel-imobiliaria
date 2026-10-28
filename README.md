# Painel Imobiliária

Busca única de imóveis de Carlos Cavalcanti Imóveis (Praia Grande). Reúne o que antes eram três painéis: **Apartamentos Usados**, **Lançamentos** e **Vista Mar**. As diferenças entre eles viraram filtros: Usados/Lançamentos, "Só vista mar" e, em "Mais filtros", o painel antigo de origem.

## Rodar

Requer Node 24 (instalado em `~/.local/node`; para o terminal achar, adicione ao `~/.zshrc`: `export PATH="$HOME/.local/node/bin:$PATH"`).

```bash
npm install
npm start          # http://localhost:4200, com hot reload
npm test           # testes da lógica de busca
npm run build      # versão de produção em dist/
```

## Dados

| Arquivo | O que é |
|---|---|
| `dados/origem/{usados,lancamentos,vista-mar}.json` | Dados originais dos três painéis, extraídos sem alteração do commit `cdf415c` |
| `dados/origem/pasta-lancamentos.json` | Tabelas da pasta `OneDrive/Outros/Lesan/Lançamentos` que ainda não eram painéis (28 prédios, 236 unidades) |
| `public/dados/estoque.json` | Estoque unificado que o app carrega (gerado, não editar à mão) |
| `scripts/ler-pasta-lancamentos.mjs` | Lê as tabelas em PDF da pasta Lançamentos (texto pelo PDFKit do macOS, `scripts/pdf-texto.swift`) e gera `pasta-lancamentos.json`; falha se alguma contagem ou soma não bater |
| `dados/origem/isildo.json` | Tabela do Isildo e do Guilherme de 20/10/2026 (19 prédios, 38 unidades), lida do PDF por `scripts/ler-tabela-isildo.mjs` (`node scripts/ler-tabela-isildo.mjs [pdf]`, padrão `~/Downloads/Tabela Isildo.pdf`) |
| `dados/origem/frente-mar.json` | Apartamentos "frente mar" ou na Av. Pres. Castelo Branco das tabelas em PDF da pasta "5. FRENTE MAR" do Google Drive (50 prédios, 58 unidades), gerado por `scripts/ler-pasta-frente-mar.mjs` (os valores estão transcritos no próprio script, porque o texto veio pelo conector do Drive) |
| `dados/origem/lancamentos-drive.json` | Prédios da pasta "7. LANÇAMENTOS" do Google Drive (2027, 2028, 2029 e Entregues) que ainda não estavam no painel (46 prédios, 1.856 unidades), lidos dos PDFs pelo conector do Drive. Entra depois do Isildo na prioridade, com origem `lanc-drive` |
| `dados/origem/drive-mes.json` | Prédios das tabelas da pasta do mês ("Outubro - Tabelas") do Drive que faltavam ou estavam incompletos, com origem `drive-mes`; gerado por `scripts/ler-drive-mes.mjs` (valores transcritos dos PDFs). Carga de 26/10/2026: pastas 4, 9, 10, 11, 12 e investidores, mais parte das casas e comerciais (105 prédios, 148 unidades). Unidades de casa/sobrado e comerciais levam `categoria` (o filtro "Imóvel" separa). Fora: locação, cidades fora da região e o que está em `pendentes` de `dados/sincronizacao.json` |
| `dados/origem/site-lesan.json` | Imóveis à venda do site da Lesan Imóveis (www.lesanimoveis.com.br, 240 anúncios), gerado por `scripts/ler-site-lesan.mjs`, origem `site-lesan`. Da listagem e da ficha vêm o valor, a área, os dormitórios, a suíte, as vagas, o condomínio, o IPTU, o elevador, o lazer, o corretor e a vista mar. Cada unidade tem o link "Ver anúncio". Locação não entra |
| `dados/origem/lesan-praedium.json` | Endereço de cada anúncio pelo código, transcrito do cadastro interno da Praedium (app.praedium.com.br, lido com o login do Carlos em 28/10/2026), sem dados de proprietário. O site não mostra endereço nem nome do prédio, então rua, número, apto, andar, bloco e edifício saem daqui. Anúncios no mesmo endereço viram um prédio; sem nome de edifício, o prédio se chama pelo endereço. Para atualizar, releia a lista de imóveis ativos da Praedium |
| `scripts/unificar.mjs` | Gera o estoque unificado a partir da origem |
| `scripts/validar.mjs` | Confere o unificado contra a origem, campo a campo |

```bash
npm run dados      # regera public/dados/estoque.json e valida
node scripts/ler-site-lesan.mjs   # relê o site da Lesan (páginas ficam em dados/cache/, fora do git)
```

O site da Lesan tem verificação anti-robô (AWS WAF): depois de umas 40 páginas seguidas, ele passa a responder "Human Verification". O leitor baixa uma página a cada 6 s e para no primeiro desafio, sem tentar contorná-lo. As fichas que faltarem ficam só com os dados da listagem (valor, área, dormitórios, bairro), com a observação "Ficha do anúncio não lida". Rodar de novo mais tarde completa só o que falta. Anúncio com valor absurdo (acima de R$ 100 milhões, erro de digitação no site) entra sem valor e marcado "Confirmar".

Na unificação, um anúncio da Lesan entra no prédio que já está no painel com a mesma rua e o mesmo número (27 prédios, como Max 10, Porto Marina, Personnalité e Park Avenue). Ele não entra quando o cadastro da Lesan dá ao prédio outro nome: o "Long Beach" fica separado do Ed. Miami Beach (Av. Pres. Costa e Silva, 293), com aviso na ficha. Os anúncios 280 e 281 estão com o nº 12.912 no cadastro; o certo é 12.192, o do Porto Marina (`CORRIGIR_NUMERO` no leitor).

Regras de unificação:

- **Prédios repetidos** entre painéis viram um só quando nome, cidade, bairro e endereço batem (33 casos). O Melissa Miyazi foi reunido à mão (`FUNDIR_MANUAL`), porque as tabelas citam bairros diferentes.
- **A mesma unidade em duas tabelas** vira uma linha. O registro **reservado** tem prioridade; sem reserva, vale a ordem lançamentos > usados > vista mar. Os outros registros ficam visíveis na ficha do prédio, e as diferenças aparecem como **divergência** (8 casos).
- **Vista mar**: todas as unidades do antigo painel Vista Mar, mais as unidades cujas tabelas mencionam vista ou frente para o mar.
- Bairros com grafias diferentes ("Vila Tupi" / "Tupi", "Forte" / "Canto do Forte") usam um nome único. O texto original fica guardado em `bairroTextos`.
- Nenhum registro é descartado: 2.031 registros de origem → 2.005 unidades, e o validador falha se algum sumir ou mudar de valor.
- **Pasta Lançamentos**: Harmony, Parque das Araucárias, Seven, Toninho (12 prédios), Ectual (15) e a tabela da Gomes Pacheco (Raimundo Gomes). Doze desses prédios já existiam no painel e receberam as unidades novas (Costa do Mar, Costa Maggiore, Ocean Park, Parque dos Coqueiros, Personnalité, Raimundo Gomes, Bellagio, Matteo, Pedro, Platinum, Unique, Torres). Em caso de conflito na mesma unidade, o registro reservado vence; depois vale a ordem lançamentos > pasta Lançamentos > usados > vista mar.
- Reservado e vendido da Seven e da Ectual aparecem só por cor ou carimbo na imagem do PDF; foram conferidos página a página e estão nas constantes `STATUS_*` do leitor. Se a tabela mudar, refaça essa conferência.
- **Tabela do Isildo (origem `isildo`)**: entra depois da pasta Lançamentos e antes dos usados na ordem de prioridade. A versão de 05/10 dessa mesma tabela foi retirada de `usados.json` (35 registros) porque a de 20/10 a substitui; as unidades de outras imobiliárias nos mesmos prédios (Kalyl, Nova Casarão) ficaram. Cada unidade guarda o link do álbum de fotos do slide (`fotos`). Os slides só com imagens (fachadas, plantas) não entram.
- **Pasta Frente Mar (origem `frente-mar`)**: entra depois do Isildo e antes dos usados na prioridade. Só apartamentos e coberturas escritos "frente mar"/"frente ao mar" (ou "frente praia", nos casos da Jean Diegues) ou com endereço na Av. Pres. Castelo Branco; casas, locações e unidades só com "vista mar" fora dessa avenida não entram. Prédio sem nome na tabela recebe o código do anúncio (AP3753, KF050, Ref. 682). As tabelas da Ectual dessa pasta já estavam na pasta Lançamentos e não foram repetidas. As tabelas Erick Pereira, Kamila Amancio e William Buongiovanni têm texto embaralhado ou só imagem; só a unidade clara da William entrou (ver resumo da importação no commit).
- Ficaram de fora a casa do Tupi da Ectual (indisponível por reforma, sem valores) e as senhas de fechadura que as tabelas trazem.

## Card da unidade

Na ficha do prédio, cada unidade tem o botão **Gerar card**. Ele monta o story 1080×1920 na marca, já preenchido com tipologia, área, vagas, lazer, condição de pagamento (fluxo direto, entrada/banco ou os dois lado a lado) e fonte da tabela. Antes de baixar, copiar ou compartilhar o PNG, dá para editar qualquer texto e escolher as fotos.

As fotos vêm de `public/fotos/` e são ligadas aos prédios por `public/dados/fotos.json`. Hoje há fotos de Fátima II, Max 10, Bella Collina, Porto Marina e Personnalité, mais o Harmony Residence, que ainda não está em nenhuma tabela. Elas foram importadas do artefato "Fotos dos Books":

```bash
node scripts/importar-fotos.mjs <html do artefato salvo>
```

Fotos em alta resolução (até 1.600 px) saem dos books em PDF e das páginas de book (pastas Downloads e OneDrive). O `scripts/pdf-imagens.mjs` lê tanto JPEG quanto imagens compactadas do PDF e corta as bordas transparentes. A lista do que usar, o rótulo de cada foto e o recorte (para tirar logo, legenda, moldura e texto) ficam em `dados/books.json`:

```bash
node scripts/importar-books.mjs                  # padrão: ~/Downloads
node scripts/importar-books.mjs porto-marina     # só um prédio
```

Hoje há Harmony Residence (19 fotos), Max 10 (22), Seven Guilhermina (15), Fátima II (14, com a obra e a sacada em foto real), Personnalité (13 páginas recortadas) e Porto Marina (21, do book na pasta Lesan/Lançamentos do OneDrive), todos em alta resolução. Bella Collina continua com as fotos de 640 px do artefato, porque o OneDrive só tem o PDF de valores dele, sem book. O leitor trata o fundo verde de chroma key dos books em vídeo como vazio e contorna dois limites do `sips` (recorte `0 0` centraliza; recorte encostado na borda é ignorado).

Prédio sem fotos: no lugar da grade, o card mostra até 3 diferenciais numerados, tirados da tabela e editáveis. Com poucas fotos, a grade usa só as que existem, sem espaço vazio.

## Painéis antigos

Os três `index.html` originais foram removidos depois da unificação e continuam no histórico do git:

```bash
git show cdf415c:vista-mar/index.html > vista-mar.html
```

| Painel | Artefato de origem (claude.ai) |
|---|---|
| Vista Mar | https://claude.ai/artifact/2W98qBXsVYW6QjKfn9mM2x |
| Apartamentos Usados | https://claude.ai/artifact/Ce5yzZzDUcU5hkUnwWCvfg |
| Lançamentos | https://claude.ai/artifact/CBVUNkK8uWPYxXaX6UfzJ9 |
