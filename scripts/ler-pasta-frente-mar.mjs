// Gera dados/origem/frente-mar.json: apartamentos "frente mar" ou na Av. Pres. Castelo Branco das tabelas
// da pasta "5. FRENTE MAR" do Google Drive (19 imobiliárias, tabelas de 08/2026 a 24/10/2026).
// O texto dos PDFs foi lido pelo conector do Drive e conferido à mão; os valores abaixo são transcritos dessas tabelas.
// Já estavam no painel, com os mesmos valores, e não foram repetidos: o 3 dorm da Nova Home em Aviação (R$ 1,05 mi),
// o 3 dorm da Nova Home em Caiçara (R$ 650 mil) e o 2 suítes da Ariani em Boqueirão (R$ 850 mil).
// Ficaram de fora: casas, locações, unidades só com "vista mar" fora da Av. Castelo Branco e as tabelas da Ectual
// (Évora, Manacá, Parque dos Coqueiros e Atlantic Ville já estão no painel, vindas da pasta Lançamentos).
// Uso: node scripts/ler-pasta-frente-mar.mjs
import { writeFileSync } from 'node:fs';

const FONTES = {
  terral: { fonte: 'Terral (Guayi, tabela de agosto/2026)', contato: 'Mario Sérgio (13) 99670-5456 · Terral (13) 99115-5075', data: '08/2026', arquivo: 'Guayi - Aptos 2 e 3 dorm (Aviação).pdf' },
  costaReal: { fonte: 'Costa Real Imóveis', contato: 'Samir (13) 97405-3825', data: '23/10/2026', arquivo: 'COSTA REAL - Apto 1 dorm (Aviação).pdf' },
  grandlar: { fonte: 'GrandLar Imóveis (tabela de 08/10/2026)', contato: 'Angelica Klein (13) 97405-5450', data: '08/10/2026', arquivo: 'GRANDLAR - Apto 2 dorm (Mirim).pdf' },
  m2: { fonte: 'M² Imóveis (tabela de 23/10/2026)', contato: 'Gustavo (13) 99727-7776 · M² Imóveis (13) 3596-1322', data: '23/10/2026', arquivo: 'METRO QUADRADO - Apto 2 dorm (Caiçara) + Locação - Apto 3 dorm (Aviação).pdf' },
  m2vinicius: { fonte: 'M² Imóveis (tabela de 23/10/2026)', contato: 'Vinicius (13) 99102-7652 · M² Imóveis (13) 3596-1322', data: '23/10/2026', arquivo: 'METRO QUADRADO - Apto 2 dorm (Caiçara) + Locação - Apto 3 dorm (Aviação).pdf' },
  vistaAtlantico: { fonte: 'Vista Atlântico Imóveis (tabela de 23/10/2026)', contato: 'Vista Atlântico (13) 3494-5840', data: '23/10/2026', arquivo: 'VISTA ATLÂNTICO - Aptos 2 dorm (Guilhermina).pdf' },
  kalyl: { fonte: 'Kalyl Imóveis (tabela de 22/10/2026)', contato: 'Kalyl Imóveis (13) 98850-1016', data: '22/10/2026', arquivo: 'KALYL - Apto 1 dorm (Boqueirão) + Apto 2 dorm (Maracanã) + Aptos 3 dorm (Guilhermina-Aviação).pdf' },
  lucato: { fonte: 'Lucato Imóveis (tabela de 24/10/2026)', contato: 'Lucato (13) 98835-4051 · (13) 99161-8893', data: '24/10/2026', arquivo: 'LUCATO - Apto 1 dorm (Guilhermina).pdf' },
  veraneio: { fonte: 'Veraneio Imóveis (tabela de 22/10/2026)', contato: 'Veraneio (13) 97405-5688 (gerente de vendas)', data: '22/10/2026', arquivo: 'VERANEIO - Apto 2 dorm (Jd. Real).pdf' },
  leandro: { fonte: 'Imóveis Leandro Carvalho (Cabelo)', contato: 'Leandro Carvalho (Cabelo)', data: '19/10/2026', arquivo: 'LEANDRO CABELO - Apto 2 dorm (Forte).pdf' },
  saga: { fonte: 'Saga Imóveis (tabela de 19/10/2026)', contato: 'Saga (13) 97411-3677 · (13) 97405-8119', data: '19/10/2026', arquivo: 'SAGA - Cobertura 6 dorm (Tupi).pdf' },
  pgi: { fonte: 'PGI (tabela de 05/10/2026)', contato: 'Luis Moraes (13) 97600-2278', data: '05/10/2026', arquivo: 'PGI - Apto 1 dorm (Maracanã).pdf' },
  c2x: { fonte: 'C2X Investimentos (tabela de 16/10/2026)', contato: 'Júlio (13) 99733-7800', data: '16/10/2026', arquivo: 'C2X - Apto 3 dorm (Maracanã).pdf' },
  novaHome: { fonte: 'Nova Home (tabela de 16/10/2026)', contato: 'Daniela (13) 97409-3105', data: '16/10/2026', arquivo: 'NOVA HOME - Aptos 3 dorm (Caiçara-Jd Real).pdf' },
  marcio: { fonte: 'Márcio Masumoto Jr (tabela de 22/09/2026)', contato: 'Márcio Masumoto Jr (Instagram @marciomasumotojr)', data: '22/09/2026', arquivo: 'MÁRCIO MASUMOTO JR - Apto 3 dorm (Flórida).pdf' },
  ariani: { fonte: 'Ariani Galeano Imóveis', contato: 'Wellington (13) 99631-9271', data: '20/10/2026', arquivo: 'ARIANI GALEANO - Apto 2 dorm (Boqueirão).pdf' },
  jean: { fonte: 'Jean Diegues Imóveis', contato: '(13) 99807-8987 · (13) 98156-9018', data: '22/10/2026', arquivo: 'JEAN DIEGUES - Apto 3 dorm (Tupi).pdf' },
  kfKatia: { fonte: 'Kátia Tavares e Flávio Belchior (tabela de 15/10/2026)', contato: 'Kátia (13) 99679-4782', data: '15/10/2026', arquivo: 'KF - Kit (Guilhermina) + Aptos 1 dorm (Tupi-Caiçara) + Aptos 2 dorm (Flórida-Jd.Real) + Aptos 3 dorm (Caiçara-Jd.Real).pdf' },
  kfFlavio: { fonte: 'Kátia Tavares e Flávio Belchior (tabela de 15/10/2026)', contato: 'Flávio (13) 99782-6694', data: '15/10/2026', arquivo: 'KF - Kit (Guilhermina) + Aptos 1 dorm (Tupi-Caiçara) + Aptos 2 dorm (Flórida-Jd.Real) + Aptos 3 dorm (Caiçara-Jd.Real).pdf' },
  coliseum: { fonte: 'Coliseum Imóveis (tabela de 21/10/2026)', contato: 'Fátima (11) 9859-65221 · Ana Paula (13) 98196-0049', data: '21/10/2026', arquivo: 'COLISEUM - Aptos 2 dorm (V.Assunção-Flórida) + Aptos 3 dorm (Solemar-Vilamar).pdf' },
  gomes: { fonte: 'Gomes e Ferreira', contato: '(13) 99149-9526 · Reinaldo (13) 99183-0576', data: '20/10/2026', arquivo: 'GOMES E FERREIRA - Aptos 2 e 3 dorm (Caiçara).pdf' },
  stefano: { fonte: 'Eduardo Stefano Negócios Imobiliários', contato: 'Eduardo Stefano (meuzap.in/stefano)', data: '21/10/2026', arquivo: 'EDUARDO STEFANO - Apto 2 dorm (Mongaguá-SP).pdf' },
  william: { fonte: 'William Buongiovanni (tabela de 14/10/2026)', contato: 'Raquel Correia (13) 99735-2597 · William (13) 99770-0999', data: '14/10/2026', arquivo: 'WILLIAM BUONGIOVANNI - Aptos 1 dorm (Mongaguá-SP) + Apto 2 dorm (Imperador) + Apto 3 dorm (Mongaguá).pdf' },
};

