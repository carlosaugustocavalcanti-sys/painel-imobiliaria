// Tira fotos em alta resolução dos books (PDF ou pasta de páginas) conforme dados/books.json,
// recorta (logos, legendas, molduras, bordas transparentes), reduz para no máximo 1600 px
// e atualiza public/dados/fotos.json. Usa o `sips` do macOS.
// Uso: node scripts/importar-books.mjs [pasta padrão dos books, padrão ~/Downloads] [prédios, ex.: porto-marina]
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { imagensDoPdf } from './pdf-imagens.mjs';

const books = JSON.parse(readFileSync('dados/books.json', 'utf8'));
const args = process.argv.slice(2);
// argumento com nome de prédio do books.json importa só ele; os outros ficam como estão
const so = args.filter((a) => a in books.predios);
const pastaPadrao = args.find((a) => !(a in books.predios)) ?? join(homedir(), 'Downloads');
const caminho = (pasta, arquivo) => join((pasta ?? pastaPadrao).replace(/^~(?=\/|$)/, homedir()), arquivo);
const manifesto = JSON.parse(readFileSync('public/dados/fotos.json', 'utf8'));
const estoque = JSON.parse(readFileSync('public/dados/estoque.json', 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'books-'));
const MAX = 1600;
const sips = (...args) => execFileSync('sips', args, { stdio: 'pipe' });
const dimensoes = (arq) => {
  const t = sips('-g', 'pixelWidth', '-g', 'pixelHeight', arq).toString();
  return [+t.match(/pixelWidth: (\d+)/)[1], +t.match(/pixelHeight: (\d+)/)[1]];
};
const ladoMaior = (arq) =>
  Math.max(...[...sips('-g', 'pixelWidth', '-g', 'pixelHeight', arq).toString().matchAll(/pixel(?:Width|Height): (\d+)/g)].map((x) => +x[1]));

for (const [chave, book] of Object.entries(books.predios)) {
  if (so.length && !so.includes(chave)) continue;
  const noEstoque = estoque.predios.some((p) => p.id === chave);
  const destino = `public/fotos/${chave}`;
  mkdirSync(destino, { recursive: true });
  const pdfs = new Map(); // arquivo → imagens (o mesmo book pode servir várias fotos)
  const imagensDe = (pasta, arquivo) => {
    const k = caminho(pasta, arquivo);
    if (!pdfs.has(k)) pdfs.set(k, imagensDoPdf(readFileSync(k), 600));
    return pdfs.get(k);
  };
  const paginas = book.paginas ? readdirSync(caminho(book.pasta, book.paginas)) : null;

  const novas = book.fotos.map((f, i) => {
    let origem;
    let corte = f.corte;
    const pdf = f.arquivo ? undefined : (f.pdf ?? book.pdf);
    if (f.arquivo) {
      // imagem solta (JPEG/PNG) dentro da pasta do book
      origem = caminho(f.pasta ?? book.pasta, f.arquivo);
    } else if (pdf) {
      const img = imagensDe(f.pasta ?? book.pasta, pdf).find((x) => x.indice === f.imagem);
      if (!img) throw new Error(`${chave}: imagem ${f.imagem} não encontrada em ${pdf}`);
      origem = join(tmp, `${chave}-${f.imagem}.${img.tipo}`);
      writeFileSync(origem, img.dados);
      // bordas esfumaçadas/transparentes do book: fica só a parte opaca (o corte manual vem dentro dela)
      if (img.opaco && !f.manterTransparencia) {
        const [ox, oy, ow, oh] = img.opaco;
        corte = corte ? [ox + corte[0], oy + corte[1], Math.min(corte[2], ow - corte[0]), Math.min(corte[3], oh - corte[1])] : img.opaco;
      }
    } else {
      const nome = paginas.find((p) => new RegExp(`_${f.pagina}\\.jpe?g$`, 'i').test(p));
      if (!nome) throw new Error(`${chave}: página ${f.pagina} não encontrada`);
      origem = join(caminho(book.pasta, book.paginas), nome);
    }
    const slug = f.rotulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const arquivo = `${destino}/hd_${String(i + 1).padStart(2, '0')}_${slug}.jpg`;
    const trabalho = join(tmp, `t-${chave}-${i}.png`);
    sips('-s', 'format', 'png', origem, '--out', trabalho);
    if (corte) {
      let [x, y, w, h] = corte.map(Math.round);
      const [W, H] = dimensoes(trabalho);
      if (x === 0 && y === 0) {
        // O sips trata "--cropOffset 0 0" como "sem offset" e centraliza o recorte. Com folga de 1 px no eixo que sobrar, o recorte sai do canto.
        if (w >= W && h >= H) w = h = 0;
        else if (W - w >= 1) x = 1;
        else y = 1;
      }
      // o sips também ignora o recorte quando ele encosta exatamente na borda: 1 px de folga
      if (x + w >= W) w = W - x - 1;
      if (y + h >= H) h = H - y - 1;
      if (w && h) sips('-c', String(h), String(w), '--cropOffset', String(y), String(x), trabalho);
    }
    // só reduz: ampliar não ganha nitidez e pesa mais
    const reduzir = ladoMaior(trabalho) > MAX ? ['-Z', String(MAX)] : [];
    sips(...reduzir, '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', trabalho, '--out', arquivo);
    return { arquivo: arquivo.replace(/^public\//, ''), rotulo: f.rotulo, hd: true, ...(f.real ? { real: true } : {}) };
  });

  const atual = manifesto.predios[chave] ?? { nome: book.nome, noEstoque, fotos: [] };
  const hdAntigas = atual.fotos.filter((f) => f.hd && !novas.some((n) => n.arquivo === f.arquivo));
  for (const f of hdAntigas) rmSync(`public/${f.arquivo}`, { force: true });
  let fotos;
  if (book.substituir === 'tudo') {
    // as fotos de 640 px saem do manifesto e do disco
    for (const f of atual.fotos) if (!f.hd) rmSync(`public/${f.arquivo}`, { force: true });
    fotos = novas;
  } else {
    const trocar = new Set(book.fotos.map((f) => f.substitui).filter(Boolean));
    for (const f of atual.fotos) if (trocar.has(f.rotulo) && !f.hd) rmSync(`public/${f.arquivo}`, { force: true });
    fotos = [...novas, ...atual.fotos.filter((f) => !trocar.has(f.rotulo) && !f.hd)];
  }
  manifesto.predios[chave] = { nome: book.nome, noEstoque, fotos };
  console.log(`${book.nome} → ${chave}: ${novas.length} em alta resolução, ${fotos.length} no total${noEstoque ? '' : ' (sem prédio no estoque)'}`);
}
manifesto.origem = manifesto.origem.replace(/ Fotos "hd_".*$/, '') + ' Fotos "hd_" vêm dos books (dados/books.json, scripts/importar-books.mjs), até 1600 px.';
writeFileSync('public/dados/fotos.json', JSON.stringify(manifesto, null, 1) + '\n');
rmSync(tmp, { recursive: true, force: true });
