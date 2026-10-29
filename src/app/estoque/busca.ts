import { Categoria, Dorm, Fase, Mercado, Origem, Predio, Unidade } from './modelo';

/* ---------- lugares: a orla de Praia Grande em ordem geográfica ---------- */

/** Bairros de praia de Praia Grande, do Canto do Forte (divisa com São Vicente) a Solemar (divisa com Mongaguá). */
export const ORLA = [
  'Canto do Forte',
  'Boqueirão',
  'Guilhermina',
  'Aviação',
  'Tupi',
  'Ocian',
  'Mirim',
  'Maracanã',
  'Caiçara',
  'Imperador',
  'Real',
  'Flórida',
  'Solemar',
] as const;
export const MONGAGUA = 'Mongaguá';

/** Onde o prédio fica na faixa da orla (bairro de praia, Mongaguá) ou fora dela. */
export function lugarDe(p: Pick<Predio, 'cidade' | 'bairro'>): string {
  if (p.cidade === MONGAGUA) return MONGAGUA;
  if (p.cidade === 'Praia Grande' && (ORLA as readonly string[]).includes(p.bairro)) return p.bairro;
  if (p.bairro === 'A confirmar') return `${p.cidade} · bairro a confirmar`;
  return p.bairro;
}
export const naOrla = (lugar: string) => lugar === MONGAGUA || (ORLA as readonly string[]).includes(lugar);

/* ---------- texto ---------- */

export const normalizar = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/* ---------- entrega ---------- */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Ano/mês previsto de entrega, ou null quando já entregue / pronto. */
export function entregaPrevista(texto: string | undefined, fase: Fase): { ano: number; mes: number } | null {
  const t = String(texto || '');
  if (/^entregue|pronto/i.test(t) || (!t && fase === 'pronto')) return null;
  const m = t.match(/([a-zç]{3})[a-zç]*\.?\/(20\d\d)/i);
  if (m) {
    const i = MESES.indexOf(normalizar(m[1]));
    if (i >= 0) return { ano: +m[2], mes: i };
  }
  const n = t.match(/\b(\d{1,2})\/(20\d\d)/);
  if (n && +n[1] >= 1 && +n[1] <= 12) return { ano: +n[2], mes: +n[1] - 1 };
  const y = t.match(/(20\d\d)/);
  return y ? { ano: +y[1], mes: -1 } : { ano: 0, mes: -1 };
}
/** Rótulo do filtro de entrega: "Entregue", "2027" ou "A confirmar". */
export function anoEntrega(texto: string | undefined, fase: Fase): string {
  const e = entregaPrevista(texto, fase);
  if (!e) return 'Entregue';
  return e.ano ? String(e.ano) : 'A confirmar';
}

/* ---------- linhas de busca ---------- */

/** Uma unidade pronta para filtrar: o registro principal com o prédio e campos derivados. */
export interface Linha {
  u: Unidade;
  p: Predio;
  lugar: string;
  mercados: Mercado[];
  entrega: string;
  texto: string;
  /** Formas de pagamento aceitas: lançamentos pela modalidade do prédio, usados pelo texto da tabela. */
  pagamentos: Pagto[];
  /** A tabela diz "frente mar" (ou frente ao mar / frente praia), ou o prédio fica na Av. Castelo Branco. */
  frenteMar: boolean;
  /** Comissão que a tabela informa: 5% sobre o valor da tabela, ou fifty (metade com o parceiro). Vazio = a tabela não diz. */
  comissoes: Comissao[];
  /** Vagas de garagem lidas do texto da tabela ("2 privativas" = 2, "coletiva" = 1, "sem vaga" = 0). null = a tabela não diz. */
  vagas: number | null;
}

/** Número de vagas num texto livre de tabela, ou null quando não dá para saber. "2 ou 3" conta 2. */
export function vagasDeTexto(texto: string | undefined): number | null {
  const t = normalizar(texto).trim();
  if (!t || t === '—' || t === '-') return null;
  if (/sem vaga|nao (tem|possui) vaga/.test(t)) return 0;
  const n = t.match(/^(\d+)/);
  if (n) return +n[1];
  return /vaga|coletiva|privativa|rotativa|livre|demarcada|determinada|coberta/.test(t) ? 1 : null;
}

/** Vagas de uma unidade: a primeira tabela que informa. */
export function vagasDe(u: Unidade): number | null {
  for (const r of [u, ...(u.outras ?? [])]) {
    const v = vagasDeTexto(r.vagas);
    if (v != null) return v;
  }
  return null;
}

const FRENTE_MAR = /frente\s*(ao\s+|para\s+o\s+|p\/\s*o\s+)?(mar|praia)/;
const CASTELO_BRANCO = /castelo\s+branco/;

