// Lê as imagens embutidas num PDF sem dependências: JPEG (DCTDecode) sai como está e
// imagens Flate (RGB, cinza ou CMYK, 8 bits, com ou sem máscara de transparência) viram PNG.
import { inflateSync, deflateSync } from 'node:zlib';

/** Objetos "n 0 obj ... endobj" do PDF, com o dicionário e o stream bruto. */
function objetos(b) {
  const txt = b.toString('latin1');
  const mapa = new Map();
  const re = /(\d+)\s+0\s+obj\s*<<((?:[^<>]|<<(?:[^<>]|<<[^<>]*>>)*>>)*)>>\s*(stream\r?\n)?/g;
  let m;
  while ((m = re.exec(txt))) {
    const dic = m[2];
    let stream = null;
    if (m[3]) {
      const ini = m.index + m[0].length;
      let len = +(dic.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/)?.[1] ?? -1);
      if (len < 0 || txt.slice(ini + len, ini + len + 30).indexOf('endstream') < 0) len = txt.indexOf('endstream', ini) - ini;
      stream = b.subarray(ini, ini + len);
    }
    mapa.set(+m[1], { dic, stream });
  }
  return mapa;
}

const ref = (dic, chave) => +(dic.match(new RegExp(`/${chave}\\s+(\\d+)\\s+0\\s+R`))?.[1] ?? 0) || null;

function componentes(dic, objs) {
  const cs = dic.match(/\/ColorSpace\s*(\/\w+|\[[^\]]*\]|\d+\s+0\s+R)/)?.[1] ?? '/DeviceRGB';
  if (/DeviceGray/.test(cs)) return 1;
  if (/DeviceCMYK/.test(cs)) return 4;
  if (/DeviceRGB/.test(cs)) return 3;
  const icc = cs.match(/ICCBased\s+(\d+)\s+0\s+R/)?.[1] ?? (/^\d+/.test(cs) ? cs.match(/^(\d+)/)[1] : null);
  if (icc) {
    const o = objs.get(+icc);
    const n = o?.dic.match(/\/N\s+(\d)/)?.[1];
    if (n) return +n;
    const inner = o?.dic.match(/ICCBased\s+(\d+)\s+0\s+R/)?.[1];
    if (inner) return +(objs.get(+inner)?.dic.match(/\/N\s+(\d)/)?.[1] ?? 3);
  }
  return 3;
}

/** Desfaz os preditores PNG (Predictor >= 10) quando o PDF usa. */
function despredizer(dados, largura, bpp, dic) {
  const pred = +(dic.match(/\/Predictor\s+(\d+)/)?.[1] ?? 1);
  if (pred < 10) return dados;
  const linha = largura * bpp;
  const linhas = dados.length / (linha + 1);
  const out = Buffer.alloc(linhas * linha);
  for (let y = 0; y < linhas; y++) {
    const f = dados[y * (linha + 1)];
    const src = dados.subarray(y * (linha + 1) + 1, (y + 1) * (linha + 1));
    for (let x = 0; x < linha; x++) {
      const a = x >= bpp ? out[y * linha + x - bpp] : 0;
      const c = y > 0 ? out[(y - 1) * linha + x] : 0;
      const d = y > 0 && x >= bpp ? out[(y - 1) * linha + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a;
      else if (f === 2) v += c;
      else if (f === 3) v += (a + c) >> 1;
      else if (f === 4) {
        const p = a + c - d, pa = Math.abs(p - a), pb = Math.abs(p - c), pc = Math.abs(p - d);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? c : d;
      }
      out[y * linha + x] = v & 255;
    }
  }
  return out;
}

function png(largura, altura, rgba) {
  const crcTab = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const x of buf) c = crcTab[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, 'latin1');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dados.length);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(Buffer.concat([t, dados])));
    return Buffer.concat([len, t, dados, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const cru = Buffer.alloc(altura * (largura * 4 + 1));
  for (let y = 0; y < altura; y++) rgba.copy(cru, y * (largura * 4 + 1) + 1, y * largura * 4, (y + 1) * largura * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', deflateSync(cru)), bloco('IEND', Buffer.alloc(0))]);
}

/**
 * Maior retângulo totalmente opaco da imagem (borda esfumaçada ou recorte em diagonal ficam de fora).
 * Trabalha numa grade de blocos de 8 px e usa o "maior retângulo no histograma" linha a linha. [x, y, largura, altura]
 */
function caixaOpaca(rgba, w, h) {
  const B = 8;
  const gw = Math.floor(w / B), gh = Math.floor(h / B);
  const cheio = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      let ok = 1;
      for (let y = gy * B; y < gy * B + B && ok; y++)
        for (let x = gx * B; x < gx * B + B; x++)
          if (rgba[(y * w + x) * 4 + 3] < 245) {
            ok = 0;
            break;
          }
      cheio[gy * gw + gx] = ok;
    }
  const alt = new Int32Array(gw);
  let melhor = { area: 0, x: 0, y: 0, w: gw, h: gh };
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) alt[gx] = cheio[gy * gw + gx] ? alt[gx] + 1 : 0;
    const pilha = [];
    for (let gx = 0; gx <= gw; gx++) {
      const a = gx < gw ? alt[gx] : 0;
      while (pilha.length && alt[pilha[pilha.length - 1]] >= a) {
        const topo = pilha.pop();
        const altura = alt[topo];
        const ini = pilha.length ? pilha[pilha.length - 1] + 1 : 0;
        const area = altura * (gx - ini);
        if (area > melhor.area) melhor = { area, x: ini, y: gy - altura + 1, w: gx - ini, h: altura };
      }
      pilha.push(gx);
    }
  }
  return [melhor.x * B, melhor.y * B, melhor.w * B, melhor.h * B];
}

