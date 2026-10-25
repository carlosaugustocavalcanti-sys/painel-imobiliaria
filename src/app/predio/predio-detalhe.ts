import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FASE_ROTULO, Filtros, ORIGEM_ROTULO, STATUS_ROTULO, passa, montarLinhas } from '../estoque/busca';
import { brl, brl2, brlK, faixa, m2, num } from '../estoque/formato';
import { Predio, RegistroUnidade, Unidade } from '../estoque/modelo';

const CAMPO_ROTULO: Record<string, string> = { valor: 'valor', status: 'status', area: 'área', cond: 'condomínio', iptu: 'IPTU' };

/** Ficha completa de um prédio: unidades, condições, tabelas de origem e, nos lançamentos, o book. */
@Component({
  selector: 'app-predio-detalhe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './predio-detalhe.html',
})
export class PredioDetalhe {
  readonly predio = input.required<Predio>();
  readonly filtros = input.required<Filtros>();
  readonly destaque = input<string | null>(null);
  readonly fechar = output<void>();

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  protected readonly todas = signal(false);
  protected readonly copiado = signal<string | null>(null);
  protected readonly fmt = { brl, brl2, brlK, faixa, m2, num };
  protected readonly FASE_ROTULO = FASE_ROTULO;
  protected readonly STATUS_ROTULO = STATUS_ROTULO;
  protected readonly ORIGEM_ROTULO = ORIGEM_ROTULO;
  protected readonly CAMPO_ROTULO = CAMPO_ROTULO;

  private readonly linhas = computed(() => montarLinhas([this.predio()]));
  /** Unidades do prédio que passam na busca atual (o bairro já é o deste prédio). */
  protected readonly filtradas = computed(() => this.linhas().filter((l) => passa(l, this.filtros())).map((l) => l.u));
  protected readonly unidades = computed(() => {
    const us = this.todas() ? (this.predio().unidades ?? []) : this.filtradas();
    return us.slice().sort((a, b) => (a.valor || 9e12) - (b.valor || 9e12) || String(a.unidade).localeCompare(String(b.unidade), 'pt-BR', { numeric: true }));
  });
  protected readonly total = computed(() => this.predio().unidades?.length ?? 0);

  protected readonly resumo = computed(() => {
    const us = this.predio().unidades ?? [];
    const d = us.filter((u) => u.status === 'disponivel');
    const vals = d.map((u) => u.valor ?? 0).filter((v) => v > 0);
    const conds = d.map((u) => u.cond ?? 0).filter((v) => v > 0);
    const areas = d.map((u) => u.area ?? 0).filter((v) => v > 0);
    const min = (a: number[]) => (a.length ? Math.min(...a) : null);
    const max = (a: number[]) => (a.length ? Math.max(...a) : null);
    return {
      disp: d.length,
      res: us.filter((u) => u.status === 'reservado' || u.status === 'suspenso').length,
      vend: us.filter((u) => u.status === 'vendido').length,
      vmin: min(vals),
      vmax: max(vals),
      cmin: min(conds),
      cmax: max(conds),
      amin: min(areas),
      amax: max(areas),
      emin: min(d.map((u) => u.entrada ?? 0).filter((v) => v > 0)),
      rmin: min(d.map((u) => u.renda ?? 0).filter((v) => v > 0)),
      rmax: max(d.map((u) => u.renda ?? 0).filter((v) => v > 0)),
      vista: d.filter((u) => u.vistaMar).length,
      conf: us.filter((u) => u.conf).length,
      div: us.filter((u) => u.divergencias?.length).length,
    };
  });

  /** Colunas extras só aparecem quando alguma unidade do prédio tem o dado. */
  protected readonly colunas = computed(() => {
    const us = this.predio().unidades ?? [];
    const tem = (k: keyof Unidade) => us.some((u) => u[k] != null && u[k] !== '');
    return {
      andar: tem('andar'),
      final: tem('final'),
      entrada: tem('entrada'),
      renda: tem('renda'),
      direto: tem('valorDireto'),
      fin: tem('vfin') || tem('vp'),
      cond: tem('cond'),
      iptu: tem('iptu'),
      vagas: tem('vagas'),
      laudo: tem('laudo'),
      fluxo: tem('fluxo'),
      chaves: tem('chaves') && !tem('fluxo'),
    };
  });

  constructor() {
    afterRenderEffect(() => {
      const d = this.dialogo().nativeElement;
      if (!d.open) d.showModal();
      const ref = this.destaque();
      if (ref) d.querySelector(`[data-ref="${CSS.escape(ref)}"]`)?.scrollIntoView({ block: 'center' });
    });
  }

  protected linkMapa() {
    const p = this.predio();
    if (p.mapa) return p.mapa;
    const q = [p.endereco || p.nome, p.bairro !== 'A confirmar' ? p.bairro : '', p.cidade, 'SP'].filter(Boolean).join(', ');
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }

  protected outroValor(r: RegistroUnidade) {
    return r.valor ? brl(r.valor) : 'sem valor';
  }

  /** Texto pronto para mandar ao cliente: sem número da unidade, sem dados internos. */
  protected async copiar(u: Unidade) {
    const p = this.predio();
    const linhas = [
      `${p.nome} · ${p.bairro !== 'A confirmar' ? p.bairro + ', ' : ''}${p.cidade}`,
      [u.tipologia, u.area ? m2(u.area) : '', u.vagas ? `${u.vagas} vaga(s)` : ''].filter(Boolean).join(' · '),
      u.vistaMar ? (u.vista || 'Vista para o mar') : '',
      u.valor ? `Valor: ${brl(u.valor)}` : 'Valor sob consulta',
      u.entrada ? `Entrada a partir de ${brl(u.entrada)}` : '',
      u.cond ? `Condomínio: ${brl2(u.cond)}` : '',
      u.iptu ? `IPTU: ${brl2(u.iptu)}` : '',
      FASE_ROTULO[u.fase] + (p.entrega && u.fase !== 'pronto' ? ` · entrega ${p.entrega}` : ''),
      'Valores sujeitos a confirmação.',
      'Carlos Cavalcanti · CRECI 331032 · @carlos_cavalcanti_imoveis_',
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(linhas.join('\n'));
      this.copiado.set(u.ref);
      setTimeout(() => this.copiado.set(null), 2200);
    } catch {
      this.copiado.set('erro');
    }
  }
}
