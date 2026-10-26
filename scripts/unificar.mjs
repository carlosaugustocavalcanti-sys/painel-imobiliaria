// Gera public/dados/estoque.json a partir de dados/origem/*.json (os três painéis antigos e a pasta Lançamentos do OneDrive).
// Regras de unificação (documentadas em dados/README.md):
// - um prédio que aparece em mais de um painel vira um só quando nome, bairro e endereço são compatíveis;
// - a mesma unidade em duas tabelas vira uma só: o registro reservado tem prioridade, senão a ordem
//   lançamentos > pasta Lançamentos (lesan) > tabela do Isildo > pasta Frente Mar > usados > vista mar; o outro registro fica em `outras` e as diferenças em `divergencias`;
// - nenhum registro de origem é descartado: cada um mantém `ref` = "<painel>:<id do prédio>:<índice>".
// Uso: node scripts/unificar.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ler = (n) => JSON.parse(readFileSync(`dados/origem/${n}.json`, 'utf8'));
const USADOS = ler('usados');
const LANC = ler('lancamentos');
const PASTA = ler('pasta-lancamentos');
const ISILDO = ler('isildo');
const FRENTE = ler('frente-mar');
const LANCD = ler('lancamentos-drive');
const VISTA = ler('vista-mar');

/* ---------- normalização ---------- */
export const chave = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const slug = (s) => chave(s).replace(/ /g, '-');

/** Bairros com a grafia de cada tabela → nome canônico (curto, como na faixa da orla). */
const BAIRRO_ALIAS = {
  forte: 'Canto do Forte',
  'canto do forte': 'Canto do Forte',
  guilhermina: 'Guilhermina',
  'vila guilhermina': 'Guilhermina',
  tupi: 'Tupi',
  'vila tupi': 'Tupi',
  mirim: 'Mirim',
  'vila mirim': 'Mirim',
  caicara: 'Caiçara',
  'vila caicara': 'Caiçara',
  real: 'Real',
  'jardim real': 'Real',
  florida: 'Flórida',
  'balneario florida': 'Flórida',
  imperador: 'Imperador',
  'jardim imperador': 'Imperador',
};
function bairroCanonico(texto) {
  const base = String(texto || 'A confirmar').split(' (')[0];
  return BAIRRO_ALIAS[chave(base)] ?? base;
}

