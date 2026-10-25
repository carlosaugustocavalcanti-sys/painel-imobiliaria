/** Formato de public/dados/estoque.json, gerado por scripts/unificar.mjs. Campos vazios vêm omitidos. */

export type Origem = 'usados' | 'lancamentos' | 'vista-mar';
export type Mercado = 'revenda' | 'construtora';
export type Fase = 'pronto' | 'obra' | 'lancamento';
export type Status = 'disponivel' | 'reservado' | 'vendido' | 'suspenso';
/** Dormitórios: k = kitnet/studio/flat, 4 = 4 ou mais. */
export type Dorm = 'k' | '1' | '2' | '3' | '4';

export interface Fluxo {
  entrada: number;
  chaves: number;
  anualQtd: number;
  anualVal: number;
  parcQtd: number;
  parcVal: number;
}

/** Um registro de unidade como veio de uma tabela. */
export interface RegistroUnidade {
  ref: string;
  origem: Origem;
  mercado: Mercado;
  fase: Fase;
  unidade?: string;
  tipologia?: string;
  dm?: Dorm;
  dorm?: number;
  suites?: number;
  det?: string;
  andar?: number | string;
  final?: number | string;
  area?: number;
  /** Valor à vista ou de tabela. */
  valor?: number;
  /** Usados: valor no banco, permuta ou carro. */
  vfin?: number;
  /** Vista mar: valor a prazo. */
  vp?: number;
  valorDireto?: number;
  entrada?: number;
  chaves?: number;
  financ?: number;
  parcela?: number;
  renda?: number;
  laudo?: number;
  promo?: string;
  fluxo?: Fluxo;
  cond?: number;
  iptu?: number;
  vagas?: string;
  acesso?: 'elevador' | 'escada';
  vistaMar?: boolean;
  /** painel = estava no painel Vista Mar; texto = a tabela menciona vista para o mar. */
  vistaFonte?: 'painel' | 'texto';
  vista?: string;
  status: Status;
  conf?: boolean;
  obs?: string;
  fonte?: string;
  contato?: string;
  tabela?: string;
  entregaUnidade?: string;
}

export interface Unidade extends RegistroUnidade {
  origens: Origem[];
  /** O mesmo imóvel em outras tabelas. */
  outras?: RegistroUnidade[];
  /** Campos com valores diferentes entre as tabelas. */
  divergencias?: string[];
}

export interface Tabela {
  origem: Origem;
  fonte?: string;
  contato?: string;
  atualizadoEm?: string;
}

export interface Book {
  resumo?: string[];
  finais?: string[];
  lazer?: string[];
  lazerTitulo?: string;
  condicoes?: string[];
  legal?: string[];
}

export interface InfoLancamento {
  padrao?: string;
  gravacao: 'a_gravar' | 'gravado' | 'trafego';
  ordem?: number;
  site?: boolean;
  diferenciais?: string[];
  pendencias?: string[];
  notas?: string;
  confirmar?: boolean;
  modalidade?: 'bancario' | 'direto' | 'ambos';
  notaValor?: string;
  fluxoInfo?: string[];
  book?: Book;
  tabelaRecebida?: boolean;
}

export interface Predio {
  id: string;
  nome: string;
  cidade: string;
  bairro: string;
  bairroTextos?: string[];
  endereco?: string;
  mapa?: string;
  mapaPorNome?: boolean;
  entrega?: string;
  entregaSort?: string;
  fase: Fase;
  origens: Origem[];
  origemIds: Partial<Record<Origem, string>>;
  tabelas?: Tabela[];
  fontes?: string[];
  lanc?: InfoLancamento;
  unidades?: Unidade[];
}

export interface Estoque {
  geradoDe: { commit: string; paineis: string[] };
  predios: Predio[];
}
