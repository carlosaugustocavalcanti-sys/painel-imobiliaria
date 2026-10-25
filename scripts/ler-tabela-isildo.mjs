// Lê a tabela do Isildo e do Guilherme (PDF de slides, 20/10/2026) e grava dados/origem/isildo.json,
// no mesmo formato da pasta Lançamentos. O texto sai do PDF com o PDFKit do macOS (scripts/pdf-texto.swift)
// e os links "📷 Fotos" de cada slide, com scripts/pdf-links.swift. Os slides não trazem carimbo de
// reservado/vendido: foram conferidos nas imagens e todas as unidades estão disponíveis.
// Uso: node scripts/ler-tabela-isildo.mjs [caminho do PDF]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ARQUIVO = process.argv[2] ?? join(homedir(), 'Downloads/Tabela Isildo.pdf');
const falhar = (msg) => {
  throw new Error(msg);
};
const executar = (script) => execFileSync('swift', [script, ARQUIVO], { encoding: 'utf8', maxBuffer: 1 << 26 });

const paginas = executar('scripts/pdf-texto.swift')
  .split(/^=== PÁGINA (\d+)$/m)
  .slice(1)
  .reduce((acc, v, i, a) => (i % 2 ? acc : { ...acc, [+v]: a[i + 1] }), {});
const linksPorPagina = {};
for (const l of executar('scripts/pdf-links.swift').split('\n').filter(Boolean)) {
  const [p, url] = l.split('\t');
  linksPorPagina[+p.slice(1)] = url;
}
const NPAG = Object.keys(paginas).length;
if (NPAG !== 58) falhar(`Esperava 58 páginas, li ${NPAG}`);

/* ---------- números ---------- */
const dinheiro = (s) => +String(s).replace(/\./g, '').replace(',', '.');
const decimal = (s) => +String(s).replace(',', '.');
const tipologia = (d, s) => `${d} dorm${d > 1 ? 's' : ''}${s ? ` (${s} suíte${s > 1 ? 's' : ''})` : ''}`;
const limpar = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const juntar = (linhas) => linhas.join(' ').replace(/\s+/g, ' ').trim();

/* ---------- a tabela ---------- */
const FONTE = 'Isildo e Guilherme (tabela de 20/10/2026)';
const CONTATO = 'Isildo (11) 98484-2632 · Guilherme (11) 98314-0076 · guilhermedemc@gmail.com';
const TABELA = '20/10/2026';
const NOTAS_GERAIS = [
  'As parcelas são corrigidas pelo índice da poupança acrescido de 0,5%.',
  'Aceitam permutas e estão abertos a discutir outras condições.',
  'Visitas: combinar com o Isildo ou o Guilherme a autorização e as chaves, avisando um dia antes.',
  'Fotos das unidades: https://www.flickr.com/photos/202887183@N04/albums/',
];

