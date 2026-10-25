import { FILTROS_VAZIOS, Filtros, anoEntrega, entregaPrevista, lugarDe, montarLinhas, ordenar, passa } from './busca';
import { Predio } from './modelo';

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