const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const tip = (dorm, suites, prefixo = '') =>
  prefixo + plural(dorm, 'dorm', 'dorms') + (suites ? ` (${plural(suites, 'suíte', 'suítes')})` : '');

/** Uma unidade; `f` é a chave de FONTES. Campos que a tabela não traz ficam de fora. */
const un = (f, x) => {
  const F = FONTES[f];
  const { dorm, suites = 0, prefixo, vista = 'Frente mar', ...resto } = x;
  return {
    unidade: '—',
    tipologia: tip(dorm, suites, prefixo),
    dorm,
    suites,
    status: 'disponivel',
    ...resto,
    fonte: F.fonte,
    contato: F.contato,
    tabela: F.data,
    vistaMar: true,
    vista,
    fase: 'pronto',
  };
};
const tab = (...fs) => fs.map((f) => ({ fonte: FONTES[f].fonte, contato: FONTES[f].contato, atualizadoEm: FONTES[f].data, arquivo: FONTES[f].arquivo }));
const predio = (id, nome, bairro, endereco, fontes, unidades, extra = {}) => ({
  id,
  nome,
  bairro,
  endereco,
  fase: 'pronto',
  unidades,
  cidade: 'Praia Grande',
  notas: [],
  tabelas: tab(...fontes),
  ...extra,
});
/** Prédio que a tabela não nomeia: o código do anúncio vira o nome. */
const semNome = (f, codigo, bairro, endereco, unidade, notas = []) =>
  predio(`${f}-${codigo}`.toLowerCase(), `Prédio frente mar · ${codigo}`, bairro, endereco, [f], [unidade], { notas });

