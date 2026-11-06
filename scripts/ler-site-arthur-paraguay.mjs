// Gera dados/origem/site-arthur-paraguay.json: os imóveis à venda do site da Arthur Paraguay Investimentos Imobiliários
// (arthurparaguay.com.br, plataforma Praedium, o mesmo modelo do site da Lesan). Locação e terrenos não entram.
// O site não mostra endereço: o prédio leva o nome que a descrição do anúncio cita ("Edifício X", "Residencial Y");
// sem nome, ele se chama "Arthur Paraguay cód. N". Anúncios com o mesmo nome no mesmo bairro viram um prédio só.
// Uso: node scripts/ler-site-arthur-paraguay.mjs [pasta] [--sem-baixar] [--atualizar]   (padrão: dados/cache/site-arthur-paraguay, fora do git)
// --atualizar baixa de novo a listagem; as fichas já baixadas continuam valendo. No fim, compara com o json anterior.
// Baixa uma página a cada 2 s e para no primeiro desafio anti-robô do site (sem contorná-lo): as fichas que faltarem
// usam só os dados do card da listagem. Rode de novo mais tarde para completar.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { baixador, lerCards, lerFicha, lazerDaDescricao, CASA, VISTA_RE, plural, slug } from './praedium.mjs';

const SITE = 'https://arthurparaguay.com.br';
const ORIGEM = 'site-arthur-paraguay';
const ARQ = `dados/origem/${ORIGEM}.json`;
const args = process.argv.slice(2);
const PASTA = args.find((a) => !a.startsWith('--')) ?? `dados/cache/${ORIGEM}`;
const atualizar = args.includes('--atualizar');
const HOJE = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
mkdirSync(join(PASTA, 'fichas'), { recursive: true });
const { baixar, estado } = baixador({ pausa: 2000, semBaixar: args.includes('--sem-baixar') });

/* ---------- o que entra ---------- */
const TERRENO = /terreno|lote|[áa]rea\b|ch[áa]cara|s[íi]tio|fazenda/i;
const COMERCIAL = /sala|loja|galp[ãa]o|pr[ée]dio comercial|ponto|comercial|consult[óo]rio|hotel|pousada/i;

/** Nome do prédio citado na descrição: "Edifício Gaivotas" → "Ed. Gaivotas", "Residencial Pietra" → "Res. Pietra". */
const PALAVRA = "[A-ZÀ-Ý][A-Za-zÀ-ÿ'’]+|[IVX]{1,4}\\b|\\d{1,3}\\b";
const NOME_RE = new RegExp(`\\b(Edif[íi]cio|Residencial|Condom[íi]nio)\\s+((?:${PALAVRA})(?:\\s+(?:d[aeo]s?\\s+)?(?:${PALAVRA}))*)`, 'u');
/** Palavras que vêm depois de "Condomínio"/"Residencial" sem ser nome ("Condomínio Fechado", "Residencial Completo"). */
const NAO_NOME = /^(fechado|clube|completo|com|de|do|da|frente|novo|moderno|alto|padr[ãa]o|em|na|no|para|tranquilo|seguro|bem|muito|super|excelente|[óo]timo|lindo|amplo|possui|oferece|conta|dispõe|disp[õo]e|praia|grande|bairro|localizado|valor|taxa|pr[óo]prio|lazer|piscina|apenas|todo|toda|sem|vertical|horizontal|residencial|edif[íi]cio)$/i;
export function nomeDoPredio(desc) {
  const m = String(desc ?? '').match(NOME_RE);
  if (!m) return '';
  const nome = m[2].replace(/\s+(Praia|Grande|Localizado|Apartamento|Casa|Com|Possui|Em|No|Na)\b.*$/u, '').trim();
  if (!nome || NAO_NOME.test(nome.split(' ')[0])) return '';
  const tipo = /^edif/i.test(m[1]) ? 'Ed.' : /^resid/i.test(m[1]) ? 'Res.' : 'Cond.';
  return `${tipo} ${nome}`;
}