/**
 * Imagens do PDF com lado maior >= `minLado`, na ordem em que aparecem.
 * Cada item: { indice, largura, altura, tipo: 'jpg' | 'png', dados: Buffer, transparencia: boolean }.
 */
export function imagensDoPdf(buffer, minLado = 900) {
  const objs = objetos(buffer);
  const mascaras = new Set([...objs.values()].map((o) => ref(o.dic, 'SMask')).filter(Boolean));
  const lista = [];
  let indice = 0;
  for (const [num, o] of [...objs.entries()].sort((a, b) => a[0] - b[0])) {
    if (!o.stream || !/\/Subtype\s*\/Image/.test(o.dic) || mascaras.has(num)) continue;
    indice++;
    const w = +(o.dic.match(/\/Width\s+(\d+)/)?.[1] ?? 0);
    const h = +(o.dic.match(/\/Height\s+(\d+)/)?.[1] ?? 0);
    if (Math.max(w, h) < minLado) continue;
    if (/\/DCTDecode/.test(o.dic) && !/\/FlateDecode/.test(o.dic)) {
      lista.push({ indice, largura: w, altura: h, tipo: 'jpg', dados: Buffer.from(o.stream), transparencia: false });
      continue;
    }
    if (!/\/FlateDecode/.test(o.dic) || /\/DCTDecode|\/JPXDecode/.test(o.dic) || +(o.dic.match(/\/BitsPerComponent\s+(\d+)/)?.[1] ?? 8) !== 8) continue;
    const n = componentes(o.dic, objs);
    let px;
    try {
      px = despredizer(inflateSync(o.stream), w, n, o.dic);
    } catch {
      continue;
    }
    if (px.length < w * h * n) continue;
    const rgba = Buffer.alloc(w * h * 4, 255);
    for (let i = 0; i < w * h; i++) {
      if (n === 1) rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i];
      else if (n === 4) {
        const [c, m, y, k] = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2], px[i * 4 + 3]];
        rgba[i * 4] = 255 - Math.min(255, c + k);
        rgba[i * 4 + 1] = 255 - Math.min(255, m + k);
        rgba[i * 4 + 2] = 255 - Math.min(255, y + k);
      } else {
        rgba[i * 4] = px[i * 3];
        rgba[i * 4 + 1] = px[i * 3 + 1];
        rgba[i * 4 + 2] = px[i * 3 + 2];
      }
    }
    let transparencia = false;
    const sm = ref(o.dic, 'SMask');
    const mo = sm && objs.get(sm);
    if (mo?.stream) {
      try {
        const mw = +(mo.dic.match(/\/Width\s+(\d+)/)?.[1] ?? 0);
        const mh = +(mo.dic.match(/\/Height\s+(\d+)/)?.[1] ?? 0);
        const a = despredizer(inflateSync(mo.stream), mw, 1, mo.dic);
        if (mw === w && mh === h) {
          for (let i = 0; i < w * h; i++) {
            rgba[i * 4 + 3] = a[i];
            if (a[i] < 250) transparencia = true;
          }
        }
      } catch {
        /* sem máscara legível: fica opaca */
      }
    }
    lista.push({ indice, largura: w, altura: h, tipo: 'png', dados: png(w, h, rgba), transparencia, opaco: transparencia ? caixaOpaca(rgba, w, h) : null });
  }
  return lista;
}
