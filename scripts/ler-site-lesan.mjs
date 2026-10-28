// Gera dados/origem/site-lesan.json: os imóveis à venda do site da Lesan Imóveis (www.lesanimoveis.com.br, plataforma Praedium).
// O site não mostra nome do prédio nem endereço: eles vêm do cadastro interno da Praedium, transcrito em
// dados/origem/lesan-praedium.json pelo código do anúncio. Anúncios no mesmo endereço viram um prédio só. Locação não entra.
// Uso: node scripts/ler-site-lesan.mjs [pasta] [--sem-baixar]   (padrão: dados/cache/site-lesan, fora do git)
// Baixa o que falta na pasta (listagem e fichas, uma página a cada 6 s) e para no primeiro desafio anti-robô do site:
// as fichas que não vierem usam só os dados do card da listagem. Rode de novo mais tarde para completar.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://www.lesanimoveis.com.br';
const args = process.argv.slice(2);
const PASTA = args.find((a) => !a.startsWith('--')) ?? 'dados/cache/site-lesan';
let bloqueado = args.includes('--sem-baixar');
const HOJE = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
mkdirSync(join(PASTA, 'fichas'), { recursive: true });

/* ---------- download ---------- */
const desafio = (html) => /<title>Human Verification/.test(html);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function baixar(url, arquivo) {
  if (existsSync(arquivo) && !desafio(readFileSync(arquivo, 'utf8'))) return readFileSync(arquivo, 'utf8');
  if (bloqueado) return null;
  const html = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text());
  await espera(6000);
  if (desafio(html)) {
    bloqueado = true;
    console.warn(`O site pediu verificação em ${url}; o restante fica para a próxima execução.`);
    return null;
  }
  writeFileSync(arquivo, html);
  return html;
}