/** Frente mar: o texto da unidade ou o nome do prédio diz frente mar, o endereço é a Av. Castelo Branco, ou veio da pasta Frente Mar. */
export function ehFrenteMar(u: Unidade, p: Predio): boolean {
  if (u.origens.includes('frente-mar') || CASTELO_BRANCO.test(normalizar(p.endereco))) return true;
  const regs = [u, ...(u.outras ?? [])];
  return FRENTE_MAR.test(normalizar([p.nome, ...regs.flatMap((r) => [r.vista, r.obs, r.det, r.tipologia, r.promo])].join(' ')));
}

export type Comissao = 'cinco' | 'fifty';

const COMISSAO_5 = /comiss[a-z]*[^|;]{0,40}?(?<![\d,.])5\s*%|(?<![\d,.])5\s*%\s*(de\s+)?comiss/;
const COMISSAO_FIFTY = /fif(t|i)y|fyfty/;

/** Lê a comissão no texto livre de uma tabela. "5% (abaixo do valor: fifty)" é 5%: o fifty só vale para proposta abaixo da tabela. */
export function comissoesDeTexto(texto: string | undefined): Comissao[] {
  const t = normalizar(texto).replace(/abaixo[^|;.]{0,60}fif(t|i)y/g, '');
  const r: Comissao[] = [];
  if (COMISSAO_5.test(t)) r.push('cinco');
  if (COMISSAO_FIFTY.test(t)) r.push('fifty');
  return r;
}

/** Comissão de uma unidade: o que as tabelas dela dizem; sem isso, o que a tabela do prédio diz.
 *  A Lesan não trabalha com fifty: unidade anunciada por ela é comissão normal, mesmo que outra imobiliária ofereça fifty. */
export function comissoesDe(u: Unidade, p: Predio): Comissao[] {
  const regs = [u, ...(u.outras ?? [])];
  const daUnidade = new Set(regs.flatMap((r) => comissoesDeTexto([r.obs, r.det, r.promo].join(' | '))));
  const r = daUnidade.size ? [...daUnidade] : comissoesDeTexto([...(p.notas ?? []), ...(p.diferenciais ?? [])].join(' | '));
  return regs.some((x) => x.origem === 'lesan' || x.origem === 'site-lesan') ? r.filter((c) => c !== 'fifty') : r;
}

export type Pagto = 'bancario' | 'direto';

/** Lê o texto livre de um usado e diz se aceita banco, parcelamento direto com o vendedor, ou os dois. */
export function pagamentosDeTexto(obs: string | undefined): Pagto[] {
  const t = normalizar(obs);
  // frases separadas por . ; | para que "NÃO aceita parcelamento direto" não contamine a frase vizinha
  const frases = t.split(/[.;|]/);
  const r = new Set<Pagto>();
  for (const f of frases) {
    const negada = (re: RegExp) => new RegExp('(nao aceita|\\bsem\\b|nao permite|nao tem)[^,]*(?:' + re.source + ')').test(f);
    const direto = /parcelamento direto|financiamento direto|parcelas? (corrigidas?|a prazo)|parcelad|estuda parcelamento|e direto\b|entrada \+|entrada r\$[^+]*\+/;
    const banco = /financ(ia|iamento|iar)?\b|\bbancos?\b|bancari/;
    if (direto.test(f) && !negada(direto)) r.add('direto');
    const semDireto = f.replace(/financiamento direto/g, '');
    if (banco.test(semDireto) && !negada(banco) && !/financia:\s*(somente )?(a vista|valor a vista|troca|estuda veiculo|aceita permuta)\s*$/.test(f)) r.add('bancario');
  }
  return [...r];
}

/** Formas de pagamento de uma unidade (juntando as tabelas em que ela aparece). */
export function pagamentosDe(u: Unidade, p: Predio): Pagto[] {
  const r = new Set<Pagto>();
  for (const reg of [u, ...(u.outras ?? [])]) {
    if (reg.mercado === 'construtora') {
      const mod = p.lanc?.modalidade ?? 'bancario';
      if (mod !== 'direto') r.add('bancario');
      if (mod !== 'bancario') r.add('direto');
    } else for (const x of pagamentosDeTexto(reg.obs)) r.add(x);
  }
  return [...r];
}