/** Os prédios da tabela, na ordem do PDF. `titulo` é o texto do cabeçalho dos slides do prédio. */
const PREDIOS = [
  { id: 'res-dona-vera', titulo: 'RESIDENCIAL DONA VERA', nome: 'Res. Dona Vera', bairro: 'Vila Tupi', endereco: 'Rua Aruás, 59 - Vila Tupi - Praia Grande/SP', fase: 'pronto' },
  { id: 'res-eloy-mendes', titulo: 'RESIDENCIAL ELOY MENDES', nome: 'Res. Eloy Mendes', bairro: 'Tude Bastos', endereco: 'Rua Olga Villa Nova, 27 - Tude Bastos - Praia Grande/SP', fase: 'pronto' },
  {
    id: 'res-pedro',
    titulo: 'RESIDENCIAL PEDRO',
    nome: 'Res. Pedro',
    bairro: 'Vila Tupi',
    endereco: 'Rua Uirapuru - Vila Tupi - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Out/2026',
    lazer: [
      'Sala de jogos', 'Salão de festas', 'Espaço gourmet', 'Playground', 'Brinquedoteca',
      'Piscina adulto', 'Piscina infantil', 'Solarium', 'Entrada para banhistas',
      'Espaço fitness', 'Bicicletário', 'Hall decorado e mobiliado',
      'Portaria 24h', 'Portão eletrônico', 'Câmeras de segurança',
    ],
  },
  {
    id: 'ed-saraiva',
    titulo: 'EDIFÍCIO RESIDENCIAL SARAIVA',
    nome: 'Ed. Saraiva',
    bairro: 'Aviação',
    endereco: 'Rua Pero Vaz de Caminha, 285 - Aviação - Praia Grande/SP',
    fase: 'pronto',
    lazer: ['Piscina adulto e infantil', 'Salão de jogos adulto e teen', 'Salão de festas', 'Terraço grill', 'Playground', 'Academia', 'Brinquedoteca', 'Sauna', 'Pista de cooper', 'Armário de praia'],
  },
  {
    id: 'res-laura',
    titulo: 'RESIDENCIAL LAURA',
    nome: 'Res. Laura',
    bairro: 'Aviação',
    endereco: 'Rua Carlos Martiniano de Andrade Bittencourt, 290 - Aviação - Praia Grande/SP',
    fase: 'pronto',
    lazer: ['Sala de Jogos', 'Salão de Festas', 'Piscina', 'Espaço Fitness', 'Portaria', 'Portão Eletrônico'],
  },
  {
    id: 'res-veraneio',
    titulo: 'RESIDENCIAL VERANEIO',
    nome: 'Res. Veraneio',
    bairro: 'Guilhermina',
    endereco: 'Rua Doutor Júlio de Mesquita Filho, 227 - Guilhermina - Praia Grande/SP',
    fase: 'pronto',
    lazer: ['Piscina', 'Sauna', 'Salão de Jogos', 'Salão de Festas', 'Espaço Kids', 'Academia'],
    diferenciais: ['Condomínio entregue mobiliado pela construtora'],
  },
  { id: 'res-atlantico-ii', titulo: 'RESIDENCIAL ATLÂNTICO II', nome: 'Res. Atlântico II', bairro: 'Guilhermina', endereco: 'Rua Panamá, 487 - Guilhermina - Praia Grande/SP', fase: 'pronto' },
  {
    id: 'res-chopin',
    titulo: 'RESIDENCIAL CHOPIN',
    nome: 'Res. Chopin',
    bairro: 'Boqueirão',
    endereco: 'Rua Cornélio Procópio, 202 - Boqueirão - Praia Grande/SP',
    fase: 'pronto',
    lazer: [
      'Piscinas adulto e infantil aquecidas', 'Piscina com raia semiolímpica de 25m', 'Fitness', 'Spa com saunas',
      'Playground coberto/descoberto', 'Pet place com agility, areia e banho', 'Lounges', 'Salão de festas',
      'Salão gourmet', 'Salão de jogos', 'Pista de boliche', 'Deck descoberto', 'Bicicletas compartilhadas',
    ],
  },
  {
    id: 'res-raimundo-gomes',
    titulo: 'RESIDENCIAL RAIMUNDO GOMES',
    nome: 'Res. Raimundo Gomes',
    bairro: 'Aviação',
    endereco: 'Rua Alberto Santos Dumont, 113 - Aviação - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fim/2026',
    diferenciais: ['Em frente ao futuro píer da Aviação'],
  },
  {
    id: 'primicia-plaza-residence',
    titulo: 'PRIMÍCIA PLAZA RESIDENCE',
    nome: 'Primícia Plaza',
    bairro: 'Guilhermina',
    endereco: 'Rua Botafogo, 217 - Guilhermina - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fim/2026',
    notas: ['Primícia Plaza Residence, da Construtora JR.'],
  },
  {
    id: 'res-torres',
    titulo: 'RESIDENCIAL TORRES',
    nome: 'Res. Torres',
    bairro: 'Caiçara',
    endereco: 'Av. Presidente Castelo Branco, esquina com Av. São Romério - Caiçara - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fim/2026',
    lazer: ['Piscina adulto com borda infinita', 'Piscina infantil', 'Cinema', 'Beauty center', 'Coworking', 'Pista de cooper', 'Quadra poliesportiva', 'Lazer completo'],
    diferenciais: ['Frente mar'],
  },
  {
    id: 'res-volpi',
    titulo: 'RESIDENCIAL VOLPI',
    nome: 'Res. Volpi',
    bairro: 'Vila Caiçara',
    endereco: 'Rua São Domingos, 875 - Vila Caiçara - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fim/2026',
    lazer: ['Piscina com deck molhado', 'Salão de festas', 'Salão de jogos', 'Sala fitness', 'Espaço gourmet', 'Brinquedoteca'],
  },
  {
    id: 'dumont-residence',
    titulo: 'DUMONT RESIDENCE',
    nome: 'Dumont Residence',
    bairro: 'Aviação',
    endereco: 'Rua Alberto Santos Dumont, 111 - Aviação - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fim/2026',
    notas: ['Construtora MGQ.'],
  },
  {
    id: 'primor-square-garden',
    titulo: 'PRIMOR SQUARE GARDEN',
    nome: 'Primor Square Garden',
    bairro: 'Canto do Forte',
    endereco: 'Av. Costa Machado, 440 - Canto do Forte - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fim/2026',
    notas: ['Construtora MGQ.'],
  },
  {
    id: 'res-14-bis',
    titulo: 'RESIDENCIAL 14 BIS',
    nome: 'Res. 14 Bis',
    bairro: 'Aviação',
    endereco: 'Rua Alberto Santos Dumont, 205 - Aviação - Praia Grande/SP',
    fase: 'obra',
    entrega: '2º sem/2027',
    notas: ['Construtora MGQ.'],
  },
  { id: 'ocean-park', titulo: 'RESIDENCIAL OCEAN PARK', nome: 'Ocean Park', bairro: 'Cidade Ocian', endereco: 'Rua Comendador Oto Carlos Golanda, 200 - Cidade Ocian - Praia Grande/SP', fase: 'pronto' },
  {
    id: 'res-acquamare',
    titulo: 'RESIDENCIAL ACQUAMARE',
    nome: 'Res. Acquamare',
    bairro: 'Aviação',
    endereco: 'Rua Caribas, 200 - Aviação - Praia Grande/SP',
    fase: 'pronto',
    lazer: [
      'Piscina Adulto', 'Piscina Infantil', 'Solarium', 'Salão de Festas', 'Espaço Gourmet', 'Terraço Grill', 'Academia',
      'Fitness Externo', 'Espaço de Alongamento', 'Pista de Cooper', 'Espaço Beleza', 'Home Cinema', 'Brinquedoteca',
      'Playground', 'Salão de Jogos Adulto', 'Salão de Jogos Teen', 'Lan House', 'Bicicletário',
    ],
  },
  { id: 'res-unique', titulo: 'RESIDENCIAL UNIQUE', nome: 'Res. Unique', bairro: 'Canto do Forte', endereco: 'Rua General Otelo Rodrigues Franco, 310 - Canto do Forte - Praia Grande/SP', fase: 'obra', entrega: 'Abr/2027' },
  { id: 'res-bellagio', titulo: 'RESIDENCIAL BELLAGIO', nome: 'Res. Bellagio', bairro: 'Guilhermina', endereco: 'Alameda das Américas, 162 - Guilhermina - Praia Grande/SP', fase: 'obra', entrega: 'Mai/2027' },
];