/* ---------- leitura ---------- */
const texto = (h) =>
  String(h ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
const reais = (s) => (s ? +s.replace(/[^\d,]/g, '').replace(',', '.') || null : null);
const m2 = (s) => +s.replace(/\./g, '').replace(',', '.');

/** Card da listagem: o que vale para todo anúncio, mesmo sem a ficha. */
function lerCards(html) {
  return html
    .split('<div class="col-md-6 col-lg-6">')
    .slice(1)
    .map((c) => {
      const a = (n) => c.match(new RegExp(`data-${n}="([^"]*)"`))?.[1] ?? '';
      const link = c.match(/href="(\/imovel\/[a-z0-9-]+)"/)?.[1];
      if (!link || a('transaction') !== 'sell') return null;
      const dados = [...c.matchAll(/<li class="flex-fill pb-0"><span>([^<]*)<\/span>/g)].map((m) => m[1]);
      return {
        codigo: a('code'),
        link,
        tipo: a('property-type'),
        cidade: a('city').replace(/\/SP$/, ''),
        bairro: a('block'),
        valor: +a('property-value') || null,
        selo: texto(c.match(/sale_position">([\s\S]*?)<\/div>/)?.[1]),
        quartos: +(dados.find((d) => /quarto/i.test(d))?.match(/\d+/)?.[0] ?? 0) || null,
        area: (() => { const d = dados.find((x) => /m²/.test(x)); return d ? m2(d.match(/[\d.,]+/)[0]) : null; })(),
      };
    })
    .filter(Boolean);
}

/** Ficha do anúncio: cômodos, metragens, condomínio, IPTU, corretor, descrição e itens. */
function lerFicha(html) {
  const comp = [...html.matchAll(/composition_name color-primary">\s*([\s\S]*?)\s*<\/div>/g)].map((m) => texto(m[1]));
  const n = (re) => { const c = comp.find((x) => re.test(x)); return c ? +c.match(/^[\d.]+/)?.[0] || 0 : null; };
  const areaDe = (re) => { const c = comp.find((x) => re.test(x)); return c ? m2(c.match(/^[\d.,]+/)[0]) : null; };
  const parcela = (rot) => reais(html.match(new RegExp(`${rot}\\s*<span class="transaction_parcel">\\s*([^<]*)`))?.[1]);
  const desc = texto(html.match(/<div class="pro_det">([\s\S]*?)<\/div>/)?.[1]);
  // listas de itens ("Lazer e natureza", "Infraestrutura"...): o título no h2 do bloco, cada item numa etiqueta
  const itens = {};
  for (const m of html.matchAll(/composition_header">\s*<span[^>]*><\/span>([^<]+)<\/h2>([\s\S]*?)(?=composition_header|<\/section)/g))
    itens[texto(m[1])] = [...m[2].matchAll(/characteristic-tag[^>]*>\s*<i[^>]*><\/i>([^<]+)</g)].map((x) => texto(x[1]));
  const pagto = (rot) => texto(html.match(new RegExp(`transaction_text">${rot}<\\/div>[\\s\\S]*?<h3[^>]*>([^<]*)<\\/h3>`))?.[1]);
  return {
    titulo: texto(html.match(/<h2 id="detail_heading"[^>]*>([\s\S]*?)<\/h2>/)?.[1]),
    desc,
    itens,
    suites: n(/^\d+ Su[íi]tes?$/),
    vagas: n(/Vagas? de garagem/),
    andarFaixa: comp.find((x) => /^Andar (alto|baixo)/.test(x)) ?? '',
    areaUtil: areaDe(/área útil|área privativa/),
    areaTotal: areaDe(/área total|área construída/),
    terreno: areaDe(/terreno/),
    cond: parcela('Condomínio'),
    iptu: parcela('IPTU'),
    entrega: pagto('Entrega'),
    renda: reais(pagto('Renda necessária')),
    corretor: texto(html.match(/broker_name[\s\S]*?<h6[^>]*>([^<]*)<\/h6>/)?.[1]),
    creci: html.match(/CRECI:\s*([\w-]+)/)?.[1] ?? '',
  };
}

/* ---------- formato do painel ---------- */
const CASA = /casa|sobrado|sobreposta|geminada/i;
const VISTA_RE = /(vista\s+(?:para\s+o\s+|pro\s+|ao\s+|total\s+|livre\s+|frontal\s+|lateral\s+)?(?:do\s+|para\s+o\s+)?mar|frente\s+(?:ao\s+|para\s+o\s+)?mar|frente\s+(?:à\s+|a\s+)?praia|p[ée]\s+na\s+areia)/i;
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- endereço do cadastro da Praedium ---------- */
const ENDERECOS = JSON.parse(readFileSync('dados/origem/lesan-praedium.json', 'utf8')).enderecos;
/** Número digitado errado no cadastro, conferido contra outra tabela do painel. */
const PORTO_MARINA = {
  de: '12912',
  para: '12192',
  nota: 'O cadastro da Lesan escreve Av. Pres. Castelo Branco, 12.912 nos anúncios cód. 280 e 281; os aptos 51 e 72 têm o mesmo valor e a mesma área das unidades do Porto Marina (12.192).',
};
const CORRIGIR_NUMERO = { 280: PORTO_MARINA, 281: PORTO_MARINA };
const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
/** Iniciais maiúsculas em cada palavra digitada em minúsculas (ou num texto todo em maiúsculas), menos "da", "de", "do", "e". */
const iniciais = (t) => {
  const base = t === t.toUpperCase() ? t.toLowerCase() : t;
  return base.split(' ').map((w, i) => (i && MINUSCULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
};
/** Nome do edifício como no painel: "Edifício gaivotas" → "Ed. Gaivotas", "Residencial Pietra" → "Res. Pietra". */
const nomeEdificio = (t) => {
  const n = iniciais(t.replace(/^edif[íi]cio\s+/i, '').replace(/^residencial\s+/i, ''));
  return /^edif[íi]cio/i.test(t) ? `Ed. ${n}` : /^residencial/i.test(t) ? `Res. ${n}` : n;
};
/**
 * Lê "Bairro, Cidade/SP - Rua X, 123, Apto 45 - 4º Andar - Edifício Y - Bloco B" (cada corretor digita de um jeito).
 * Devolve rua, número, unidade, andar, bloco e edifício; o que não se encaixa fica de fora (anotações internas).
 */
export function lerEndereco(linha) {
  const resto = linha.slice(linha.indexOf(' - ') + 3).replace(/\s+-\s+Praia Grande\s+-\s+SP/i, '');
  const [principal, ...partes] = resto.split(' - ').map((x) => x.trim());
  const pedacos = principal.split(',').map((x) => x.trim()).filter(Boolean);
  if (/^(rua|r\.|avenida|av\.?)$/i.test(pedacos[0]) && pedacos[1]) pedacos.splice(0, 2, `${pedacos[0]} ${pedacos[1]}`);
  let rua = pedacos.shift().replace(/^na\s+/i, '');
  let numero = '';
  const fim = rua.match(/\s(\d+)$/);
  if (fim) { numero = fim[1]; rua = rua.slice(0, fim.index); }
  let unidade = '', andar = null, bloco = '', edificio = '';
  for (const x of pedacos) {
    const n = x.replace(/\./g, '');
    if (/^\d+$/.test(n) && !numero) numero = n;
    else if (n === numero) continue;
    else {
      const u = x.match(/^(?:ap(?:to|t|ê|´to)?\.?|apê)?\s*(\d+[a-z]?)$/i) ?? x.match(/^((?:casa|sobrado)\s+\d+)$/i);
      if (u && !unidade) unidade = u[1].toUpperCase().replace(/^(CASA|SOBRADO)/, (m) => iniciais(m.toLowerCase()));
    }
  }
  for (const x of partes) {
    const a = x.match(/^(\d+)º Andar$/i);
    if (a) andar = +a[1];
    else if (/^t[ée]rreo$/i.test(x)) andar = 'Térreo';
    else if (/^bloco\s+\w+$/i.test(x) || /^[a-z]$/i.test(x)) bloco = /^bloco/i.test(x) ? iniciais(x) : `Bloco ${x.toUpperCase()}`;
    else if (/^\d+$/.test(x)) unidade ||= x;
    else if (!/^sobrado$/i.test(x)) edificio = nomeEdificio(x);
  }
  // "Residencial Maria Eduarda Arjonas, 64": o cadastro pôs o nome do prédio no lugar da rua
  if (/^residencial\s/i.test(rua) && !edificio) { edificio = nomeEdificio(rua); rua = ''; }
  return { rua: rua && iniciais(rua), numero, unidade, andar, bloco, edificio };
}

function predio(card, f) {
  const casa = CASA.test(card.tipo);
  const kitnet = /kitnet|studio|flat/i.test(card.tipo);
  const fase = /constru/i.test(card.selo) ? 'obra' : /lan[çc]amento/i.test(card.selo) ? 'lancamento' : 'pronto';
  const dorm = kitnet ? 0 : card.quartos;
  const suites = f?.suites ?? null;
  const tipologia =
    (kitnet ? card.tipo : casa ? `${card.tipo} ${plural(dorm ?? 0, 'dorm', 'dorms')}` : plural(dorm ?? 0, 'dorm', 'dorms')) +
    (suites ? ` (${plural(suites, 'suíte', 'suítes')})` : '');
  const area = f?.areaUtil ?? (casa ? f?.areaTotal : null) ?? card.area;
  // valor de bilhões é erro de digitação no site: a unidade fica sem valor e marcada para confirmar
  const valorErrado = card.valor > 1e8;
  const itens = Object.values(f?.itens ?? {}).flat();
  const elevador = itens.some((i) => /^elevador/i.test(i)) || /\belevador/i.test(f?.desc ?? '');
  const escada = /\bde escadas?\b|\bsem elevador/i.test(f?.desc ?? '');
  // só a expressão ("Vista mar", "Frente ao mar"), que vira a etiqueta da unidade
  const achado = (f?.desc.match(VISTA_RE)?.[0] ?? itens.find((i) => /vista.*mar|frente.*mar/i.test(i)) ?? '').trim().toLowerCase();
  const vista = achado && achado[0].toUpperCase() + achado.slice(1);
  const linha = ENDERECOS[card.codigo];
  const e = linha ? lerEndereco(linha) : null;
  const correcao = CORRIGIR_NUMERO[card.codigo];
  if (correcao && e?.numero === correcao.de) e.numero = correcao.para;
  const rua = e?.rua ? [e.rua, e.numero].filter(Boolean).join(', ') : '';
  const nome = e?.edificio || rua || `Lesan cód. ${card.codigo}`;
  const andarDesc = f?.desc.match(/\b(\d{1,2})[ºo°]\s*andar/)?.[1];
  const contato = [f?.corretor && `${f.corretor}${f.creci ? ` (CRECI ${f.creci})` : ''}`, 'Lesan (13) 99786-4368'].filter(Boolean).join(' · ');
  const fonte = `Site Lesan Imóveis (cód. ${card.codigo})`;
  const extras = [
    f?.titulo,
    f?.andarFaixa && e?.andar == null && !andarDesc ? f.andarFaixa : '',
    e?.bloco,
    f?.terreno ? `Terreno de ${f.terreno.toLocaleString('pt-BR')} m²` : '',
    f?.areaTotal && f.areaUtil && f.areaTotal !== f.areaUtil ? `Área total ${f.areaTotal.toLocaleString('pt-BR')} m²` : '',
    f?.itens['Bem estar e comodidade']?.join(', '),
    f?.renda ? `Renda necessária R$ ${f.renda.toLocaleString('pt-BR')}` : '',
    /^\d{4}$/.test(f?.entrega ?? '') && fase === 'pronto' ? `Entregue em ${f.entrega}` : '',
    valorErrado ? `O site anuncia por R$ ${card.valor.toLocaleString('pt-BR')}, provável erro de digitação: confirmar o valor` : '',
    f ? '' : 'Ficha do anúncio não lida (o site pediu verificação): só os dados da listagem.',
  ].filter(Boolean);
  return {
    id: `lesan-site-${card.codigo}`,
    nome,
    cidade: card.cidade,
    bairro: card.bairro,
    fase,
    ...(rua ? { endereco: `${rua} - ${card.bairro} - ${card.cidade}/SP` } : {}),
    ...(fase !== 'pronto' && f?.entrega ? { entrega: f.entrega } : {}),
    lazer: f?.itens['Lazer e natureza'] ?? [],
    tabelas: [{ fonte, contato, atualizadoEm: HOJE }],
    notas: [...(linha ? [] : ['Anúncio sem endereço no cadastro da Praedium.']), ...(correcao ? [correcao.nota] : [])],
    unidades: [
      {
        unidade: e?.unidade || `Cód. ${card.codigo}`,
        ...(e?.andar != null ? { andar: e.andar } : andarDesc ? { andar: +andarDesc } : {}),
        tipologia,
        ...(casa ? { categoria: 'casa' } : {}),
        dorm,
        ...(suites != null ? { suites } : {}),
        ...(area ? { area } : {}),
        ...(f?.vagas != null ? { vagas: f.vagas ? String(f.vagas) : 'sem vaga' } : {}),
        valor: valorErrado ? null : card.valor,
        ...(f?.cond ? { cond: f.cond } : {}),
        ...(f?.iptu ? { iptu: f.iptu } : {}),
        ...(elevador ? { acesso: 'elevador' } : escada ? { acesso: 'escada' } : {}),
        ...(vista ? { vista } : {}),
        status: 'disponivel',
        ...(valorErrado ? { conf: true } : {}),
        obs: extras.join('. ').replace(/\.\./g, '.'),
        fonte,
        contato,
        tabela: HOJE,
        anuncio: SITE + card.link,
      },
    ],
  };
}

/* ---------- execução ---------- */
const cards = [];
for (let p = 1; ; p++) {
  const html = await baixar(`${SITE}/imoveis/a-venda?pagina=${p}`, join(PASTA, `pagina-${p}.html`));
  if (!html) break;
  const novos = lerCards(html);
  if (!novos.length) break;
  cards.push(...novos);
}
const total = +(readFileSync(join(PASTA, 'pagina-1.html'), 'utf8').match(/(\d+) im[óo]veis/i)?.[1] ?? 0);
const vistos = new Set();
const unicos = cards.filter((c) => !vistos.has(c.codigo) && vistos.add(c.codigo));
if (total && unicos.length !== total) throw new Error(`A listagem diz ${total} imóveis, foram lidos ${unicos.length}`);

const predios = [];
let semFicha = 0;
for (const c of unicos) {
  const html = await baixar(SITE + c.link, join(PASTA, 'fichas', `${c.codigo}.html`));
  if (!html) semFicha++;
  predios.push(predio(c, html ? lerFicha(html) : null));
}
// anúncios no mesmo endereço (rua e número) viram um prédio só, com uma unidade por anúncio;
// "Avenida Presidente Costa e Silva" e "Av Costa e Silva" são a mesma rua
const chaveRua = (end) =>
  slug(end.split(' - ')[0].replace(/\b(avenida|av|rua|r|presidente|pres|doutor|dr|general|marechal|brigadeiro|professora|profa|deputado|jornalista|comendador)\b\.?/gi, ''));
const porNome = new Map();
for (const p of predios) {
  const k = p.endereco ? chaveRua(p.endereco) + '|' + p.cidade : p.id;
  const ja = porNome.get(k);
  if (!ja) { porNome.set(k, p); continue; }
  if (ja.nome === ja.endereco?.split(' - ')[0] && p.nome !== p.endereco?.split(' - ')[0]) ja.nome = p.nome;
  ja.unidades.push(...p.unidades);
  ja.tabelas.push(...p.tabelas);
  ja.lazer = [...new Set([...ja.lazer, ...p.lazer])];
  ja.notas = [...new Set([...ja.notas, ...p.notas])];
}
const saida = [...porNome.values()];
// o mesmo apartamento anunciado duas vezes fica nas duas linhas, avisado na observação
for (const p of saida) {
  for (const u of p.unidades) {
    const outro = p.unidades.find((v) => v !== u && !v.unidade.startsWith('Cód.') && v.unidade === u.unidade);
    if (outro) u.obs = [u.obs, `Mesmo apartamento do anúncio ${outro.fonte.match(/cód\. \d+/)[0]}`].filter(Boolean).join('. ');
  }
}
writeFileSync(
  'dados/origem/site-lesan.json',
  JSON.stringify({ arquivo: `${SITE}/imoveis/a-venda`, lidoEm: new Date().toISOString().slice(0, 10), sobre: 'Imóveis à venda no site da Lesan Imóveis.', predios: saida }, null, 1) + '\n',
);
console.log(`${unicos.length} anúncios → ${saida.length} prédios; ${semFicha} sem ficha lida${semFicha ? ' (rode de novo mais tarde)' : ''}.`);
