import { Injectable, computed, signal } from '@angular/core';
import { montarLinhas } from './busca';
import { Estoque } from './modelo';

/** Carrega public/dados/estoque.json uma vez e expõe prédios e linhas de busca. */
@Injectable({ providedIn: 'root' })
export class EstoqueService {
  readonly estoque = signal<Estoque | null>(null);
  readonly erro = signal<string | null>(null);
  readonly carregando = computed(() => !this.estoque() && !this.erro());

  readonly predios = computed(() => this.estoque()?.predios ?? []);
  readonly linhas = computed(() => montarLinhas(this.predios()));
  readonly predioPorId = computed(() => new Map(this.predios().map((p) => [p.id, p])));
  /** Todas as tabelas de origem citadas, para o filtro "Tabela". */
  readonly fontes = computed(() =>
    [...new Set(this.linhas().flatMap((l) => [l.u, ...(l.u.outras ?? [])].map((r) => r.fonte).filter((f): f is string => !!f)))].sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    ),
  );

  constructor() {
    this.carregar();
  }

  async carregar() {
    this.erro.set(null);
    try {
      const r = await fetch('dados/estoque.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this.estoque.set(await r.json());
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : String(e));
    }
  }
}
