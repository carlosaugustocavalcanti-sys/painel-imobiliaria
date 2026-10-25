const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRL2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR');

const ok = (v: number | null | undefined): v is number => v != null && !isNaN(v) && v !== 0;

/** R$ 350.000 */
export const brl = (v?: number | null) => (ok(v) ? BRL0.format(v) : '—');
/** R$ 489,40 (condomínio, IPTU, parcelas) */
export const brl2 = (v?: number | null) => (ok(v) ? BRL2.format(v) : '—');
/** R$ 350 mil · R$ 1,4 mi */
export function brlK(v?: number | null): string {
  if (!ok(v)) return '—';
  if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
  return 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil';
}
export const num = (v?: number | null) => (v == null ? '—' : NUM.format(v));
/** 52,04 m² */
export const m2 = (v?: number | null) => (ok(v) ? v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²' : '—');

export function faixa(min?: number | null, max?: number | null, fmt: (v: number) => string = brl): string {
  if (!ok(min)) return '—';
  return ok(max) && max > min ? `${fmt(min)} a ${fmt(max)}` : fmt(min);
}

export const plural = (n: number, um: string, varios: string) => `${NUM.format(n)} ${n === 1 ? um : varios}`;
