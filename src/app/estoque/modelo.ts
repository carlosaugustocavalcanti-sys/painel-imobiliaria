/** Formato de public/dados/estoque.json, gerado por scripts/unificar.mjs. Campos vazios vêm omitidos. */

/** Os três painéis antigos, a pasta Lançamentos do OneDrive (lesan), a tabela do Isildo, as pastas do Drive e o site da Lesan Imóveis. */
export type Origem = 'usados' | 'lancamentos' | 'vista-mar' | 'lesan' | 'isildo' | 'frente-mar' | 'lanc-drive' | 'drive-mes' | 'site-lesan';
export type Mercado = 'revenda' | 'construtora';
export type Fase = 'pronto' | 'obra' | 'lancamento';
export type Status = 'disponivel' | 'reservado' | 'vendido' | 'suspenso';
/** Natureza do imóvel; registro sem o campo é apartamento. */
export type Categoria = 'apartamento' | 'casa' | 'comercial';
/** Dormitórios: k = kitnet/studio/flat, 4 = 4 ou mais. */
export type Dorm = 'k' | '1' | '2' | '3' | '4';

export interface Fluxo {
  entrada: number;
  chaves?: number;
  anualQtd?: number;
  anualVal?: number;
  parcQtd: number;
  parcVal: number;
  /** "Parcela única" da tabela (Seven), sem data informada. */
  unica?: number;
}

/** Um registro de unidade como veio de uma tabela. */
export interface RegistroUnidade {
  ref: string;
  origem: Origem;
  mercado: Mercado;
  fase: Fase;
  unidade?: string;
  tipologia?: string;
  /** Apartamento (padrão), casa/sobrado ou imóvel comercial (sala, loja, galpão). */
  categoria?: Categoria;
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
  /** Link do álbum de fotos da unidade, quando a tabela traz (Isildo). */
  fotos?: string;
  /** Link do anúncio no site da Lesan Imóveis. */
  anuncio?: string;
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
  /** Nome curto da construtora (dados/construtoras.json). Vazio = a tabela não diz. */
  construtora?: string;
  origens: Origem[];
  origemIds: Partial<Record<Origem, string>>;
  tabelas?: Tabela[];
  fontes?: string[];
  lanc?: InfoLancamento;
  /** Itens de lazer, diferenciais e observações das tabelas (pasta Lançamentos). */
  lazer?: string[];
  diferenciais?: string[];
  notas?: string[];
  unidades?: Unidade[];
}

export interface Estoque {
  geradoDe: { commit: string; paineis: string[] };
  predios: Predio[];
}
