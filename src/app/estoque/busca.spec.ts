import { FILTROS_VAZIOS, Filtros, anoEntrega, entregaPrevista, lugarDe, montarLinhas, ordenar, passa } from './busca';
import { Predio, Unidade } from './modelo';

const predio = (p: Partial<Predio>): Predio => ({
  id: 'x',
  nome: 'Ed. Teste',
  cidade: 'Praia Grande',
  bairro: 'Guilhermina',
  fase: 'pronto',
  origens: ['usados'],
  origemIds: { usados: 'x' },
  ...p,
});
const F = (f: Partial<Filtros>): Filtros => ({ ...FILTROS_VAZIOS, lugares: [], ...f });

const P = predio({
  unidades: [
    { ref: 'usados:x:0', origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', unidade: '14', tipologia: '2 dorms', dm: '2', valor: 350000, area: 70, status: 'disponivel', vistaMar: true, obs: 'Sacada com churrasqueira' },
    { ref: 'usados:x:1', origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', unidade: '22', tipologia: '1 dorm', dm: '1', valor: 250000, area: 45, status: 'reservado' },
    {
      ref: 'lancamentos:y:0', origem: 'lancamentos', origens: ['lancamentos', 'usados'], mercado: 'construtora', fase: 'obra', unidade: '125', tipologia: '3 dorms', dm: '3', valor: 580000, status: 'disponivel',
      outras: [{ ref: 'usados:x:2', origem: 'usados', mercado: 'revenda', fase: 'obra', unidade: '125', valor: 500000, status: 'disponivel' }],
    },
  ],
});
const L = montarLinhas([P]);

describe('busca', () => {
  it('por padrão mostra só disponíveis', () => {
    expect(L.filter((l) => passa(l, F({}))).map((l) => l.u.unidade)).toEqual(['14', '125']);
    expect(L.filter((l) => passa(l, F({ todas: true }))).length).toBe(3);
  });

  it('usados e lançamentos consideram todas as tabelas da unidade', () => {
    expect(L.filter((l) => passa(l, F({ tipo: 'usados' }))).map((l) => l.u.unidade)).toEqual(['14', '125']);
    expect(L.filter((l) => passa(l, F({ tipo: 'lancamentos' }))).map((l) => l.u.unidade)).toEqual(['125']);
  });

  it('vista mar, dormitórios e valor', () => {
    expect(L.filter((l) => passa(l, F({ vista: true }))).length).toBe(1);
    expect(L.filter((l) => passa(l, F({ dm: '3' }))).map((l) => l.u.unidade)).toEqual(['125']);
    expect(L.filter((l) => passa(l, F({ vmax: 400000 }))).map((l) => l.u.unidade)).toEqual(['14']);
  });

  it('a busca ignora acentos e procura em observações', () => {
    expect(L.filter((l) => passa(l, F({ q: 'CHURRASQUEIRA guilhermina' }))).length).toBe(1);
    expect(L.filter((l) => passa(l, F({ q: 'teste' }))).length).toBe(2);
  });

  it('ordena por valor com sem-valor por último', () => {
    expect(ordenar(L, '-valor').map((l) => l.u.unidade)).toEqual(['125', '14', '22']);
  });

  it('lugar na orla', () => {
    expect(lugarDe({ cidade: 'Mongaguá', bairro: 'Centro' })).toBe('Mongaguá');
    expect(lugarDe({ cidade: 'Praia Grande', bairro: 'A confirmar' })).toBe('Praia Grande · bairro a confirmar');
    expect(lugarDe({ cidade: 'Praia Grande', bairro: 'Tupi' })).toBe('Tupi');
  });

  it('entrega', () => {
    expect(entregaPrevista('Mar/2027', 'obra')).toEqual({ ano: 2027, mes: 2 });
    expect(entregaPrevista('12/2026', 'obra')).toEqual({ ano: 2026, mes: 11 });
    expect(anoEntrega('Entregue', 'pronto')).toBe('Entregue');
    expect(anoEntrega('', 'pronto')).toBe('Entregue');
    expect(anoEntrega('', 'obra')).toBe('A confirmar');
  });
});

import { cardDe } from '../card/card-dados';
describe('card', () => {
  const base: Pick<Unidade, 'ref' | 'origem' | 'origens' | 'mercado' | 'status'> = {
    ref: 'r',
    origem: 'lancamentos',
    origens: ['lancamentos'],
    mercado: 'construtora',
    status: 'disponivel',
  };
  it('título e destaque a partir da tipologia', () => {
    const p = predio({ fase: 'lancamento' });
    expect(cardDe(p, { ...base, fase: 'lancamento', tipologia: '1 suíte + lavabo', dm: '1' })).toMatchObject({ titulo: '1 dorm', destaque: '1 suíte' });
    expect(cardDe(p, { ...base, fase: 'lancamento', tipologia: '3 dorms (1 suíte + 2 demi)', dm: '3' })).toMatchObject({ titulo: '3 dorms', destaque: '1 suíte' });
    expect(cardDe(p, { ...base, fase: 'lancamento', tipologia: '2 dorms', dm: '2' })).toMatchObject({ titulo: '', destaque: '2 dorms' });
  });
  it('sem suíte, o destaque amarelo é a área; a entrega vai na etiqueta', () => {
    const p = predio({ fase: 'lancamento', entrega: 'Dez/2026' });
    const c = cardDe(p, { ...base, fase: 'lancamento', tipologia: '2 dorms', dm: '2', area: 63.61 });
    expect(c).toMatchObject({ titulo: '2 dorms', destaque: '63,61 m²' });
    expect(c.etiqueta).toBe('Guilhermina · Praia Grande · Entrega Dez/2026');
    expect(c.subtitulo).toBe('Na planta');
  });
  it('diferenciais: até 3, sem comissão, título e detalhe separados', () => {
    const p = predio({
      lanc: {
        gravacao: 'a_gravar',
        diferenciais: ['Comissão 5%', 'Localização: Guilhermina, perto da praia', 'Unidades com porcelanato (pisos e revestimentos)', 'Pronto para morar', 'Fechadura digital', 'Quarto item'],
      },
    });
    expect(cardDe(p, { ...base, fase: 'pronto', tipologia: '2 dorms' }).diferenciais).toEqual([
      { titulo: 'Localização', detalhe: 'Guilhermina, perto da praia' },
      { titulo: 'Unidades com porcelanato', detalhe: 'Pisos e revestimentos' },
      { titulo: 'Fechadura digital', detalhe: '' },
    ]);
  });
  it('fluxo direto vira o bloco de parcelas, sem inventar valores', () => {
    const p = predio({ fase: 'lancamento' });
    const c = cardDe(p, { ...base, fase: 'lancamento', tipologia: '2 dorms', valor: 800000, fluxo: { entrada: 200000, chaves: 0, anualQtd: 10, anualVal: 15000, parcQtd: 120, parcVal: 3750 } });
    expect(c.pagamentos).toHaveLength(1);
    expect(c.pagamentos[0].grande.replace(/\s/g, ' ')).toBe('R$ 3.750,00');
    expect(c.pagamentos[0].linhas.map((l) => l.rotulo)).toEqual(['Entrada', '10 anuais de']);
    expect(c.pagamentos[0].totalValor.replace(/\s/g, ' ')).toBe('R$ 800.000,00');
  });
  it('banco e direto lado a lado quando a tabela traz os dois', () => {
    const c = cardDe(predio({}), { ...base, fase: 'obra', tipologia: '2 dorms', valor: 594283, valorDireto: 635239, entrada: 59429, financ: 475425 });
    expect(c.pagamentos.map((x) => x.rotulo)).toEqual(['Financiamento bancário', 'Direto com a construtora']);
    expect(c.pagamentos[1].grande.replace(/\s/g, ' ')).toBe('R$ 635.239,00');
  });
});
