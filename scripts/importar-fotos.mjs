// Importa as fotos do artefato "Fotos dos Books" (claude.ai/artifact/2JYARKfUVGfzy2wprPjjJo)
// para public/fotos/<prédio>/ e escreve public/dados/fotos.json, que liga cada foto ao prédio do estoque.
// Uso: node scripts/importar-fotos.mjs <html do artefato salvo>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [arquivo] = process.argv.slice(2);
if (!arquivo) throw new Error('Informe o HTML salvo do artefato "Fotos dos Books".');
const html = readFileSync(arquivo, 'utf8');
const estoque = JSON.parse(readFileSync('public/dados/estoque.json', 'utf8'));

/** Seção do artefato → id do prédio no estoque (null = empreendimento que ainda não está em nenhuma tabela). */
const PREDIO = { fatima: 'fatima', max10: 'max-10', bella: 'bela-colina', porto: 'porto-marina', harmony: null };

const secoes = [...html.matchAll(/<section id="([^"]+)"><div class="shead"><h2>([^<]+)<\/h2>/g)].map((m) => ({
  id: m[1],
  nome: m[2],
  inicio: m.index,
}));
const fotos = [...html.matchAll(/data-label="([^"]*)" data-id="([^"]+)"><img[^>]*src="data:image\/(\w+);base64,([^"]+)"/g)];

const saida = {
  origem: 'Artefato "Fotos dos Books" (claude.ai/artifact/2JYARKfUVGfzy2wprPjjJo): fotos dos books das construtoras, sem plantas, logos e modelos; 640 px de largura.',
  predios: {},
};
for (const s of secoes) {
  const predioId = PREDIO[s.id];
  if (predioId === undefined) throw new Error(`Seção sem mapeamento: ${s.id}`);
  if (predioId && !estoque.predios.some((p) => p.id === predioId)) throw new Error(`Prédio ${predioId} não está no estoque`);
  const chave = predioId ?? s.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  const pasta = `public/fotos/${chave}`;
  mkdirSync(pasta, { recursive: true });
  const proxima = secoes.find((x) => x.inicio > s.inicio)?.inicio ?? Infinity;
  const lista = fotos.filter((f) => f.index > s.inicio && f.index < proxima);
  saida.predios[chave] = {
    nome: s.nome,
    noEstoque: !!predioId,
    fotos: lista.map(([, rotulo, id, tipo, b64]) => {
      const ext = tipo === 'jpeg' ? 'jpg' : tipo;
      writeFileSync(`${pasta}/${id}.${ext}`, Buffer.from(b64, 'base64'));
      // "Obra (foto real)" é foto de verdade; o resto é render do book ("Imagem ilustrativa")
      return { arquivo: `fotos/${chave}/${id}.${ext}`, rotulo, real: /foto real/i.test(rotulo) };
    }),
  };
  console.log(`${s.nome} → ${chave}: ${lista.length} fotos${predioId ? '' : ' (sem prédio no estoque)'}`);
}
writeFileSync('public/dados/fotos.json', JSON.stringify(saida, null, 1) + '\n');