/** Rua + número para comparar endereços entre tabelas. */
function enderecoChave(end) {
  if (!end || /n[ãa]o consta|a confirmar|sem endere/i.test(end)) return null;
  const s = chave(String(end).split(' · ')[0].replace(/\(.*?\)/g, ''))
    .replace(/\b(rua|r|avenida|av|praca|alameda|travessa)\b/g, '')
    .replace(/\b(doutor|dr|presidente|pres|nossa senhora|n sra|comendador|general)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const num = (s.match(/\b(\d[\d ]*)\b/) || [])[1]?.replace(/ /g, '') ?? null;
  const rua = s.replace(/\b\d[\d ]*\b.*$/, '').trim();
  if (!rua) return null;
  return { rua, num };
}
function enderecosCompativeis(a, b) {
  const A = enderecoChave(a),
    B = enderecoChave(b);
  if (!A || !B) return true;
  const ruaOk = A.rua.includes(B.rua) || B.rua.includes(A.rua);
  return ruaOk && (!A.num || !B.num || A.num === B.num);
}

/* dormitórios: mesma classificação dos painéis antigos */
const dmFromText = (t) => {
  t = String(t || '');
  const m = t.match(/(\d)\s*(?:dorm|su[íi]te|quarto)/i);
  if (m) {
    const n = +m[1];
    return n >= 4 ? '4' : String(n);
  }
  return /kitnet|studio|est[úu]dio|flat|loft/i.test(t) ? 'k' : null;
};
const dmFromNum = (n) => (n == null || n === 0 ? 'k' : n >= 4 ? '4' : String(n));

/** Menção a vista para o mar no texto da tabela (usado fora do painel Vista Mar). */
const VISTA_RE =
  /vista\s+(?:para\s+o\s+|pro\s+|ao\s+|total\s+|livre\s+(?:e\s+|para\s+o\s+)?|frontal\s+(?:para\s+o\s+)?|lateral\s+(?:do\s+|para\s+o\s+)?)?mar|frente\s+(?:ao\s+|para\s+o\s+)?mar|frente\s+(?:à\s+|a\s+)?praia|p[ée]\s+na\s+areia/i;
const SEM_VISTA_RE = /sem\s+vista|n[ãa]o\s+tem\s+vista/i;

const num = (v) => (v == null || v === '' || isNaN(+v) ? null : +v);
const STATUS_VISTA = { d: 'disponivel', v: 'vendido', r: 'reservado', s: 'suspenso' };
const FASE_VISTA = { Pronto: 'pronto', 'Recém-entregue': 'pronto', 'Em obra': 'obra', 'Em obras': 'obra', Lançamento: 'lancamento' };

/* ---------- prédios e unidades por painel ---------- */
const predios = [];

// Painel de Apartamentos Usados
for (const e of USADOS.emps) {
  const t = USADOS.units[e.id];
  predios.push({
    origem: 'usados',
    origemId: e.id,
    nome: e.nome,
    cidade: 'Praia Grande',
    bairroTexto: e.bairro || 'A confirmar',
    endereco: t?.endereco || '',
    mapa: t?.mapa || '',
    entrega: e.entrega || '',
    fase: e.cat === 'obra' ? 'obra' : 'pronto',
    tabelas: t ? [{ origem: 'usados', fonte: t.fonte || '', contato: t.contato || '', atualizadoEm: t.atualizadoEm || '' }] : [],
    fontes: e.fontes || [],
    unidades: (t?.itens || []).map((x, i) => {
      const texto = [x.tipologia, x.det, x.obs].join(' ');
      const vm = VISTA_RE.test(texto) && !SEM_VISTA_RE.test(texto);
      return {
        ref: `usados:${e.id}:${i}`,
        origem: 'usados',
        mercado: 'revenda',
        fase: e.cat === 'obra' ? 'obra' : 'pronto',
        unidade: String(x.unidade ?? ''),
        tipologia: x.tipologia || '',
        dm: dmFromText(x.tipologia),
        det: x.det || '',
        area: num(x.area),
        valor: num(x.valor),
        vfin: num(x.vfin),
        cond: num(x.cond),
        iptu: num(x.iptu),
        vagas: x.vg || '',
        acesso: x.acesso || '',
        vistaMar: vm,
        vistaFonte: vm ? 'texto' : null,
        vista: '',
        status: x.status || 'disponivel',
        conf: !!x.conf,
        obs: x.obs || '',
        fonte: x.fonte || '',
        contato: '',
        tabela: t?.atualizadoEm || '',
      };
    }),
  });
}

// Painel de Lançamentos (com o fluxo do Fátima, que o painel aplicava por código)
const lancUnits = structuredClone(LANC.units);
lancUnits.fatima.itens.forEach((x) => {
  const a = LANC.fluxoFatima[x.unidade];
  if (a) x.fluxo = { entrada: a[0], chaves: a[1], anualQtd: a[2], anualVal: a[3], parcQtd: a[4], parcVal: a[5] };
});
lancUnits.fatima.fluxoInfo = LANC.fluxoInfoFatima;
for (const e of LANC.emps) {
  const t = lancUnits[e.id];
  const fase = (e.cat || 'lanc') === 'lanc' ? 'lancamento' : e.cat;
  predios.push({
    origem: 'lancamentos',
    origemId: e.id,
    nome: e.nome,
    cidade: 'Praia Grande',
    bairroTexto: e.bairro || 'A confirmar',
    endereco: t?.endereco || '',
    mapa: t?.mapa || '',
    entrega: e.entrega || '',
    entregaSort: e.entregaSort || '',
    fase,
    tabelas: t ? [{ origem: 'lancamentos', fonte: t.fonte || '', contato: t.contato || '', atualizadoEm: t.atualizadoEm || '' }] : [],
    fontes: t?.fonte ? [t.fonte] : [],
    lanc: {
      padrao: e.padrao || '',
      gravacao: e.status || 'a_gravar',
      ordem: e.ordem ?? null,
      site: !!e.site,
      diferenciais: e.diferenciais || [],
      pendencias: e.pendencias || [],
      notas: e.notas || '',
      confirmar: !!e.confirmar,
      modalidade: t?.modalidade || 'bancario',
      notaValor: t?.notaValor || '',
      fluxoInfo: t?.fluxoInfo || null,
      book: t?.book || null,
      tabelaRecebida: !!t?.itens?.length,
    },
    unidades: (t?.itens || []).map((x, i) => {
      const texto = [x.tipologia, x.obs, x.promo].join(' ');
      const vm = VISTA_RE.test(texto) && !SEM_VISTA_RE.test(texto);
      const u = {
        ref: `lancamentos:${e.id}:${i}`,
        origem: 'lancamentos',
        mercado: 'construtora',
        fase,
        unidade: String(x.unidade ?? ''),
        tipologia: x.tipologia || '',
        dm: dmFromText(x.tipologia),
        det: '',
        area: num(x.area),
        valor: num(x.valor),
        cond: null,
        iptu: null,
        vagas: '',
        acesso: '',
        vistaMar: vm,
        vistaFonte: vm ? 'texto' : null,
        vista: '',
        status: x.status || 'disponivel',
        conf: false,
        obs: x.obs || '',
        fonte: t?.fonte || '',
        contato: '',
        tabela: t?.atualizadoEm || '',
      };
      for (const k of ['andar', 'final', 'valorDireto', 'entrada', 'chaves', 'financ', 'parcela', 'renda', 'laudo', 'promo', 'fluxo']) {
        if (x[k] != null && x[k] !== '') u[k] = x[k];
      }
      return u;
    }),
  });
}

// Painel Vista Mar
const mapsVista = (g) =>
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(
    (g.end ? g.end.replace(/\s*\(.*?\)/g, '') : g.nome) + ', ' + (g.bairro !== 'A confirmar' ? g.bairro + ', ' : '') + g.cidade + ', SP',
  );
const tipoVista = (x) =>
  x.dorm == null || x.dorm === 0
    ? x.tipo || 'Kitnet/Flat'
    : x.dorm + ' dorm' + (x.dorm > 1 ? 's' : '') + (x.su ? ` (${x.su} suíte${x.su > 1 ? 's' : ''})` : '');
for (const g of VISTA.G) {
  const us = VISTA.U.map((x, i) => ({ x, i })).filter(({ x }) => x.g === g.id);
  const fontes = [...new Set(us.map(({ x }) => x.fonte))];
  predios.push({
    origem: 'vista-mar',
    origemId: g.id,
    nome: g.nome,
    cidade: g.cidade,
    bairroTexto: g.bairro || 'A confirmar',
    endereco: g.end || '',
    mapa: mapsVista(g),
    mapaPorNome: !g.end,
    entrega: g.entrega || '',
    fase: g.cat === 'obra' ? 'obra' : 'pronto',
    tabelas: fontes.map((f) => {
      const u = us.find(({ x }) => x.fonte === f).x;
      return { origem: 'vista-mar', fonte: f, contato: us.map(({ x }) => x.fonte === f && x.ct).find(Boolean) || '', atualizadoEm: u.tab || '' };
    }),
    fontes,
    unidades: us.map(({ x, i }) => ({
      ref: `vista-mar:${g.id}:${i}`,
      origem: 'vista-mar',
      mercado: 'revenda',
      fase: FASE_VISTA[x.fase] ?? (g.cat === 'obra' ? 'obra' : 'pronto'),
      unidade: String(x.ap ?? ''),
      tipologia: tipoVista(x),
      dm: dmFromNum(x.dorm),
      dorm: x.dorm ?? null,
      suites: x.su ?? null,
      det: '',
      area: num(x.area),
      valor: num(x.valor),
      vp: num(x.vp),
      cond: num(x.cond),
      iptu: num(x.iptu),
      vagas: x.vg || '',
      acesso: x.el === 'e' ? 'elevador' : x.el === 'x' ? 'escada' : '',
      vistaMar: true,
      vistaFonte: 'painel',
      vista: x.vista || '',
      status: STATUS_VISTA[x.st] || x.st,
      conf: !!x.conf,
      obs: x.obs || '',
      fonte: x.fonte || '',
      contato: x.ct || '',
      tabela: x.tab || '',
      entregaUnidade: x.ent || '',
    })),
  });
}

// Pasta Lançamentos (OneDrive): Harmony, Parque das Araucárias, Seven, Toninho, Ectual e Gomes Pacheco.
// Os registros já vêm no formato da unidade unificada; aqui entram só ref, origem, segmento e fase.
const mapsPasta = (b) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.endereco || `${b.nome}, ${b.cidade}, SP`);
// A tabela do Isildo (20/10/2026) tem o mesmo formato e entra pelo mesmo caminho, com origem 'isildo'.
for (const [origem, b] of [...PASTA.predios.map((b) => ['lesan', b]), ...ISILDO.predios.map((b) => ['isildo', b]), ...FRENTE.predios.map((b) => ['frente-mar', b]), ...LANCD.predios.map((b) => ['lanc-drive', b])]) {
  predios.push({
    origem,
    origemId: b.id,
    nome: b.nome,
    cidade: b.cidade,
    bairroTexto: b.bairro || 'A confirmar',
    endereco: b.endereco || '',
    mapa: mapsPasta(b),
    mapaPorNome: !b.endereco,
    entrega: b.entrega || '',
    fase: b.fase,
    tabelas: b.tabelas.map((t) => ({ origem, fonte: t.fonte || '', contato: t.contato || '', atualizadoEm: t.atualizadoEm || '' })),
    fontes: [...new Set(b.tabelas.map((t) => t.fonte).filter(Boolean))],
    lazer: b.lazer ?? [],
    diferenciais: b.diferenciais ?? [],
    notas: b.notas ?? [],
    ...(b.lanc ? { lanc: { ...b.lanc, diferenciais: b.diferenciais ?? [] } } : {}),
    unidades: b.unidades.map((x, i) => {
      const fase = x.fase ?? b.fase;
      const texto = [x.tipologia, x.det, x.obs, x.vista].join(' ');
      // vistaMar explícito na origem vale; sem ele, a menção a vista/frente para o mar no texto da tabela
      const vm = x.vistaMar !== undefined ? !!x.vistaMar : VISTA_RE.test(texto) && !SEM_VISTA_RE.test(texto);
      return {
        ref: `${origem}:${b.id}:${i}`,
        origem,
        mercado: fase === 'pronto' ? 'revenda' : 'construtora',
        fase,
        ...x,
        dm: dmFromNum(x.dorm),
        vistaMar: vm,
        vistaFonte: vm ? 'texto' : null,
        status: x.status || 'disponivel',
      };
    }),
  });
}

