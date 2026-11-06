// Monta a página local de captação (captacao/index.html) com os anúncios de particulares da OLX em Praia Grande.
// Tudo fica em captacao/, pasta fora do git: nome e telefone de proprietários NUNCA vão para o repositório nem para o Pages.
//
// Entradas (em captacao/):
//   bruto/olx-*.json   fichas lidas da OLX pelo navegador do app (um objeto { id: ficha } ou uma lista de fichas)
// Só entram anúncios com o telefone do proprietário escrito no título ou na descrição: a OLX não mostra telefone
// cadastrado de particular (o contato é pelo chat), e o "ver número" da ficha é o número da própria descrição.
// Saídas (em captacao/):
//   olx-praia-grande.json   anúncios consolidados
//   index.html              página "Captação" (abre direto no navegador, sem servidor)
//
// Uso: node scripts/captacao/montar.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { paginaCaptacao } from './pagina.mjs';

const PASTA = 'captacao';
const BRUTO = join(PASTA, 'bruto');
mkdirSync(BRUTO, { recursive: true });

/* ---------- fichas ---------- */
const fichas = new Map();
const arquivos = readdirSync(BRUTO).filter((a) => /^olx-.*\.json$/.test(a)).sort();
for (const arq of arquivos) {
  const j = JSON.parse(readFileSync(join(BRUTO, arq), 'utf8'));
  for (const f of Array.isArray(j) ? j : Object.values(j)) if (f?.id) fichas.set(f.id, f);
}
if (!fichas.size) {
  console.error(`Nenhuma ficha em ${BRUTO}/olx-*.json`);
  process.exit(1);
}

/* ---------- telefone escrito na descrição ---------- */
// Celular com 9 dígitos (com ou sem DDD) ou fixo com DDD. Ignora valores ("R$ 650.000") e CEP.
const FONE_RE = /(?<!\d|\d[.,]|\$\s?)(?:\+?55[\s.-]?)?(?:\(?\s*(1[1-9]|[2-9]\d)\s*\)?[\s.-]*)?(9[\s.]?\d{4}|[2-5]\d{3})[\s.-]?(\d{4})(?!\d|[.,]\d)/g;
export function telefonesDoTexto(texto, dddPadrao = '13') {
  const achados = new Set();
  for (const m of String(texto ?? '').matchAll(FONE_RE)) {
    const [, ddd, meio, fim] = m;
    const corpo = meio.replace(/\D/g, '') + fim;
    if (corpo.length === 8 && !ddd) continue; // fixo sem DDD: fácil de confundir com outro número
    if (/^(\d)\1+$/.test(corpo)) continue;
    achados.add((ddd ?? dddPadrao) + corpo);
  }
  // Número disfarçado para escapar da máscara da OLX: "13.9.9.6.7.6.6.8.9.8", "1.3 9.9.6...", "013 99...".
  if (!achados.size) {
    for (const m of String(texto ?? '').matchAll(/(?<!\d|\$\s?)\d(?:[\s.()-]{0,2}\d){9,12}(?!\d)/g)) {
      const d = m[0].replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').replace(/^0(?=\d{10,11}$)/, '');
      if (/^(1[1-9]|[2-9]\d)9\d{8}$/.test(d) || /^(1[1-9]|[2-9]\d)[2-5]\d{7}$/.test(d)) achados.add(d);
    }
  }
  return [...achados];
}

/** A descrição da OLX vem com <br> e entidades HTML. */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const textoPuro = (s) =>
  String(s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(+e.slice(1)) : ENT[e.toLowerCase()] ?? m))
    .trim();

/* ---------- consolidação ---------- */
const BAIRRO_NOME = { Forte: 'Canto do Forte', Tupi: 'Vila Tupi', Mirim: 'Vila Mirim', Caicara: 'Caiçara' };
const lidos = [...fichas.values()].filter((f) => !f.removido && !f.profissional);
const anuncios = lidos
  .map((f) => {
    const descricao = textoPuro(f.descricao);
    return { ...f, descricao, bairro: BAIRRO_NOME[f.bairro] ?? f.bairro, telefones: telefonesDoTexto(`${f.titulo}\n${descricao}`) };
  })
  .filter((a) => a.telefones.length && a.anunciante)
  .sort((a, b) => String(b.publicado).localeCompare(String(a.publicado)));

const lidoEm = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const lidosTotal = lidos.length;
writeFileSync(join(PASTA, 'olx-praia-grande.json'), JSON.stringify({ lidoEm, lidosTotal, anuncios }, null, 1));
writeFileSync(join(PASTA, 'index.html'), paginaCaptacao({ lidoEm, lidosTotal, anuncios }));
console.log(`${lidosTotal} anúncios de particulares lidos · ${anuncios.length} com nome e telefone → ${PASTA}/index.html`);
