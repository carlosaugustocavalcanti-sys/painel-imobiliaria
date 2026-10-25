import { brl2 } from '../estoque/formato';
import { Predio, Unidade } from '../estoque/modelo';

/** Tudo o que o card mostra, já em texto. O gerador deixa editar cada campo antes de exportar. */
export interface CardDados {
  /** Etiqueta de cima: "AVIAÇÃO · PRAIA GRANDE · PRONTO PARA MORAR". */
  etiqueta: string;
  /** Título em caixa alta; o destaque vai no marca-texto amarelo ao lado. */
  titulo: string;
  destaque: string;
  /** "79 m² · 2 vagas · lazer completo". */
  subtitulo: string;
  lazer: string[];
  /** Um bloco preto, ou dois lado a lado (financiamento bancário e direto). */
  pagamentos: Pagamento[];
  rodape: string;
}

export interface Pagamento {
  rotulo: string;
  grande: string;
  sufixo: string;
  sufixo2: string;
  linhas: { rotulo: string; valor: string }[];
  totalRotulo: string;
  totalValor: string;
}

/** Itens de lazer reconhecidos no texto das tabelas (quando o lançamento não traz a lista do book). */
const LAZER: [string, RegExp][] = [
  ['Piscina', /piscina/i],
  ['Sauna', /sauna/i],
  ['Academia', /academia|fitness|gin[áa]stica/i],
  ['Salão de festas', /sal[ãa]o de festas?/i],
  ['Espaço gourmet', /espa[çc]o gourmet/i],
  ['Churrasqueira', /churrasqueira/i],
  ['Playground', /playground/i],
  ['Brinquedoteca', /brinquedoteca/i],
  ['Salão de jogos', /sal[ãa]o de jogos/i],
  ['Quadra', /quadra/i],
  ['Sacada gourmet', /sacada gourmet|varanda gourmet|terra[çc]o gourmet/i],
  ['Mobiliado', /mobiliad/i],
  ['Elevador', /elevador/i],
  ['Portaria 24h', /portaria 24/i],
  ['Pet place', /pet/i],
];

const FASE_LONGA = { pronto: 'Pronto para morar', obra: 'Em obra', lancamento: 'Na planta' } as const;

function dormitorios(u: Unidade): { titulo: string; destaque: string } {
  const t = `${u.tipologia ?? ''} ${u.det ?? ''}`;
  if (u.dm === 'k') return { titulo: '', destaque: /studio|est[úu]dio/i.test(t) ? 'Studio' : u.tipologia || 'Studio' };
  // "1 suíte + lavabo" não diz "dorm": a classificação de dormitórios da busca preenche
  const d = u.dorm ?? (+(t.match(/(\d)\s*(?:dorm|quarto)/i)?.[1] ?? 0) || +(u.dm ?? 0));
  const s = u.suites ?? +(t.match(/(\d)\s*su[íi]te/i)?.[1] ?? (/\bsu[íi]te\b/i.test(t) ? 1 : 0));
  if (!d) return { titulo: '', destaque: u.tipologia || '' };
  const dorms = `${d} dorm${d > 1 ? 's' : ''}`;
  if (!s) return { titulo: '', destaque: dorms };
  return { titulo: dorms, destaque: `${s} suíte${s > 1 ? 's' : ''}` };
}

function vagas(v?: string): string {
  if (!v || v === '—' || /sem vaga/i.test(v)) return '';
  const n = v.match(/^(\d+)/)?.[1];
  if (n) return `${n} vaga${+n > 1 ? 's' : ''}`;
  return `vaga ${v.toLowerCase()}`;
}

function lazerDe(p: Predio, u: Unidade): string[] {
  const book = p.lanc?.book?.lazer;
  if (book?.length) return book.map((x) => x.replace(/\s*\(.*?\)\s*/g, ' ').trim()).slice(0, 8);
  const texto = [u.obs, u.det, ...(u.outras ?? []).map((o) => o.obs)].join(' ');
  return LAZER.filter(([, re]) => re.test(texto)).map(([nome]) => nome).slice(0, 8);
}

function pagamentosDe(p: Predio, u: Unidade): Pagamento[] {
  const fl = u.fluxo;
  const temDireto = !!((fl && fl.parcQtd && fl.parcVal) || u.valorDireto);
  const temBanco = u.mercado === 'construtora' && !!u.financ;
  if (!(temDireto && temBanco)) return [pagamentoDe(p, u)];

  // dois fluxos: banco (valor) e direto com a construtora (valorDireto, quando a tabela traz)
  const banco: Pagamento = {
    rotulo: 'Financiamento bancário',
    grande: brl2(u.financ),
    sufixo: 'financiado no banco',
    sufixo2: '',
    linhas: [
      ...(u.entrada ? [{ rotulo: 'Entrada', valor: brl2(u.entrada) }] : []),
      ...(u.chaves && !fl ? [{ rotulo: 'Nas chaves', valor: brl2(u.chaves) }] : []),
    ],
    totalRotulo: 'Total',
    totalValor: u.valor ? brl2(u.valor) : '',
  };
  const totalDireto = u.valorDireto ?? u.valor;
  const direto: Pagamento =
    fl && fl.parcQtd && fl.parcVal
      ? {
          rotulo: 'Direto com a construtora',
          grande: brl2(fl.parcVal),
          sufixo: `por mês · ${fl.parcQtd} parcelas`,
          sufixo2: '',
          linhas: [
            { rotulo: 'Entrada', valor: brl2(fl.entrada) },
            ...(fl.chaves ? [{ rotulo: 'Nas chaves', valor: brl2(fl.chaves) }] : []),
            ...(fl.anualQtd && fl.anualVal ? [{ rotulo: `${fl.anualQtd} anuais de`, valor: brl2(fl.anualVal) }] : []),
          ],
          totalRotulo: 'Total',
          totalValor: totalDireto ? brl2(totalDireto) : '',
        }
      : {
          rotulo: 'Direto com a construtora',
          grande: brl2(totalDireto),
          sufixo: 'valor total no direto',
          sufixo2: '',
          linhas: [],
          totalRotulo: '',
          totalValor: '',
        };
  return [banco, direto];
}