/* ---------- fusão de prédios entre painéis ---------- */
const PRIORIDADE = { lancamentos: 0, lesan: 1, isildo: 2, 'lanc-drive': 2.5, 'frente-mar': 3, usados: 4, 'vista-mar': 5 };
predios.forEach((p) => (p.bairro = bairroCanonico(p.bairroTexto)));
/** Fusões conferidas à mão que a regra automática não pega (bairro divergente entre tabelas). */
const FUNDIR_MANUAL = [
  // Mesmo prédio na Av. Pres. Castelo Branco, 16.140: Lançamentos diz Imperador, Vista Mar diz Jardim Real.
  ['lancamentos:melissa-miyazi', 'vista-mar:g107'],
  // Costa do Mar: a Ectual escreve "Rua Maria de Lourdes Simões e Simões" e o painel Vista Mar, "R. Maria Simões, 50".
  ['lesan:costa-do-mar', 'vista-mar:g136'],
  ['lesan:costa-do-mar', 'frente-mar:costa-do-mar-frente-mar'],
  // Melissa Miyazi também aparece na pasta Frente Mar (C2X e Nova Home), com o mesmo endereço.
  ['lancamentos:melissa-miyazi', 'frente-mar:melissa-miyazi-frente-mar'],
];
const grupos = [];
for (const p of predios) {
  const manual = FUNDIR_MANUAL.find((par) => par.includes(`${p.origem}:${p.origemId}`));
  const alvoManual =
    manual && grupos.find((g) => g.membros.some((m) => manual.includes(`${m.origem}:${m.origemId}`)));
  if (alvoManual) {
    alvoManual.membros.push(p);
    continue;
  }
  const alvo = grupos.find(
    (g) =>
      !g.membros.some((m) => m.origem === p.origem) &&
      chave(g.membros[0].nome).replace(/^(ed|edificio|res|residencial|cond|condominio) /, '') ===
        chave(p.nome).replace(/^(ed|edificio|res|residencial|cond|condominio) /, '') &&
      g.membros[0].cidade === p.cidade &&
      g.membros.every((m) => enderecosCompativeis(m.endereco, p.endereco)) &&
      g.membros.every(
        (m) =>
          m.bairro === p.bairro ||
          m.bairro === 'A confirmar' ||
          p.bairro === 'A confirmar' ||
          (enderecoChave(m.endereco) && enderecoChave(p.endereco)),
      ),
  );
  if (alvo) alvo.membros.push(p);
  else grupos.push({ membros: [p] });
}

