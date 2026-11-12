// Página local "Captação": anúncios de particulares da OLX, com contato e andamento da captação.
// O andamento (status e anotação de cada anúncio) fica no localStorage do navegador, porque a página abre como arquivo.

const CSS = String.raw`
:root {
  color-scheme: light;
  --amarelo: #f2b300; --preto: #1c1c1c; --gelo: #f2f2f0; --claro: #e2e2df; --cinza: #5c5c5c; --branco: #ffffff;
  --branco-65: rgba(255,255,255,.65); --branco-18: rgba(255,255,255,.18);
  --f: 'Hanken Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --r-tag: 6px; --r-caixa: 24px; --borda: 1.5px solid var(--claro); --gut: clamp(16px, 3vw, 32px);
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scrollbar-color: var(--cinza) var(--gelo); }
body { margin: 0; background: var(--gelo); color: var(--preto); font: 500 15px/1.4 var(--f); }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
::selection { background: var(--amarelo); color: var(--preto); }
:focus-visible { outline: 2px solid var(--preto); outline-offset: 2px; }
.topo :focus-visible { outline-color: var(--amarelo); }
a { color: inherit; text-underline-offset: 3px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.num { font-variant-numeric: tabular-nums; }
.mk { background: var(--amarelo); color: var(--preto); padding: 0 .2em; font-weight: 800; }

/* topo */
.topo { background: var(--preto); color: var(--branco); }
.topo-in { max-width: 1280px; margin: 0 auto; padding: 20px var(--gut) 18px; display: grid; gap: 14px; }
.marca h1 { margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: -.04em; line-height: .95; font-size: 30px; }
.marca h1 em { font-style: normal; color: var(--amarelo); }
.marca p { margin: 8px 0 0; font-size: 13.5px; color: var(--branco-65); max-width: 62ch; }
.marca p b { color: var(--branco); font-weight: 800; }
.busca { position: relative; display: block; }
.busca svg { position: absolute; left: 16px; top: 50%; width: 20px; height: 20px; transform: translateY(-50%); fill: none; stroke: var(--cinza); stroke-width: 2.4; stroke-linecap: round; }
.busca input { width: 100%; min-height: 52px; border: 0; border-radius: var(--r-tag); padding: 12px 16px 12px 46px; font-size: 17px; font-weight: 700; background: var(--branco); color: var(--preto); caret-color: var(--preto); }
.busca input::placeholder { color: var(--cinza); font-weight: 500; }
.seg { display: inline-flex; flex-wrap: wrap; background: var(--branco-18); border-radius: var(--r-tag); padding: 3px; gap: 2px; }
.seg button { border: 0; background: transparent; color: var(--branco); padding: 8px 14px; border-radius: 4px; font-weight: 800; font-size: 14px; min-height: 40px; }
.seg button span { font-weight: 700; font-size: 12px; opacity: .7; margin-left: 4px; font-variant-numeric: tabular-nums; }
.seg button[aria-checked='true'] { background: var(--branco); color: var(--preto); }
.seg button:hover:not([aria-checked='true']) { background: var(--branco-18); }
.rapidos { display: flex; flex-wrap: wrap; gap: 10px; }
@media (min-width: 860px) { .topo-in { grid-template-columns: minmax(0, 360px) minmax(0, 1fr); column-gap: 32px; align-items: end; } .rapidos { grid-column: 1 / -1; } }

/* filtros */
.pagina { max-width: 1280px; margin: 0 auto; padding: 18px var(--gut) 48px; }
.filtros { display: flex; flex-wrap: wrap; gap: 14px 22px; padding-bottom: 16px; border-bottom: var(--borda); }
.filtro { display: grid; gap: 6px; }
.rot { font-weight: 800; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--cinza); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: var(--borda); background: var(--branco); border-radius: var(--r-tag); padding: 7px 11px; font-weight: 800; font-size: 13.5px; min-height: 38px; }
.chip span { font-weight: 700; font-size: 11.5px; color: var(--cinza); margin-left: 3px; font-variant-numeric: tabular-nums; }
.chip[aria-pressed='true'] { background: var(--preto); color: var(--branco); border-color: var(--preto); }
.chip[aria-pressed='true'] span { color: var(--branco-65); }
.chip:hover:not([aria-pressed='true']) { border-color: var(--cinza); }
.campo, select.campo { border: var(--borda); background: var(--branco); border-radius: var(--r-tag); padding: 7px 10px; font-weight: 700; font-size: 14px; min-height: 38px; }
.faixa { display: flex; gap: 6px; align-items: center; }
.faixa .campo { width: 118px; }

/* resultado */
.frase { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 16px; margin: 18px 0 12px; }
.frase h2 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -.01em; }
.frase h2 .mk { font-weight: 900; }
.frase p { margin: 0; font-size: 13px; color: var(--cinza); }
.limpar { border: 0; background: none; padding: 0; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; font-size: 13px; }
.vazio { background: var(--branco); border: var(--borda); border-radius: var(--r-caixa); padding: 32px; text-align: center; color: var(--cinza); }
.vazio b { display: block; color: var(--preto); font-size: 17px; margin-bottom: 4px; }

/* anúncio */
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.anuncio { background: var(--branco); border: var(--borda); border-radius: 14px; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 14px; padding: 12px; }
.anuncio[data-status='captado'] { border-color: var(--preto); }
.anuncio[data-status='descartado'] { opacity: .55; }
.foto { width: 112px; height: 112px; border-radius: 10px; object-fit: cover; background: var(--claro); display: block; }
.sem-foto { width: 112px; height: 112px; border-radius: 10px; background: var(--claro); }
.corpo { display: grid; gap: 8px; min-width: 0; }
.linha1 { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; justify-content: space-between; }
.valor { font-size: 21px; font-weight: 900; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.valor s { font-size: 13px; font-weight: 700; color: var(--cinza); margin-left: 6px; }
.data { font-size: 12.5px; color: var(--cinza); }
.titulo { margin: 0; font-size: 15px; font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
.onde { margin: 0; font-size: 13.5px; color: var(--cinza); }
.onde b { color: var(--preto); font-weight: 800; }
.fatos { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.fatos li { background: var(--gelo); border-radius: var(--r-tag); padding: 3px 8px; font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
.contato { grid-column: 2; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; border-top: var(--borda); padding-top: 10px; }
.quem { font-weight: 800; font-size: 14px; }
.quem small { display: block; font-weight: 700; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--cinza); }
.fone { display: inline-flex; align-items: center; gap: 6px; font-weight: 900; font-size: 16px; text-decoration: none; font-variant-numeric: tabular-nums; border: 1.5px solid var(--preto); border-radius: var(--r-tag); padding: 6px 10px; min-height: 38px; }
.fone:hover { background: var(--preto); color: var(--branco); }
.fone svg, .bt svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.fone small { font-weight: 700; font-size: 11px; color: var(--cinza); }
.fone:hover small { color: var(--branco-65); }
.aviso { font-size: 13px; color: var(--cinza); font-weight: 700; }
.aviso.pend { background: var(--amarelo); color: var(--preto); border-radius: var(--r-tag); padding: 4px 8px; font-weight: 800; }
.bt { display: inline-flex; align-items: center; gap: 6px; border: var(--borda); background: var(--branco); border-radius: var(--r-tag); padding: 6px 10px; min-height: 38px; font-weight: 800; font-size: 13.5px; text-decoration: none; }
.bt:hover { border-color: var(--cinza); }
.acoes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-left: auto; }
.status { border: var(--borda); background: var(--branco); border-radius: var(--r-tag); padding: 6px 8px; min-height: 38px; font-weight: 800; font-size: 13.5px; }
.status.on { background: var(--preto); color: var(--branco); border-color: var(--preto); }
details.mais { grid-column: 1 / -1; border-top: var(--borda); padding-top: 8px; }
details.mais summary { cursor: pointer; font-weight: 800; font-size: 13.5px; list-style: none; display: inline-flex; gap: 6px; align-items: center; min-height: 32px; }
details.mais summary::-webkit-details-marker { display: none; }
details.mais summary::before { content: ''; width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(-45deg); transition: transform .15s; }
details.mais[open] summary::before { transform: rotate(45deg); }
.desc { white-space: pre-line; font-size: 14px; line-height: 1.5; max-width: 75ch; margin: 8px 0; }
.itens { font-size: 13px; color: var(--cinza); margin: 4px 0; }
.itens b { color: var(--preto); }
.galeria { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0; scrollbar-width: thin; }
.galeria img { height: 120px; border-radius: 8px; flex: none; background: var(--claro); }
.nota { width: 100%; max-width: 75ch; min-height: 64px; border: var(--borda); border-radius: var(--r-tag); padding: 8px 10px; font-size: 14px; background: var(--branco); resize: vertical; margin-top: 8px; display: block; }
.mais-itens { display: flex; justify-content: center; margin-top: 16px; }
.mais-itens .bt { min-height: 46px; padding: 10px 20px; }
.rodape { margin-top: 28px; font-size: 12.5px; color: var(--cinza); max-width: 75ch; }
@media (max-width: 560px) {
  .anuncio { grid-template-columns: 76px minmax(0, 1fr); gap: 10px; padding: 10px; }
  .foto, .sem-foto { width: 76px; height: 76px; }
  .contato { grid-column: 1 / -1; }
  .acoes { margin-left: 0; width: 100%; }
  .acoes .status { flex: 1; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

const JS = String.raw`
const { lidoEm, lidosTotal, anuncios } = DADOS;
const CHAVE = 'captacao-olx-v1';
let andamento = {};
try { andamento = JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch {}
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(andamento)); } catch {} };
const STATUS = [['novo', 'Não contatado'], ['liguei', 'Liguei, sem resposta'], ['conversando', 'Em conversa'], ['captado', 'Captado'], ['descartado', 'Descartado']];
const statusDe = (a) => andamento[a.id]?.status || 'novo';

