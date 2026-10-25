import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Predio, Unidade } from '../estoque/modelo';
import { CardDados, Pagamento, cardDe } from './card-dados';
import { ALTURA, LARGURA, carregarFontes, desenharCard } from './card-desenho';
import { FotoBook, FotosService, escolherFotos } from './fotos.service';

type Imagem = CanvasImageSource & { width: number; height: number };

/** Ambientes de lazer reconhecidos nos rótulos das fotos do book (sem repetir: "Cinema" e "Home theater" contam uma vez). */
const LAZER_FOTO: [string, RegExp][] = [
  ['Piscina', /piscina/i],
  ['Spa', /spa\b|sauna/i],
  ['Cinema', /cinema|home theater/i],
  ['Academia', /academia/i],
  ['Espaço gourmet', /gourmet|grill|churrasq/i],
  ['Salão de festas', /sal[ãa]o de festas/i],
  ['Salão de jogos', /jogos|gamer/i],
  ['Brinquedoteca', /brinquedoteca/i],
  ['Playground', /playground/i],
  ['Quadra', /quadra/i],
];
function lazerDasFotos(fotos: FotoBook[]): string[] {
  return LAZER_FOTO.filter(([, re]) => fotos.some((f) => re.test(f.rotulo) && !/varanda/i.test(f.rotulo))).map(([n]) => n).slice(0, 8);
}
interface Foto {
  id: string;
  rotulo: string;
  url: string;
  real: boolean;
  img?: Imagem;
}

/** Gera o card 1080×1920 da unidade, com prévia ao vivo e campos editáveis. */
@Component({
  selector: 'app-card-gerador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-gerador.html',
})
export class CardGerador {
  readonly predio = input.required<Predio>();
  readonly unidade = input.required<Unidade>();
  readonly fechar = output<void>();

  private readonly fotosSrv = inject(FotosService);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private readonly tela = viewChild.required<ElementRef<HTMLCanvasElement>>('tela');

  protected readonly dados = signal<CardDados | null>(null);
  /** Fotos disponíveis: as do book do prédio e as que você adicionar. */
  protected readonly biblioteca = signal<Foto[]>([]);
  /** Ids das fotos no card, na ordem (a primeira fica em destaque). */
  protected readonly escolhidas = signal<string[]>([]);
  protected readonly aviso = signal<string | null>(null);
  protected readonly podeCompartilhar = typeof navigator !== 'undefined' && 'canShare' in navigator;
  private readonly versao = signal(0);

  protected readonly fotosNoCard = computed(() => {
    const porId = new Map(this.biblioteca().map((f) => [f.id, f]));
    return this.escolhidas().map((id) => porId.get(id)).filter((f): f is Foto => !!f);
  });

  constructor() {
    afterNextRender(async () => {
      this.dialogo().nativeElement.showModal();
      const p = this.predio();
      const u = this.unidade();
      await Promise.all([carregarFontes(), this.fotosSrv.carregar()]);
      const book = this.fotosSrv.doPredio(p);
      const d = cardDe(p, u);
      if (book.length) d.rodape = d.rodape.replace(' Valores sujeitos', ' Imagens ilustrativas. Valores sujeitos');
      // sem lista de lazer na tabela: usa os espaços de lazer que aparecem nas fotos do book
      if (!d.lazer.length) d.lazer = lazerDasFotos(book);
      this.dados.set(d);
      const fotos = book.map((f: FotoBook) => ({ id: f.arquivo, rotulo: f.rotulo, url: f.arquivo, real: !!f.real }));
      this.biblioteca.set(fotos);
      this.escolhidas.set(escolherFotos(book).map((f) => f.arquivo));
      await Promise.all(fotos.map((f) => this.carregarImagem(f)));
      this.versao.update((v) => v + 1);
    });

    // redesenha a prévia sempre que os dados ou as fotos mudam
    effect(() => {
      const d = this.dados();
      const fotos = this.fotosNoCard();
      this.versao();
      if (!d) return;
      requestAnimationFrame(() => {
        const c = this.tela().nativeElement;
        const ctx = c.getContext('2d');
        if (ctx) desenharCard(ctx, d, fotos.map((f) => f.img).filter((i): i is Imagem => !!i));
      });
    });
  }

  private carregarImagem(f: Foto) {
    return new Promise<void>((ok) => {
      const img = new Image();
      img.onload = () => {
        f.img = img;
        ok();
      };
      img.onerror = () => ok();
      img.src = f.url;
    });
  }

  protected readonly LARGURA = LARGURA;
  protected readonly ALTURA = ALTURA;