export function montarLinhas(predios: Predio[]): Linha[] {
  const linhas: Linha[] = [];
  for (const p of predios) {
    // Sem as fontes do prédio: buscar "lesan" traz só as unidades que a Lesan anuncia, não o prédio inteiro.
    const textoPredio = normalizar([p.nome, p.bairro, ...(p.bairroTextos ?? []), p.cidade, p.endereco].join(' '));
    for (const u of p.unidades ?? []) {
      const regs = [u, ...(u.outras ?? [])];
      linhas.push({
        u,
        p,
        lugar: lugarDe(p),
        mercados: [...new Set(regs.map((r) => r.mercado))],
        entrega: anoEntrega(u.entregaUnidade || p.entrega, u.fase),
        pagamentos: pagamentosDe(u, p),
        frenteMar: ehFrenteMar(u, p),
        comissoes: comissoesDe(u, p),
        vagas: vagasDe(u),
        texto:
          textoPredio +
          ' ' +
          normalizar(regs.map((r) => [r.unidade, r.tipologia, r.det, r.vista, r.obs, r.fonte, r.promo].join(' ')).join(' ')),
      });
    }
  }
  return linhas;
}

/* ---------- filtros ---------- */

export type Tipo = '' | 'usados' | 'lancamentos';
export type Acesso = '' | 'elevador' | 'escada' | 'nd';
export type FiltroCategoria = '' | Categoria;
export const CATEGORIA_ROTULO: Record<Categoria, string> = { apartamento: 'Apartamentos', casa: 'Casas e sobrados', comercial: 'Comerciais' };

export interface Filtros {
  q: string;
  /** Usados (revenda das imobiliárias) ou Lançamentos (tabela da construtora). */
  tipo: Tipo;
  /** Apartamentos, casas/sobrados ou comerciais (vazio = todos). */
  categoria: FiltroCategoria;
  vista: boolean;
  /** Só frente mar (texto da tabela ou Av. Castelo Branco). */
  frente: boolean;
  /** Só unidades cuja tabela informa essa comissão (vazio = todas). */
  comissao: '' | Comissao;
  dm: '' | Dorm;
  /** Pelo menos esse número de vagas de garagem (0 = qualquer). */
  vagas: number;
  /** Área útil/privativa em m², De/Até (0 = sem limite). */
  amin: number;
  amax: number;
  vmin: number;
  vmax: number;
  lugares: string[];
  fase: '' | Fase;
  acesso: Acesso;
  fonte: string;
  pagamento: '' | 'bancario' | 'direto';
  entrega: string;
  gravacao: '' | 'pend' | 'grav';
  todas: boolean;
  origem: '' | Origem;
}

export const FILTROS_VAZIOS: Filtros = {
  q: '',
  tipo: '',
  categoria: '',
  vista: false,
  frente: false,
  comissao: '',
  dm: '',
  vagas: 0,
  amin: 0,
  amax: 0,
  vmin: 0,
  vmax: 0,
  lugares: [],
  fase: '',
  acesso: '',
  fonte: '',
  pagamento: '',
  entrega: '',
  gravacao: '',
  todas: false,
  origem: '',
};

/** Faixas De/Até de valor (as mesmas dos painéis antigos). */
export const VAL_STEPS = [150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000, 1200, 1500, 2000, 3000, 5000, 10000].map(
  (k) => k * 1e3,
);

/** Faixas De/Até de área útil ou privativa, em m². */
export const AREA_STEPS = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200, 300];
/** Opções do filtro de vagas: "pelo menos N". */
export const VAGAS_OPCOES: [number, string][] = [
  [0, 'Qualquer'],
  [1, '1 ou mais'],
  [2, '2 ou mais'],
  [3, '3 ou mais'],
];

export type ChaveFiltro = keyof Filtros;

