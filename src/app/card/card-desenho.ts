import { CardDados, Pagamento } from './card-dados';

/** Story 1080×1920 na marca Carlos Cavalcanti: só 6 cores, Hanken Grotesk, etiquetas 6px, caixas 24px. */
export const LARGURA = 1080;
export const ALTURA = 1920;

const M = 72; // margem
const CW = LARGURA - 2 * M; // largura útil
const COR = { amarelo: '#F2B300', preto: '#1C1C1C', gelo: '#F2F2F0', claro: '#E2E2DF', cinza: '#5C5C5C', branco: '#FFFFFF' };
const BRANCO_65 = 'rgba(255,255,255,0.65)';
const BRANCO_25 = 'rgba(255,255,255,0.25)';
const FONTE = '"Hanken Grotesk", system-ui, sans-serif';

export async function carregarFontes() {
  await Promise.all([500, 800, 900].map((w) => document.fonts.load(`${w} 40px "Hanken Grotesk"`)));
}

type Ctx = CanvasRenderingContext2D;

/* ---------- texto com tracking (letterSpacing com plano B letra a letra) ---------- */
function fonte(ctx: Ctx, peso: number, px: number) {
  ctx.font = `${peso} ${px}px ${FONTE}`;
}
const temLS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
function medir(ctx: Ctx, s: string, tracking = 0): number {
  const px = parseFloat(ctx.font.split(' ')[1]);
  if (temLS) {
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${tracking * px}px`;
    const w = ctx.measureText(s).width;
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = '0px';
    return w - (s.length ? tracking * px : 0);
  }
  return ctx.measureText(s).width + Math.max(0, s.length - 1) * tracking * px;
}
function escrever(ctx: Ctx, s: string, x: number, y: number, tracking = 0, alinhar: 'left' | 'right' = 'left') {
  const px = parseFloat(ctx.font.split(' ')[1]);
  const w = medir(ctx, s, tracking);
  let cx = alinhar === 'right' ? x - w : x;
  ctx.textAlign = 'left';
  if (temLS || !tracking) {
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${tracking * px}px`;
    ctx.fillText(s, cx, y);
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = '0px';
    return w;
  }
  for (const ch of s) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking * px;
  }
  return w;
}
/** Diminui a fonte até o texto caber na largura. */
function caber(ctx: Ctx, s: string, peso: number, px: number, largura: number, tracking = 0, minimo = 14) {
  fonte(ctx, peso, px);
  while (px > minimo && medir(ctx, s, tracking) > largura) fonte(ctx, peso, --px);
  return px;
}
function quebrar(ctx: Ctx, s: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const p of s.split(/\s+/).filter(Boolean)) {
    const t = atual ? atual + ' ' + p : p;
    if (ctx.measureText(t).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = t;
  }
  if (atual) linhas.push(atual);
  return linhas;
}
const caixa = (s: string) => s.toLocaleUpperCase('pt-BR');

