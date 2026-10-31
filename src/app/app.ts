import { ChangeDetectionStrategy, Component, afterRenderEffect, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  AREA_STEPS,
  CATEGORIA_ROTULO,
  DORM_ROTULO,
  FASE_ROTULO,
  FILTROS_VAZIOS,
  Filtros,
  Linha,
  MONGAGUA,
  ORDENS,
  ORIGEM_ROTULO,
  ORLA,
  Ordem,
  STATUS_ROTULO,
  VAL_STEPS,
  VAGAS_OPCOES,
  entregaPrevista,
  filtroDeUnidade,
  lugarDe,
  naOrla,
  normalizar,
  ordenar,
  passa,
  valLabel,
} from './estoque/busca';
import { EstoqueService } from './estoque/estoque.service';
import { brl, brlK, faixa, m2, num, plural, vagasTexto } from './estoque/formato';
import { Categoria, Dorm, Predio, Unidade } from './estoque/modelo';
import { Aba, escreverUrl, lerUrl } from './estoque/url';
import { Orla, TrechoOrla } from './orla/orla';
import { PredioDetalhe } from './predio/predio-detalhe';
import { CardGerador } from './card/card-gerador';
import { copiarParaCliente } from './estoque/cliente';

const POR_PAGINA = 40;
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface ResumoPredio {
  p: Predio;
  linhas: Linha[];
  disp: number;
  min?: number;
  max?: number;
}

