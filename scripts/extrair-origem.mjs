// Extrai os dados embutidos nos três painéis antigos (commit cdf415c) para dados/origem/*.json,
// sem alterar nenhum valor. Uso: node scripts/extrair-origem.mjs [commit]
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const COMMIT = process.argv[2] ?? 'cdf415c';
const html = (path) => execFileSync('git', ['show', `${COMMIT}:${path}`], { encoding: 'utf8' }).split('\n');

/** Lê o literal JSON que começa logo após `prefix` numa linha do painel. */
function literal(lines, prefix) {
  const line = lines.find((l) => l.startsWith(prefix));
  if (!line) throw new Error(`Linha não encontrada: ${prefix}`);
  const body = line.slice(prefix.length).replace(/;\s*(\/\/.*)?$/, '');
  return JSON.parse(body);
}

const usados = html('apartamentos-usados/index.html');
const lanc = html('lancamentos/index.html');
const vista = html('vista-mar/index.html');

const origem = {
  usados: {
    painel: 'apartamentos-usados/index.html',
    emps: literal(usados, 'const FALLBACK_EMP = '),
    units: literal(usados, 'let units = '),
  },
  lancamentos: {
    painel: 'lancamentos/index.html',
    emps: literal(lanc, 'const FALLBACK_EMP = '),
    units: literal(lanc, 'let units = '),
    // O painel aplicava estes dois blocos por código sobre units.fatima; ficam aqui como estavam.
    fluxoFatima: literal(lanc, 'const FLUXO_FATIMA='),
    fluxoInfoFatima: literal(lanc, 'units.fatima.fluxoInfo='),
  },
  'vista-mar': {
    painel: 'vista-mar/index.html',
    ...literal(vista, 'const D='),
  },
};

mkdirSync('dados/origem', { recursive: true });
for (const [nome, dados] of Object.entries(origem)) {
  writeFileSync(`dados/origem/${nome}.json`, JSON.stringify({ commit: COMMIT, ...dados }, null, 1) + '\n');
}
console.log('Extraído de', COMMIT, '→ dados/origem/{usados,lancamentos,vista-mar}.json');