/** A linha passa nos filtros? `ignorar` deixa um filtro de fora (para contar as opções dele). */
export function passa(l: Linha, f: Filtros, ignorar?: ChaveFiltro): boolean {
  const { u, p } = l;
  const usa = (k: ChaveFiltro) => k !== ignorar;
  if (usa('todas') && !f.todas && u.status !== 'disponivel') return false;
  if (usa('tipo') && f.tipo && !l.mercados.includes(f.tipo === 'usados' ? 'revenda' : 'construtora')) return false;
  if (usa('categoria') && f.categoria && (u.categoria ?? 'apartamento') !== f.categoria) return false;
  if (usa('vista') && f.vista && !u.vistaMar) return false;
  if (usa('frente') && f.frente && !l.frenteMar) return false;
  if (usa('comissao') && f.comissao && !l.comissoes.includes(f.comissao)) return false;
  if (usa('dm') && f.dm && u.dm !== f.dm) return false;
  if (usa('vagas') && f.vagas && !((l.vagas ?? 0) >= f.vagas)) return false;
  if (usa('amin') && usa('amax') && (f.amin || f.amax)) {
    const a = u.area ?? 0;
    if (!(a > 0) || (f.amin && a < f.amin) || (f.amax && a > f.amax)) return false;
  }
  if (usa('vmin') && usa('vmax') && (f.vmin || f.vmax)) {
    const v = u.valor ?? 0;
    if (!(v > 0) || (f.vmin && v < f.vmin) || (f.vmax && v > f.vmax)) return false;
  }
  if (usa('lugares') && f.lugares.length && !f.lugares.includes(l.lugar)) return false;
  if (usa('fase') && f.fase && u.fase !== f.fase) return false;
  if (usa('acesso') && f.acesso && (f.acesso === 'nd' ? !!u.acesso : u.acesso !== f.acesso)) return false;
  if (usa('fonte') && f.fonte && ![u, ...(u.outras ?? [])].some((r) => r.fonte === f.fonte)) return false;
  if (usa('pagamento') && f.pagamento) {
    if (!l.pagamentos.includes(f.pagamento)) return false;
  }
  if (usa('entrega') && f.entrega && l.entrega !== f.entrega) return false;
  if (usa('gravacao') && f.gravacao) {
    if (!p.lanc || p.fase !== 'lancamento') return false;
    if ((p.lanc.gravacao === 'a_gravar') !== (f.gravacao === 'pend')) return false;
  }
  if (usa('origem') && f.origem && !u.origens.includes(f.origem)) return false;
  if (usa('q') && f.q.trim()) {
    for (const termo of normalizar(f.q).split(/\s+/).filter(Boolean)) if (!l.texto.includes(termo)) return false;
  }
  return true;
}

/** Algum filtro que olha para a unidade (e não só para o prédio) está ligado? */
export const filtroDeUnidade = (f: Filtros) =>
  !!(f.categoria || f.vista || f.frente || f.comissao || f.dm || f.vagas || f.amin || f.amax || f.vmin || f.vmax || f.acesso || f.fonte || f.tipo === 'usados');

/* ---------- ordenação ---------- */

export type Ordem = 'valor' | '-valor' | 'm2' | 'area' | 'predio';
export const ORDENS: [Ordem, string][] = [
  ['valor', 'Menor valor'],
  ['-valor', 'Maior valor'],
  ['m2', 'Menor R$/m²'],
  ['area', 'Maior área'],
  ['predio', 'Nome do prédio'],
];

const semValorPorUltimo = (a?: number, b?: number) => (!a ? 1 : 0) - (!b ? 1 : 0);
export function ordenar(linhas: Linha[], ordem: Ordem): Linha[] {
  const r = linhas.slice();
  const nome = (a: Linha, b: Linha) => a.p.nome.localeCompare(b.p.nome, 'pt-BR') || String(a.u.unidade).localeCompare(String(b.u.unidade), 'pt-BR', { numeric: true });
  const m2 = (l: Linha) => (l.u.valor && l.u.area ? l.u.valor / l.u.area : 0);
  switch (ordem) {
    case 'valor':
      return r.sort((a, b) => semValorPorUltimo(a.u.valor, b.u.valor) || (a.u.valor ?? 0) - (b.u.valor ?? 0) || nome(a, b));
    case '-valor':
      return r.sort((a, b) => semValorPorUltimo(a.u.valor, b.u.valor) || (b.u.valor ?? 0) - (a.u.valor ?? 0) || nome(a, b));
    case 'm2':
      return r.sort((a, b) => semValorPorUltimo(m2(a), m2(b)) || m2(a) - m2(b) || nome(a, b));
    case 'area':
      return r.sort((a, b) => semValorPorUltimo(a.u.area, b.u.area) || (b.u.area ?? 0) - (a.u.area ?? 0) || nome(a, b));
    default:
      return r.sort(nome);
  }
}

/* ---------- rótulos ---------- */

export const FASE_ROTULO: Record<Fase, string> = { pronto: 'Pronto', obra: 'Em obra', lancamento: 'Na planta' };
export const DORM_ROTULO: Record<Dorm, string> = { k: 'Studio', '1': '1 dorm', '2': '2 dorms', '3': '3 dorms', '4': '4+ dorms' };
export const STATUS_ROTULO = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido', suspenso: 'Suspenso' } as const;
export const ORIGEM_ROTULO: Record<Origem, string> = {
  usados: 'Painel de usados',
  lancamentos: 'Painel de lançamentos',
  'vista-mar': 'Painel vista mar',
  lesan: 'Pasta Lançamentos (OneDrive)',
  isildo: 'Tabela do Isildo',
  'frente-mar': 'Pasta Frente Mar (Drive)',
  'lanc-drive': 'Pasta Lançamentos (Drive)',
  'drive-mes': 'Tabelas do Drive (mês)',
  'site-lesan': 'Site da Lesan Imóveis',
};
export const valLabel = (v: number) =>
  v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR') + ' mi' : 'R$ ' + v / 1e3 + ' mil';
