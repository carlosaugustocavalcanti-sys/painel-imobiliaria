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
| `dados/origem/*.json` | Dados originais dos três painéis, extraídos sem alteração do commit `cdf415c` |
| `public/dados/estoque.json` | Estoque unificado que o app carrega (gerado, não editar à mão) |
| `scripts/unificar.mjs` | Gera o estoque unificado a partir da origem |
| `scripts/validar.mjs` | Confere o unificado contra a origem, campo a campo |

```bash
npm run dados      # regera public/dados/estoque.json e valida
```

Regras de unificação:

- **Prédios repetidos** entre painéis viram um só quando nome, cidade, bairro e endereço batem (33 casos). O Melissa Miyazi foi reunido à mão (`FUNDIR_MANUAL`), porque as tabelas citam bairros diferentes.
- **A mesma unidade em duas tabelas** vira uma linha. O registro **reservado** tem prioridade; sem reserva, vale a ordem lançamentos > usados > vista mar. Os outros registros ficam visíveis na ficha do prédio, e as diferenças aparecem como **divergência** (8 casos).
- **Vista mar**: todas as unidades do antigo painel Vista Mar, mais as unidades cujas tabelas mencionam vista ou frente para o mar.
- Bairros com grafias diferentes ("Vila Tupi" / "Tupi", "Forte" / "Canto do Forte") usam um nome único. O texto original fica guardado em `bairroTextos`.
- Nenhum registro é descartado: 1.795 registros de origem → 1.770 unidades, e o validador falha se algum sumir ou mudar de valor.

## Card da unidade

Na ficha do prédio, cada unidade tem o botão **Gerar card**. Ele monta o story 1080×1920 na marca, já preenchido com tipologia, área, vagas, lazer, condição de pagamento (fluxo direto, entrada/banco ou os dois lado a lado) e fonte da tabela. Antes de baixar, copiar ou compartilhar o PNG, dá para editar qualquer texto e escolher as fotos.

As fotos vêm de `public/fotos/` e são ligadas aos prédios por `public/dados/fotos.json`. Hoje há fotos de Fátima II, Max 10, Bella Collina, Porto Marina e Personnalité, mais o Harmony Residence, que ainda não está em nenhuma tabela. Elas foram importadas do artefato "Fotos dos Books":

```bash
node scripts/importar-fotos.mjs <html do artefato salvo>
```

Fotos em alta resolução (até 1.600 px) saem dos books em PDF e das páginas de book (pastas Downloads e OneDrive). O `scripts/pdf-imagens.mjs` lê tanto JPEG quanto imagens compactadas do PDF e corta as bordas transparentes. A lista do que usar, o rótulo de cada foto e o recorte (para tirar logo, legenda, moldura e texto) ficam em `dados/books.json`:

```bash
node scripts/importar-books.mjs    # padrão: ~/Downloads
```

Hoje há Harmony Residence (19 fotos do book em PDF), Max 10 (22, do book no OneDrive) e Personnalité (13 páginas recortadas). Fátima II, Bella Collina e Porto Marina continuam com as fotos de 640 px do artefato.

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
