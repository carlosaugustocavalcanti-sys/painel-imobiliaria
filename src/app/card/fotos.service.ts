import { Injectable, signal } from '@angular/core';
import { normalizar } from '../estoque/busca';
import { Predio, Unidade } from '../estoque/modelo';

export interface FotoBook {
  arquivo: string;
  rotulo: string;
  /** Foto real (ex.: obra, galeria do anúncio no site); as demais são renders do book: "Imagem ilustrativa". */
  real?: boolean;
  /** Planta: os finais que ela mostra e a torre, quando vale só para uma. O card da unidade usa a planta do seu final. */
  planta?: { finais: number[]; torre?: string; dorms?: number };
}

interface Manifesto {
  origem: string;
  predios: Record<string, { nome: string; noEstoque: boolean; fotos: FotoBook[] }>;
}

/** Fotos dos books (public/dados/fotos.json, gerado por scripts/importar-fotos.mjs). */
@Injectable({ providedIn: 'root' })
export class FotosService {
  private readonly manifesto = signal<Manifesto | null>(null);
  private carregando: Promise<void> | null = null;

  carregar() {
    this.carregando ??= fetch('dados/fotos.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => this.manifesto.set(m))
      .catch(() => this.manifesto.set(null));
    return this.carregando;
  }

  /** Fotos do prédio pelo id do estoque; se não houver, pelo nome. */
  doPredio(p: Predio): FotoBook[] {
    const m = this.manifesto();
    if (!m) return [];
    if (m.predios[p.id]) return m.predios[p.id].fotos;
    const nome = normalizar(p.nome).replace(/[^a-z0-9]+/g, ' ').trim();
    const achado = Object.values(m.predios).find((x) => normalizar(x.nome).replace(/[^a-z0-9]+/g, ' ').trim() === nome);
    return achado?.fotos ?? [];
  }
}

/** Ordem de preferência para montar o card: fachada em destaque, depois lazer e ambientes. */
const PREFERENCIA = [/^fachada$/i, /fachada/i, /piscina/i, /varanda|terra[çc]o/i, /sala/i, /gourmet|churrasq/i, /academia/i, /sal[ãa]o/i, /su[íi]te|quarto/i, /jogos|gamer/i, /playground|brinquedoteca/i];
export function escolherFotos(fotos: FotoBook[], n = 6, planta?: FotoBook): FotoBook[] {
  // planta só entra a da unidade, logo depois do destaque
  const restantes = fotos.filter((f) => !/obra/i.test(f.rotulo) && !ehPlanta(f));
  const escolhidas: FotoBook[] = [];
  for (const re of PREFERENCIA) {
    const i = restantes.findIndex((f) => re.test(f.rotulo));
    if (i >= 0) escolhidas.push(...restantes.splice(i, 1));
    if (escolhidas.length >= n) break;
  }
  const lista = [...escolhidas, ...restantes];
  if (planta) lista.splice(1, 0, planta);
  return lista.slice(0, n);
}

export const ehPlanta = (f: Pick<FotoBook, 'rotulo' | 'planta'>) => !!f.planta || /planta|implanta[çc][ãa]o/i.test(f.rotulo);

/** Planta do final da unidade ("61 A" é o final 1 da torre A). Unidade sem torre desempata pelos dormitórios. */
export function plantaDaUnidade(fotos: FotoBook[], u: Pick<Unidade, 'unidade' | 'dm'>): FotoBook | undefined {
  const m = String(u.unidade ?? '').trim().match(/^(\d+)\s*([a-z])?$/i);
  if (!m) return undefined;
  const final = +m[1] % 10;
  const torre = m[2]?.toUpperCase();
  let achadas = fotos.filter((f) => f.planta?.finais.includes(final) && (!torre || !f.planta.torre || f.planta.torre === torre));
  if (achadas.length > 1 && u.dm) achadas = achadas.filter((f) => String(f.planta?.dorms) === u.dm);
  return achadas.length === 1 ? achadas[0] : undefined;
}