function pagamentoDe(p: Predio, u: Unidade): Pagamento {
  const total = { totalRotulo: 'Valor total', totalValor: u.valor ? brl2(u.valor) : 'Sob consulta' };
  const fl = u.fluxo;
  if (fl && fl.parcQtd && fl.parcVal) {
    const linhas = [{ rotulo: 'Entrada', valor: brl2(fl.entrada) }];
    if (fl.chaves) linhas.push({ rotulo: 'Nas chaves', valor: brl2(fl.chaves) });
    if (fl.anualQtd && fl.anualVal) linhas.push({ rotulo: `${fl.anualQtd} anuais de`, valor: brl2(fl.anualVal) });
    return {
      rotulo: 'Fluxo de pagamento · parcelamento direto',
      grande: brl2(fl.parcVal),
      sufixo: 'por mês',
      sufixo2: `em ${fl.parcQtd} parcelas`,
      linhas,
      ...total,
    };
  }
  if (u.mercado === 'construtora' && u.entrada) {
    const linhas = [];
    if (u.financ) linhas.push({ rotulo: 'Financiamento bancário', valor: brl2(u.financ) });
    if (u.chaves) linhas.push({ rotulo: 'Nas chaves', valor: brl2(u.chaves) });
    if (u.parcela) linhas.push({ rotulo: '1ª parcela estimada (SAC)', valor: brl2(u.parcela) });
    if (u.renda && p.lanc?.modalidade !== 'direto') linhas.push({ rotulo: 'Renda familiar a partir de', valor: brl2(u.renda) });
    return { rotulo: 'Condição de pagamento · entrada', grande: brl2(u.entrada), sufixo: 'de entrada', sufixo2: '', linhas, ...total };
  }
  const linhas = [];
  const prazo = u.vfin ?? u.vp;
  if (prazo) linhas.push({ rotulo: u.vfin ? 'Banco, permuta ou carro' : 'A prazo', valor: brl2(prazo) });
  if (u.cond) linhas.push({ rotulo: 'Condomínio', valor: brl2(u.cond) });
  if (u.iptu) linhas.push({ rotulo: 'IPTU', valor: brl2(u.iptu) });
  return {
    rotulo: u.mercado === 'construtora' ? 'Valor de tabela' : 'Valor do imóvel',
    grande: u.valor ? brl2(u.valor) : 'Sob consulta',
    sufixo: u.valor ? (u.mercado === 'construtora' ? 'valor de tabela' : 'à vista') : '',
    sufixo2: '',
    linhas,
    totalRotulo: '',
    totalValor: '',
  };
}

/** Data da tabela da unidade, no formato que a tabela trouxe ("09/10/2026"). */
function dataTabela(p: Predio, u: Unidade): string {
  const candidatos = [u.tabela, ...(p.tabelas ?? []).filter((t) => t.origem === u.origem).map((t) => t.atualizadoEm)];
  for (const c of candidatos) {
    const m = c?.match(/\d{2}\/\d{2}\/\d{4}/);
    if (m) return m[0];
  }
  return '';
}

export function cardDe(p: Predio, u: Unidade): CardDados {
  const { titulo, destaque } = dormitorios(u);
  const lazer = lazerDe(p, u);
  const sub = [u.area ? `${u.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²` : '', vagas(u.vagas)];
  if (u.vistaMar) sub.push(/frente/i.test(u.vista ?? '') ? 'frente mar' : 'vista mar');
  else if (lazer.length >= 5) sub.push('lazer completo');

  const entrega = p.entrega && u.fase !== 'pronto' ? ` · entrega ${p.entrega}` : '';
  const local = [p.bairro !== 'A confirmar' ? p.bairro : '', p.cidade].filter(Boolean).join(' · ');
  const data = dataTabela(p, u);
  const fase =
    u.fase === 'pronto' ? 'Imóvel pronto.' : u.fase === 'obra' ? `Imóvel em obra${entrega.replace(' · ', ', ')}.` : `Na planta${entrega.replace(' · ', ', ')}.`;
  const estimativa = !u.fluxo && u.parcela ? ' Parcela e renda estimadas (SAC, Caixa SBPE), sujeitas à análise de crédito.' : '';

  return {
    etiqueta: `${local} · ${FASE_LONGA[u.fase]}`,
    titulo,
    destaque,
    subtitulo: sub.filter(Boolean).join(' · '),
    lazer,
    pagamentos: pagamentosDe(p, u),
    rodape: `${fase}${estimativa} Valores sujeitos a alteração.${data ? ` Fonte: tabela de preços (${data}).` : ' Fonte: tabela de preços.'}`,
  };
}
