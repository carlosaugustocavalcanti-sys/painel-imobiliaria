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
  /** Usados no lugar das fotos quando o prédio não tem nenhuma: até 3, numerados. */
  diferenciais: { titulo: string; detalhe: string }[];
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
  /** Linha opcional abaixo do total (ex.: "À vista"). */
  depoisRotulo?: string;
  depoisValor?: string;
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

/** "Localização: Guilhermina, perto da praia" → título "Localização", detalhe "Guilhermina, perto da praia". */
function diferencial(texto: string): { titulo: string; detalhe: string } {
  const t = texto.trim();
  const p = t.match(/^(.{4,60}?)\s*\(([^()]+)\)$/); // "Unidades com porcelanato (pisos e revestimentos)"
  if (p) return { titulo: p[1], detalhe: p[2].charAt(0).toUpperCase() + p[2].slice(1) };
  const m =t.match(/^(.{4,40}?)\s*(?::|—|–| - |;)\s+(.+)$/) ?? (t.length > 38 ? t.match(/^(.{6,38}?),\s+(.+)$/) : null);
  if (!m) return { titulo: t, detalhe: '' };
  return { titulo: m[1], detalhe: m[2].charAt(0).toUpperCase() + m[2].slice(1) };
}
function diferenciaisDe(p: Predio): CardDados['diferenciais'] {
  return (p.lanc?.diferenciais ?? [])
    .filter((d) => !/comiss|^pronto para morar$|^\s*$/i.test(d))
    .slice(0, 3)
    .map(diferencial);
}

export function cardDe(p: Predio, u: Unidade): CardDados {
  let { titulo, destaque } = dormitorios(u);
  const lazer = lazerDe(p, u);
  const area = u.area ? `${u.area.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²` : '';
  // sem suíte para destacar, o destaque amarelo vira a área ("2 DORMS · 63,61 M²")
  const areaNoTitulo = !titulo && !!destaque && !!area && u.dm !== 'k';
  if (areaNoTitulo) [titulo, destaque] = [destaque, area];

  const entregaTxt = p.entrega || u.entregaUnidade || '';
  const sub = [
    u.fase !== 'pronto' ? FASE_LONGA[u.fase] : '',
    areaNoTitulo || !u.area ? '' : `${Math.round(u.area)} m²`,
    vagas(u.vagas),
  ];
  if (u.vistaMar) sub.push(/frente/i.test(u.vista ?? '') ? 'frente mar' : 'vista mar');
  else if (lazer.length >= 5) sub.push('lazer completo');

  const entrega = entregaTxt && u.fase !== 'pronto' ? ` · entrega ${entregaTxt}` : '';
  const local = [p.bairro !== 'A confirmar' ? p.bairro : '', p.cidade].filter(Boolean).join(' · ');
  const data = dataTabela(p, u);
  const fase =
    u.fase === 'pronto' ? 'Imóvel pronto.' : u.fase === 'obra' ? `Imóvel em obra${entrega.replace(' · ', ', ')}.` : `Na planta${entrega.replace(' · ', ', ')}.`;
  const estimativa = !u.fluxo && u.parcela ? ' Parcela e renda estimadas (SAC, Caixa SBPE), sujeitas à análise de crédito.' : '';

  return {
    etiqueta: u.fase !== 'pronto' && entregaTxt ? `${local} · Entrega ${entregaTxt}` : `${local} · ${FASE_LONGA[u.fase]}`,
    titulo,
    destaque,
    subtitulo: sub.filter(Boolean).join(' · '),
    lazer,
    diferenciais: diferenciaisDe(p),
    pagamentos: pagamentosDe(p, u),
    rodape: `${fase}${estimativa} Valores sujeitos a alteração.${data ? ` Fonte: tabela de preços (${data}).` : ' Fonte: tabela de preços.'}`,
  };
}
