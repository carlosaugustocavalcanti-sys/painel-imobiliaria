import { Injectable, signal } from '@angular/core';
import { normalizar } from '../estoque/busca';
import { Predio } from '../estoque/modelo';

export interface FotoBook {
  arquivo: string;
  rotulo: string;
  /** Foto real (ex.: obra, galeria do anúncio no site); as demais são renders do book: "Imagem ilustrativa". */
  real?: boolean;
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
export function escolherFotos(fotos: FotoBook[], n = 6): FotoBook[] {
  const restantes = fotos.filter((f) => !/obra/i.test(f.rotulo));
  const escolhidas: FotoBook[] = [];
  for (const re of PREFERENCIA) {
    const i = restantes.findIndex((f) => re.test(f.rotulo));
    if (i >= 0) escolhidas.push(...restantes.splice(i, 1));
    if (escolhidas.length >= n) break;
  }
  return [...escolhidas, ...restantes].slice(0, n);
}
