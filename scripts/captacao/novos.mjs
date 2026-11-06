// Lista os ids da última leitura da OLX (captacao/bruto/ativos.json) que ainda não têm ficha em captacao/bruto/olx-*.json.
// A saída (uma lista JSON) é o que vai para __rodar(...) no navegador.
// Uso: node scripts/captacao/novos.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BRUTO = join('captacao', 'bruto');
const ativos = JSON.parse(readFileSync(join(BRUTO, 'ativos.json'), 'utf8'));
const lidos = new Set();
for (const arq of readdirSync(BRUTO).filter((a) => /^olx-.*\.json$/.test(a))) {
  const j = JSON.parse(readFileSync(join(BRUTO, arq), 'utf8'));
  for (const f of Array.isArray(j) ? j : Object.values(j)) if (f?.id) lidos.add(+f.id);
}
const novos = ativos.ids.filter((id) => !lidos.has(+id));
console.error(`${ativos.ids.length} anúncios de particulares na OLX hoje · ${novos.length} ainda sem ficha`);
console.log(JSON.stringify(novos));
