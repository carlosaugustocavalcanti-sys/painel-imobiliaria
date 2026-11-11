// Leitura dos sites de imobiliária feitos na plataforma Praedium (Lesan Imóveis, Arthur Paraguay).
// Todos usam o mesmo modelo de página: card da listagem com data-code, data-property-value etc.,
// e ficha do anúncio com cômodos, metragens, condomínio, IPTU, corretor, descrição e listas de itens.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/* ---------- download ---------- */
/** Página de verificação anti-robô (AWS WAF da Lesan, Cloudflare em outros sites). */
export const desafio = (html) => /<title>\s*(Human Verification|Just a moment|Attention Required)/i.test(html);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Baixa páginas uma a uma, com pausa entre elas, e para no primeiro desafio anti-robô (sem tentar contorná-lo).
 * O que já está em cache não é baixado de novo, a não ser com renovar = true.
 */
export function baixador({ pausa = 6000, semBaixar = false } = {}) {
  const estado = { bloqueado: semBaixar };
  async function baixar(url, arquivo, renovar = false) {
    if (!renovar && existsSync(arquivo) && !desafio(readFileSync(arquivo, 'utf8'))) return readFileSync(arquivo, 'utf8');
    if (estado.bloqueado) return null;
    let r, html;
    try {
      r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
      html = await r.text();
    } catch (e) {
      // Falha de rede (timeout, conexão cortada): para por hoje e grava o que já veio, em vez de derrubar o script.
      estado.bloqueado = true;
      console.warn(`Falha de rede em ${url} (${e.cause?.code ?? e.name}); o restante fica para a próxima execução.`);
      return null;
    }
    await espera(pausa);
    if (desafio(html) || r.status === 403 || r.status === 429 || r.status >= 500) {
      estado.bloqueado = true;
      console.warn(`O site pediu verificação ou recusou ${url} (HTTP ${r.status}); o restante fica para a próxima execução.`);
      return null;
    }
    if (r.status !== 200) {
      console.warn(`HTTP ${r.status} em ${url}; página ignorada.`);
      return null;
    }
    writeFileSync(arquivo, html);
    return html;
  }
  return { baixar, estado };
}

/* ---------- leitura ---------- */
export const texto = (h) =>
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
export const reais = (s) => (s ? +s.replace(/[^\d,]/g, '').replace(',', '.') || null : null);
export const m2 = (s) => +s.replace(/\./g, '').replace(',', '.');

/** Card da listagem: o que vale para todo anúncio, mesmo sem a ficha. Locação fica de fora. */
export function lerCards(html) {
  return html
    .split('<div class="col-md-6 col-lg-6">')
    .slice(1)
    .map((c) => {
      const a = (n) => c.match(new RegExp(`data-${n}="([^"]*)"`))?.[1] ?? '';
      const link = c.match(/href="(\/imovel\/[a-z0-9-]+)"/)?.[1];
      if (!link || a('transaction') !== 'sell') return null;
      const dados = [...c.matchAll(/<li class="flex-fill pb-0"><span>([^<]*)<\/span>/g)].map((m) => m[1]);
      const n = (re) => +(dados.find((d) => re.test(d))?.match(/\d+/)?.[0] ?? 0) || null;
      return {
        codigo: a('code'),
        link,
        tipo: a('property-type'),
        cidade: a('city').replace(/\/SP$/, ''),
        bairro: a('block'),
        valor: +a('property-value') || null,
        selo: texto(c.match(/sale_position">([\s\S]*?)<\/div>/)?.[1]),
        quartos: n(/quarto/i),
        vagas: n(/vaga/i),
        area: (() => { const d = dados.find((x) => /m²/.test(x)); return d ? m2(d.match(/[\d.,]+/)[0]) : null; })(),
        desc: texto(c.match(/card_property_description">\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1]),
      };
    })
    .filter(Boolean);
}

/** Ficha do anúncio: cômodos, metragens, condomínio, IPTU, corretor, descrição e itens. */
export function lerFicha(html) {
  const comp = [...html.matchAll(/composition_name color-primary">\s*([\s\S]*?)\s*<\/div>/g)].map((m) => texto(m[1]));
  const n = (re) => { const c = comp.find((x) => re.test(x)); return c ? +c.match(/^[\d.]+/)?.[0] || 0 : null; };
  const areaDe = (re) => { const c = comp.find((x) => re.test(x)); const v = c?.match(/^[\d.,]+/)?.[0]; return v ? m2(v) : null; };
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

/* ---------- lazer citado na descrição ---------- */
// A descrição às vezes cita lazer do condomínio que não está marcado na lista "Lazer e natureza" do anúncio.
// Vale só a frase que fala do prédio (condomínio, moradores, empreendimento, lazer) e não do apartamento
// ("sacada gourmet com churrasqueira") nem do bairro ("academias e opções de lazer na região").
const LAZER_DESC = [
  ['Piscina', /piscina/],
  ['Salão de Festas', /sal(ao|oes) de festas/],
  ['Salão de Jogos', /sal(ao|oes) de jogos/],
  ['Academia', /academia|espaco fitness/],
  ['Espaço Gourmet', /espaco gourmet/],
  ['Churrasqueira', /churrasqueira/],
  ['Brinquedoteca', /brinquedoteca/],
  ['Playground', /playground/],
  ['Sauna', /sauna/],
  ['Quadra Poliesportiva', /quadra (poliesportiva|de futebol|esportiva)|mini ?quadra/],
  ['Cinema', /cinema/],
];
const sem = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DO_PREDIO = /condominio|edificio|empreendimento|predio|moradores|lazer|diferenciais/;
const NAO_DO_PREDIO = /apartamento|sacada|varanda|bairro|regiao|cidade|arredores|proxim|perto|vizinhanca|entorno|localiza/;
export function lazerDaDescricao(desc, lista = []) {
  const ja = sem(lista.join(' | '));
  const achados = new Set();
  for (const f of sem(desc ?? '').split(/[.!?;\n]/))
    if (DO_PREDIO.test(f) && !NAO_DO_PREDIO.test(f)) for (const [nome, re] of LAZER_DESC) if (re.test(f) && !re.test(ja)) achados.add(nome);
  return [...achados];
}

/* ---------- formato do painel ---------- */
export const CASA = /casa|sobrado|sobreposta|geminada/i;
export const VISTA_RE = /(vista\s+(?:para\s+o\s+|pro\s+|ao\s+|total\s+|livre\s+|frontal\s+|lateral\s+)?(?:do\s+|para\s+o\s+)?mar|frente\s+(?:ao\s+|para\s+o\s+)?mar|frente\s+(?:à\s+|a\s+)?praia|p[ée]\s+na\s+areia)/i;
export const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
