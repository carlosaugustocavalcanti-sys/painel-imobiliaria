// Fila de mensagens de WhatsApp para os proprietários da Captação OLX.
// Tudo que tem nome, telefone ou registro de envio fica em captacao/ (fora do git). Este script não guarda dado pessoal.
//
// Entradas (em captacao/):
//   olx-praia-grande.json      anúncios consolidados pelo montar.mjs
//   mensagem-whatsapp.md       o texto da mensagem, com [Nome], [apartamento/casa] e [bairro]
//   envios/nomes.json          opcional: { "nome na OLX": "como chamar" } para apelidos e usuários ("" = sem nome)
//   envios/enviados.json       registro: { telefone: { status, em, id } } (criado por este script)
//
// Uso:
//   node scripts/captacao/fila-whatsapp.mjs proximos [n=10]                 → lista JSON dos próximos envios
//   node scripts/captacao/fila-whatsapp.mjs registrar <telefone> <status> [id]  status: enviado | sem-whatsapp | pulado | erro
//   node scripts/captacao/fila-whatsapp.mjs resumo
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = 'captacao';
const ENVIOS = join(PASTA, 'envios');
const ARQ_ENVIADOS = join(ENVIOS, 'enviados.json');
mkdirSync(ENVIOS, { recursive: true });
const ler = (arq, padrao) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : padrao);

/** Corretor ou imobiliária anunciando como particular: não faz sentido oferecer captação. */
const PROFISSIONAL = /im[oó]ve|corretor|imobili|construtora|network|compras|vendas|morarna/i;

const minusculas = (s) => s.toLocaleLowerCase('pt-BR');
const titulo = (s) => s.charAt(0).toLocaleUpperCase('pt-BR') + minusculas(s.slice(1));

/** Como chamar o proprietário: o primeiro nome, quando o nome da OLX parece nome de gente. */
export function saudacao(anunciante, apelidos = {}) {
  const bruto = String(anunciante ?? '').trim();
  if (bruto in apelidos) return apelidos[bruto];
  if (!bruto || /[@\d_]/.test(bruto) || /\p{L}\.\p{L}/u.test(bruto)) return '';
  const partes = bruto.split(/\s+/);
  const primeiro = partes[0].replace(/\.$/, '');
  if (!/^\p{L}{2,}$/u.test(primeiro)) return '';
  if (partes.length === 1 && primeiro.length > 11) return ''; // provável usuário colado ("joaosilvaimoveis")
  return titulo(primeiro);
}

const NA = /^(Vila|Nova|Cidade|Aviação|Guilhermina|Ocian|Glória|Flórida|Princesa|Esmeralda|Antártica)\b/;
const tipoDe = (a) =>
  /kitchenette|kitnet/i.test(a.tipo) ? 'kitnet' : /cobertura/i.test(a.tipo) ? 'cobertura' : /^Casa/i.test(a.categoria) ? 'casa' : 'apartamento';

export function montarTexto(modelo, a, nome) {
  let t = modelo;
  t = nome ? t.replaceAll('[Nome]', nome) : t.replace(/\[Nome\],\s*/g, '').replace(/\s*\[Nome\]/g, ''); // "Olá, tudo bem?"
  const tipo = tipoDe(a);
  const feminino = tipo !== 'apartamento';
  t = t.replace(/\bdo seu \[apartamento\/casa\]/g, `${feminino ? 'da sua' : 'do seu'} ${tipo}`).replaceAll('[apartamento/casa]', tipo);
  t = a.bairro ? t.replace(/\b(no|na) \[bairro\]/g, `${NA.test(a.bairro) ? 'na' : 'no'} ${a.bairro}`) : t.replace(/\s*\b(no|na) \[bairro\]/g, '');
  return t;
}

function modelo() {
  const arq = join(PASTA, 'mensagem-whatsapp.md');
  if (!existsSync(arq)) throw new Error(`Falta ${arq} com o texto da mensagem`);
  return readFileSync(arq, 'utf8').replace(/^#.*\n+/gm, '').trim();
}

function fila() {
  const { anuncios } = ler(join(PASTA, 'olx-praia-grande.json'), { anuncios: [] });
  const enviados = ler(ARQ_ENVIADOS, {});
  const apelidos = ler(join(ENVIOS, 'nomes.json'), {});
  const texto = modelo();
  const vistos = new Set();
  const itens = [];
  for (const a of anuncios) {
    const telefone = a.telefones.find((t) => t.length === 11 && t[2] === '9'); // só celular tem WhatsApp
    if (!telefone || vistos.has(telefone)) continue;
    vistos.add(telefone);
    if (enviados[telefone] || PROFISSIONAL.test(a.anunciante)) continue;
    const nome = saudacao(a.anunciante, apelidos);
    itens.push({ id: a.id, telefone, anunciante: a.anunciante, nome, url: a.url, texto: montarTexto(texto, a, nome) });
  }
  return itens;
}

const [, , cmd = 'resumo', ...args] = process.argv;
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'proximos') {
    console.log(JSON.stringify(fila().slice(0, +(args[0] ?? 10)), null, 1));
  } else if (cmd === 'registrar') {
    const [telefone, status, id] = args;
    if (!/^\d{11}$/.test(telefone ?? '') || !['enviado', 'sem-whatsapp', 'pulado', 'erro'].includes(status)) {
      console.error('Uso: registrar <telefone com DDD, 11 dígitos> <enviado|sem-whatsapp|pulado|erro> [id]');
      process.exit(1);
    }
    const enviados = ler(ARQ_ENVIADOS, {});
    enviados[telefone] = { status, em: new Date().toISOString(), id: id ? +id : null };
    writeFileSync(ARQ_ENVIADOS, JSON.stringify(enviados, null, 1));
    console.log(`registrado: ${status}`);
  } else {
    const enviados = Object.values(ler(ARQ_ENVIADOS, {}));
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const deHoje = enviados.filter((e) => e.status === 'enviado' && new Date(e.em).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) === hoje);
    const conta = (s) => enviados.filter((e) => e.status === s).length;
    console.log(`enviados: ${conta('enviado')} (hoje: ${deHoje.length}) · sem WhatsApp: ${conta('sem-whatsapp')} · pulados: ${conta('pulado')} · erro: ${conta('erro')} · na fila: ${fila().length}`);
  }
}