/* ---------- uma unidade por slide ---------- */
const ruido = /^(￼|📷 Fotos|Vista livre –|[A-Za-z]{1,2})$/;
function unidadeDaPagina(numero, texto, predio) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const i = linhas.findIndex((l) => /^(Apto|Casa) /.test(l));
  if (i < 0) return null;
  const cab = linhas[i].match(/^(Apto|Casa)\s+(.+?)\s*[–-]\s*(.*)$/);
  if (!cab) falhar(`Página ${numero}: cabeçalho ilegível "${linhas[i]}"`);
  const [, tipo, rotulo, resto] = cab;
  const casa = tipo === 'Casa';
  const unidade = casa ? `Casa ${rotulo}` : rotulo.replace(/^(\d+)([A-Z])$/, '$1 $2').replace(/^(\d+) Bloco ([A-Z])$/, '$1 (Bl. $2)');

  // descrição: do fim do cabeçalho até a primeira linha de dados
  const fim = linhas.findIndex((l, j) => j > i && /^(Condom[ií]nio|IPTU|Área útil)/.test(l));
  if (fim < 0) falhar(`Página ${numero}: sem área útil`);
  const cabecalho = juntar([resto, ...linhas.slice(i + 1, fim).filter((l) => ruido.test(l) && /Vista livre/.test(l))]);
  const descricao = juntar(linhas.slice(i + 1, fim).filter((l) => !ruido.test(l)));

  const sala = descricao.match(/^(.*?)\bsala,\s*(.*)$/);
  if (!sala) falhar(`Página ${numero}: descrição sem "sala,": ${descricao}`);
  const [, inicio, corpo] = sala;
  let dorm, suites;
  let m;
  if ((m = inicio.match(/(\d) su[íi]tes? \+ (\d) dormit[óo]rios?/))) [dorm, suites] = [+m[1] + +m[2], +m[1]];
  else if ((m = inicio.match(/(\d) dormit[óo]rios? \+ (\d) su[íi]tes?/))) [dorm, suites] = [+m[1] + +m[2], +m[2]];
  else if ((m = inicio.match(/(\d) dormit[óo]rios? sendo (\d) su[íi]tes?/))) [dorm, suites] = [+m[1], +m[2]];
  else if ((m = inicio.match(/^(\d) su[íi]tes?,/))) [dorm, suites] = [+m[1], +m[1]];
  else if ((m = inicio.match(/^(\d) dormit[óo]rios?,/))) [dorm, suites] = [+m[1], 0];
  else falhar(`Página ${numero}: tipologia ilegível "${inicio}"`);
  // o título do slide ("2 Dorm", "3 suítes") tem que bater com a descrição
  const titulo = resto.match(/(\d) (Dorm|suítes?)/i);
  if (titulo && +titulo[1] !== (/dorm/i.test(titulo[2]) ? dorm : suites)) falhar(`Página ${numero}: título "${resto}" não bate com ${dorm} dorms/${suites} suítes`);

  const frases = corpo.split(/\.\s+/).map((f) => f.replace(/\.$/, '').trim()).filter(Boolean);
  const vaga = frases[0].match(/^(.*?) e (\d) vagas? de garagem( demarcadas?)?$/);
  if (!vaga) falhar(`Página ${numero}: sem vagas em "${frases[0]}"`);
  const [, restoDet, vagas, demarcada] = vaga;
  const det = `sala, ${restoDet}`;

  const todo = juntar(linhas);
  const pega = (re, grupo = 1) => linhas.map((l) => l.match(re)).find(Boolean)?.[grupo];
  const area = pega(/^Área útil:?\s*(?:de\s*)?([\d.,]+)\s*m/);
  const valor = pega(/^R\$\s*([\d.]+,\d{2})/);
  if (!area || !valor) falhar(`Página ${numero}: sem área ou valor`);
  const entrada = pega(/^Entrada (?:de )?R\$\s*([\d.]+,\d{2})/);
  const chaves = pega(/^(?:Nas )?[Cc]haves R\$\s*([\d.]+,\d{2})/);
  const anual = linhas.map((l) => l.match(/^(\d+) anuais de R\$\s*([\d.]+,\d{2})/)).find(Boolean);
  const parc = linhas.map((l) => l.match(/^(\d+) parcelas de R\$\s*([\d.]+,\d{2})/)).find(Boolean);
  const cond = pega(/^Condom[ií]nio:?\s*R\$\s*([\d.]+,\d{2})/);
  const iptu = pega(/^IPTU:?\s*R\$\s*([\d.]+,\d{2})/);
  const andar = todo.match(/(\d+)° pavimento/)?.[1];
  const laudo = todo.match(/laudo já aprovado de R\$\s*([\d.]+,\d{2})/)?.[1];
  const aVista = linhas.some((l) => /^R\$\s*[\d.]+,\d{2} à vista/.test(l));
  const financia = /financiamento bancário/i.test(todo);

  let fluxo;
  if (entrada) {
    if (!parc) falhar(`Página ${numero}: entrada sem parcelas`);
    fluxo = limpar({
      entrada: dinheiro(entrada),
      chaves: chaves ? dinheiro(chaves) : undefined,
      anualQtd: anual ? +anual[1] : undefined,
      anualVal: anual ? dinheiro(anual[2]) : undefined,
      parcQtd: +parc[1],
      parcVal: dinheiro(parc[2]),
    });
    const soma = fluxo.entrada + (fluxo.chaves ?? 0) + (fluxo.anualQtd ?? 0) * (fluxo.anualVal ?? 0) + fluxo.parcQtd * fluxo.parcVal;
    if (Math.abs(soma - dinheiro(valor)) > 10) falhar(`Página ${numero}, unidade ${unidade}: o fluxo soma ${soma}, a tabela diz ${dinheiro(valor)}`);
  }

  const vistaMar = /vista mar|frente mar/i.test(`${cabecalho} ${descricao}`);
  const vista = vistaMar ? (/frente mar/i.test(cabecalho) ? 'Frente mar' : 'Vista mar') : /vista livre/i.test(cabecalho) ? 'Vista livre' : undefined;
  const obs = [
    vista === 'Vista livre' ? 'Vista livre.' : undefined,
    aVista ? 'Valor à vista.' : undefined,
    laudo ? `Financiamento bancário com laudo já aprovado de R$ ${laudo}.` : financia ? 'Aceita financiamento bancário.' : undefined,
    ...frases.slice(1).filter((f) => !/pavimento|^vista mar$/i.test(f)).map((f) => `${f}.`),
    andar ? `${andar}º pavimento.` : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return limpar({
    unidade,
    andar: andar ? +andar : undefined,
    tipologia: casa ? `Casa · ${tipologia(dorm, suites)}` : tipologia(dorm, suites),
    dorm,
    suites,
    det,
    area: decimal(area),
    vagas: demarcada ? `${vagas} demarcada${+vagas > 1 ? 's' : ''}` : vagas,
    valor: dinheiro(valor),
    entrada: entrada ? dinheiro(entrada) : undefined,
    chaves: chaves ? dinheiro(chaves) : undefined,
    laudo: laudo ? dinheiro(laudo) : undefined,
    fluxo,
    cond: cond ? dinheiro(cond) : undefined,
    iptu: iptu ? dinheiro(iptu) : undefined,
    status: 'disponivel',
    obs,
    fotos: linksPorPagina[numero],
    fonte: FONTE,
    contato: CONTATO,
    tabela: TABELA,
    vistaMar,
    vista,
    fase: predio.fase,
  });
}

