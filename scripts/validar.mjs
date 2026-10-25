// Confere public/dados/estoque.json contra os dados originais dos três painéis e da pasta Lançamentos (dados/origem/*.json).
// Falha (exit 1) se algum registro de origem sumiu, foi duplicado, teve valor alterado ou tem um campo sem destino.
// Uso: node scripts/validar.mjs
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const ler = (p) => JSON.parse(readFileSync(p, 'utf8'));
const USADOS = ler('dados/origem/usados.json');
const LANC = ler('dados/origem/lancamentos.json');
const VISTA = ler('dados/origem/vista-mar.json');
const PASTA = ler('dados/origem/pasta-lancamentos.json');
const ESTOQUE = ler('public/dados/estoque.json');

const erros = [];
const erro = (msg) => erros.length < 200 && erros.push(msg);
const vazio = (v) => v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0);
/** Remove vazios aninhados, como o unificador faz ao compactar o arquivo (null e ausente são o mesmo). */
const limpo = (v) =>
  Array.isArray(v)
    ? v.map(limpo)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).filter(([, x]) => !vazio(x)).map(([k, x]) => [k, limpo(x)]))
      : v;
const igual = (a, b) =>
  (vazio(a) && vazio(b)) || isDeepStrictEqual(limpo(a), limpo(b)) || (typeof a === 'number' && +b === a);

/* ---------- índice dos registros unificados ---------- */
const porRef = new Map();
const predioPorOrigem = new Map();
for (const p of ESTOQUE.predios) {
  for (const [o, id] of Object.entries(p.origemIds)) {
    const k = `${o}:${id}`;
    if (predioPorOrigem.has(k)) erro(`Prédio de origem ${k} aparece em mais de um prédio unificado`);
    predioPorOrigem.set(k, p);
  }
  for (const u of p.unidades ?? []) {
    for (const r of [u, ...(u.outras ?? [])]) {
      if (porRef.has(r.ref)) erro(`Registro ${r.ref} duplicado`);
      porRef.set(r.ref, { r, predio: p, principal: u });
    }
  }
}

/** Compara cada campo do registro bruto com o campo correspondente no unificado. */
function conferir(ref, bruto, unificado, mapa) {
  for (const k of Object.keys(bruto)) {
    if (!(k in mapa)) {
      erro(`${ref}: campo de origem "${k}" sem destino no estoque unificado`);
      continue;
    }
    const destino = mapa[k];
    if (destino === null) continue; // campo usado só para ligar registros (ex.: id do grupo)
    const [campo, conv] = Array.isArray(destino) ? destino : [destino, (v) => v];
    if (!igual(conv(bruto[k]), unificado[campo])) {
      erro(`${ref}: ${k}=${JSON.stringify(bruto[k])} virou ${campo}=${JSON.stringify(unificado[campo])}`);
    }
  }
}

/* ---------- unidades ---------- */
const refsOrigem = [];
const M_USADOS = {
  unidade: ['unidade', String], tipologia: 'tipologia', det: 'det', area: 'area', valor: 'valor', vfin: 'vfin',
  cond: 'cond', iptu: 'iptu', vg: 'vagas', fonte: 'fonte', status: 'status', obs: 'obs', conf: 'conf', acesso: 'acesso',
};
for (const [id, t] of Object.entries(USADOS.units)) {
  t.itens.forEach((x, i) => {
    const ref = `usados:${id}:${i}`;
    refsOrigem.push(ref);
    const achado = porRef.get(ref);
    if (!achado) return erro(`${ref} sumiu`);
    conferir(ref, { status: 'disponivel', ...x }, achado.r, M_USADOS);
    if (!igual(achado.r.tabela, t.atualizadoEm)) erro(`${ref}: data da tabela`);
  });
}

const STATUS_VISTA = { d: 'disponivel', v: 'vendido', r: 'reservado', s: 'suspenso' };
const FASE_VISTA = { Pronto: 'pronto', 'Recém-entregue': 'pronto', 'Em obra': 'obra', 'Em obras': 'obra', Lançamento: 'lancamento' };
const M_VISTA = {
  g: null, ap: ['unidade', String], tipo: null, dorm: 'dorm', su: 'suites', area: 'area', vg: 'vagas', valor: 'valor',
  vp: 'vp', cond: 'cond', iptu: 'iptu', vista: 'vista', st: ['status', (v) => STATUS_VISTA[v]], fase: ['fase', (v) => FASE_VISTA[v]],
  ent: 'entregaUnidade', ct: 'contato', obs: 'obs', conf: 'conf', fonte: 'fonte', tab: 'tabela',
  el: ['acesso', (v) => (v === 'e' ? 'elevador' : v === 'x' ? 'escada' : '')],
};
VISTA.U.forEach((x, i) => {
  const ref = `vista-mar:${x.g}:${i}`;
  refsOrigem.push(ref);
  const achado = porRef.get(ref);
  if (!achado) return erro(`${ref} sumiu`);
  conferir(ref, x, achado.r, M_VISTA);
  // tipo (rótulo de kitnet) entra na tipologia, como o painel exibia
  if ((x.dorm == null || x.dorm === 0) && x.tipo && achado.r.tipologia !== x.tipo) erro(`${ref}: tipo ${x.tipo}`);
  if (achado.r.vistaMar !== true) erro(`${ref}: unidade do painel Vista Mar sem vistaMar`);
});

