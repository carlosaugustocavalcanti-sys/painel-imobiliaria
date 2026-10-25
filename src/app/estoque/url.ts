import { FILTROS_VAZIOS, Filtros, Ordem, ORDENS } from './busca';

export type Aba = 'unidades' | 'predios' | 'bairros' | 'entregas' | 'renda';
export const ABAS: Aba[] = ['unidades', 'predios', 'bairros', 'entregas', 'renda'];

export interface EstadoUrl {
  f: Filtros;
  aba: Aba;
  ordem: Ordem;
  predio: string | null;
}

/** Lê a busca a partir de ?q=...&tipo=... para que uma pesquisa possa ser salva ou compartilhada. */
export function lerUrl(search: string): EstadoUrl {
  const s = new URLSearchParams(search);
  const f: Filtros = { ...FILTROS_VAZIOS, lugares: [] };
  for (const k of Object.keys(FILTROS_VAZIOS) as (keyof Filtros)[]) {
    const v = s.get(k);
    if (v == null) continue;
    const padrao = FILTROS_VAZIOS[k];
    if (Array.isArray(padrao)) (f as unknown as Record<string, unknown>)[k] = v.split('|').filter(Boolean);
    else if (typeof padrao === 'number') (f as unknown as Record<string, unknown>)[k] = +v || 0;
    else if (typeof padrao === 'boolean') (f as unknown as Record<string, unknown>)[k] = v === '1';
    else (f as unknown as Record<string, unknown>)[k] = v;
  }
  const aba = s.get('aba') as Aba;
  const ordem = s.get('ordem') as Ordem;
  return {
    f,
    aba: ABAS.includes(aba) ? aba : 'unidades',
    ordem: ORDENS.some(([o]) => o === ordem) ? ordem : 'valor',
    predio: s.get('predio'),
  };
}

export function escreverUrl(e: EstadoUrl): string {
  const s = new URLSearchParams();
  for (const k of Object.keys(FILTROS_VAZIOS) as (keyof Filtros)[]) {
    const v = e.f[k];
    if (Array.isArray(v)) {
      if (v.length) s.set(k, v.join('|'));
    } else if (typeof v === 'boolean') {
      if (v) s.set(k, '1');
    } else if (v) s.set(k, String(v));
  }
  if (e.aba !== 'unidades') s.set('aba', e.aba);
  if (e.ordem !== 'valor') s.set('ordem', e.ordem);
  if (e.predio) s.set('predio', e.predio);
  const q = s.toString();
  return q ? '?' + q : location.pathname;
}
