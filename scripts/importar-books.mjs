// Tira fotos em alta resolução dos books (PDF ou pasta de páginas) conforme dados/books.json,
// recorta, reduz para no máximo 1600 px e atualiza public/dados/fotos.json.
// Usa o `sips` do macOS. Uso: node scripts/importar-books.mjs [pasta dos books, padrão ~/Downloads]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const pasta = process.argv[2] ?? join(homedir(), 'Downloads');
const books = JSON.parse(readFileSync('dados/books.json', 'utf8'));
const manifesto = JSON.parse(readFileSync('public/dados/fotos.json', 'utf8'));
const estoque = JSON.parse(readFileSync('public/dados/estoque.json', 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'books-'));
const MAX = 1600;

/** JPEGs (DCTDecode) embutidos no PDF, na ordem em que aparecem. */
function jpegsDoPdf(arquivo) {
  const b = readFileSync(arquivo);
  const txt = b.toString('latin1');
  const re = /<<((?:[^<>]|<<[^<>]*>>)*?)>>\s*stream\r?\n/g;
  const lista = [];
  let m;
  while ((m = re.exec(txt))) {
    const dic = m[1];
    if (!/\/Subtype\s*\/Image/.test(dic) || !/\/DCTDecode/.test(dic) || /\/FlateDecode/.test(dic)) continue;
    const ini = m.index + m[0].length;
    lista.push(b.subarray(ini, txt.indexOf('endstream', ini)));
  }
  return lista;
}

const sips = (...args) => execFileSync('sips', args, { stdio: 'pipe' });

for (const [chave, book] of Object.entries(books.predios)) {
  const noEstoque = estoque.predios.some((p) => p.id === chave);
  const destino = `public/fotos/${chave}`;
  mkdirSync(destino, { recursive: true });
  const pdf = book.pdf ? jpegsDoPdf(join(pasta, book.pdf)) : null;
  const paginas = book.paginas ? readdirSync(join(pasta, book.paginas)) : null;

  const novas = book.fotos.map((f, i) => {
    let origem;
    if (pdf) {
      origem = join(tmp, `${chave}-${f.imagem}.jpg`);
      writeFileSync(origem, pdf[f.imagem - 1]);
    } else {
      const nome = paginas.find((p) => new RegExp(`_${f.pagina}\\.jpe?g$`, 'i').test(p));
      if (!nome) throw new Error(`${chave}: página ${f.pagina} não encontrada`);
      origem = join(pasta, book.paginas, nome);
    }
    const slug = f.rotulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const arquivo = `${destino}/hd_${String(i + 1).padStart(2, '0')}_${slug}.jpg`;
    const trabalho = join(tmp, `t-${chave}-${i}.jpg`);
    sips('-s', 'format', 'jpeg', origem, '--out', trabalho);
    if (f.corte) {
      const [x, y, w, h] = f.corte;
      sips('-c', String(h), String(w), '--cropOffset', String(y), String(x), trabalho);
    }
    // só reduz: ampliar não ganha nitidez e pesa mais
    const dims = sips('-g', 'pixelWidth', '-g', 'pixelHeight', trabalho).toString();
    const lado = Math.max(...[...dims.matchAll(/pixel(?:Width|Height): (\d+)/g)].map((x) => +x[1]));
    sips(...(lado > MAX ? ['-Z', String(MAX)] : []), '-s', 'formatOptions', '82', trabalho, '--out', arquivo);
    return { arquivo: arquivo.replace(/^public\//, ''), rotulo: f.rotulo, hd: true };
  });

  const atual = manifesto.predios[chave] ?? { nome: book.nome, noEstoque, fotos: [] };
  let fotos;
  if (book.substituir === 'tudo') {
    // as fotos de 640 px saem do manifesto e do disco
    for (const f of atual.fotos) if (!f.hd) rmSync(`public/${f.arquivo}`, { force: true });
    fotos = novas;
  } else {
    const trocar = new Set(book.fotos.map((f) => f.substitui).filter(Boolean));
    for (const f of atual.fotos) if (trocar.has(f.rotulo) && !f.hd) rmSync(`public/${f.arquivo}`, { force: true });
    const mantidas = atual.fotos.filter((f) => !trocar.has(f.rotulo) && !f.hd);
    fotos = [...novas, ...mantidas];
  }
  manifesto.predios[chave] = { nome: book.nome, noEstoque, fotos };
  console.log(`${book.nome} → ${chave}: ${novas.length} em alta resolução, ${fotos.length} no total${noEstoque ? '' : ' (sem prédio no estoque)'}`);
}
manifesto.origem +=
  manifesto.origem.includes('books.json') ? '' : ' Fotos "hd_" vêm dos books em PDF/páginas (dados/books.json, scripts/importar-books.mjs), até 1600 px.';
writeFileSync('public/dados/fotos.json', JSON.stringify(manifesto, null, 1) + '\n');
rmSync(tmp, { recursive: true, force: true });