const M_LANC = {
  unidade: ['unidade', String], andar: 'andar', final: 'final', tipologia: 'tipologia', area: 'area', valor: 'valor',
  valorDireto: 'valorDireto', entrada: 'entrada', chaves: 'chaves', financ: 'financ', parcela: 'parcela', renda: 'renda',
  laudo: 'laudo', promo: 'promo', status: 'status', obs: 'obs', fluxo: 'fluxo',
};
for (const [id, t] of Object.entries(LANC.units)) {
  t.itens.forEach((x, i) => {
    const ref = `lancamentos:${id}:${i}`;
    refsOrigem.push(ref);
    const achado = porRef.get(ref);
    if (!achado) return erro(`${ref} sumiu`);
    conferir(ref, { status: 'disponivel', ...x }, achado.r, M_LANC);
    if (!igual(achado.r.fonte, t.fonte)) erro(`${ref}: fonte`);
    // o painel aplicava o fluxo do Fátima por código, por cima do que viesse na tabela
    const a = id === 'fatima' ? LANC.fluxoFatima[x.unidade] : null;
    const fluxo = a ? { entrada: a[0], chaves: a[1], anualQtd: a[2], anualVal: a[3], parcQtd: a[4], parcVal: a[5] } : x.fluxo;
    if (!igual(fluxo, achado.r.fluxo)) erro(`${ref}: fluxo de pagamento`);
  });
}


/* ---------- prédios e tabelas ---------- */
const temTabela = (p, origem, t) =>
  (p.tabelas ?? []).some((x) => x.origem === origem && igual(x.fonte, t.fonte) && igual(x.contato, t.contato) && igual(x.atualizadoEm, t.atualizadoEm));
for (const e of USADOS.emps) {
  const p = predioPorOrigem.get(`usados:${e.id}`);
  if (!p) { erro(`Prédio usados:${e.id} sumiu`); continue; }
  const t = USADOS.units[e.id];
  if (!(p.bairroTextos ?? []).includes(e.bairro)) erro(`usados:${e.id}: bairro ${e.bairro}`);
  if (t && !temTabela(p, 'usados', t)) erro(`usados:${e.id}: tabela de origem`);
  for (const f of e.fontes ?? []) if (!(p.fontes ?? []).includes(f)) erro(`usados:${e.id}: fonte ${f}`);
  if (t?.endereco && !(p.endereco)) erro(`usados:${e.id}: endereço`);
}
for (const e of LANC.emps) {
  const p = predioPorOrigem.get(`lancamentos:${e.id}`);
  if (!p) { erro(`Prédio lancamentos:${e.id} sumiu`); continue; }
  const t = LANC.units[e.id];
  const L = p.lanc ?? {};
  const pares = [
    ['padrao', e.padrao], ['gravacao', e.status], ['ordem', e.ordem], ['site', e.site], ['diferenciais', e.diferenciais],
    ['pendencias', e.pendencias], ['notas', e.notas], ['confirmar', e.confirmar], ['notaValor', t?.notaValor],
    ['book', t?.book], ['modalidade', t?.modalidade ?? 'bancario'],
    ['fluxoInfo', e.id === 'fatima' ? LANC.fluxoInfoFatima : t?.fluxoInfo],
  ];
  for (const [k, v] of pares) if (!igual(v, L[k])) erro(`lancamentos:${e.id}: ${k}`);
  if (t && !temTabela(p, 'lancamentos', t)) erro(`lancamentos:${e.id}: tabela de origem`);
  if (!igual(e.entrega, p.entrega) && p.origens[0] === 'lancamentos') erro(`lancamentos:${e.id}: entrega`);
}
for (const g of VISTA.G) {
  const p = predioPorOrigem.get(`vista-mar:${g.id}`);
  if (!p) { erro(`Prédio vista-mar:${g.id} sumiu`); continue; }
  if (p.cidade !== g.cidade) erro(`vista-mar:${g.id}: cidade`);
  if (!(p.bairroTextos ?? []).includes(g.bairro)) erro(`vista-mar:${g.id}: bairro`);
}