/* ---------- monta ---------- */
const colapsar = (s) => s.replace(/\s+/g, ' ').toLowerCase();
const predios = PREDIOS.map((b) => ({ ...b, paginas: [], unidades: [] }));
const entre = (a, ...b) => b.every((x) => a.includes(x));
for (let n = 3; n <= 57; n++) {
  const texto = paginas[n];
  const achados = predios.filter((b) => entre(colapsar(texto), colapsar(b.titulo)));
  if (achados.length !== 1) falhar(`Página ${n}: ${achados.length} prédios no cabeçalho`);
  const b = achados[0];
  b.paginas.push(n);
  const u = unidadeDaPagina(n, texto, b);
  if (u) b.unidades.push(u);
}
for (const b of predios) {
  if (!b.unidades.length) falhar(`${b.nome}: nenhuma unidade`);
  const textoDoPredio = colapsar(b.paginas.map((n) => paginas[n]).join(' '));
  for (const item of b.lazer ?? []) if (!textoDoPredio.includes(colapsar(item).replace(/^(frente mar)$/, '$1'))) falhar(`${b.nome}: lazer "${item}" não está no texto dos slides`);
}

const saida = predios.map(({ paginas: _p, titulo: _t, lazer, diferenciais, notas, entrega, ...b }) => ({
  ...b,
  cidade: 'Praia Grande',
  ...(entrega ? { entrega } : {}),
  ...(lazer ? { lazer } : {}),
  ...(diferenciais ? { diferenciais } : {}),
  notas: [...(notas ?? []), ...NOTAS_GERAIS],
  tabelas: [{ fonte: FONTE, contato: CONTATO, atualizadoEm: TABELA, arquivo: 'Tabela Isildo.pdf' }],
}));

const total = saida.reduce((a, b) => a + b.unidades.length, 0);
if (total !== 38) falhar(`Esperava 38 unidades, li ${total}`);
writeFileSync(
  'dados/origem/isildo.json',
  JSON.stringify(
    {
      arquivo: 'Downloads/Tabela Isildo.pdf',
      lidoEm: '2026-10-25',
      sobre:
        'Tabela do Isildo e do Guilherme de 20/10/2026 (19 prédios, 38 unidades). Texto e links de fotos extraídos do PDF por scripts/ler-tabela-isildo.mjs; os slides só com imagens (fachadas, plantas) não entram.',
      predios: saida,
    },
    null,
    1,
  ) + '\n',
);
console.log(`${saida.length} prédios, ${total} unidades → dados/origem/isildo.json`);
for (const b of saida) console.log(`  ${b.id.padEnd(26)} ${String(b.unidades.length).padStart(2)} un  ${b.fase}`);