const COMISSAO_FIFTY = 'Comissão fifty 6%.';
const CB = (n) => `Av. Pres. Castelo Branco, ${n}`;

const predios = [
  /* ---------- Terral: Guayi (Av. Castelo Branco 3.972, frente mar, pronto) ---------- */
  predio('guayi-frente-mar', 'Guayi', 'Aviação', `${CB('3.972')} - Campo da Aviação - Praia Grande/SP`, ['terral'], [
    ...[
      ['141', 3, 903800, 15063.33, 1807600],
      ['161', 3, 925800, 15430, 1851600],
      ['201', 3, 969800, 16163.33, 1939600],
    ].map(([n, , ato, parc, total]) =>
      un('terral', { unidade: n, dorm: 3, suites: 3, area: 173.13, vagas: '2', valor: total, entrada: ato, iptu: 857, cond: 1195, fluxo: { entrada: ato, parcQtd: 60, parcVal: parc }, obs: 'Final 1: 3 suítes, 173,13 m² + 0,8 m² de depósito. Ato + 60 parcelas mensais (IPCA + 1% ao mês).', det: 'Final 1 · 3 suítes · beach box independente' }),
    ),
    un('terral', { unidade: '135', dorm: 2, suites: 2, area: 106.02, vagas: '2', valor: 950000, entrada: 475000, iptu: 550, cond: 776, fluxo: { entrada: 475000, parcQtd: 60, parcVal: 7916.67 }, obs: 'Final 5: 2 suítes, 106,02 m² + 0,8 m² de depósito. Ato + 60 parcelas mensais (IPCA + 1% ao mês).', det: 'Final 5 · 2 suítes · beach box independente' }),
  ], {
    notas: ['Pronto para morar, frente para o mar. Chaves no stand de vendas (Av. Pres. Castelo Branco, 3.996).', '5% de desconto para pagamento à vista ou financiamento bancário.', 'Tabela sujeita a alterações; IPTU e condomínio são valores estimados.'],
  }),

  /* ---------- Costa Real ---------- */
  semNome('costaReal', 'Costa Real 1 dorm', 'A confirmar', null, un('costaReal', { dorm: 1, vagas: '1', valor: 336000, iptu: 250, cond: 500, vista: 'Frente ao mar', det: 'sala 2 ambientes, sacada envidraçada com churrasqueira, cozinha, área de serviço', obs: 'Aceita financiamento bancário. A tabela não nomeia o prédio nem informa a área. Estuda imóvel e veículo como parte do pagamento. Comissão 5%.' })),

  /* ---------- GrandLar ---------- */
  predio('atlantic-house-frente-mar', 'Atlantic House', 'Maracanã', `${CB('11.030')} - Maracanã - Praia Grande/SP`, ['grandlar', 'kalyl'], [
    un('grandlar', { dorm: 2, suites: 1, area: 75, vagas: '1', valor: 685000, cond: 986, iptu: 512, det: 'sacada gourmet envidraçada, decorado', obs: 'Porteira fechada. Aceita financiamento bancário. Lazer: piscina, salão de festas, salão de jogos e brinquedoteca. Comissão 5%.' }),
    un('kalyl', { unidade: '701', dorm: 2, suites: 1, area: 66.25, vagas: '1', valor: 650000, iptu: 451.52, cond: 967.1, det: 'mobiliado (fica como está), sacada gourmet envidraçada, cozinha planejada, lazer completo', obs: 'Preço reduzido. R$ 680 mil no financiamento bancário ou permuta. Condomínio R$ 967,10 (+ taxa de renovação do AVCB R$ 92,22). Chaves: enviar CRECI para autorizar. Comissão 5%.' }),
  ]),
  predio('res-hugo-navarro-frente-mar', 'Res. Hugo Navarro', 'Mirim', CB('10676'), ['grandlar'], [
    un('grandlar', { unidade: '103', dorm: 2, suites: 1, area: 69, vagas: '1', valor: 600000, cond: 754.37, iptu: 401.11, status: 'suspenso', det: 'sacada gourmet envidraçada, mobiliado', obs: 'Suspenso temporariamente. Condomínio R$ 754,37 + taxa extra R$ 265,78. Aceita financiamento bancário. Comissão R$ 20 mil.' }),
  ]),

  /* ---------- M² Imóveis: Av. Castelo Branco ---------- */
  predio('res-rei-david-frente-mar', 'Res. Rei David', 'Aviação', CB('4304'), ['m2'], [
    un('m2', { unidade: '305 A', dorm: 1, area: 45, vagas: '1', valor: 285000, iptu: 228, cond: 581, vista: 'Av. Pres. Castelo Branco', det: 'sala, cozinha, mobiliado; salão de jogos e de festas, elevador, portaria 24h', obs: 'Chaves: agendar. À vista ou financiamento bancário; aceita carro sob avaliação. Comissão 5%.' }),
    un('m2', { unidade: '704 A', dorm: 2, area: 76, vagas: '1', valor: 360000, iptu: 262, cond: 871, vista: 'Vista mar · Av. Pres. Castelo Branco', det: 'sala, cozinha, mobiliado; salão de jogos e de festas, elevador, portaria 24h', obs: 'Visitas de segunda a sexta, das 9h às 17h, e sábado até 12h. À vista ou financiamento bancário; aceita carro sob avaliação. Comissão 5%.' }),
  ]),
  predio('res-rei-salomao-frente-mar', 'Res. Rei Salomão', 'Aviação', CB('4284'), ['m2'], [
    un('m2', { unidade: '104', dorm: 2, area: 72, vagas: '1', valor: 380000, iptu: 180, cond: 1080, vista: 'Av. Pres. Castelo Branco', det: 'sala, cozinha, área de serviço, semi mobiliado; elevador, lazer, portaria 24h', obs: 'À vista ou financiamento bancário; aceita carro sob avaliação. Comissão 5%.' }),
  ]),
  predio('res-angela-frente-mar', 'Res. Angela', 'Aviação', CB('4424'), ['m2vinicius'], [
    un('m2vinicius', { unidade: '1102', dorm: 2, suites: 1, area: 100, vagas: '1', valor: 670000, iptu: 400, cond: 1200, vista: 'Vista mar · Av. Pres. Castelo Branco', det: 'sacada, mobiliado; portaria 24h, lazer completo', obs: 'À vista ou financiamento bancário. Comissão 5%.' }),
  ]),

  /* ---------- Vista Atlântico ---------- */
  predio('pico-dos-andes-frente-mar', 'Pico dos Andes', 'Ocian', CB('7140'), ['vistaAtlantico'], [
    un('vistaAtlantico', { unidade: '502', dorm: 1, area: 55, vagas: '1', valor: 390000, iptu: 280, cond: 620, det: 'apenas planejados', obs: 'Aceita financiamento. Comissão 5%.' }),
  ]),
  predio('braganca-frente-mar', 'Bragança', 'Guilhermina', 'Av. Castelo Branco, 3278', ['vistaAtlantico'], [
    un('vistaAtlantico', { unidade: '81', dorm: 2, area: 72, vagas: '1', valor: 650000, iptu: 370, cond: 793.83, det: 'sacada frente mar', obs: 'Condomínio R$ 793,83 + R$ 150 de salão de festas e jogos (fundo de obras). Aceita financiamento. Comissão 5%.' }),
  ]),
  predio('nicolas-frente-mar', 'Nicolas', 'Guilhermina', 'Av. Castelo Branco, 3236', ['vistaAtlantico'], [
    un('vistaAtlantico', { unidade: '1305', dorm: 2, suites: 1, area: 84, vagas: '2', valor: 627000, iptu: 517.65, cond: 871.59, vista: 'Vista mar · Av. Castelo Branco', det: 'sacada, lazer completo, mobiliado', obs: 'Aceita financiamento. Comissão 5%.' }),
  ]),

  /* ---------- Kalyl ---------- */
  predio('villagio-di-napoli-frente-mar', 'Villagio di Napoli', 'Maracanã', `${CB('11.590')} · Maracanã`, ['kalyl'], [
    un('kalyl', { unidade: '601', dorm: 3, suites: 1, area: 85.41, vagas: '2', valor: 550000, iptu: 449.73, cond: 1180.77, det: 'sacada envidraçada com vista mar, lazer completo, portaria 24h, pintura nova', obs: 'Preço reduzido. Condomínio R$ 1.180,77 + rateio do elevador R$ 148,53. À vista; aceita financiamento bancário e permuta. Chaves: apartamento aberto; enviar CRECI para fotos. Comissão 5%.' }),
  ]),
  /* ---------- Lucato ---------- */
  predio('res-julio-cesar-frente-mar', 'Res. Julio Cesar', 'Guilhermina', `Rua Peru, 53, esquina com ${CB('3220')} - Vila Guilhermina`, ['lucato'], [
    un('lucato', { unidade: '404', dorm: 1, area: 48, vagas: '1', valor: 330000, iptu: 82.81, cond: 507.98, vista: 'Frente mar · Av. Pres. Castelo Branco', det: 'sala, cozinha, área de serviço; 2 elevadores, bicicletário, lavanderia no térreo', obs: 'Lazer: piscina, salão de jogos, salão de festas, churrasqueira, solarium. À vista ou financiamento bancário. Comissão parceria fifty 6%.' }),
  ]),

  /* ---------- Veraneio ---------- */
  predio('res-bela-vista-frente-mar', 'Res. Bela Vista', 'Real', CB('16578'), ['veraneio'], [
    un('veraneio', { unidade: '76', dorm: 2, area: 76, vagas: '1', valor: 545000, det: 'varanda gourmet, sala 2 ambientes, lazer completo', obs: 'Aceita financiamento bancário. Chaves: agendar. Comissão 5%; o sinal da proposta vai para a conta da Veraneio.' }),
  ]),

  /* ---------- Leandro Cabelo ---------- */
  predio('ed-verde-mar-frente-mar', 'Ed. Verde Mar', 'Canto do Forte', `${CB('340')} (portaria) · 2ª entrada R. General Euclides Figueiredo, 340 - Canto do Forte`, ['leandro'], [
    un('leandro', { unidade: '324 · bloco 6', andar: 3, dorm: 2, area: 52, vagas: '1', valor: 325000, iptu: 209.65, cond: 491.82, acesso: 'escada', det: '100% reformado, cozinha grande', obs: '3º andar por escada, prédio com portaria 24h, salão de festas e duas entradas. Documentação ok para financiamento; aceita financiamento bancário e estuda imóvel de menor valor. Chaves na portaria. Comissão 5%.' }),
  ]),

  /* ---------- PGI ---------- */
  predio('ed-jeanete-mariano-frente-mar', 'Ed. Jeanete Mariano', 'Maracanã', 'Rua Mario Daige, 108 · Maracanã', ['pgi'], [
    un('pgi', { unidade: '502 B', dorm: 1, area: 59.51, valor: 339000, iptu: 269.75, cond: 519, vista: 'Frente ao mar · duas sacadas com vista mar', det: 'duas sacadas, na sala e no quarto', obs: 'Aceita financiamento bancário. O proprietário retira TV, máquina de lavar e micro-ondas. Comissão 5%.' }),
  ]),

  /* ---------- C2X + Nova Home: Melissa Miyazi (Av. Castelo Branco 16.140) ---------- */
  predio('melissa-miyazi-frente-mar', 'Melissa Miyazi', 'Imperador', 'Av. Presidente Castelo Branco, 16.140 - Praia Grande/SP', ['c2x', 'novaHome'], [
    un('c2x', { unidade: '21', dorm: 3, suites: 1, area: 127, vagas: '2', valor: 998000, iptu: 853.91, cond: 1391.21, vista: 'Frente mar · Maracanã', det: 'mobiliado, sacada envidraçada, piscina na cobertura, lazer completo', obs: 'À vista, financiamento bancário ou permuta. Chaves: agendar com o Júlio. Comissão 5%.' }),
    un('novaHome', { dorm: 3, suites: 1, area: 127, vagas: '2', valor: 990000, iptu: 760, cond: 1100, vista: 'Frente mar total', det: 'porteira fechada', obs: 'Unidade sem número na tabela. Estuda veículo como parte do pagamento. Comissão fifty.' }),
  ]),

  /* ---------- Nova Home ---------- */
  predio('ed-mirza-frente-mar', 'Ed. Mirza', 'Maracanã', CB('12000'), ['novaHome'], [
    un('novaHome', { dorm: 1, area: 35, vagas: '1', valor: 340000, iptu: 180, cond: 426, vista: 'Vista mar · Av. Pres. Castelo Branco', det: 'sacada, garagem rotativa, porteira fechada', obs: 'Unidade sem número na tabela. Comissão 5%.' }),
  ]),
  predio('ilha-home-resort-frente-mar', 'Ilha Home Resort', 'Guilhermina', CB('1990'), ['novaHome'], [
    un('novaHome', { dorm: 3, area: 92, vagas: '2', valor: 1100000, iptu: 520, cond: 980, vista: 'Frente mar total', det: 'mobiliado, portaria 24h, lazer completo', obs: 'De R$ 1.200.000 por R$ 1.100.000. Unidade sem número na tabela. Estuda veículo como parte do pagamento. Comissão fifty.' }),
  ]),

  /* ---------- Márcio Masumoto ---------- */
  predio('res-lucas-frente-mar', 'Res. Lucas', 'Flórida', 'Rua Íris, 28', ['marcio'], [
    un('marcio', { unidade: '11', dorm: 3, suites: 1, area: 115, vagas: '2', valor: 990000, iptu: 712, cond: 1050, det: 'lazer: piscina adulto e infantil, academia, brinquedoteca, espaço de descanso e spa', obs: 'Lançamento. Comissão de 4% sobre o valor da tabela.' }),
  ]),

  /* ---------- Saga ---------- */
  predio('res-nelson-crevatin-frente-mar', 'Res. Nelson Crevatin', 'Tupi', 'Rua José da Silva Machado, 21 - Vila Tupi', ['saga'], [
    un('saga', { unidade: 'Cobertura 71/72', prefixo: 'Cobertura · ', dorm: 6, suites: 1, area: 235, vagas: '2', valor: 1390000, iptu: 771, cond: 1350, det: 'cobertura duplex, espaço gourmet com churrasqueira e forno a lenha, sauna', obs: 'Visitas com agendamento. Comissão 5%.' }),
  ]),

  /* ---------- Gomes e Ferreira: Costa do Mar ---------- */
  predio('costa-do-mar-frente-mar', 'Costa do Mar', 'Caiçara', 'Rua Maria de Lourdes Simões e Simões, 50 - Caiçara - Praia Grande/SP', ['gomes'], [
    un('gomes', { unidade: '156', dorm: 2, suites: 1, area: 83.61, vagas: '2', valor: 750000, cond: 634, det: 'lavabo, lazer completo, pronto para morar', obs: '10% de desconto à vista.' }),
    un('gomes', { unidade: '157', dorm: 2, suites: 1, area: 86.52, vagas: '2', valor: 770000, cond: 656.35, det: 'lavabo, lazer completo, pronto para morar', obs: '10% de desconto à vista.' }),
  ]),

  /* ---------- Eduardo Stefano ---------- */
  predio('res-laus-ramos-frente-mar', 'Res. Laus Ramos', 'Flórida', CB('19.684'), ['stefano'], [
    un('stefano', { unidade: '11', dorm: 2, area: 64, vagas: '1', valor: 365000, iptu: 272, cond: 643, acesso: 'escada', vista: 'Frente mar · Av. Pres. Castelo Branco', det: 'varanda, semi mobiliado, sem elevador', obs: 'Com proposta. Aceita financiamento bancário. Enviar foto do CRECI para autorizar visita. Comissão 5%.' }),
  ]),
  predio('res-solarium-frente-mar', 'Res. Solarium', 'Flórida', CB('18.358'), ['stefano'], [
    un('stefano', { unidade: '127', dorm: 2, suites: 1, area: 72, vagas: '1', valor: 565000, iptu: 412.75, cond: 511.52, vista: 'Vista mar · Av. Pres. Castelo Branco', det: 'mobiliado, cozinha planejada, varanda gourmet, vaga coletiva', obs: 'Aceita financiamento bancário. Visitas aos sábados só até as 14h. Comissão 5%.' }),
  ]),
  predio('res-matteo-frente-mar', 'Res. Matteo', 'Vila Dinápolis', 'Av. Gov. Mario Covas Júnior, 4778 - Mongaguá/SP', ['stefano'], [
    un('stefano', { unidade: '73', dorm: 2, suites: 1, area: 74, vagas: '1', valor: 425000, iptu: 366, cond: 730, vista: 'Edifício frente mar · vista mar definitiva', det: 'varanda gourmet, lazer completo', obs: 'Comissão 5%.' }),
  ], { cidade: 'Mongaguá' }),
  predio('res-porto-bello-frente-mar', 'Res. Porto Bello', 'Jardim Lunamar', 'Av. Gov. Mário Covas Jr, 594', ['stefano'], [
    un('stefano', { unidade: '35-B', dorm: 2, suites: 1, area: 75, vagas: '1', valor: 570000, cond: 485, vista: 'Edifício frente mar · vista mar', det: 'varanda gourmet, lazer completo', obs: 'Comissão 5%.' }),
  ], { cidade: 'Mongaguá' }),
  predio('res-splendour-frente-mar', 'Res. Splendour', 'Vila São Paulo', 'Rua João Zarzur, 55', ['stefano'], [
    un('stefano', { unidade: '156-A', dorm: 2, suites: 1, area: 79, vagas: '1', valor: 510000, iptu: 490, cond: 640, vista: 'Edifício frente mar · vista mar definitiva', det: 'varanda gourmet, lazer completo', obs: 'Comissão 5%.' }),
    un('stefano', { unidade: '155-B', dorm: 2, suites: 1, area: 79, vagas: '1', valor: 510000, iptu: 410, cond: 581, vista: 'Edifício frente mar · vista mar definitiva', det: 'varanda gourmet, lazer completo', obs: 'Comissão 5%.' }),
  ], { cidade: 'Mongaguá' }),

  /* ---------- William Buongiovanni ---------- */
  semNome('william', 'William Flórida 4 suítes', 'Flórida', null, un('william', { dorm: 4, suites: 4, area: 148, vagas: '2', valor: 1100000, iptu: 704, cond: 1800, acesso: 'elevador', andar: 4, det: 'piscina, salão de jogos, salão de festas com área gourmet', obs: 'A tabela não nomeia o prédio. 4º andar com elevador. Comissão fifty 6%.' })),

  /* ---------- Ariani Galeano ---------- */

  /* ---------- Jean Diegues ---------- */
  semNome('jean', 'Ref. 682', 'Tupi', null, un('jean', { dorm: 3, suites: 3, area: 113, vagas: '1', valor: 850000, iptu: 535, cond: 1368, det: 'área gourmet, lazer completo', obs: 'À vista ou financiamento. Comissão 6%. A tabela não nomeia o prédio.' })),
  semNome('jean', 'Ref. 713', 'Guilhermina', null, un('jean', { prefixo: 'Kitnet · ', dorm: 1, area: 30, vagas: '1', valor: 250000, iptu: 90, cond: 328.5, andar: 1, vista: 'Frente praia', det: 'mobiliado, bicicletário', obs: 'Tabela diz "frente praia". 1º andar. À vista ou financiamento. Comissão 5%.' })),
  semNome('jean', 'Ref. 716', 'Guilhermina', null, un('jean', { dorm: 1, area: 37, vagas: '1', valor: 320000, iptu: 105, cond: 440, andar: 11, vista: 'Frente praia', det: 'mobiliado, bicicletário', obs: 'Tabela diz "frente praia". 11º andar. À vista ou financiamento. Comissão 5%.' })),
  semNome('jean', 'Ref. 712', 'Guilhermina', null, un('jean', { dorm: 1, area: 38, vagas: '1', valor: 315000, iptu: 150, cond: 500, andar: 5, vista: 'Frente praia', det: 'mobiliado, bicicletário', obs: 'Tabela diz "frente praia". 5º andar. À vista ou financiamento. Comissão fifty.' })),

  /* ---------- Kátia Tavares e Flávio Belchior ---------- */
  semNome('kfFlavio', 'KF050', 'Caiçara', null, un('kfFlavio', { unidade: 'KF050', dorm: 1, area: 57, vagas: '1', valor: 250000, iptu: 208, cond: 300, andar: 2, acesso: 'escada', vista: 'Prédio frente mar · varanda frente mar', det: 'mobiliado', obs: '2º andar sem elevador. ' + COMISSAO_FIFTY })),
  semNome('kfFlavio', 'KF354', 'Maracanã', null, un('kfFlavio', { unidade: 'KF354', dorm: 2, suites: 1, area: 62, vagas: '1', valor: 500000, iptu: 350, cond: 650, vista: 'Prédio frente mar', det: 'varanda com churrasqueira a carvão, lazer', obs: COMISSAO_FIFTY })),
  semNome('kfFlavio', 'KF080', 'Mongaguá', null, un('kfFlavio', { unidade: 'KF080', dorm: 2, suites: 1, area: 81, vagas: '1', valor: 510000, iptu: 425, cond: 796, vista: 'Prédio frente mar · varanda vista mar', det: 'lazer (sem piscina)', obs: COMISSAO_FIFTY }), []),
  semNome('kfKatia', 'KF401', 'Real', null, un('kfKatia', { unidade: 'KF401', dorm: 2, suites: 1, area: 81, vagas: '1', valor: 520000, iptu: 546, cond: 905, vista: 'Prédio frente mar · vista mar', det: 'varanda gourmet, semi mobiliado, lazer', obs: COMISSAO_FIFTY })),
  semNome('kfKatia', 'KF057', 'Maracanã', null, un('kfKatia', { unidade: 'KF057', dorm: 2, suites: 1, area: 63, vagas: '1', valor: 520000, iptu: 328, cond: 477, vista: 'Prédio frente mar · vista mar', det: 'varanda com churrasqueira a carvão, mobiliado, lazer', obs: COMISSAO_FIFTY })),
  semNome('kfFlavio', 'KF608', 'Imperador', null, un('kfFlavio', { unidade: 'KF608', dorm: 2, suites: 1, area: 86, vagas: '1', valor: 530000, iptu: 278, cond: 1044, vista: 'Prédio frente mar · varanda vista mar', det: 'mobiliado, lazer', obs: COMISSAO_FIFTY })),
  semNome('kfKatia', 'KF033', 'Flórida', null, un('kfKatia', { unidade: 'KF033', dorm: 2, suites: 2, area: 98, vagas: '2', valor: 1080000, iptu: 562, cond: 715, det: 'varanda gourmet, sala 3 ambientes, mobiliado', obs: 'Planta original de 3 suítes, que pode ser revertida. ' + COMISSAO_FIFTY })),
  semNome('kfKatia', 'KF323', 'Caiçara', null, un('kfKatia', { unidade: 'KF323', dorm: 3, suites: 1, area: 94, vagas: '2', valor: 750000, iptu: 465, cond: 1200, det: 'varanda gourmet com churrasqueira a carvão, mobiliado, lazer', obs: COMISSAO_FIFTY })),
  semNome('kfKatia', 'KF390', 'Real', null, un('kfKatia', { unidade: 'KF390', dorm: 3, suites: 1, area: 128, vagas: '2', valor: 950000, iptu: 850, cond: 1560, det: 'varanda gourmet, mobiliado, lazer', obs: COMISSAO_FIFTY })),

  /* ---------- Coliseum (o código do anúncio vira o nome; preço = valor da tabela) ---------- */
  semNome('coliseum', 'AP3753', 'Flórida', null, un('coliseum', { unidade: 'AP3753', dorm: 2, suites: 1, area: 76, vagas: '1', valor: 490000, iptu: 365.82, cond: 596.43, vista: 'Prédio frente mar · vista mar', det: 'varanda gourmet envidraçada', obs: 'Chaves: agendar. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP4016', 'Aviação', null, un('coliseum', { unidade: 'AP4016', dorm: 2, suites: 1, area: 84, vagas: '1', valor: 440000, iptu: 365.82, cond: 596.43, vista: 'Prédio frente mar · sacadas com vista mar', det: 'mobiliado; lazer completo (piscina, quadra, espaço gourmet)', obs: 'Chaves: agendar. Condomínio e IPTU saem iguais aos do AP3753 na tabela. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP4203', 'Vila Assunção', null, un('coliseum', { unidade: 'AP4203', dorm: 2, suites: 1, area: 62, vagas: '1', valor: 480000, iptu: 324, cond: 600, det: 'sacada, mobiliado; elevador e salão de jogos', obs: 'À vista; aceita financiamento bancário. Chaves: agendar. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP4204', 'Vila Assunção', null, un('coliseum', { unidade: 'AP4204', dorm: 2, area: 60, vagas: '1', valor: 500000, iptu: 302.98, cond: 587, vista: 'Frente mar · sacadas vista mar', det: 'elevador e salão de jogos', obs: 'À vista; aceita financiamento bancário. Chaves: agendar. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP4184', 'Flórida', null, un('coliseum', { unidade: 'AP4184', dorm: 2, area: 86, vagas: '1', valor: 550000, iptu: 440, cond: 740, vista: 'Prédio frente mar · vista para o mar', det: 'sacada gourmet envidraçada; salão de festas e piscina', obs: 'À vista; estuda proposta de financiamento bancário. Chaves: agendar. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP3996', 'Flórida', null, un('coliseum', { unidade: 'AP3996', dorm: 2, area: 77, vagas: '1', valor: 580000, iptu: 350, cond: 600, vista: 'Prédio frente mar · vista livre', det: 'sacada gourmet envidraçada; salão de festas e piscina', obs: 'À vista; estuda proposta de financiamento bancário. Chaves: agendar. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP3893', 'Vila Assunção', null, un('coliseum', { unidade: 'AP3893', dorm: 2, suites: 1, area: 85, vagas: '1', valor: 620000, iptu: 281.87, cond: 773.8, vista: 'Em frente ao mar · vista para o mar', det: 'lazer com elevador, salão de jogos e salão de festas', obs: 'À vista ou financiamento bancário. Chaves: agendar. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP1990', 'Solemar', null, un('coliseum', { unidade: 'AP1990', dorm: 3, suites: 1, area: 105, vagas: '2', valor: 665000, iptu: 500, cond: 1200, det: 'varanda gourmet, elevador, lazer', obs: 'À vista ou financiamento bancário. Chaves: agendar. ' + COMISSAO_FIFTY })),
  semNome('coliseum', 'AP4019', 'Flórida', null, un('coliseum', { unidade: 'AP4019', dorm: 3, suites: 1, area: 102, vagas: '2', valor: 895000, vista: 'Prédio frente mar · varanda com vista mar', det: 'mobiliado; portaria 24h, piscina, academia, playground, churrasqueira, brinquedoteca, salão de festas', obs: 'Aceita financiamento. Chaves: agendar. Comissão fifty.' })),
  semNome('coliseum', 'KN0383', 'Guilhermina', null, un('coliseum', { prefixo: '', dorm: 1, area: 38, vagas: '1', valor: 275000, iptu: 117, cond: 521, det: 'mobiliado e todo reformado, portaria 24h, vaga rotativa', obs: 'Aceita financiamento bancário. Chaves: agendar. ' + COMISSAO_FIFTY })),
];

predios.find((p) => p.id === 'kfflavio-kf080').cidade = 'Mongaguá';

// conferência: toda unidade tem valor e área ou tipologia, e nenhum id se repete
const ids = new Set();
let n = 0;
for (const p of predios) {
  if (ids.has(p.id)) throw new Error(`id repetido: ${p.id}`);
  ids.add(p.id);
  for (const u of p.unidades) {
    n++;
    if (!(u.valor > 0)) throw new Error(`${p.id}/${u.unidade}: sem valor`);
    if (!u.tipologia) throw new Error(`${p.id}/${u.unidade}: sem tipologia`);
  }
}
predios.forEach((p) => (p.notas = p.notas ?? []));
const saida = {
  arquivo: 'Google Drive/5. FRENTE MAR',
  lidoEm: '2026-10-26',
  sobre: `Apartamentos escritos "frente mar" ou na Av. Pres. Castelo Branco, tirados das tabelas em PDF da pasta "5. FRENTE MAR" do Drive (${predios.length} prédios, ${n} unidades). Casas, locações e unidades só com "vista mar" fora da Av. Castelo Branco ficaram de fora. Quando o prédio não tem nome na tabela, o código do anúncio vira o nome.`,
  predios,
};
writeFileSync('dados/origem/frente-mar.json', JSON.stringify(saida, null, 1) + '\n');
console.log(`frente-mar.json: ${predios.length} prédios, ${n} unidades`);