const f = { q: '', cat: '', quartos: '', bairro: '', zap: '', status: '', mar: '', vmin: '', vmax: '' };
const POR_PAGINA = 60;
let mostrar = POR_PAGINA;

const brl = (n) => n == null ? 'Sem valor' : 'R$ ' + n.toLocaleString('pt-BR');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const foneFmt = (t) => t.length === 11 ? '(' + t.slice(0, 2) + ') ' + t.slice(2, 7) + '-' + t.slice(7) : '(' + t.slice(0, 2) + ') ' + t.slice(2, 6) + '-' + t.slice(6);
const dataFmt = (iso) => { if (!iso) return ''; const d = new Date(iso); const dias = Math.floor((Date.now() - d) / 864e5); return dias <= 0 ? 'Publicado hoje' : dias === 1 ? 'Publicado ontem' : dias < 30 ? 'Publicado há ' + dias + ' dias' : 'Publicado em ' + d.toLocaleDateString('pt-BR'); };
const celular = (a) => a.telefones.some((t) => t.length === 11);
const catDe = (a) => /apart/i.test(a.categoria) ? 'apto' : /casa/i.test(a.categoria) ? 'casa' : /terreno|lote/i.test(a.categoria + a.tipo) ? 'terreno' : 'outro';
const CATS = [['', 'Todos'], ['apto', 'Apartamentos'], ['casa', 'Casas'], ['terreno', 'Terrenos'], ['outro', 'Outros']];
const QUARTOS = [['', 'Qualquer'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4 ou mais']];
const MARS = [['', 'Todos'], ['1', 'Frente ao mar']];
/** Frente mar: o anúncio diz que o imóvel está de frente para o mar ou pé na areia.
 *  Não conta "vista mar", "a 300 m do mar" nem o "Carrefour frente mar" (nome de referência). */
const MAR_FORTE = /frente\s*(ao|para\s*o|pro|pra|do|a)?\s*mar|frente-?mar|em\s+frente\s+ao\s+mar/i;
const MAR_FRACO = /p[eé]\s*na\s*areia/i;
const MAR_VISTA = /vista\s+(definitiva\s+)?(mar|(pro|para\s+o)\s+mar)|vista\s+mar/i;
const MAR_LONGE = /\ba\s+\d+\s*(m|mt|mts|metros?)\b/i;
function frenteMar(a) {
  const t = (a.titulo + '\n' + a.descricao).replace(/carrefour\s+frente\s*mar/gi, '');
  if (MAR_LONGE.test(a.titulo)) return false;
  return MAR_FORTE.test(t) || (MAR_FRACO.test(t) && !MAR_VISTA.test(t));
}
const ZAPS = [['', 'Todos'], ['cel', 'Celular (WhatsApp)'], ['fixo', 'Só fixo']];
anuncios.forEach((a) => { a._cat = catDe(a); a._mar = frenteMar(a); a._busca = semAcento([a.titulo, a.descricao, a.bairro, a.rua, a.anunciante, a.tipo, a.cep, a.id].join(' ')); });

function passa(a, ignorar) {
  if (ignorar !== 'cat' && f.cat && a._cat !== f.cat) return false;
  if (ignorar !== 'quartos' && f.quartos && (f.quartos === '4' ? !(a.quartos >= 4) : a.quartos !== +f.quartos)) return false;
  if (ignorar !== 'bairro' && f.bairro && a.bairro !== f.bairro) return false;
  if (ignorar !== 'mar' && f.mar && !a._mar) return false;
  if (ignorar !== 'zap' && f.zap && (f.zap === 'cel') !== celular(a)) return false;
  if (ignorar !== 'status' && f.status && statusDe(a) !== f.status) return false;
  if (f.vmin && !(a.valor >= +f.vmin)) return false;
  if (f.vmax && !(a.valor <= +f.vmax)) return false;
  if (f.q) { const termos = semAcento(f.q).split(/\s+/).filter(Boolean); if (!termos.every((t) => a._busca.includes(t))) return false; }
  return true;
}
const conta = (campo, valor, fn) => anuncios.filter((a) => passa(a, campo) && fn(a, valor)).length;

const icFone = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
const icZap = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>';
const icLink = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>';

function telefones(a) {
  return a.telefones.map((t) =>
    '<a class="fone" href="tel:+55' + t + '">' + icFone + foneFmt(t) + '</a>' +
    (t.length === 11 ? '<a class="bt" href="https://wa.me/55' + t + '" target="_blank" rel="noopener">' + icZap + 'WhatsApp</a>' : '')
  ).join('');
}

function cartao(a) {
  const st = statusDe(a);
  const fatos = [
    a.tipo && a.tipo[0].toUpperCase() + a.tipo.slice(1),
    a.area && a.area + ' m²',
    a.quartos != null && a.quartos + (a.quartos === 1 ? ' quarto' : ' quartos'),
    a.banheiros != null && a.banheiros + (a.banheiros === 1 ? ' banheiro' : ' banheiros'),
    a.vagas != null && a.vagas + (a.vagas === 1 ? ' vaga' : ' vagas'),
    a.condominio && 'Cond. ' + brl(a.condominio),
    a.iptu && 'IPTU ' + brl(a.iptu),
    a.valor && a.area && 'R$ ' + Math.round(a.valor / a.area).toLocaleString('pt-BR') + '/m²',
  ].filter(Boolean);
  const nota = andamento[a.id]?.nota || '';
  return '<li class="anuncio" data-id="' + a.id + '" data-status="' + st + '">' +
    (a.fotos[0] ? '<img class="foto" loading="lazy" src="' + esc(a.fotos[0]) + '" alt="">' : '<div class="sem-foto"></div>') +
    '<div class="corpo">' +
      '<div class="linha1"><span class="valor">' + brl(a.valor) + (a.valorAntigo && a.valorAntigo > a.valor ? '<s>' + brl(a.valorAntigo) + '</s>' : '') + '</span><span class="data">' + dataFmt(a.publicado) + '</span></div>' +
      '<p class="titulo">' + esc(a.titulo) + '</p>' +
      '<p class="onde"><b>' + esc(a.bairro || 'Bairro não informado') + '</b>' + (a.rua ? ' · ' + esc(a.rua) : '') + (a.cep ? ' · CEP ' + a.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '') + '</p>' +
      '<ul class="fatos">' + fatos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    '</div>' +
      '<div class="contato">' +
        '<span class="quem"><small>Proprietário</small>' + esc(a.anunciante || 'Sem nome') + '</span>' +
        telefones(a) +
        '<span class="acoes">' +
          '<label class="sr" for="st' + a.id + '">Andamento</label>' +
          '<select class="status' + (st !== 'novo' ? ' on' : '') + '" id="st' + a.id + '" data-acao="status">' + STATUS.map(([v, t]) => '<option value="' + v + '"' + (v === st ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
          '<a class="bt" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + icLink + 'Ver na OLX</a>' +
        '</span>' +
      '</div>' +
    '<details class="mais"><summary>Descrição, fotos e anotação' + (nota ? ' · tem anotação' : '') + '</summary>' +
      '<p class="desc">' + esc(a.descricao) + '</p>' +
      (a.itensImovel.length ? '<p class="itens"><b>Imóvel:</b> ' + esc(a.itensImovel.join(', ')) + '</p>' : '') +
      (a.itensCondominio.length ? '<p class="itens"><b>Condomínio:</b> ' + esc(a.itensCondominio.join(', ')) + '</p>' : '') +
      '<p class="itens">Código OLX ' + a.id + '</p>' +
      '<div class="galeria" data-fotos="' + esc(JSON.stringify(a.fotos)) + '"></div>' +
      '<label class="sr" for="nt' + a.id + '">Anotação</label>' +
      '<textarea class="nota" id="nt' + a.id + '" data-acao="nota" placeholder="Anotação da captação (fica só neste computador)">' + esc(nota) + '</textarea>' +
    '</details>' +
  '</li>';
}

function chips(grupo, lista, contar) {
  return lista.map(([v, t]) => '<button type="button" class="chip" data-grupo="' + grupo + '" data-v="' + v + '" aria-pressed="' + (f[grupo] === v) + '">' + t + (v ? ' <span>' + contar(v) + '</span>' : '') + '</button>').join('');
}

const $ = (s) => document.querySelector(s);
function render() {
  const res = anuncios.filter((a) => passa(a));
  $('#cats').innerHTML = CATS.filter(([v]) => !v || anuncios.some((a) => a._cat === v)).map(([v, t]) => '<button type="button" role="radio" data-grupo="cat" data-v="' + v + '" aria-checked="' + (f.cat === v) + '">' + t + ' <span>' + conta('cat', v, (a, x) => !x || a._cat === x) + '</span></button>').join('');
  $('#quartos').innerHTML = chips('quartos', QUARTOS, (v) => conta('quartos', v, (a, x) => x === '4' ? a.quartos >= 4 : a.quartos === +x));
  $('#mar').innerHTML = chips('mar', MARS, (v) => conta('mar', v, (a) => a._mar));
  $('#fones').innerHTML = chips('zap', ZAPS, (v) => conta('zap', v, (a, x) => (x === 'cel') === celular(a)));
  $('#status').innerHTML = chips('status', [['', 'Todos'], ...STATUS], (v) => conta('status', v, (a, x) => statusDe(a) === x));
  const bairros = {}; anuncios.filter((a) => passa(a, 'bairro')).forEach((a) => { const b = a.bairro || 'Não informado'; bairros[b] = (bairros[b] || 0) + 1; });
  $('#bairro').innerHTML = '<option value="">Todos os bairros</option>' + Object.entries(bairros).sort((x, y) => x[0].localeCompare(y[0], 'pt-BR')).map(([b, n]) => '<option value="' + esc(b) + '"' + (f.bairro === b ? ' selected' : '') + '>' + esc(b) + ' (' + n + ')</option>').join('');
  const algum = Object.entries(f).some(([k, v]) => v);
  $('#frase').innerHTML = '<h2><span class="mk num">' + res.length.toLocaleString('pt-BR') + '</span> ' + (res.length === 1 ? 'proprietário' : 'proprietários') + ' com telefone</h2>' +
    (algum ? '<button type="button" class="limpar" data-acao="limpar">Limpar filtros</button>' : '');
  $('#lista').innerHTML = res.length ? res.slice(0, mostrar).map(cartao).join('') : '';
  $('#vazio').hidden = !!res.length;
  $('#mais').hidden = res.length <= mostrar;
  $('#mais button').textContent = 'Mostrar mais ' + Math.min(POR_PAGINA, res.length - mostrar) + ' de ' + (res.length - mostrar).toLocaleString('pt-BR') + ' restantes';
}

function mudar(parcial) { Object.assign(f, parcial); mostrar = POR_PAGINA; render(); }
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-grupo]');
  if (b) { const g = b.dataset.grupo; mudar({ [g]: f[g] === b.dataset.v && b.dataset.v ? '' : b.dataset.v }); return; }
  if (e.target.closest('[data-acao="limpar"]')) { Object.keys(f).forEach((k) => (f[k] = '')); $('#q').value = ''; $('#vmin').value = ''; $('#vmax').value = ''; mudar({}); return; }
  if (e.target.closest('#mais button')) { mostrar += POR_PAGINA; render(); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'bairro') return mudar({ bairro: el.value });
  if (el.dataset.acao === 'status') {
    const id = el.closest('.anuncio').dataset.id;
    andamento[id] = { ...andamento[id], status: el.value, quando: new Date().toISOString() }; salvar();
    el.classList.toggle('on', el.value !== 'novo'); el.closest('.anuncio').dataset.status = el.value;
    $('#status').innerHTML = chips('status', [['', 'Todos'], ...STATUS], (v) => conta('status', v, (a, x) => statusDe(a) === x));
  }
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'q') return mudar({ q: el.value });
  if (el.id === 'vmin' || el.id === 'vmax') return mudar({ [el.id]: el.value.replace(/\D/g, '') });
  if (el.dataset.acao === 'nota') { const id = el.closest('.anuncio').dataset.id; andamento[id] = { ...andamento[id], nota: el.value }; salvar(); }
});
document.addEventListener('toggle', (e) => {
  const g = e.target.querySelector?.('.galeria');
  if (e.target.open && g && !g.childElementCount) g.innerHTML = JSON.parse(g.dataset.fotos).map((u) => '<img loading="lazy" src="' + esc(u) + '" alt="">').join('');
}, true);
if (location.hash === '#frente-mar') f.mar = '1';
$('#lido').textContent = lidoEm;
$('#total').textContent = lidosTotal.toLocaleString('pt-BR');
render();
`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function paginaCaptacao({ lidoEm, lidosTotal, anuncios }) {
  const dados = JSON.stringify({ lidoEm, lidosTotal, anuncios }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Captação OLX</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@500;700;800;900&display=swap">
<style>${CSS}</style>
</head>
<body>
<header class="topo">
  <div class="topo-in">
    <div class="marca">
      <h1>Capta<em>ção</em></h1>
      <p><b>Proprietários anunciando na OLX</b> · Praia Grande · venda · lido em <span id="lido"></span>. Só neste computador: não vai para o painel nem para a internet.</p>
    </div>
    <label class="busca">
      <span class="sr">Buscar</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
      <input id="q" type="search" placeholder="Rua, bairro, nome, palavra (ex.: piscina, permuta)" autocomplete="off">
    </label>
    <div class="rapidos"><div class="seg" role="radiogroup" aria-label="Tipo de imóvel" id="cats"></div></div>
  </div>
</header>
<main class="pagina">
  <section class="filtros" aria-label="Refinar">
    <div class="filtro"><span class="rot">Localização</span><div class="chips" id="mar"></div></div>
    <div class="filtro"><span class="rot">Telefone</span><div class="chips" id="fones"></div></div>
    <div class="filtro"><span class="rot">Andamento</span><div class="chips" id="status"></div></div>
    <div class="filtro"><span class="rot">Quartos</span><div class="chips" id="quartos"></div></div>
    <div class="filtro"><label class="rot" for="bairro">Bairro</label><select class="campo" id="bairro"></select></div>
    <div class="filtro"><span class="rot">Valor (R$)</span><div class="faixa">
      <label class="sr" for="vmin">Valor mínimo</label><input class="campo num" id="vmin" inputmode="numeric" placeholder="De">
      <label class="sr" for="vmax">Valor máximo</label><input class="campo num" id="vmax" inputmode="numeric" placeholder="Até">
    </div></div>
  </section>
  <div class="frase" id="frase" aria-live="polite"></div>
  <ul class="lista" id="lista"></ul>
  <div class="vazio" id="vazio" hidden><b>Nenhum anúncio com esses filtros</b>Tire um filtro ou limpe a busca.</div>
  <div class="mais-itens" id="mais"><button type="button" class="bt"></button></div>
  <p class="rodape">Fonte: anúncios de particulares da OLX (olx.com.br), Praia Grande, venda. Dos <span id="total"></span> anúncios de particulares lidos, entram só os que trazem o telefone do proprietário escrito no anúncio; os outros só atendem pelo chat da OLX. O nome é o que a OLX mostra do anunciante (às vezes só o primeiro nome ou um apelido). Confira o número na descrição antes de ligar. O andamento e as anotações ficam salvos neste navegador.</p>
</main>
<script>const DADOS = ${dados};</script>
<script>${JS}</script>
</body>
</html>
`;
}
