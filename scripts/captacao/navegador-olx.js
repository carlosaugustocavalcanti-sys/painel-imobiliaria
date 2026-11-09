// Leitor da OLX que roda DENTRO do navegador do app (javascript_tool), numa aba já aberta na OLX.
// A OLX barra curl (Cloudflare), então a leitura é feita pela própria página, com pausa entre os pedidos.
// Não tem dado pessoal aqui: os dados lidos saem pelo resultado do javascript_tool e vão para captacao/ (fora do git).
//
// Passo 1, na aba da lista (www.olx.com.br/imoveis/venda/estado-sp/baixada-santista-e-litoral-sul/praia-grande?f=p):
//   cole este arquivo, rode __listar() e espere __llog terminar em 'fim'.
//   'INICIO'+JSON.stringify(__ativos())+'FIM'  → node scripts/captacao/extrair-resultado.mjs <arquivo> ativos
// Passo 2, numa aba de anúncio (sp.olx.com.br/...):
//   cole este arquivo, rode __rodar([ids novos]) e espere __flog terminar em 'fim' (ou 'parou').
//   'INICIO'+JSON.stringify(__novas)+'FIM'     → node scripts/captacao/extrair-resultado.mjs <arquivo> olx-praia-grande-AAAA-MM-DD

/* ---------- passo 1: ids dos anúncios de particulares na lista ---------- */
window.__anunciosDaLista = (html) => {
  const ads = [];
  const re = /\\"subject\\":\\"((?:[^\\]|\\\\[^"])*?)\\",\\"priceValue\\"[\s\S]*?\\"professionalAd\\":(true|false),\\"listId\\":(\d+)/g;
  let m;
  while ((m = re.exec(html))) ads.push({ id: +m[3], prof: m[2] === 'true' });
  return ads;
};
window.__lista = new Map();
window.__llog = [];
window.__listar = async (pausa = 3000, maxPaginas = 60) => {
  __lista.clear();
  __llog.length = 0;
  for (let o = 1; o <= maxPaginas; o++) {
    if (o > 1) await new Promise((ok) => setTimeout(ok, pausa));
    const r = await fetch(location.pathname + '?f=p&o=' + o).catch(() => ({ status: 'erro' }));
    const t = r.text ? await r.text() : '';
    const a = __anunciosDaLista(t);
    __llog.push([o, r.status, a.length]);
    if (r.status !== 200) { __llog.push('parou'); return; }
    if (!a.length) { __llog.push('fim'); return; }
    for (const x of a) if (!x.prof) __lista.set(x.id, x);
    // Depois da última página do filtro a OLX não devolve lista vazia: completa com anúncios de outras cidades.
    // O fim certo é o total que a própria página informa.
    const total = +(t.match(/\\"totalOfAds\\":(\d+)/)?.[1] ?? 0);
    if (total && o * 50 >= total) { __llog.push('fim'); return; }
  }
  __llog.push('parou'); // bateu no limite de páginas sem achar o fim: lista incompleta
};
window.__ativos = () => ({ lidoEm: new Date().toISOString().slice(0, 10), completo: __llog.at(-1) === 'fim', ids: [...__lista.keys()] });

/* ---------- passo 2: ficha de cada anúncio (initial-data) ---------- */
window.__extrair = (ad) => {
  const p = {};
  for (const x of ad.properties || []) p[x.name] = x.values?.length ? x.values.map((v) => v.label ?? v) : x.value;
  const num = (s) => { const n = String(s ?? '').replace(/[^\d,]/g, '').replace(',', '.'); return n ? +n : null; };
  const lista = (v) => (Array.isArray(v) ? v : v ? String(v).split(/,\s*/) : []);
  const L = ad.location || {};
  return {
    id: ad.listId, url: ad.friendlyUrl, titulo: ad.subject, descricao: ad.body,
    valor: num(ad.priceValue), valorAntigo: num(ad.oldPrice),
    categoria: p.category ?? '', tipo: (p.real_estate_type ?? '').replace(/^Venda - /, ''),
    condominio: num(p.condominio), iptu: num(p.iptu), area: num(p.size), quartos: num(p.rooms),
    banheiros: num(p.bathrooms), vagas: num(p.garage_spaces),
    itensImovel: lista(p.re_features), itensCondominio: lista(p.re_complex_features),
    rua: L.address ?? '', bairro: L.neighbourhood ?? '', cep: L.zipcode ?? '', cidade: L.municipality ?? '',
    lat: L.mapLati ?? null, lng: L.mapLong ?? null,
    anunciante: ad.user?.name ?? '', contaId: ad.user?.publicAccountId ?? '',
    temTelefone: !!ad.phone?.phoneExist, whatsapp: !!ad.user?.whatsapp?.enabled, chat: !!ad.chatEnabled,
    profissional: !!ad.professionalAd,
    fotos: (ad.images || []).slice(0, 6).map((i) => i.originalMobile || i.original),
    publicado: ad.origListTime ? new Date(ad.origListTime * 1000).toISOString() : null, atualizado: ad.listTime ?? null,
  };
};
window.__novas = window.__novas || (() => { try { return JSON.parse(localStorage.getItem('__novas') || '{}'); } catch { return {}; } })();
window.__flog = [];
window.__rodar = async (ids, pausa = 2500) => {
  __flog.length = 0;
  for (const id of ids) {
    if (__novas[id]) continue;
    const r = await fetch('/baixada-santista-e-litoral-sul/imoveis/a-' + id).catch(() => ({ status: 'erro' }));
    if (r.status === 404 || r.status === 410) { __novas[id] = { id, removido: true }; continue; }
    const t = r.text ? await r.text() : '';
    const el = new DOMParser().parseFromString(t, 'text/html').getElementById('initial-data');
    if (r.status !== 200 || !el) { __flog.push(['parou', id, r.status]); break; }
    __novas[id] = __extrair(JSON.parse(el.dataset.json).ad);
    if (Object.keys(__novas).length % 10 === 0) try { localStorage.setItem('__novas', JSON.stringify(__novas)); } catch {}
    await new Promise((ok) => setTimeout(ok, pausa));
  }
  try { localStorage.setItem('__novas', JSON.stringify(__novas)); } catch {}
  if (__flog.at(-1)?.[0] !== 'parou') __flog.push('fim');
};
/** Depois de salvar o resultado em captacao/bruto, limpa o rascunho para a próxima semana. */
window.__limpar = () => { window.__novas = {}; try { localStorage.removeItem('__novas'); localStorage.removeItem('__fichas'); } catch {} return 'limpo'; };
'leitor OLX pronto';
