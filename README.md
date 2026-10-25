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

As fotos vêm de `public/fotos/` e são ligadas aos prédios por `public/dados/fotos.json`. Hoje há fotos do book de Fátima II, Max 10, Bella Collina e Porto Marina, mais o Harmony Residence, que ainda não está em nenhuma tabela. Elas foram importadas do artefato "Fotos dos Books":

```bash
node scripts/importar-fotos.mjs <html do artefato salvo>
```

Prédio sem fotos: o card sai com as áreas marcadas "FOTO", e você adiciona as suas pelo botão "Adicionar fotos do computador".

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