/* ---------- pasta Lançamentos (OneDrive) ---------- */
for (const b of PASTA.predios) {
  const p = predioPorOrigem.get(`lesan:${b.id}`);
  if (!p) {
    erro(`Prédio lesan:${b.id} sumiu`);
    continue;
  }
  b.unidades.forEach((x, i) => {
    const ref = `lesan:${b.id}:${i}`;
    refsOrigem.push(ref);
    const achado = porRef.get(ref);
    if (!achado) return erro(`${ref} sumiu`);
    // os campos da pasta têm o mesmo nome no estoque unificado
    conferir(ref, { status: 'disponivel', ...x }, achado.r, Object.fromEntries(Object.keys({ status: 0, ...x }).map((k) => [k, k])));
    if (!achado.r.mercado || !achado.r.fase) erro(`${ref}: sem segmento/fase`);
  });
  for (const t of b.tabelas) {
    if (!(p.tabelas ?? []).some((x) => x.origem === 'lesan' && igual(x.fonte, t.fonte) && igual(x.contato, t.contato) && igual(x.atualizadoEm, t.atualizadoEm))) erro(`lesan:${b.id}: tabela ${t.fonte}`);
  }
  for (const n of b.notas ?? []) if (!(p.notas ?? []).includes(n)) erro(`lesan:${b.id}: nota perdida "${n.slice(0, 40)}"`);
  for (const l of b.lazer ?? []) if (!(p.lazer ?? []).includes(l) && !p.lanc?.book?.lazer) erro(`lesan:${b.id}: lazer ${l}`);
}

// todo registro de origem tem exatamente um destino (e nenhum registro do estoque vem de lugar nenhum)
const totalUnificado = porRef.size;
if (totalUnificado !== refsOrigem.length) erro(`Registros: origem ${refsOrigem.length}, unificado ${totalUnificado}`);

/* ---------- os painéis antigos continuam reproduzíveis ---------- */
// Para cada painel: unidades disponíveis, soma e menor valor calculados direto dos dados brutos
// devem bater com os registros do estoque unificado daquela origem.
function resumoBruto(registros) {
  const d = registros.filter((x) => x.disp);
  const vals = d.map((x) => +x.valor).filter((v) => v > 0);
  const soma = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100; // centavos: a ordem da soma muda o último dígito
  return { total: registros.length, disponiveis: d.length, soma, menor: vals.length ? Math.min(...vals) : null };
}
const brutos = {
  usados: Object.values(USADOS.units).flatMap((t) => t.itens.map((x) => ({ disp: (x.status || 'disponivel') === 'disponivel', valor: x.valor }))),
  lancamentos: Object.values(LANC.units).flatMap((t) => t.itens.map((x) => ({ disp: (x.status || 'disponivel') === 'disponivel', valor: x.valor }))),
  'vista-mar': VISTA.U.map((x) => ({ disp: x.st === 'd', valor: x.valor })),
  lesan: PASTA.predios.flatMap((b) => b.unidades.map((x) => ({ disp: (x.status || 'disponivel') === 'disponivel', valor: x.valor }))),
};
for (const [origem, regs] of Object.entries(brutos)) {
  const unif = [...porRef.values()].filter(({ r }) => r.origem === origem).map(({ r }) => ({ disp: r.status === 'disponivel', valor: r.valor }));
  const a = resumoBruto(regs), b = resumoBruto(unif);
  if (!isDeepStrictEqual(a, b)) erro(`Painel ${origem}: origem ${JSON.stringify(a)} ≠ unificado ${JSON.stringify(b)}`);
  else console.log(`✓ ${origem}: ${a.total} unidades, ${a.disponiveis} disponíveis, menor valor ${a.menor}, soma ${a.soma}`);
}

/* ---------- divergências sempre visíveis ---------- */
for (const { r, principal } of porRef.values()) {
  if (r !== principal) continue;
  for (const o of principal.outras ?? []) {
    for (const c of ['valor', 'status']) {
      if (!vazio(principal[c]) && !vazio(o[c]) && principal[c] !== o[c] && !(principal.divergencias ?? []).includes(c)) {
        erro(`${principal.ref}: ${c} diferente de ${o.ref} sem aviso de divergência`);
      }
    }
    if (o.status === 'reservado' && principal.status !== 'reservado') erro(`${principal.ref}: registro reservado não ficou como principal`);
  }
}

if (erros.length) {
  console.error(`\n✗ ${erros.length} problema(s):`);
  for (const e of erros) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ ${refsOrigem.length} registros de origem conferidos campo a campo em ${ESTOQUE.predios.length} prédios.`);