/* ---------- fotos ---------- */
interface Ret {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Grade de fotos conforme a quantidade: a primeira foto é sempre a maior. */
export function gradeFotos(n: number, topo: number, altura: number): Ret[] {
  const g = 32;
  const r = (x: number, y: number, w: number, h: number): Ret => ({ x: M + x, y: topo + y, w, h });
  const meia = (CW - g) / 2;
  const ladoE = 400;
  const ladoD = CW - ladoE - g;
  const baixo = Math.round(altura * 0.24);
  const cima = altura - baixo - 24;
  const terco = (CW - 2 * 20) / 3;
  switch (n) {
    case 1:
      return [r(0, 0, CW, altura)];
    case 2:
      return [r(0, 0, meia, altura), r(meia + g, 0, meia, altura)];
    case 3: {
      const h2 = (altura - g) / 2;
      return [r(0, 0, ladoE, altura), r(ladoE + g, 0, ladoD, h2), r(ladoE + g, h2 + g, ladoD, h2)];
    }
    case 4: {
      const h2 = (cima - g) / 2;
      return [r(0, 0, ladoE, cima), r(ladoE + g, 0, ladoD, h2), r(ladoE + g, h2 + g, ladoD, h2), r(0, cima + 24, CW, baixo)];
    }
    case 5: {
      const h2 = (cima - g) / 2;
      return [
        r(0, 0, ladoE, cima),
        r(ladoE + g, 0, ladoD, h2),
        r(ladoE + g, h2 + g, ladoD, h2),
        r(0, cima + 24, meia + 6, baixo),
        r(meia + g - 6, cima + 24, meia + 6, baixo),
      ];
    }
    default: {
      const h2 = (cima - g) / 2;
      return [
        r(0, 0, ladoE, cima),
        r(ladoE + g, 0, ladoD, h2),
        r(ladoE + g, h2 + g, ladoD, h2),
        r(0, cima + 24, terco, baixo),
        r(terco + 20, cima + 24, terco, baixo),
        r(2 * (terco + 20), cima + 24, terco, baixo),
      ];
    }
  }
}
export interface FotoCard {
  img: CanvasImageSource & { width: number; height: number };
  /** Planta: inteira sobre fundo branco, em vez de cortada para preencher o espaço. */
  inteira?: boolean;
}
function foto(ctx: Ctx, { img, inteira }: FotoCard, ret: Ret) {
  if (inteira) {
    const pad = 16;
    const escala = Math.min((ret.w - 2 * pad) / img.width, (ret.h - 2 * pad) / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.save();
    ctx.fillStyle = COR.branco;
    ctx.beginPath();
    ctx.roundRect(ret.x, ret.y, ret.w, ret.h, 24);
    ctx.fill();
    ctx.drawImage(img, ret.x + (ret.w - w) / 2, ret.y + (ret.h - h) / 2, w, h);
    ctx.restore();
    return;
  }
  const escala = Math.max(ret.w / img.width, ret.h / img.height);
  const sw = ret.w / escala;
  const sh = ret.h / escala;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(ret.x, ret.y, ret.w, ret.h, 24);
  ctx.clip();
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, ret.x, ret.y, ret.w, ret.h);
  ctx.restore();
}

/* ---------- diferenciais (card sem fotos) ---------- */
/** Caixa cinza com número em marca-texto, título e detalhe. Devolve a altura usada. */
function desenharDiferencial(ctx: Ctx, d: { titulo: string; detalhe: string }, n: number, topo: number) {
  const xTexto = M + 128;
  const larg = M + CW - 36 - xTexto;
  fonte(ctx, 800, 32);
  const titulo = quebrar(ctx, d.titulo.trim(), larg).slice(0, 2);
  fonte(ctx, 500, 27);
  const detalhe = d.detalhe.trim() ? quebrar(ctx, d.detalhe.trim(), larg).slice(0, 2) : [];
  const altura = Math.max(118, 34 + titulo.length * 40 + detalhe.length * 36 + 26);

  ctx.fillStyle = COR.claro;
  ctx.beginPath();
  ctx.roundRect(M, topo, CW, altura, 24);
  ctx.fill();
  const numTopo = topo + (altura - 58) / 2;
  ctx.fillStyle = COR.amarelo;
  ctx.fillRect(M + 32, numTopo, 64, 58);
  ctx.fillStyle = COR.preto;
  fonte(ctx, 900, 34);
  const num = String(n).padStart(2, '0');
  escrever(ctx, num, M + 32 + (64 - medir(ctx, num, -0.03)) / 2, numTopo + 41, -0.03);

  let ty = topo + (altura - (titulo.length * 40 + detalhe.length * 36)) / 2 + 30;
  fonte(ctx, 800, 32);
  for (const l of titulo) {
    escrever(ctx, l, xTexto, ty, -0.01);
    ty += 40;
  }
  ctx.fillStyle = COR.cinza;
  fonte(ctx, 500, 27);
  for (const l of detalhe) {
    escrever(ctx, l, xTexto, ty + 2);
    ty += 36;
  }
  return altura;
}

/* ---------- bloco de pagamento ---------- */
const temTotal = (pg: Pagamento) => !!(pg.totalRotulo.trim() || pg.totalValor.trim());
const temDepois = (pg: Pagamento) => !!(pg.depoisRotulo?.trim() || pg.depoisValor?.trim());
const linhasDe = (pg: Pagamento) => pg.linhas.filter((l) => l.rotulo.trim() || l.valor.trim());
/** Medidas do bloco: cheio (largura toda) ou compacto (dois lado a lado). */
const MEDIDA = {
  cheio: { pad: 48, rot: 20, grande: 84, suf: 30, suf2: 20, linha: 62, txt: 31, val: 32, tot: 40, totRot: 34 },
  compacto: { pad: 30, rot: 17, grande: 54, suf: 16, suf2: 15, linha: 54, txt: 22, val: 24, tot: 28, totRot: 24 },
};
function alturaPagamento(pg: Pagamento, compacto: boolean) {
  const m = compacto ? MEDIDA.compacto : MEDIDA.cheio;
  const rotulo = compacto ? 2 * m.rot + 10 : m.rot + 4;
  const sufixo = compacto && pg.sufixo.trim() ? m.suf + 10 : 0;
  return m.pad + rotulo + 24 + m.grande + sufixo + 28 + linhasDe(pg).length * m.linha + (temTotal(pg) ? m.linha + 8 : 0) + (temDepois(pg) ? m.linha : 0) + m.pad - 18;
}
function desenharPagamento(ctx: Ctx, pg: Pagamento, x: number, topo: number, w: number, altura: number, compacto: boolean) {
  const m = compacto ? MEDIDA.compacto : MEDIDA.cheio;
  ctx.fillStyle = COR.preto;
  ctx.beginPath();
  ctx.roundRect(x, topo, w, altura, 24);
  ctx.fill();
  const xi = x + m.pad;
  const xf = x + w - m.pad;
  let py = topo + m.pad + m.rot * 0.8;

  // rótulo amarelo (quebra em duas linhas no bloco compacto)
  ctx.fillStyle = COR.amarelo;
  fonte(ctx, 800, m.rot);
  const rot = caixa(pg.rotulo);
  if (compacto) {
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${0.12 * m.rot}px`;
    const partes = quebrar(ctx, rot, xf - xi);
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = '0px';
    partes.slice(0, 2).forEach((l, i) => escrever(ctx, l, xi, py + i * (m.rot + 10), 0.12));
    py += m.rot + 10;
  } else {
    caber(ctx, rot, 800, m.rot, xf - xi, 0.12, 14);
    escrever(ctx, rot, xi, py, 0.12);
  }

  // número grande
  py += 24 + m.grande * 0.86;
  ctx.fillStyle = COR.amarelo;
  caber(ctx, pg.grande, 900, m.grande, compacto ? xf - xi : (xf - xi) * 0.66, -0.045, 28);
  const wg = escrever(ctx, pg.grande, xi, py, -0.045);
  if (compacto) {
    if (pg.sufixo.trim()) {
      ctx.fillStyle = BRANCO_65;
      caber(ctx, caixa(pg.sufixo), 800, m.suf, xf - xi, 0.12, 11);
      escrever(ctx, caixa(pg.sufixo), xi, py + m.suf + 10, 0.12);
      py += m.suf + 10;
    }
  } else if (pg.sufixo.trim() || pg.sufixo2.trim()) {
    const xs = xi + wg + 22;
    ctx.fillStyle = COR.branco;
    caber(ctx, caixa(pg.sufixo), 800, m.suf, xf - xs, 0, 16);
    escrever(ctx, caixa(pg.sufixo), xs, py - (pg.sufixo2.trim() ? 28 : 6));
    ctx.fillStyle = BRANCO_65;
    caber(ctx, caixa(pg.sufixo2), 800, m.suf2, xf - xs, 0.12, 12);
    escrever(ctx, caixa(pg.sufixo2), xs, py, 0.12);
  }
  py += 28;

  // linhas
  for (const l of linhasDe(pg)) {
    ctx.fillStyle = BRANCO_25;
    ctx.fillRect(xi, py, xf - xi, 1.5);
    ctx.fillStyle = COR.branco;
    fonte(ctx, 800, m.val);
    const wv = medir(ctx, l.valor, -0.02);
    escrever(ctx, l.valor, xf, py + m.linha * 0.7, -0.02, 'right');
    caber(ctx, l.rotulo, 500, m.txt, xf - xi - wv - 16, 0, 14);
    escrever(ctx, l.rotulo, xi, py + m.linha * 0.7);
    py += m.linha;
  }
  if (temTotal(pg)) {
    ctx.fillStyle = COR.amarelo;
    ctx.fillRect(xi, py, xf - xi, 2);
    fonte(ctx, 900, m.tot);
    const wv = medir(ctx, pg.totalValor, -0.045);
    escrever(ctx, pg.totalValor, xf, py + m.linha * 0.8, -0.045, 'right');
    caber(ctx, caixa(pg.totalRotulo), 900, m.totRot, xf - xi - wv - 16, -0.02, 14);
    escrever(ctx, caixa(pg.totalRotulo), xi, py + m.linha * 0.78, -0.02);
    py += m.linha + 8;
  }
  if (temDepois(pg)) {
    // linha depois do total (ex.: "À vista"), no mesmo estilo das linhas de cima
    ctx.fillStyle = BRANCO_25;
    ctx.fillRect(xi, py, xf - xi, 1.5);
    ctx.fillStyle = COR.branco;
    fonte(ctx, 800, m.val);
    const wv = medir(ctx, pg.depoisValor ?? '', -0.02);
    escrever(ctx, pg.depoisValor ?? '', xf, py + m.linha * 0.7, -0.02, 'right');
    caber(ctx, pg.depoisRotulo ?? '', 500, m.txt, xf - xi - wv - 16, 0, 14);
    escrever(ctx, pg.depoisRotulo ?? '', xi, py + m.linha * 0.7);
  }
}

/* ---------- card ---------- */
export function desenharCard(ctx: Ctx, d: CardDados, fotos: FotoCard[]) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COR.gelo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  /* etiqueta */
  let y = 64;
  if (d.etiqueta.trim()) {
    const txt = caixa(d.etiqueta);
    const px = caber(ctx, txt, 800, 20, CW - 40, 0.12, 14);
    const w = medir(ctx, txt, 0.12);
    ctx.fillStyle = COR.claro;
    ctx.beginPath();
    ctx.roundRect(M, y, w + 40, px + 26, 6);
    ctx.fill();
    ctx.fillStyle = COR.preto;
    escrever(ctx, txt, M + 20, y + 13 + px * 0.8, 0.12);
    y += px + 26 + 38;
  }

  /* título com marca-texto */
  const tit = caixa(d.titulo.trim());
  const des = caixa(d.destaque.trim());
  const pad = (px: number) => 0.2 * px;
  let px = 96;
  const larguraTit = (p: number) => {
    fonte(ctx, 900, p);
    const a = tit ? medir(ctx, tit, -0.045) : 0;
    const b = des ? medir(ctx, des, -0.045) + 2 * pad(p) : 0;
    return a + (a && b ? 0.33 * p : 0) + b;
  };
  while (px > 56 && larguraTit(px) > CW) px--;
  const umaLinha = larguraTit(px) <= CW;
  const linhaTit = (texto: string, marcado: boolean, x: number, topo: number) => {
    fonte(ctx, 900, px);
    const w = medir(ctx, texto, -0.045);
    if (marcado) {
      ctx.fillStyle = COR.amarelo;
      ctx.fillRect(x, topo, w + 2 * pad(px), px);
      ctx.fillStyle = COR.preto;
      escrever(ctx, texto, x + pad(px), topo + px * 0.84, -0.045);
      return w + 2 * pad(px);
    }
    ctx.fillStyle = COR.preto;
    escrever(ctx, texto, x, topo + px * 0.84, -0.045);
    return w;
  };
  if (umaLinha) {
    let x = M;
    if (tit) x += linhaTit(tit, false, x, y) + 0.33 * px;
    if (des) linhaTit(des, true, x, y);
    y += px;
  } else {
    if (tit) {
      linhaTit(tit, false, M, y);
      y += px + 8;
    }
    if (des) {
      px = caber(ctx, des, 900, px, CW - 2 * pad(px), -0.045, 40);
      linhaTit(des, true, M, y);
      y += px;
    }
  }

  /* subtítulo */
  if (d.subtitulo.trim()) {
    const sub = caixa(d.subtitulo.replace(/\s*·\s*/g, '  ·  '));
    const sp = caber(ctx, sub, 800, 34, CW, 0, 20);
    ctx.fillStyle = COR.preto;
    escrever(ctx, sub, M, y + 24 + sp * 0.8);
    y += 24 + sp + 30;
  } else y += 30;

  /* mede o que vem abaixo das fotos para dar a elas o espaço que sobrar */
  fonte(ctx, 800, 20);
  const chips = d.lazer.map((s) => caixa(s.trim())).filter(Boolean);
  const linhasChips: { s: string; w: number }[][] = [];
  let atual: { s: string; w: number }[] = [];
  let larg = 0;
  for (const s of chips) {
    const w = Math.min(CW, medir(ctx, s, 0.12) + 36);
    if (larg + w > CW && atual.length) {
      linhasChips.push(atual);
      atual = [];
      larg = 0;
    }
    atual.push({ s, w });
    larg += w + 12;
  }
  if (atual.length) linhasChips.push(atual);
  const altChips = linhasChips.length ? 36 + linhasChips.length * 46 + (linhasChips.length - 1) * 10 + 28 : 0;

  const blocos = d.pagamentos.filter((pg) => pg.grande.trim() || pg.linhas.length || pg.totalValor.trim());
  const duplo = blocos.length > 1;
  const altPg = blocos.length ? Math.max(...blocos.map((pg) => alturaPagamento(pg, duplo))) : 0;

  fonte(ctx, 500, 21);
  const linhasRodape = d.rodape.trim() ? d.rodape.split('\n').flatMap((l) => quebrar(ctx, l, CW)) : [];
  const altRodape = linhasRodape.length * 33;

  const assinaturaTopo = ALTURA - 72 - 66;
  const sobra = assinaturaTopo - 40 - altRodape - 36 - altPg - 32 - altChips - y;
  /** Onde o bloco de pagamento fica quando não há fotos: mais para baixo, deixando ar acima da assinatura. */
  let topoMinimoPg = 0;

  if (fotos.length) {
    /* fotos: a grade usa só as que existem, sem nenhuma vaga vazia */
    const altFotos = Math.max(0, Math.min(744, sobra));
    if (altFotos >= 200) {
      gradeFotos(Math.min(6, fotos.length), y, altFotos).forEach((ret, i) => foto(ctx, fotos[i], ret));
      y += altFotos + 28;
    }
  } else {
    /* sem fotos: diferenciais numerados no lugar da grade */
    const difs = d.diferenciais.filter((x) => x.titulo.trim()).slice(0, 3);
    if (difs.length) {
      y += 42;
      ctx.fillStyle = COR.cinza;
      fonte(ctx, 800, 20);
      escrever(ctx, 'DIFERENCIAIS', M, y + 18, 0.12);
      y += 42;
      for (const [i, dif] of difs.entries()) y += desenharDiferencial(ctx, dif, i + 1, y) + 20;
    }
    topoMinimoPg = assinaturaTopo - 200 - altRodape - 36 - altPg - altChips;
  }

  y = Math.max(y, topoMinimoPg);

  /* lazer */
  if (linhasChips.length) {
    ctx.fillStyle = COR.cinza;
    fonte(ctx, 800, 18);
    escrever(ctx, 'LAZER NO CONDOMÍNIO', M, y + 18, 0.12);
    y += 36;
  }
  for (const linha of linhasChips) {
    let x = M;
    for (const c of linha) {
      ctx.fillStyle = COR.claro;
      ctx.beginPath();
      ctx.roundRect(x, y, c.w, 46, 6);
      ctx.fill();
      ctx.fillStyle = COR.preto;
      fonte(ctx, 800, 20);
      let s = c.s;
      while (medir(ctx, s, 0.12) > c.w - 36 && s.length > 3) s = s.slice(0, -2) + '…';
      escrever(ctx, s, x + 18, y + 31, 0.12);
      x += c.w + 12;
    }
    y += 56;
  }
  if (linhasChips.length) y += 18;

  /* bloco(s) de pagamento */
  const topoPg = y + 4;
  if (duplo) {
    const w = (CW - 24) / 2;
    blocos.slice(0, 2).forEach((pg, i) => desenharPagamento(ctx, pg, M + i * (w + 24), topoPg, w, altPg, true));
  } else if (blocos.length) {
    desenharPagamento(ctx, blocos[0], M, topoPg, CW, altPg, false);
  }
  y = topoPg + altPg + 36;

  /* rodapé com a fonte dos dados */
  ctx.fillStyle = COR.cinza;
  fonte(ctx, 500, 21);
  for (const l of linhasRodape) {
    escrever(ctx, l, M, y + 22);
    y += 33;
  }

  /* assinatura */
  ctx.fillStyle = COR.preto;
  fonte(ctx, 900, 40);
  escrever(ctx, 'Carlos Cavalcanti', M, assinaturaTopo + 34, -0.03);
  ctx.fillStyle = COR.cinza;
  fonte(ctx, 800, 16);
  escrever(ctx, 'CRECI 331032  ·  @CARLOS_CAVALCANTI_IMOVEIS_', M, assinaturaTopo + 66, 0.16);
  ctx.restore();
}
