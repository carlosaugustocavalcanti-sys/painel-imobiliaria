// Tira as fichas do arquivo de resultado do navegador do app (texto 'INICIO{...}FIM') e grava em captacao/bruto/.
// Uso: node scripts/captacao/extrair-resultado.mjs <arquivo-de-resultado> [nome]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const [arq, nome = 'olx-praia-grande'] = process.argv.slice(2);
let txt = readFileSync(arq, 'utf8');
try { const j = JSON.parse(txt); if (Array.isArray(j)) txt = j.map((x) => x.text ?? '').join(''); } catch {}
const i = txt.indexOf('INICIO'), f = txt.lastIndexOf('FIM');
if (i < 0 || f < 0) throw new Error('marcadores INICIO/FIM não encontrados');
let corpo = txt.slice(i + 6, f);
let dados;
try { dados = JSON.parse(corpo); } catch { dados = JSON.parse(JSON.parse('"' + corpo + '"')); }
mkdirSync('captacao/bruto', { recursive: true });
writeFileSync(`captacao/bruto/${nome}.json`, JSON.stringify(dados));
console.log(Object.keys(dados).length, 'fichas →', `captacao/bruto/${nome}.json`);
