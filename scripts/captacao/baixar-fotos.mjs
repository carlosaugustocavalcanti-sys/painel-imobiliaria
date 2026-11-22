// Baixa as fotos dos anúncios da página de captação para captacao/fotos/ (pasta fora do git).
// Uma pasta por anúncio: "<bairro> - <categoria> - <código OLX>/01.jpg, 02.jpg...".
// Entradas: captacao/olx-praia-grande.json (anúncios da página) e, opcional, um JSON { id: [urls] } com a galeria
// completa de cada anúncio (lida pelo navegador); sem ele, usa as fotos que a ficha já guarda.
// Fotos sempre na resolução original (img.olx.com.br/images/...). Pula o que já foi baixado.
// Uso: node scripts/captacao/baixar-fotos.mjs [galerias.json]
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = join('captacao', 'fotos');
const { anuncios } = JSON.parse(readFileSync(join('captacao', 'olx-praia-grande.json'), 'utf8'));
const galerias = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : {};

const original = (u) => String(u).replace(/img\.olx\.com\.br\/(?:thumbs\d+x\d+|thumbs)\//, 'img.olx.com.br/images/');
const limpo = (s) => String(s || 'Sem bairro').replace(/[\\/:*?"<>|]/g, '-').trim();
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

let baixadas = 0, puladas = 0, falhas = 0;
for (const a of anuncios) {
  const urls = (galerias[a.id]?.length ? galerias[a.id] : a.fotos).map(original);
  const dir = join(PASTA, `${limpo(a.bairro)} - ${limpo(a.categoria)} - ${a.id}`);
  mkdirSync(dir, { recursive: true });
  for (const [i, u] of urls.entries()) {
    const arq = join(dir, String(i + 1).padStart(2, '0') + '.jpg');
    if (existsSync(arq)) { puladas++; continue; }
    try {
      const r = await fetch(u);
      if (!r.ok || !String(r.headers.get('content-type')).startsWith('image/')) throw new Error(r.status);
      writeFileSync(arq, Buffer.from(await r.arrayBuffer()));
      baixadas++;
    } catch (e) {
      falhas++;
      console.warn(`falhou ${a.id} foto ${i + 1}: ${e.message}`);
    }
    await espera(150);
  }
}
const pastas = readdirSync(PASTA).length;
console.log(`${baixadas} fotos baixadas, ${puladas} já existiam, ${falhas} falhas · ${pastas} pastas em ${PASTA}`);