  /* ---------- edição ---------- */
  protected campo<K extends keyof CardDados>(k: K, v: CardDados[K]) {
    this.dados.update((d) => (d ? { ...d, [k]: v } : d));
  }
  protected valor(ev: Event) {
    return (ev.target as HTMLInputElement).value;
  }
  protected lazerTexto() {
    return this.dados()?.lazer.join('\n') ?? '';
  }
  protected difs() {
    const l = (this.dados()?.diferenciais ?? []).slice(0, 3);
    while (l.length < 3) l.push({ titulo: '', detalhe: '' });
    return l;
  }
  protected dif(i: number, k: 'titulo' | 'detalhe', v: string) {
    this.dados.update((d) => {
      if (!d) return d;
      const diferenciais = this.difs().map((x, j) => (j === i ? { ...x, [k]: v } : x));
      return { ...d, diferenciais };
    });
  }
  protected pag<K extends keyof Pagamento>(i: number, k: K, v: Pagamento[K]) {
    this.dados.update((d) => (d ? { ...d, pagamentos: d.pagamentos.map((p, j) => (j === i ? { ...p, [k]: v } : p)) } : d));
  }
  protected linha(i: number, j: number, k: 'rotulo' | 'valor', v: string) {
    this.dados.update((d) => {
      if (!d) return d;
      const pagamentos = d.pagamentos.map((p, a) => {
        if (a !== i) return p;
        const linhas = p.linhas.slice();
        while (linhas.length <= j) linhas.push({ rotulo: '', valor: '' });
        linhas[j] = { ...linhas[j], [k]: v };
        return { ...p, linhas };
      });
      return { ...d, pagamentos };
    });
  }
  protected linhasEditaveis(p: Pagamento) {
    const l = p.linhas.slice();
    while (l.length < 4) l.push({ rotulo: '', valor: '' });
    return l;
  }
  protected separarFluxos(dois: boolean) {
    this.dados.update((d) => {
      if (!d) return d;
      if (!dois) return { ...d, pagamentos: d.pagamentos.slice(0, 1) };
      const vazio: Pagamento = { rotulo: 'Direto com a construtora', grande: '', sufixo: '', sufixo2: '', linhas: [], totalRotulo: 'Total', totalValor: '' };
      return { ...d, pagamentos: [d.pagamentos[0], d.pagamentos[1] ?? vazio] };
    });
  }

  /* ---------- fotos ---------- */
  protected alternarFoto(id: string) {
    this.escolhidas.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 6 ? s : [...s, id]));
  }
  protected paraDestaque(id: string) {
    this.escolhidas.update((s) => [id, ...s.filter((x) => x !== id)]);
  }
  protected async adicionar(ev: Event) {
    const arquivos = [...((ev.target as HTMLInputElement).files ?? [])];
    const novas: Foto[] = [];
    for (const a of arquivos) {
      try {
        novas.push({ id: `local:${a.name}:${a.size}`, rotulo: a.name, url: URL.createObjectURL(a), real: true, img: await createImageBitmap(a) });
      } catch {
        this.aviso.set(`Não consegui abrir ${a.name}.`);
      }
    }
    this.biblioteca.update((b) => [...b, ...novas.filter((n) => !b.some((x) => x.id === n.id))]);
    this.escolhidas.update((s) => [...s, ...novas.map((n) => n.id)].slice(0, 6));
    (ev.target as HTMLInputElement).value = '';
  }

  /* ---------- exportar ---------- */
  private nomeArquivo() {
    const p = this.predio();
    const u = this.unidade();
    const base = `card-${p.nome}-${u.tipologia ?? ''}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base}.png`;
  }
  private png(): Promise<Blob> {
    return new Promise((ok, erro) => this.tela().nativeElement.toBlob((b) => (b ? ok(b) : erro(new Error('falha ao gerar PNG'))), 'image/png'));
  }
  protected async baixar() {
    const url = URL.createObjectURL(await this.png());
    const a = document.createElement('a');
    a.href = url;
    a.download = this.nomeArquivo();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.aviso.set('Imagem baixada.');
  }
  protected async copiar() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': this.png() })]);
      this.aviso.set('Imagem copiada. Cole no WhatsApp ou no Instagram.');
    } catch {
      this.aviso.set('Este navegador não deixa copiar imagens. Use "Baixar PNG".');
    }
  }
  protected async compartilhar() {
    const arquivo = new File([await this.png()], this.nomeArquivo(), { type: 'image/png' });
    if (navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo] }).catch(() => undefined);
    } else this.aviso.set('Compartilhar não está disponível aqui. Use "Baixar PNG".');
  }
  protected faltaFoto() {
    return this.fotosNoCard().length === 0;
  }
}
