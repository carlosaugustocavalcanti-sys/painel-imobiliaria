import { FILTROS_VAZIOS, Filtros, anoEntrega, comissoesDeTexto, vagasDeTexto, entregaPrevista, lugarDe, montarLinhas, ordenar, passa, pagamentosDeTexto, rotuloMar } from './busca';
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

  it('construtora: filtra pelo prédio, prédio sem construtora sai, e a busca por texto acha o nome', () => {
    const u: Unidade = { ref: 'c:0', origem: 'lancamentos', origens: ['lancamentos'], mercado: 'construtora', fase: 'obra', status: 'disponivel' };
    const ls = montarLinhas([
      predio({ id: 'a', construtora: 'Martino', unidades: [u] }),
      predio({ id: 'b', construtora: 'GMV', unidades: [{ ...u, ref: 'c:1' }] }),
      predio({ id: 'c', unidades: [{ ...u, ref: 'c:2' }] }),
    ]);
    const ids = (f: Partial<Filtros>) => ls.filter((l) => passa(l, F(f))).map((l) => l.p.id);
    expect(ids({ construtora: 'Martino' })).toEqual(['a']);
    expect(ids({})).toEqual(['a', 'b', 'c']);
    expect(ids({ q: 'gmv' })).toEqual(['b']);
  });

  it('vagas: lê o número do texto da tabela', () => {
    expect(vagasDeTexto('2 privativas')).toBe(2);
    expect(vagasDeTexto('1 (coletiva)')).toBe(1);
    expect(vagasDeTexto('2 ou 3')).toBe(2);
    expect(vagasDeTexto('Coletiva')).toBe(1);
    expect(vagasDeTexto('privativa 20,7 m²')).toBe(1);
    expect(vagasDeTexto('Sem vaga')).toBe(0);
    expect(vagasDeTexto('—')).toBeNull();
    expect(vagasDeTexto(undefined)).toBeNull();
  });

  it('vagas (pelo menos N) e área De/Até; sem informação sai quando o filtro está ligado', () => {
    const u = (ref: string, extra: Partial<Unidade>): Unidade => ({ ref, origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', status: 'disponivel', ...extra });
    const ls = montarLinhas([
      predio({ id: 'v', unidades: [u('v:0', { vagas: '1', area: 45 }), u('v:1', { vagas: '2 privativas', area: 80 }), u('v:2', { area: 120 }), u('v:3', { vagas: 'sem vaga' })] }),
    ]);
    const refs = (f: Partial<Filtros>) => ls.filter((l) => passa(l, F(f))).map((l) => l.u.ref);
    expect(refs({ vagas: 1 })).toEqual(['v:0', 'v:1']);
    expect(refs({ vagas: 2 })).toEqual(['v:1']);
    expect(refs({ amin: 60 })).toEqual(['v:1', 'v:2']);
    expect(refs({ amax: 80 })).toEqual(['v:0', 'v:1']);
    expect(refs({ amin: 50, amax: 100, vagas: 1 })).toEqual(['v:1']);
  });

  it('categoria: registro sem o campo é apartamento; casa e comercial só aparecem quando pedidos', () => {
    const u = (ref: string, extra: Partial<Unidade>): Unidade => ({ ref, origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', status: 'disponivel', ...extra });
    const ls = montarLinhas([predio({ id: 'c', unidades: [u('c:0', {}), u('c:1', { categoria: 'casa' }), u('c:2', { categoria: 'comercial' })] })]);
    expect(ls.filter((l) => passa(l, F({}))).length).toBe(3);
    expect(ls.filter((l) => passa(l, F({ categoria: 'apartamento' }))).map((l) => l.u.ref)).toEqual(['c:0']);
    expect(ls.filter((l) => passa(l, F({ categoria: 'casa' }))).map((l) => l.u.ref)).toEqual(['c:1']);
    expect(ls.filter((l) => passa(l, F({ categoria: 'comercial' }))).map((l) => l.u.ref)).toEqual(['c:2']);
  });

  it('frente mar: texto da tabela ou endereço na Av. Castelo Branco', () => {
    const u = (ref: string, extra: Partial<Unidade>): Unidade => ({ ref, origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', status: 'disponivel', ...extra });
    const ls = montarLinhas([
      predio({ id: 'a', unidades: [u('a:0', { vista: 'Frente ao mar' }), u('a:1', { obs: 'Prédio frente mar · sacada' }), u('a:2', { obs: 'Em frente ao futuro píer' })] }),
      predio({ id: 'b', endereco: 'Av. Pres. Castelo Branco, 12000', unidades: [u('b:0', { obs: 'Lado rua' })] }),
      // Seven Guilhermina: posição da unidade no prédio, longe da praia
      predio({ id: 'c', endereco: 'Rua Dr. João Sampaio, 840', unidades: [u('c:0', { det: 'Frente, lado praia' })] }),
    ]);
    expect(ls.filter((l) => passa(l, F({ frente: true }))).map((l) => l.u.ref)).toEqual(['a:0', 'a:1', 'b:0']);
    expect(L.filter((l) => passa(l, F({ frente: true }))).length).toBe(0);
  });

  it('rótulo de mar: prédio na Av. Castelo Branco é sempre frente mar, mesmo sem vista na tabela', () => {
    const u = (extra: Partial<Unidade>): Unidade => ({ ref: 'x:0', origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', status: 'disponivel', ...extra });
    const cb = predio({ endereco: 'Avenida Presidente Castelo Branco, 2808 - Vila Guilhermina' });
    const rua = predio({ endereco: 'Rua Peru, 100' });
    expect(rotuloMar(u({}), cb)).toBe('Frente mar');
    expect(rotuloMar(u({ vistaMar: true, vista: 'Vista mar · Av. Pres. Castelo Branco' }), cb)).toBe('Frente mar');
    expect(rotuloMar(u({ vistaMar: true, vista: 'Sacada vista mar' }), cb)).toBe('Frente mar · Sacada vista mar');
    expect(rotuloMar(u({ vistaMar: true, vista: 'Frente mar total' }), cb)).toBe('Frente mar total');
    expect(rotuloMar(u({ vistaMar: true, vista: 'Vista para o mar' }), rua)).toBe('Vista para o mar');
    expect(rotuloMar(u({}), rua)).toBe('');
  });

  it('a busca ignora acentos e procura em observações', () => {
    expect(L.filter((l) => passa(l, F({ q: 'CHURRASQUEIRA guilhermina' }))).length).toBe(1);
    expect(L.filter((l) => passa(l, F({ q: 'teste' }))).length).toBe(2);
  });

  it('a busca não exige o tipo do prédio: "Residencial Teste" acha o Ed. Teste', () => {
    expect(L.filter((l) => passa(l, F({ q: 'Residencial Teste' }))).length).toBe(2);
    expect(L.filter((l) => passa(l, F({ q: 'Edifício teste' }))).length).toBe(2);
    expect(L.filter((l) => passa(l, F({ q: 'ed.' }))).length).toBe(2);
  });

  it('buscar uma imobiliária traz só as unidades que ela anuncia, não o prédio inteiro', () => {
    const base: Omit<Unidade, 'ref'> = { origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', status: 'disponivel' };
    const ls = montarLinhas([
      predio({
        fontes: ['Site Lesan Imóveis (cód. 88)', 'M² Imóveis'],
        unidades: [
          { ...base, ref: 'a:0', unidade: '51', fonte: 'Site Lesan Imóveis (cód. 88)' },
          { ...base, ref: 'a:1', unidade: '25', fonte: 'M² Imóveis' },
        ],
      }),
    ]);
    expect(ls.filter((l) => passa(l, F({ q: 'lesan' }))).map((l) => l.u.unidade)).toEqual(['51']);
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
  it('a unidade escolhida abre a etiqueta com o número', () => {
    const p = predio({ fase: 'lancamento', entrega: 'Dez/2026' });
    const c = cardDe(p, { ...base, fase: 'lancamento', tipologia: '2 dorms', dm: '2', unidade: '1203' });
    expect(c.etiqueta).toBe('Apto 1203 · Guilhermina · Praia Grande · Entrega Dez/2026');
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

import { vagasTexto } from './formato';
import { textoCliente } from './cliente';
describe('copiar para o cliente', () => {
  it('vagas legíveis', () => {
    expect(['1', '2', '2 demarcadas', 'Sem vaga', 'coletiva', '—', undefined].map((v) => vagasTexto(v))).toEqual([
      '1 vaga',
      '2 vagas',
      '2 vagas demarcadas',
      'Sem vaga',
      'Vaga coletiva',
      '',
      '',
    ]);
  });
  it('texto sem número da unidade nem dados internos', () => {
    const p = predio({});
    const u = P.unidades![0];
    const t = textoCliente(p, { ...u, vagas: '1', fonte: 'Imobiliária X', contato: '(13) 9999-0000' });
    expect(t).toContain('Ed. Teste · Guilhermina, Praia Grande');
    expect(t).toContain('2 dorms · 70 m² · 1 vaga');
    expect(t).not.toContain('14');
    expect(t).not.toContain('Imobiliária X');
    expect(t).not.toContain('9999');
  });
});

describe('pasta Lançamentos', () => {
  const base: Pick<Unidade, 'ref' | 'origem' | 'origens' | 'mercado' | 'status'> = {
    ref: 'lesan:seven:0',
    origem: 'lesan',
    origens: ['lesan'],
    mercado: 'construtora',
    status: 'disponivel',
  };
  it('card mostra a parcela única como linha própria, sem chamá-la de "chaves"', () => {
    const p = predio({ fase: 'lancamento' });
    const c = cardDe(p, { ...base, fase: 'lancamento', tipologia: '2 dorms', dm: '2', valor: 597000, fluxo: { entrada: 40000, anualQtd: 2, anualVal: 12000, parcQtd: 24, parcVal: 2308.33, unica: 470600 } });
    expect(c.pagamentos[0].linhas.map((l) => l.rotulo)).toEqual(['Entrada', '2 anuais de', 'Parcela única']);
  });
  it('lazer e diferenciais vêm do prédio quando não há book', () => {
    const p = predio({ lazer: ['Piscina borda infinita', 'Sauna'], diferenciais: ['Lazer completo', 'Comissão 5%', '1 vaga'] });
    const c = cardDe(p, { ...base, fase: 'lancamento', tipologia: '2 dorms', dm: '2' });
    expect(c.lazer).toEqual(['Piscina borda infinita', 'Sauna']);
    expect(c.diferenciais.map((d) => d.titulo)).toEqual(['Lazer completo', '1 vaga']);
  });
  it('filtro de origem separa a pasta Lançamentos dos painéis antigos', () => {
    const lesan = montarLinhas([predio({ unidades: [{ ...base, fase: 'lancamento', unidade: '1', status: 'disponivel' }] })]);
    expect(lesan.filter((l) => passa(l, F({ origem: 'lesan' }))).length).toBe(1);
    expect(lesan.filter((l) => passa(l, F({ origem: 'usados' }))).length).toBe(0);
    expect(lesan.filter((l) => passa(l, F({ origem: 'isildo' }))).length).toBe(0);
    expect(lesan.filter((l) => passa(l, F({ origem: 'frente-mar' }))).length).toBe(0);
  });
});

describe('forma de pagamento dos usados', () => {
  it('lê banco, direto e negações do texto da tabela', () => {
    expect(pagamentosDeTexto('Financia: Aceita financiamento bancário | Comissão 5%')).toEqual(['bancario']);
    expect(pagamentosDeTexto('Parcelamento direto: 70% de entrada e o restante em 24x')).toEqual(['direto']);
    expect(pagamentosDeTexto('Aceita financiamento bancário e direto, e permuta.')).toEqual(['direto', 'bancario']);
    expect(pagamentosDeTexto('Permuta ou carro R$ 355 mil (sem banco)')).toEqual([]);
    expect(pagamentosDeTexto('Financia: Somente à vista')).toEqual([]);
    expect(pagamentosDeTexto('Valor à vista ou financiamento bancário; NÃO aceita parcelamento direto')).toEqual(['bancario']);
  });
});

describe('comissão', () => {
  it('lê 5% e fifty do texto da tabela', () => {
    expect(comissoesDeTexto('Aceita financiamento | Comissão: 5%')).toEqual(['cinco']);
    expect(comissoesDeTexto('Comissão fifty 6%')).toEqual(['fifty']);
    expect(comissoesDeTexto('Parceria fifty')).toEqual(['fifty']);
    expect(comissoesDeTexto('5% de comissão')).toEqual(['cinco']);
    expect(comissoesDeTexto('Comissão: 5% (abaixo: fifty)')).toEqual(['cinco']);
    expect(comissoesDeTexto('Comissão: R$ 15 mil')).toEqual([]);
    expect(comissoesDeTexto('Parcela de R$ 1.500,00 e 15%')).toEqual([]);
  });

  it('filtra pela comissão da unidade; sem informação na unidade, vale a do prédio', () => {
    const base: Omit<Unidade, 'ref'> = { origem: 'usados', origens: ['usados'], mercado: 'revenda', fase: 'pronto', status: 'disponivel' };
    const ls = montarLinhas([
      predio({
        notas: ['Comissão 5%'],
        unidades: [
          { ...base, ref: 'a:0', unidade: '1', obs: 'Comissão fifty 6%' },
          { ...base, ref: 'a:1', unidade: '2', obs: 'Sacada' },
        ],
      }),
      predio({ id: 'y', unidades: [{ ...base, ref: 'b:0', unidade: '3', obs: 'Comissão: 5%' }, { ...base, ref: 'b:1', unidade: '4' }] }),
    ]);
    expect(ls.filter((l) => passa(l, F({ comissao: 'fifty' }))).map((l) => l.u.unidade)).toEqual(['1']);
    expect(ls.filter((l) => passa(l, F({ comissao: 'cinco' }))).map((l) => l.u.unidade)).toEqual(['2', '3']);
    expect(ls.filter((l) => passa(l, F({}))).length).toBe(4);
  });

  it('unidade da Lesan nunca é fifty, nem quando outra imobiliária oferece fifty', () => {
    const base: Omit<Unidade, 'ref'> = { origem: 'site-lesan', origens: ['site-lesan', 'vista-mar'], mercado: 'revenda', fase: 'pronto', status: 'disponivel' };
    const outra = { ...base, ref: 'g:0', origem: 'vista-mar' as const, obs: 'Comissão: Fifty (5%)' };
    const ls = montarLinhas([
      predio({
        notas: ['Parceria fifty'],
        unidades: [
          { ...base, ref: 'a:0', unidade: '1', outras: [outra] },
          { ...base, ref: 'a:1', unidade: '2' },
        ],
      }),
    ]);
    expect(ls.map((l) => l.comissoes)).toEqual([['cinco'], []]);
  });
});
