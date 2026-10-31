import { FotoBook, escolherFotos, plantaDaUnidade } from './fotos.service';

const planta = (finais: number[], torre: string | undefined, dorms: number): FotoBook => ({
  arquivo: `planta-${finais}-${torre ?? 'ab'}`,
  rotulo: `Planta final ${finais}`,
  planta: { finais, ...(torre ? { torre } : {}), dorms },
});
const PLANTAS = [planta([1], 'A', 3), planta([1], 'B', 2), planta([3], undefined, 2)];
const BOOK: FotoBook[] = [
  { arquivo: 'piscina', rotulo: 'Piscina' },
  { arquivo: 'fachada', rotulo: 'Fachada frente mar' },
  ...PLANTAS,
  { arquivo: 'implantacao', rotulo: 'Implantação da área comum' },
  { arquivo: 'sala', rotulo: 'Sala de estar' },
];

describe('plantas no card', () => {
  it('acha a planta pelo final e pela torre da unidade', () => {
    expect(plantaDaUnidade(PLANTAS, { unidade: '61 A', dm: '3' })).toBe(PLANTAS[0]);
    expect(plantaDaUnidade(PLANTAS, { unidade: '141 B' })).toBe(PLANTAS[1]);
    expect(plantaDaUnidade(PLANTAS, { unidade: '64 B', dm: '2' })).toBeUndefined();
    expect(plantaDaUnidade(PLANTAS, { unidade: '133', dm: '2' })).toBe(PLANTAS[2]);
  });

  it('unidade sem torre desempata pelos dormitórios; sem como decidir, fica sem planta', () => {
    expect(plantaDaUnidade(PLANTAS, { unidade: '131', dm: '2' })).toBe(PLANTAS[1]);
    expect(plantaDaUnidade(PLANTAS, { unidade: '131' })).toBeUndefined();
    expect(plantaDaUnidade(PLANTAS, { unidade: 'Torres A e B (9 aptos)' })).toBeUndefined();
  });

  it('a planta da unidade entra logo depois da fachada; as outras plantas não entram sozinhas', () => {
    expect(escolherFotos(BOOK).map((f) => f.arquivo)).toEqual(['fachada', 'piscina', 'sala']);
    expect(escolherFotos(BOOK, 6, PLANTAS[0]).map((f) => f.arquivo)).toEqual(['fachada', 'planta-1-A', 'piscina', 'sala']);
  });
});