const camposComparados = ['valor', 'status', 'area', 'cond', 'iptu'];
const usadosIds = new Set();
const saida = grupos.map(({ membros }) => {
  membros.sort((a, b) => PRIORIDADE[a.origem] - PRIORIDADE[b.origem]);
  const base = membros[0];
  let id = base.origem === 'vista-mar' ? `${slug(base.nome)}-${slug(base.bairro)}` : base.origemId;
  while (usadosIds.has(id)) id += '-2';
  usadosIds.add(id);

  // unidades: agrupa a mesma unidade vinda de painéis diferentes
  const unidades = [];
  for (const m of membros) {
    for (const u of m.unidades) {
      const k = chave(u.unidade);
      const par = k && k !== '' && unidades.find((v) => chave(v.unidade) === k && v.origens.every((o) => o !== u.origem));
      if (!par) {
        unidades.push({ ...u, origens: [u.origem], outras: [] });
        continue;
      }
      // decide quem é o registro principal: reservado primeiro, depois a prioridade do painel
      const atual = { ...par };
      delete atual.outras;
      delete atual.origens;
      const peso = (r) => (r.status === 'reservado' ? -10 : 0) + PRIORIDADE[r.origem];
      const [principal, outro] = peso(u) < peso(atual) ? [u, atual] : [atual, u];
      const outras = [...par.outras, outro];
      const origens = [...par.origens, u.origem];
      Object.keys(par).forEach((key) => delete par[key]);
      Object.assign(par, principal, { origens, outras });
      // vista para o mar vale se qualquer tabela informa
      if (!par.vistaMar && outro.vistaMar) Object.assign(par, { vistaMar: true, vistaFonte: outro.vistaFonte, vista: outro.vista });
      if (!par.vista && outro.vista) par.vista = outro.vista;
    }
  }
  for (const u of unidades) {
    const div = new Set();
    for (const o of u.outras) for (const c of camposComparados) if (u[c] != null && o[c] != null && u[c] !== o[c]) div.add(c);
    u.divergencias = [...div];
    // mesmo prédio: a unidade herda o segmento do registro principal
  }

  const lanc = membros.find((m) => m.lanc)?.lanc;
  const bairros = [...new Set(membros.map((m) => m.bairroTexto))];
  // mesmo nome com e sem acento: fica a grafia acentuada
  const nome = membros.map((m) => m.nome).find((n) => /[^\x00-\x7f]/.test(n) && chave(n).endsWith(chave(base.nome).replace(/^(ed|res) /, ''))) ?? base.nome;
  return {
    id,
    nome,
    cidade: base.cidade,
    bairro: membros.find((m) => m.bairro !== 'A confirmar')?.bairro ?? 'A confirmar',
    bairroTextos: bairros,
    endereco: membros.find((m) => m.endereco)?.endereco || '',
    mapa: membros.find((m) => m.mapa && !m.mapaPorNome)?.mapa || membros.find((m) => m.mapa)?.mapa || '',
    mapaPorNome: !membros.some((m) => m.endereco),
    entrega: membros.find((m) => m.entrega)?.entrega || '',
    entregaSort: membros.find((m) => m.entregaSort)?.entregaSort || '',
    fase: base.fase,
    origens: membros.map((m) => m.origem),
    origemIds: Object.fromEntries(membros.map((m) => [m.origem, m.origemId])),
    tabelas: membros.flatMap((m) => m.tabelas),
    fontes: [...new Set(membros.flatMap((m) => m.fontes))],
    ...(lanc ? { lanc } : {}),
    lazer: [...new Set(membros.flatMap((m) => m.lazer ?? []))],
    diferenciais: [...new Set(membros.flatMap((m) => m.diferenciais ?? []))],
    notas: membros.flatMap((m) => m.notas ?? []),
    unidades,
  };
});