function predio(card, f) {
  const casa = CASA.test(card.tipo);
  const comercial = !casa && COMERCIAL.test(card.tipo);
  const kitnet = /kitnet|studio|flat|loft/i.test(card.tipo);
  const fase = /constru/i.test(card.selo) ? 'obra' : /lan[çc]amento/i.test(card.selo) ? 'lancamento' : 'pronto';
  const dorm = kitnet || comercial ? 0 : card.quartos ?? 0;
  const suites = f?.suites ?? null;
  const tipologia = comercial
    ? card.tipo
    : (kitnet ? card.tipo : casa || /cobertura/i.test(card.tipo) ? `${card.tipo} ${plural(dorm, 'dorm', 'dorms')}` : plural(dorm, 'dorm', 'dorms')) +
      (suites ? ` (${plural(suites, 'suíte', 'suítes')})` : '');
  const area = f?.areaUtil ?? (casa ? f?.areaTotal : null) ?? card.area;
  const valorErrado = card.valor > 1e8;
  const desc = f?.desc || card.desc;
  const itens = Object.values(f?.itens ?? {}).flat();
  const elevador = itens.some((i) => /^elevador/i.test(i)) || /\belevador/i.test(desc);
  const escada = /\bde escadas?\b|\bsem elevador/i.test(desc);
  const achado = (desc.match(VISTA_RE)?.[0] ?? itens.find((i) => /vista.*mar|frente.*mar/i.test(i)) ?? '').trim().toLowerCase();
  const vista = achado && achado[0].toUpperCase() + achado.slice(1);
  const nomeDesc = nomeDoPredio(desc);
  const nome = nomeDesc || `Arthur Paraguay cód. ${card.codigo}`;
  const andarDesc = desc.match(/\b(\d{1,2})[ºo°]\s*andar/)?.[1];
  const vagas = f?.vagas ?? card.vagas;
  const contato = [f?.corretor || 'Arthur Paraguay Investimentos Imobiliários', f?.creci && `CRECI ${f.creci}`, '(13) 99796-5404']
    .filter(Boolean)
    .join(' · ');
  const fonte = `Site Arthur Paraguay (cód. ${card.codigo})`;
  const extras = [
    f?.titulo,
    f?.andarFaixa && !andarDesc ? f.andarFaixa : '',
    f?.terreno ? `Terreno de ${f.terreno.toLocaleString('pt-BR')} m²` : '',
    f?.areaTotal && f.areaUtil && f.areaTotal !== f.areaUtil ? `Área total ${f.areaTotal.toLocaleString('pt-BR')} m²` : '',
    f?.itens['Bem estar e comodidade']?.join(', '),
    f?.renda ? `Renda necessária R$ ${f.renda.toLocaleString('pt-BR')}` : '',
    /^\d{4}$/.test(f?.entrega ?? '') && fase === 'pronto' ? `Entregue em ${f.entrega}` : '',
    valorErrado ? `O site anuncia por R$ ${card.valor.toLocaleString('pt-BR')}, provável erro de digitação: confirmar o valor` : '',
    f ? '' : 'Ficha do anúncio não lida: só os dados da listagem.',
  ].filter(Boolean);
  return {
    id: `arthur-${nomeDesc ? slug(nomeDesc + ' ' + card.bairro) : card.codigo}`,
    nome,
    cidade: card.cidade,
    bairro: card.bairro,
    fase,
    ...(fase !== 'pronto' && f?.entrega ? { entrega: f.entrega } : {}),
    lazer: [...(f?.itens['Lazer e natureza'] ?? []), ...lazerDaDescricao(desc, f?.itens['Lazer e natureza'])],
    tabelas: [{ fonte, contato, atualizadoEm: HOJE }],
    notas: [nomeDesc ? 'O site não mostra o endereço; o nome do prédio é o que a descrição do anúncio cita.' : 'O site não mostra o endereço nem o nome do prédio.'],
    unidades: [
      {
        unidade: `Cód. ${card.codigo}`,
        ...(andarDesc ? { andar: +andarDesc } : {}),
        tipologia,
        ...(casa ? { categoria: 'casa' } : comercial ? { categoria: 'comercial' } : {}),
        dorm,
        ...(suites != null ? { suites } : {}),
        ...(area ? { area } : {}),
        ...(vagas != null ? { vagas: vagas ? String(vagas) : 'sem vaga' } : {}),
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
  const html = await baixar(`${SITE}/imoveis/a-venda?pagina=${p}`, join(PASTA, `pagina-${p}.html`), atualizar);
  if (!html && atualizar) throw new Error(`A listagem parou na página ${p} (verificação do site); nada foi alterado. Rode de novo mais tarde.`);
  if (!html) break;
  const novos = lerCards(html);
  if (!novos.length) break;
  cards.push(...novos);
}
const total = +(readFileSync(join(PASTA, 'pagina-1.html'), 'utf8').match(/([\d.]+) im[óo]veis/i)?.[1].replace('.', '') ?? 0);
const vistos = new Set();
const unicos = cards.filter((c) => !vistos.has(c.codigo) && vistos.add(c.codigo));
// Publicar no painel só quando a listagem inteira foi capturada (todos os anúncios à venda do site).
// Enquanto parcial, o unificar/validar ignoram esta origem e o painel não muda. As fichas continuam
// enriquecendo os cards nos dias seguintes, já publicadas.
const listagemCompleta = total > 0 && unicos.length === total;
if (estado.bloqueado && !args.includes('--sem-baixar')) console.warn(`Listagem incompleta: ${unicos.length} de ${total}.`);
else if (total && unicos.length !== total) console.warn(`A listagem diz ${total} imóveis, foram lidos ${unicos.length}.`);
const fora = unicos.filter((c) => TERRENO.test(c.tipo) && !CASA.test(c.tipo));
const entram = unicos.filter((c) => !fora.includes(c));

const predios = [];
let semFicha = 0;
for (const c of entram) {
  const html = await baixar(SITE + c.link, join(PASTA, 'fichas', `${c.codigo}.html`));
  if (!html) semFicha++;
  predios.push(predio(c, html ? lerFicha(html) : null));
}
// anúncios com o mesmo nome de prédio no mesmo bairro viram um prédio só, com uma unidade por anúncio
const porId = new Map();
for (const p of predios) {
  const ja = porId.get(p.id);
  if (!ja) { porId.set(p.id, p); continue; }
  ja.unidades.push(...p.unidades);
  ja.tabelas.push(...p.tabelas);
  ja.lazer = [...new Set([...ja.lazer, ...p.lazer])];
  if (ja.fase !== p.fase && p.fase !== 'pronto') ja.fase = p.fase;
}
const saida = [...porId.values()];

// o que mudou desde a leitura anterior, pelo código do anúncio
const codigo = (u) => u.fonte.match(/cód\. (\d+)/)[1];
const porCodigo = (ps) => new Map(ps.flatMap((p) => p.unidades.map((u) => [codigo(u), { valor: u.valor, nome: p.nome, unidade: u.unidade }])));
const anterior = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : null;
const antes = anterior ? porCodigo(anterior.predios) : new Map();
const semData = (u) => JSON.stringify({ ...u, tabela: '' });
const unidadeAntes = new Map((anterior?.predios ?? []).flatMap((p) => p.unidades.map((u) => [codigo(u), u])));
for (const p of saida)
  for (const u of p.unidades) {
    const velho = unidadeAntes.get(codigo(u));
    if (!velho || semData(velho) !== semData(u)) continue;
    u.tabela = velho.tabela;
    const t = p.tabelas.find((x) => x.fonte === u.fonte);
    if (t) t.atualizadoEm = velho.tabela;
  }
const agora = porCodigo(saida);
const brl = (v) => (v ? `R$ ${v.toLocaleString('pt-BR')}` : 'sem valor');
const desc = (c, x) => `cód. ${c} (${x.nome})`;
if (antes.size) {
  const novos = [...agora].filter(([c]) => !antes.has(c));
  const retirados = [...antes].filter(([c]) => !agora.has(c));
  const valores = [...agora].filter(([c, x]) => antes.has(c) && antes.get(c).valor !== x.valor);
  console.log(`Novos (${novos.length}):`, novos.map(([c, x]) => `${desc(c, x)} ${brl(x.valor)}`).join('; ') || '—');
  console.log(`Retirados do site (${retirados.length}):`, retirados.map(([c, x]) => desc(c, x)).join('; ') || '—');
  console.log(`Valor alterado (${valores.length}):`, valores.map(([c, x]) => `${desc(c, x)} ${brl(antes.get(c).valor)} → ${brl(x.valor)}`).join('; ') || '—');
}
writeFileSync(
  ARQ,
  JSON.stringify(
    {
      arquivo: `${SITE}/imoveis/a-venda`,
      lidoEm: new Date().toISOString().slice(0, 10),
      sobre: 'Imóveis à venda no site da Arthur Paraguay Investimentos Imobiliários (sem terrenos).',
      // enquanto false, o painel ignora esta origem (importação ainda em andamento, aos poucos)
      publicado: listagemCompleta,
      listagem: { lidos: unicos.length, total, completa: listagemCompleta },
      foraDoPainel: fora.map((c) => ({ codigo: c.codigo, tipo: c.tipo, bairro: c.bairro, cidade: c.cidade, valor: c.valor })),
      predios: saida,
    },
    null,
    1,
  ) + '\n',
);
console.log(
  `${unicos.length} de ${total || '?'} anúncios da listagem (${fora.length} terrenos fora) → ${saida.length} prédios; ${unicos.length - semFicha} com ficha, ${semFicha} sem.`,
);
console.log(
  listagemCompleta
    ? 'Listagem COMPLETA: a origem entra no painel (publicado: true). As fichas que faltam completam nos próximos dias.'
    : `Listagem ainda PARCIAL (${unicos.length}/${total || '?'}): origem segue fora do painel (publicado: false). Rode de novo amanhã para trazer mais.`,
);