@Component({
  selector: 'app-root',
  imports: [Orla, PredioDetalhe, CardGerador],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly estoque = inject(EstoqueService);

  private readonly inicial = lerUrl(location.search);
  protected readonly f = signal<Filtros>(this.inicial.f);
  protected readonly aba = signal<Aba>(this.inicial.aba);
  protected readonly ordem = signal<Ordem>(this.inicial.ordem);
  protected readonly predioAberto = signal<string | null>(this.inicial.predio);
  protected readonly destaque = signal<string | null>(null);
  protected readonly limite = signal(POR_PAGINA);
  protected readonly maisFiltros = signal(false);
  /** Unidade com o gerador de card aberto direto da lista de resultados. */
  protected readonly cardAberto = signal<{ p: Predio; u: Unidade } | null>(null);
  /** Ref da unidade recém-copiada (ou "erro:<ref>"), para o retorno no botão. */
  protected readonly copiado = signal<string | null>(null);

  protected readonly fmt = { brl, brlK, faixa, m2, num, plural, valLabel, vagasTexto };
  protected readonly Math = Math;
  protected readonly ORDENS = ORDENS;
  protected readonly VAL_STEPS = VAL_STEPS;
  protected readonly AREA_STEPS = AREA_STEPS;
  protected readonly VAGAS_OPCOES = VAGAS_OPCOES;
  protected readonly FASE_ROTULO = FASE_ROTULO;
  protected readonly STATUS_ROTULO = STATUS_ROTULO;
  protected readonly ORIGEM_ROTULO = ORIGEM_ROTULO;
  protected readonly CATEGORIAS: ['' | Categoria, string][] = [['', 'Todos'], ...(Object.entries(CATEGORIA_ROTULO) as [Categoria, string][])];
  protected readonly DORMS: ['' | Dorm, string][] = [['', 'Qualquer'], ...(Object.entries(DORM_ROTULO) as [Dorm, string][])];

  /* ---------- resultados ---------- */
  protected readonly linhas = computed(() => this.estoque.linhas().filter((l) => passa(l, this.f())));
  protected readonly ordenadas = computed(() => ordenar(this.linhas(), this.ordem()));
  protected readonly visiveis = computed(() => this.ordenadas().slice(0, this.limite()));

  protected readonly resumo = computed(() => {
    const ls = this.linhas();
    const vals = ls.map((l) => l.u.valor ?? 0).filter((v) => v > 0);
    const m2s = ls.filter((l) => l.u.valor && l.u.area).map((l) => l.u.valor! / l.u.area!);
    return {
      unidades: ls.length,
      predios: new Set(ls.map((l) => l.p.id)).size,
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null,
      media: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      m2: m2s.length ? m2s.reduce((a, b) => a + b, 0) / m2s.length : null,
      vista: ls.filter((l) => l.vistaMar).length,
    };
  });

  /** Quantas unidades cada opção traria, mantendo os outros filtros. */
  private contar(valor: Partial<Filtros>) {
    const f = { ...this.f(), ...valor };
    return this.estoque.linhas().filter((l) => passa(l, f)).length;
  }
  protected readonly contagemTipo = computed(() => ({
    '': this.contar({ tipo: '' }),
    usados: this.contar({ tipo: 'usados' }),
    lancamentos: this.contar({ tipo: 'lancamentos' }),
  }));
  protected readonly contagemVista = computed(() => this.contar({ vista: true }));
  protected readonly contagemFrente = computed(() => this.contar({ frente: true }));
  protected readonly contagemComissao = computed(() => ({
    '': this.contar({ comissao: '' }),
    cinco: this.contar({ comissao: 'cinco' }),
    fifty: this.contar({ comissao: 'fifty' }),
  }));
  protected readonly contagemCategoria = computed(() => Object.fromEntries(this.CATEGORIAS.map(([c]) => [c, this.contar({ categoria: c })])));
  protected readonly contagemDm = computed(() => Object.fromEntries(this.DORMS.map(([d]) => [d, this.contar({ dm: d })])));
  protected readonly contagemVagas = computed(() => Object.fromEntries(this.VAGAS_OPCOES.map(([n]) => [n, this.contar({ vagas: n })])));
  /** Construtoras com unidades no recorte atual (mantendo os outros filtros), em ordem alfabética. A escolhida fica mesmo com zero. */
  protected readonly construtoras = computed(() => {
    const f = this.f();
    const n = new Map<string, number>();
    for (const l of this.estoque.linhas()) if (l.p.construtora && passa(l, f, 'construtora')) n.set(l.p.construtora, (n.get(l.p.construtora) ?? 0) + 1);
    if (f.construtora && !n.has(f.construtora)) n.set(f.construtora, 0);
    return [...n].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  });

  /* ---------- orla ---------- */
  protected readonly trechos = computed<TrechoOrla[]>(() => {
    const base = this.estoque.linhas().filter((l) => passa(l, this.f(), 'lugares'));
    const por = new Map<string, { total: number; vista: number }>();
    for (const l of base) {
      const o = por.get(l.lugar) ?? { total: 0, vista: 0 };
      o.total++;
      if (l.vistaMar) o.vista++;
      por.set(l.lugar, o);
    }
    const trecho = (lugares: string[], nome: string): TrechoOrla => ({
      lugares,
      nome,
      total: lugares.reduce((a, x) => a + (por.get(x)?.total ?? 0), 0),
      vista: lugares.reduce((a, x) => a + (por.get(x)?.vista ?? 0), 0),
    });
    const outros = [...new Set(this.estoque.linhas().map((l) => l.lugar))].filter((x) => !naOrla(x)).sort();
    return [...ORLA.map((b) => trecho([b], b)), trecho([MONGAGUA], MONGAGUA), trecho(outros, 'Outros')];
  });

  /* ---------- prédios ---------- */
  protected readonly predios = computed<ResumoPredio[]>(() => {
    const por = new Map<string, Linha[]>();
    for (const l of this.linhas()) por.set(l.p.id, [...(por.get(l.p.id) ?? []), l]);
    const lista: ResumoPredio[] = [...por.values()].map((linhas) => {
      const vals = linhas.filter((l) => l.u.status === 'disponivel').map((l) => l.u.valor ?? 0).filter((v) => v > 0);
      return {
        p: linhas[0].p,
        linhas,
        disp: linhas.filter((l) => l.u.status === 'disponivel').length,
        min: vals.length ? Math.min(...vals) : undefined,
        max: vals.length ? Math.max(...vals) : undefined,
      };
    });
    // prédios ainda sem tabela entram quando nenhum filtro de unidade está ligado
    const f = this.f();
    if (!filtroDeUnidade(f)) {
      const q = normalizar(f.q).split(/\s+/).filter(Boolean);
      for (const p of this.estoque.predios()) {
        if (p.unidades?.length) continue;
        const txt = normalizar([p.nome, p.bairro, p.endereco].join(' '));
        if (q.some((t) => !txt.includes(t))) continue;
        if (f.lugares.length && !f.lugares.includes(lugarDe(p))) continue;
        if (f.fase && p.fase !== f.fase) continue;
        if (f.construtora && p.construtora !== f.construtora) continue;
        if (f.origem && !p.origens.includes(f.origem)) continue;
        lista.push({ p, linhas: [], disp: 0 });
      }
    }
    return lista.sort((a, b) => b.disp - a.disp || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
  });

  /* ---------- bairros ---------- */
  protected readonly bairros = computed(() => {
    const g = new Map<string, { lugar: string; predios: Set<string>; n: number; vals: number[]; m2: number[] }>();
    for (const l of this.estoque.linhas()) {
      if (!passa(l, this.f(), 'lugares') || l.u.status !== 'disponivel') continue;
      const o = g.get(l.lugar) ?? { lugar: l.lugar, predios: new Set<string>(), n: 0, vals: [], m2: [] };
      o.predios.add(l.p.id);
      o.n++;
      if (l.u.valor) o.vals.push(l.u.valor);
      if (l.u.valor && l.u.area) o.m2.push(l.u.valor / l.u.area);
      g.set(l.lugar, o);
    }
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const ordemOrla = (x: string) => {
      const i = [...ORLA, MONGAGUA].indexOf(x as (typeof ORLA)[number]);
      return i < 0 ? 99 : i;
    };
    return [...g.values()]
      .map((o) => ({
        lugar: o.lugar,
        predios: o.predios.size,
        n: o.n,
        min: o.vals.length ? Math.min(...o.vals) : null,
        max: o.vals.length ? Math.max(...o.vals) : null,
        media: avg(o.vals),
        m2: avg(o.m2),
      }))
      .sort((a, b) => ordemOrla(a.lugar) - ordemOrla(b.lugar) || a.lugar.localeCompare(b.lugar, 'pt-BR'));
  });

  /* ---------- entregas ---------- */
  protected readonly entregas = computed(() => {
    const hoje = new Date();
    const blocos = new Map<string, { ano: number; mes: number; itens: ResumoPredio[] }>();
    for (const r of this.predios()) {
      const e = entregaPrevista(r.p.entrega || r.linhas.find((l) => l.u.entregaUnidade)?.u.entregaUnidade, r.p.fase);
      if (!e) continue;
      const k = `${e.ano}-${String(e.mes).padStart(2, '0')}`;
      const b = blocos.get(k) ?? { ano: e.ano, mes: e.mes, itens: [] };
      b.itens.push(r);
      blocos.set(k, b);
    }
    return [...blocos.values()]
      .sort((a, b) => (a.ano || 9999) - (b.ano || 9999) || (a.mes < 0 ? 12 : a.mes) - (b.mes < 0 ? 12 : b.mes))
      .map((b) => ({
        ...b,
        titulo: b.mes >= 0 ? MESES[b.mes] : 'Mês a confirmar',
        anoTxt: b.ano ? String(b.ano) : 'sem data',
        agora: b.ano === hoje.getFullYear() && b.mes === hoje.getMonth(),
        passou: b.ano > 0 && b.mes >= 0 && (b.ano < hoje.getFullYear() || (b.ano === hoje.getFullYear() && b.mes < hoje.getMonth())),
        itens: b.itens.sort((x, y) => x.p.nome.localeCompare(y.p.nome, 'pt-BR')),
      }));
  });

  /* ---------- entrada e renda ---------- */
  protected readonly renda = computed(() =>
    this.predios()
      .map((r) => {
        const c = r.linhas.filter((l) => l.u.mercado === 'construtora' && l.u.status === 'disponivel');
        const min = (k: 'entrada' | 'renda' | 'valor') => {
          const v = c.map((l) => l.u[k] ?? 0).filter((x) => x > 0);
          return v.length ? Math.min(...v) : null;
        };
        return { r, n: c.length, entrada: min('entrada'), renda: min('renda'), valor: min('valor'), mod: r.p.lanc?.modalidade ?? 'bancario' };
      })
      .filter((x) => x.n)
      .sort((a, b) => (a.renda ?? 9e9) - (b.renda ?? 9e9) || (a.entrada ?? 0) - (b.entrada ?? 0)),
  );

  /* ---------- filtros ativos ---------- */
  protected readonly anos = computed(() => {
    const s = new Set(this.estoque.linhas().map((l) => l.entrega));
    const anos = [...s].filter((v) => /^\d{4}$/.test(v)).sort();
    return [...(s.has('Entregue') ? ['Entregue'] : []), ...anos, ...(s.has('A confirmar') ? ['A confirmar'] : [])];
  });

  protected readonly ativos = computed(() => {
    const f = this.f();
    const a: { rotulo: string; limpar: Partial<Filtros> }[] = [];
    if (f.q.trim()) a.push({ rotulo: `“${f.q.trim()}”`, limpar: { q: '' } });
    if (f.tipo) a.push({ rotulo: f.tipo === 'usados' ? 'Usados' : 'Lançamentos', limpar: { tipo: '' } });
    if (f.categoria) a.push({ rotulo: CATEGORIA_ROTULO[f.categoria], limpar: { categoria: '' } });
    if (f.vista) a.push({ rotulo: 'Vista mar', limpar: { vista: false } });
    if (f.frente) a.push({ rotulo: 'Frente mar', limpar: { frente: false } });
    if (f.comissao) a.push({ rotulo: f.comissao === 'cinco' ? 'Comissão 5%' : 'Comissão fifty', limpar: { comissao: '' } });
    if (f.dm) a.push({ rotulo: DORM_ROTULO[f.dm], limpar: { dm: '' } });
    if (f.vagas) a.push({ rotulo: `${f.vagas}+ ${f.vagas === 1 ? 'vaga' : 'vagas'}`, limpar: { vagas: 0 } });
    if (f.amin || f.amax)
      a.push({
        rotulo: !f.amin ? `até ${f.amax} m²` : !f.amax ? `a partir de ${f.amin} m²` : `${f.amin} a ${f.amax} m²`,
        limpar: { amin: 0, amax: 0 },
      });
    if (f.vmin || f.vmax)
      a.push({
        rotulo: !f.vmin ? `até ${valLabel(f.vmax)}` : !f.vmax ? `a partir de ${valLabel(f.vmin)}` : `${valLabel(f.vmin)} a ${valLabel(f.vmax)}`,
        limpar: { vmin: 0, vmax: 0 },
      });
    for (const l of f.lugares) a.push({ rotulo: l, limpar: { lugares: f.lugares.filter((x) => x !== l) } });
    if (f.fase) a.push({ rotulo: FASE_ROTULO[f.fase], limpar: { fase: '' } });
    if (f.acesso) a.push({ rotulo: { elevador: 'Com elevador', escada: 'Só escada', nd: 'Acesso não informado' }[f.acesso], limpar: { acesso: '' } });
    if (f.fonte) a.push({ rotulo: `Tabela: ${f.fonte}`, limpar: { fonte: '' } });
    if (f.construtora) a.push({ rotulo: `Construtora ${f.construtora}`, limpar: { construtora: '' } });
    if (f.pagamento) a.push({ rotulo: f.pagamento === 'direto' ? 'Direto c/ construtora/investidor' : 'Financ. bancário', limpar: { pagamento: '' } });
    if (f.entrega) a.push({ rotulo: `Entrega: ${f.entrega}`, limpar: { entrega: '' } });
    if (f.gravacao) a.push({ rotulo: f.gravacao === 'pend' ? 'Gravação pendente' : 'Já gravado', limpar: { gravacao: '' } });
    if (f.todas) a.push({ rotulo: 'Inclui reservadas e vendidas', limpar: { todas: false } });
    if (f.origem) a.push({ rotulo: ORIGEM_ROTULO[f.origem], limpar: { origem: '' } });
    return a;
  });
  protected readonly qtdMaisFiltros = computed(() => {
    const f = this.f();
    return [f.fase, f.acesso, f.fonte, f.entrega, f.gravacao, f.todas, f.origem].filter(Boolean).length;
  });

  protected readonly aberto = computed(() => {
    const id = this.predioAberto();
    return id ? (this.estoque.predioPorId().get(id) ?? null) : null;
  });

  constructor() {
    // a URL acompanha a busca (dá para salvar ou mandar o link de uma pesquisa)
    effect(() => {
      const url = escreverUrl({ f: this.f(), aba: this.aba(), ordem: this.ordem(), predio: untracked(this.predioAberto) });
      history.replaceState(history.state, '', url);
    });
    addEventListener('popstate', () => this.predioAberto.set(lerUrl(location.search).predio));
    // no celular a faixa de abas rola para o lado: a aba ativa fica sempre à vista
    afterRenderEffect(() => {
      this.aba();
      this.estoque.carregando();
      const nav = document.querySelector<HTMLElement>('.abas');
      const ativa = nav?.querySelector<HTMLElement>('[aria-current]');
      if (!nav || !ativa) return;
      const n = nav.getBoundingClientRect();
      const a = ativa.getBoundingClientRect();
      if (a.left < n.left || a.right > n.right - 24) nav.scrollLeft += a.left - n.left - 16;
    });
  }

  /* ---------- ações ---------- */
  protected mudar(parcial: Partial<Filtros>) {
    this.f.update((f) => ({ ...f, ...parcial }));
    this.limite.set(POR_PAGINA);
  }
  protected limparTudo() {
    this.f.set({ ...FILTROS_VAZIOS, lugares: [] });
    this.limite.set(POR_PAGINA);
  }
  protected alternarLugares(lugares: string[]) {
    const atual = this.f().lugares;
    const todos = lugares.every((l) => atual.includes(l));
    this.mudar({ lugares: todos ? atual.filter((l) => !lugares.includes(l)) : [...new Set([...atual, ...lugares])] });
  }
  protected valorMin(v: string) {
    const n = +v || 0;
    this.mudar({ vmin: n, vmax: this.f().vmax && n > this.f().vmax ? 0 : this.f().vmax });
  }
  protected valorMax(v: string) {
    const n = +v || 0;
    this.mudar({ vmax: n, vmin: this.f().vmin && n && n < this.f().vmin ? 0 : this.f().vmin });
  }
  protected areaMin(v: string) {
    const n = +v || 0;
    this.mudar({ amin: n, amax: this.f().amax && n > this.f().amax ? 0 : this.f().amax });
  }
  protected areaMax(v: string) {
    const n = +v || 0;
    this.mudar({ amax: n, amin: this.f().amin && n && n < this.f().amin ? 0 : this.f().amin });
  }
  protected abrir(p: Predio, ref?: string) {
    this.destaque.set(ref ?? null);
    this.predioAberto.set(p.id);
    history.pushState({ predio: p.id }, '', escreverUrl({ f: this.f(), aba: this.aba(), ordem: this.ordem(), predio: p.id }));
  }
  protected fechar() {
    if (history.state?.predio) history.back();
    else {
      this.predioAberto.set(null);
      history.replaceState(null, '', escreverUrl({ f: this.f(), aba: this.aba(), ordem: this.ordem(), predio: null }));
    }
  }
  protected gerarCard(l: Linha) {
    this.cardAberto.set({ p: l.p, u: l.u });
  }
  protected async copiar(l: Linha) {
    this.copiado.set((await copiarParaCliente(l.p, l.u)) ? l.u.ref : 'erro:' + l.u.ref);
    setTimeout(() => this.copiado.set(null), 2200);
  }
  protected texto(ev: Event) {
    return (ev.target as HTMLInputElement).value;
  }
  protected faixaPredio(r: ResumoPredio) {
    return faixa(r.min, r.max);
  }
  protected tipologias(r: ResumoPredio) {
    const c = new Map<string, number>();
    for (const l of r.linhas) if (l.u.status === 'disponivel') c.set(l.u.tipologia || '—', (c.get(l.u.tipologia || '—') ?? 0) + 1);
    return [...c].map(([k, v]) => `${k} (${v})`).join(' · ');
  }
}