saida.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
mkdirSync('public/dados', { recursive: true });
const estoque = {
  geradoDe: { commit: USADOS.commit, paineis: ['apartamentos-usados', 'lancamentos', 'vista-mar'], pasta: PASTA.pasta, isildo: ISILDO.arquivo, frenteMar: FRENTE.arquivo, lancDrive: LANCD.arquivo },
  predios: saida,
};
// Campos vazios (null, '', false, []) são omitidos para o arquivo ficar menor; o app trata ausência como vazio.
const compactar = (k, v) =>
  v === null || v === '' || v === false || (Array.isArray(v) && v.length === 0 && k !== '') ? undefined : v;
writeFileSync('public/dados/estoque.json', JSON.stringify(estoque, compactar) + '\n');

/* ---------- relatório ---------- */
const nUn = saida.reduce((a, p) => a + p.unidades.length, 0);
const nRef = saida.reduce((a, p) => a + p.unidades.reduce((b, u) => b + 1 + u.outras.length, 0), 0);
const fundidos = saida.filter((p) => p.origens.length > 1);
console.log(`Prédios: ${saida.length} (${fundidos.length} reunidos de mais de um painel)`);
console.log(`Unidades: ${nUn} (${nRef} registros de origem, ${nRef - nUn} repetidos entre painéis)`);
console.log(`Divergências: ${saida.flatMap((p) => p.unidades.filter((u) => u.divergencias.length)).length}`);
for (const p of fundidos) console.log('  reunido:', p.nome, '←', JSON.stringify(p.origemIds));
