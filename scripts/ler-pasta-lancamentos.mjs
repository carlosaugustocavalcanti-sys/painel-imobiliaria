// Lê as tabelas da pasta OneDrive/Outros/Lesan/Lançamentos que ainda não eram painéis
// (Harmony, Parque das Araucárias, Seven, Toninho, Ectual e a tabela da Gomes Pacheco)
// e grava dados/origem/pasta-lancamentos.json. O texto sai do PDF com o PDFKit do macOS
// (scripts/pdf-texto.swift); só o que o texto não traz (reservado/vendido por cor ou carimbo)
// foi conferido nas imagens das páginas e está nas constantes STATUS_* abaixo.
// Uso: node scripts/ler-pasta-lancamentos.mjs [pasta dos PDFs]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? join(homedir(), 'OneDrive/Outros/Lesan/Lançamentos');
const texto = (arquivo) => execFileSync('swift', ['scripts/pdf-texto.swift', join(BASE, arquivo)], { encoding: 'utf8', maxBuffer: 1 << 26 });
const falhar = (msg) => {
  throw new Error(msg);
};

/* ---------- números ---------- */
/** "1.039,06" → 1039.06 · "1.085.000,00" → 1085000 · "220 MIL" → 220000 · "795,100.00" (formato inglês) → 795100 */
function dinheiro(s) {
  s = String(s).replace(/R\$|\s/g, '').toUpperCase();
  const mil = s.endsWith('MIL');
  s = s.replace('MIL', '');
  let n;
  if (/,\d{2}$/.test(s)) n = +s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{2}$/.test(s) && s.includes(',')) n = +s.replace(/,/g, '');
  else n = +s.replace(/\./g, '');
  if (Number.isNaN(n)) falhar(`Número ilegível: ${s}`);
  return mil ? n * 1000 : n;
}
const decimal = (s) => +String(s).replace(',', '.');
const arred = (n) => Math.round(n * 100) / 100;
const andarDe = (u) => (/^\d+/.test(u) ? +String(parseInt(u)).slice(0, -1) || undefined : undefined);
const tipologia = (d, s) => `${d} dorm${d > 1 ? 's' : ''}${s ? ` (${s} suíte${s > 1 ? 's' : ''})` : ''}`;
const limpar = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const MONEY = /\d{1,3}(?:\.\d{3})*,\d{2}/g;

/* ============================================================
 * HARMONY (TerraNova) — HARMONY RESIDENCE - ENTRADA PARCELADA.pdf
 * ============================================================ */
function harmony() {
  const arquivo = 'HARMONY/HARMONY RESIDENCE - ENTRADA PARCELADA.pdf';
  const linhas = texto(arquivo).split('\n');
  const unidades = [];
  const inicio = /^(\d{2,3}) ([\d,]+) (\d) Dorm\. (\d) Súite, (\d) Vagas Privativas(.*)$/;
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(inicio);
    if (!m) continue;
    let bloco = m[6];
    for (let j = i + 1; j < linhas.length && !inicio.test(linhas[j]) && !/^(FINAL|===|APTO|M²)/.test(linhas[j]); j++) bloco += ' ' + linhas[j];
    const [, unidade, area, dorms, suites, vagas] = m;
    const base = limpar({
      unidade,
      andar: andarDe(unidade),
      final: +unidade % 10,
      tipologia: tipologia(+dorms, +suites),
      dorm: +dorms,
      suites: +suites,
      area: decimal(area),
      vagas: `${vagas} privativas`,
    });
    if (/VENDIDA/.test(bloco)) unidades.push({ ...base, status: 'vendido' });
    else if (/RESERVADA/.test(bloco)) unidades.push({ ...base, status: 'reservado' });
    else {
      const v = (bloco.match(MONEY) ?? []).map(dinheiro);
      if (v.length !== 6) falhar(`Harmony ${unidade}: esperava 6 valores, achei ${v.length}`);
      const [entrada, mensal, anual, chaves, financ, valor] = v;
      // entrada + 32 mensais + 1 anual + chaves + financiamento = valor da tabela (tolerância de centavos)
      if (Math.abs(entrada + 32 * mensal + anual + chaves + financ - valor) > 1) falhar(`Harmony ${unidade}: a soma não fecha`);
      unidades.push({
        ...base,
        valor,
        entrada,
        chaves,
        financ,
        fluxo: { entrada, chaves, anualQtd: 1, anualVal: anual, parcQtd: 32, parcVal: mensal },
        status: 'disponivel',
        obs: 'Anual em março/2028. 32 mensais. Financiamento bancário Caixa.',
      });
    }
  }
  if (unidades.length !== 48) falhar(`Harmony: esperava 48 linhas (4 finais × 12 andares), li ${unidades.length}`);
  return {
    id: 'harmony-residence',
    nome: 'Harmony Residence',
    cidade: 'Praia Grande',
    bairro: 'Aviação',
    endereco: 'Rua Monte Castelo, 111 - Aviação - Praia Grande/SP',
    fase: 'lancamento',
    entrega: 'Jun/2029',
    diferenciais: [
      'Primeira quadra da praia',
      'Fechadura digital nas portas de entrada',
      'Ponto de TV e infra de gás na varanda gourmet',
      '2 vagas privativas',
      'Entrada parcelada com financiamento bancário Caixa no período de obra, a partir de R$ 36.000',
    ],
    notas: [
      'Construtora TerraNova. Tabela sujeita a alteração sem aviso prévio.',
      'Financiamento bancário Caixa Econômica, com assessoria especializada. Aprovação de crédito bancário obrigatória.',
      'Parcelamento da entrada corrigido pelo INCC (acumulativo e mensal).',
      'Imagens e plantas meramente ilustrativas.',
    ],
    lanc: { gravacao: 'a_gravar', modalidade: 'bancario', tabelaRecebida: true },
    tabelas: [
      {
        fonte: 'TerraNova (tabela de entrada parcelada)',
        contato: 'Escritório TerraNova (13) 3491-1223 · Fernanda, ADM de vendas (13) 99634-6566',
        atualizadoEm: 'sem data (arquivo de 22/10/2026)',
        arquivo,
      },
    ],
    unidades: unidades.map((u) => ({
      ...u,
      fonte: 'TerraNova (tabela de entrada parcelada)',
      contato: 'Escritório TerraNova (13) 3491-1223 · Fernanda (13) 99634-6566',
      tabela: 'sem data (arquivo de 22/10/2026)',
      vistaMar: false,
    })),
  };
}

/* ============================================================
 * PARQUE DAS ARAUCÁRIAS (Arco-Íris-Mar) — só 2 unidades, conferidas na imagem
 * ============================================================ */
function araucarias() {
  const arquivo = 'PARQUE DAS ARAUCARIAS/PARQUE DAS ARAUCARIAS - TABELA.pdf';
  const t = texto(arquivo);
  // linha de cada unidade: "101 79.510 ... 2 VAGAS 20,70m2 160.033 R$ 795,100.00 R$ 119,265.00 R$ 119,265.00 R$ 4,638.08"
  const m = [...t.matchAll(/^(\d{3}) ([\d.]+)\n2 VAGAS 20,70m2 ([\d.]+) R\$ ([\d.,]+)\nR\$ ([\d.,]+)\nR\$ ([\d.,]+)\nR\$\n([\d.,]+)/gm)];
  if (m.length !== 2) falhar(`Araucárias: esperava 2 unidades, li ${m.length}`);
  // a tabela escreve as áreas com 3 casas e ponto: "79.510" = 79,51 m² (o JavaScript já lê o ponto como decimal)
  const m2 = (s) => arred(+s);
  const unidades = m.map(([, unidade, ap, total, preco, ent, entrega, parc]) => {
    const valor = dinheiro(preco);
    const entrada = dinheiro(ent);
    const chaves = dinheiro(entrega);
    const parcVal = dinheiro(parc);
    if (Math.abs(entrada + chaves + 120 * parcVal - valor) > 1) falhar(`Araucárias ${unidade}: a soma não fecha`);
    return {
      unidade,
      andar: andarDe(unidade),
      tipologia: tipologia(2, 1),
      dorm: 2,
      suites: 1,
      area: m2(ap),
      vagas: '2',
      valor,
      entrada,
      chaves,
      fluxo: { entrada, chaves, anualQtd: 0, parcQtd: 120, parcVal },
      status: 'disponivel',
      obs: `Área total ${(+total).toLocaleString("pt-BR")} m² e garagem de 20,70 m² por vaga (colunas da tabela). Entrada em 15% e 15% na entrega. A tabela mostra a área privativa como "${ap}", lida como ${m2(ap).toLocaleString('pt-BR')} m².`,
      fonte: 'Arco-Íris-Mar (tabela de lançamento)',
      tabela: '17/10/2026',
      vistaMar: false,
    };
  });
  return {
    id: 'parque-das-araucarias',
    nome: 'Parque das Araucárias',
    cidade: 'Praia Grande',
    bairro: 'Vila Balneária',
    endereco: 'Avenida Presidente Castelo Branco, 16040 - Vila Balneária - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fev/2027',
    diferenciais: ['Todas as unidades com 2 dormitórios, sendo 1 suíte', '2 vagas de garagem'],
    notas: [
      'Construtora Arco-Íris-Mar. Incorporação: matrícula 234.037, Registro de Imóveis de Praia Grande.',
      'Financiamento direto com a construtora, com correção pela poupança cumulativa até a entrega; depois, poupança + 0,3% ao mês cumulativa.',
      'Proposta com imóvel como parte do pagamento: o custo de transferência para a vendedora é do comprador.',
      'A construtora pode adquirir mobiliário para as áreas comuns e cobrar a cota de cada unidade.',
    ],
    lanc: { gravacao: 'a_gravar', modalidade: 'direto', tabelaRecebida: true },
    tabelas: [{ fonte: 'Arco-Íris-Mar (tabela de lançamento)', atualizadoEm: '17/10/2026', arquivo }],
    unidades,
  };
}

/* ============================================================
 * SEVEN GUILHERMINA — TABELA SEVEN GUILHERMINA - EXTERNA 16.09.pdf
 * ============================================================ */
// Linhas cinza ("RESERVADO" na legenda). Só aparece na imagem das páginas; conferido página a página.
const STATUS_SEVEN_RESERVADAS = new Set(['51', '61', '71', '81', '52', '62', '72', '43', '34', '55', '65', '75', '36', '66']);
function seven() {
  const arquivo = 'SEVEN - GUILHERMINA/TABELA SEVEN GUILHERMINA - EXTERNA 16.09.pdf';
  const linhas = texto(arquivo).split('\n');
  const re = /^(\d+) 2 ([\d,]+) (FRENTE PRAIA|FRENTE KENNEDY|LATERAL KENNEDY|FUNDOS KENNEDY|FUNDOS PRAIA|LATERAL PRAIA) R\$ ([\d.,]+) R\$ ([\d.,]+) R\$ ([\d.,]+) R\$ ([\d.,]+) R\$ ([\d.,]+)$/;
  const unidades = [];
  const folgas = [];
  for (const l of linhas) {
    const m = l.match(re);
    if (!m) continue;
    const [, unidade, area, posicao, valor, entrada, parcela, anual, unica] = m;
    // "FRENTE PRAIA" é o lado do prédio, não frente mar (fica na Rua Dr. João Sampaio): sai "Frente, lado praia"
    const [onde, lado] = posicao.toLowerCase().split(' ');
    const v ={ valor: dinheiro(valor), entrada: dinheiro(entrada), parcVal: dinheiro(parcela), anualVal: dinheiro(anual), unica: dinheiro(unica) };
    folgas.push(arred(v.valor - (v.entrada + 24 * v.parcVal + 2 * v.anualVal + v.unica)));
    unidades.push({
      unidade,
      andar: andarDe(unidade),
      final: +unidade % 10,
      tipologia: '2 dorms',
      dorm: 2,
      area: decimal(area),
      det: `${onde.charAt(0).toUpperCase() + onde.slice(1)}, lado ${lado === 'kennedy' ? 'Av. Kennedy' : lado}`,
      vagas: '1',
      valor: v.valor,
      entrada: v.entrada,
      fluxo: { entrada: v.entrada, anualQtd: 2, anualVal: v.anualVal, parcQtd: 24, parcVal: v.parcVal, unica: v.unica },
      status: STATUS_SEVEN_RESERVADAS.has(unidade) ? 'reservado' : 'disponivel',
      fonte: 'Seven Guilhermina (tabela direta com a construtora)',
      tabela: '16/09/2026',
      vistaMar: false,
    });
  }
  if (unidades.length !== 57) falhar(`Seven: esperava 57 unidades (10+10+10+9+9+9), li ${unidades.length}`);
  if (unidades.filter((u) => u.status === 'reservado').length !== STATUS_SEVEN_RESERVADAS.size) falhar('Seven: unidade reservada que não existe na tabela');
  return {
    id: 'seven-guilhermina',
    nome: 'Seven Guilhermina',
    cidade: 'Praia Grande',
    bairro: 'Guilhermina',
    endereco: 'Rua Dr. João Sampaio, 840 - Guilhermina - Praia Grande/SP',
    fase: 'lancamento',
    entrega: 'Jun/2028',
    lazer: ['Piscina borda infinita', 'Sauna', 'Pet shower', 'Academia', 'Salão de festas', 'Salão de jogos', 'Espaço kids'],
    diferenciais: ['Lazer completo, com piscina de borda infinita', 'Todas as unidades com 1 vaga de garagem'],
    notas: [
      'Pagamento direto com a construtora; correção por INCC ao mês, de forma acumulativa, durante as obras.',
      `A coluna "Parcela única" não tem data na tabela. Entrada + 24 parcelas + 2 anuais + parcela única ficam de R$ ${Math.min(...folgas).toLocaleString('pt-BR')} a R$ ${Math.max(...folgas).toLocaleString('pt-BR')} abaixo do valor final; a tabela não explica a diferença.`,
      'Posição de cada unidade: frente, lateral ou fundos, para a praia ou para a Av. Kennedy (coluna "Posição" da tabela).',
    ],
    lanc: { gravacao: 'a_gravar', modalidade: 'direto', tabelaRecebida: true },
    tabelas: [{ fonte: 'Seven Guilhermina (tabela direta com a construtora)', atualizadoEm: '16/09/2026', arquivo }],
    unidades,
  };
}

/* ============================================================
 * GOMES PACHECO (Raimundo Gomes) — 1 unidade, a mesma já em lancamentos
 * ============================================================ */
function gomesPacheco() {
  const arquivo = 'GOMES PACHECO - AVIAÇÃO/TABELA GOMES PACHECO.pdf';
  const t = texto(arquivo);
  const m = t.match(/^175 ([\d,]+) R\$ ([\d.,]+) R\$ ([\d.,]+) R\$ ([\d.,]+) R\$ ([\d.,]+)$/m);
  if (!m || !/130 X PCL/.test(t) || !/R\$ 33\.000,00/.test(t)) falhar('Gomes Pacheco: tabela mudou de formato');
  const [, area, chaves, anual, parcela, total] = m.map((x, i) => (i === 0 || i === 1 ? x : dinheiro(x)));
  return {
    unidade: '175',
    andar: 17,
    final: 5,
    tipologia: tipologia(2, 1),
    dorm: 2,
    suites: 1,
    area: decimal(area),
    vagas: '2',
    valor: total,
    entrada: 99000,
    chaves,
    fluxo: { entrada: 99000, chaves, anualQtd: 10, anualVal: anual, parcQtd: 130, parcVal: parcela },
    status: 'disponivel',
    obs: 'Entrada de R$ 99 mil em ato, 30 e 60 dias (R$ 33.000 cada). 10 anuais a partir de dez/26. Desconto à vista: 10%.',
    fonte: 'RA Gomes Pacheco (tabela de vendas)',
    contato: '(13) 3472-5291 · (13) 3471-4460',
    tabela: '20/10/2026',
    vistaMar: false,
    _arquivo: arquivo,
  };
}

/* ============================================================
 * TONINHO — TABELA TONINHO.pdf (atualizada em 09/10/2026)
 * ============================================================ */
const TON = {
  fonte: 'Toninho Investidor (tabela de 09/10/2026)',
  contato: 'Luciano ou Lucas: (13) 99702-5476 · (13) 98226-5967',
  tabela: '09/10/2026',
};
const PREDIOS_TONINHO = [
  { re: /RESIDENCIAL VOGUE/, id: 'vogue', nome: 'Ed. Vogue', bairro: 'Canto do Forte', endereco: 'Avenida Paris, 724 - Canto do Forte - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Vogue', lazer: ['Salão de beleza', 'Spa center', 'Pet care', 'Academia', 'Salão de jogos adulto e infantil', 'Salão de festas', 'Espaço gourmet grill', 'Cinema', 'Net room', 'Sauna', 'Piscina adulto e infantil'], extra: 'Aceita financiamento bancário.' },
  { re: /RESIDENCIAL COSTA MAGGIORE/, id: 'costa-maggiore', nome: 'Costa Maggiore', bairro: 'Canto do Forte', endereco: 'Rua General Otelo Rodrigues Franco, 215 - Canto do Forte - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Costa Maggiore', lazer: ['Salão de jogos', 'Salão de festas', 'Espaço gourmet grill', 'Cinema', 'Brinquedoteca', 'Academia', 'Máquina de gelo', 'Piscina adulto e infantil com deck', 'Sauna seca e úmida', 'Spa com hidro'], extra: '3 elevadores, 3 vagas privativas demarcadas no subsolo, aquecimento a gás, alto padrão com gerador de energia. Visitas de seg. a sex. até 16h e sáb. até 14h. Aceita financiamento bancário.' },
  { re: /RESIDENCIAL OCEÂNICA/, id: 'oceanica', nome: 'Res. Oceânica', bairro: 'Aviação', endereco: 'Av. Presidente Castelo Branco, 4460 - Aviação - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Oceânica', lazer: ['Salão de festas com copa', 'Espaço gourmet', 'Academia', 'Área de convivência', 'Brinquedoteca', 'Quadra poliesportiva', 'Piscina aquecida com deck e sauna', 'Armários de praia'], extra: 'Chaves no local. Visitas de seg. a sex. até 17h e sáb. até 13h. Aceita financiamento bancário.' },
  { re: /RESIDENCIAL PERSONNALITTÉ/, id: 'personnalite', nome: 'Personnalité', bairro: 'Aviação', endereco: 'Rua João Ramalho, 486 - Aviação - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Personnalité', lazer: ['Salão de jogos', 'Salão de festas', 'Espaço gourmet', 'Terraço grill', 'Cinema', 'Piscina adulto e infantil', 'Spa center', 'Sauna úmida', 'Academia', 'Mini quadra poliesportiva', 'Brinquedoteca', 'Playground', 'Lounge coberto e descoberto'], extra: 'Chaves no local. Visitas de seg. a sáb. até 17h.' },
  { re: /RESIDENCIAL SPLENDOR/, id: 'splendor', nome: 'Ed. Splendor', bairro: 'Aviação', endereco: 'Rua Martin Afonso de Souza, 559 - Aviação - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Splendor', lazer: ['Salão de jogos', 'Salão de festas', 'Espaço gourmet', 'Cinema', 'Spa', 'Brinquedoteca', 'Lounge', 'Academia', 'Piscina adulto com borda infinita e infantil', 'Sauna', 'Solarium'], extra: 'Chaves no local. Aceita financiamento bancário. Apartamento 101 com móveis planejados.' },
  { re: /RESIDENCIAL CARMINDA/, id: 'carminda', nome: 'Ed. Carminda', bairro: 'Aviação', endereco: 'Rua Luzia Encarnação Vidal, 69 - Aviação - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Carminda', lazer: ['Salão de jogos', 'Salão de festas', 'Piscina adulto e infantil aquecida', 'Academia', 'Sauna', 'Brinquedoteca', 'Espaço gourmet', 'Armários de praia'], extra: 'Aceita financiamento bancário. Apartamento 154 com móveis planejados.' },
  { re: /RESIDENCIAL SEIXEIRO E SARAIVA/, id: 'seixeiro-e-saraiva', nome: 'Res. Seixeiro e Saraiva', bairro: 'Aviação', endereco: 'Rua Pero Vaz de Caminha, 315 - Aviação - Praia Grande/SP', fase: 'pronto', cond: ['Ed. Seixeiro', 'Ed. Saraiva'], lazer: ['Salão de jogos adulto e teen', 'Salão de festas adulto e teen', 'Terraço grill', 'Academia', 'Piscina adulto e infantil com deck molhado', 'Playground', 'Brinquedoteca', 'Pista de cooper', 'Área de convivência', 'Armários de praia', 'Quadra poliesportiva no G1'], extra: 'Chaves no local. Visitas de seg. a sex. até 16h e sáb. até 13h. Apartamento 52 (Torre Saraiva): sacada envidraçada, box de vidro, fechadura eletrônica, ar-condicionado, painel de TV na sala, pias em granito e rebaixamento de teto em todo o apartamento.' },
  { re: /RESIDENCIAL PEDRO/, id: 'pedro', nome: 'Res. Pedro', bairro: 'Tupi', endereco: 'Rua Uirapuru, 100 - Tupi - Praia Grande/SP', fase: 'obra', entrega: 'Dez/2026', cond: null, lazer: ['Salão de jogos', 'Salão de festas', 'Piscina adulto e infantil com deck', 'Área de recreação infantil', 'Academia', 'Terraço grill'], extra: 'Visita só com autorização: ligar para a Toninho.' },
  { re: /RESIDENCIAL INFINITY CAIÇARA/, id: 'infinity-caicara', nome: 'Res. Infinity Caiçara', bairro: 'Caiçara', endereco: 'Rua São Domingos, 669 - Caiçara - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Infinity Caiçara', lazer: ['Piscina adulto e infantil', 'Salão de jogos', 'Salão de festas', 'Deck seco', 'Deck molhado', 'Academia', 'Playground', 'Spa center', 'Área de convívio pet', 'Mini quadra', 'Pet care'], extra: 'Aceita financiamento bancário.' },
  { re: /RESIDENCIAL ATLANTIC VILLE/, id: 'atlantic-ville', nome: 'Atlantic Ville', bairro: 'Caiçara', endereco: 'Rua Flausina de Oliveira Rosa, 52 - Caiçara - Praia Grande/SP', fase: 'pronto', cond: 'Ed. Atlantic Ville', lazer: ['Salão de jogos adulto e infantil', 'Espaço teen', 'Espaço movie', 'Quadra recreativa', 'Playground', 'Brinquedoteca', 'Pet care', 'Beauty center', 'Academia', 'Espaço grill', 'Terraço grill', 'Salão de festas', 'Sauna seca e úmida', 'Sala de massagem', 'Piscina coberta', 'Spa center', 'Piscina adulto e infantil com borda infinita'], extra: 'Visitas de seg. a sex. até 17h e sáb. até 13h. Garagem demarcada e privativa. Aceita financiamento bancário. Apartamento 103 com móveis planejados.' },
  { re: /RESIDENCIAL RIVIERA PALACE/, id: 'riviera-palace', nome: 'Riviera Palace', bairro: 'Caiçara', endereco: 'Av. Presidente Castelo Branco, 11.422 - Caiçara - Praia Grande/SP', fase: 'pronto', cond: 'Riviera Palace', lazer: ['Salão de jogos', 'Salão de festas', 'Piscina adulta e infantil', 'Deck molhado e seco', 'Pet care', 'Espaço pet', 'Terraço grill', 'Spa', 'Sauna seca e úmida', 'Academia', 'Playground', 'Brinquedoteca', 'Mini quadra'], extra: 'Visitas de seg. a sáb. até 17h. Garagens demarcadas e privativas. Aceita financiamento bancário.' },
  { re: /RESIDENCIAL PLATINUM/, id: 'res-platinum', nome: 'Res. Platinum', cidade: 'Mongaguá', bairro: 'Centro', endereco: 'Av. São Paulo, 283 - Centro - Mongaguá/SP', fase: 'obra', entrega: 'Mar/2027', cond: null, lazer: ['Salão de jogos', 'Salão de festas', 'Piscina adulta e infantil', 'Deck seco e molhado', 'Descanso/spa', 'Saunas', 'Academia', 'Sala de cinema', 'Espaço gourmet', 'Coworking', 'Sala de reunião', 'Quadra poliesportiva', 'Playground', 'Espaço grill', 'Brinquedoteca', 'Salão de jogos teen', 'Pet center'], extra: 'Próximo do comércio. Visitas de seg. a sex. até 17h, com horário agendado.' },
];
function toninho() {
  const arquivo = 'TONINHO/TABELA TONINHO.pdf';
  const linhas = texto(arquivo).split('\n');
  const porId = new Map(PREDIOS_TONINHO.map((p) => [p.id, { ...p, unidades: [] }]));
  let atual = null;
  let torre = '';
  let parc = 0;
  let anuais = 0;
  const cabecalho = /^APTOS? DORMS SUÍTES VAGA\(?S?\)? M² ENTRADA SALDO (\d+)X (\d+) ANUAIS VALOR$/;
  const linha = /^(\d+[A-Z]?) (\d) (\d) (\d) (\d+) R\$ ([\d.]+(?: MIL)?) R\$ ([\d.,]+) R\$ ([\d.]+(?: MIL)?) (?:R\$ ([\d.,]+(?: MIL)?)|C\/PROPOSTA)$/;
  const condIptu = new Map(); // "Ed. Vogue|82" → { cond, iptu }
  for (const l of linhas) {
    const b = PREDIOS_TONINHO.find((p) => p.re.test(l));
    if (b) {
      atual = porId.get(b.id);
      torre = '';
      continue;
    }
    if (/^TORRE SEIXEIRO/.test(l)) torre = 'Torre Seixeiro';
    if (/^TORRE SARAIVA/.test(l)) torre = 'Torre Saraiva';
    const c = l.match(cabecalho);
    if (c) {
      parc = +c[1];
      anuais = +c[2];
      continue;
    }
    const m = l.match(linha);
    if (m && atual) {
      const [, unidade, dorms, suites, vagas, area, entradaT, saldoT, anualT, valorT] = m;
      const entrada = dinheiro(entradaT);
      const parcVal = dinheiro(saldoT);
      const anualVal = dinheiro(anualT);
      const valor = valorT ? dinheiro(valorT) : null;
      const soma = arred(entrada + parc * parcVal + anuais * anualVal);
      // entrada + parcelas + anuais = valor (a tabela arredonda as parcelas: tolerância de R$ 1.000)
      if (valor && Math.abs(soma - valor) > 1000) falhar(`Toninho ${atual.nome} ${unidade}: soma ${soma} ≠ valor ${valor}`);
      atual.unidades.push(
        limpar({
          unidade,
          andar: andarDe(unidade),
          tipologia: tipologia(+dorms, +suites),
          dorm: +dorms,
          suites: +suites,
          area: +area,
          det: torre,
          vagas,
          valor,
          entrada,
          fluxo: { entrada, anualQtd: anuais, anualVal, parcQtd: parc, parcVal },
          status: 'disponivel',
          obs: valor ? undefined : `Valor "com proposta" na tabela. Entrada + parcelas + anuais somam R$ ${soma.toLocaleString('pt-BR')}.`,
          ...TON,
          vistaMar: false,
          _tabela: atual.id,
        }),
      );
      continue;
    }
    const ci = l.match(/^(Ed\. [^–]+?|Riviera Palace)\s*[–-]?\s*Apto\.? ([\d/]+) R\$ ([\d.,]+) (?:R\$ ([\d.,]+)|Não tem)$/);
    if (ci) for (const apto of ci[2].split('/')) condIptu.set(`${ci[1].trim()}|${apto}`, { cond: dinheiro(ci[3]), iptu: ci[4] ? dinheiro(ci[4]) : undefined });
  }
  const predios = [];
  for (const p of porId.values()) {
    if (!p.unidades.length) falhar(`Toninho: nenhuma unidade lida em ${p.nome}`);
    const nomes = [].concat(p.cond ?? []);
    for (const u of p.unidades) {
      const alvo = nomes.length === 1 ? nomes[0] : u.det === 'Torre Seixeiro' ? 'Ed. Seixeiro' : 'Ed. Saraiva';
      const ci = nomes.length ? condIptu.get(`${alvo}|${u.unidade}`) : null;
      if (nomes.length && !ci) falhar(`Toninho: sem condomínio/IPTU para ${alvo} ${u.unidade}`);
      if (ci) Object.assign(u, limpar(ci));
      delete u._tabela;
      if (!u.det) delete u.det;
    }
    predios.push({
      id: p.id,
      nome: p.nome,
      cidade: p.cidade ?? 'Praia Grande',
      bairro: p.bairro,
      endereco: p.endereco,
      fase: p.fase,
      ...(p.entrega ? { entrega: p.entrega } : {}),
      lazer: p.lazer,
      notas: [
        p.extra,
        'Parcelas corrigidas 0,85% ao mês, 1ª em jun/2027. Troca: imóvel em média 30% do valor (sob avaliação) + moeda no ato + pequeno saldo parcelado ou diferença à vista; o custo da transferência é do comprador. Comissão de venda: 5%.',
        'Promoção da tabela, válida até 30/10/2026: brinde de TV 60" em vendas de 2 ou 3 dorms acima de R$ 1 milhão e iPhone 17 256 GB acima de R$ 1,5 milhão (exceto o Platinum). Só vale para vendas nas condições e valores da tabela.',
      ].filter(Boolean),
      tabelas: [{ ...{ fonte: TON.fonte, contato: TON.contato, atualizadoEm: TON.tabela }, arquivo }],
      unidades: p.unidades,
    });
  }
  const total = predios.reduce((a, p) => a + p.unidades.length, 0);
  if (total !== 47) falhar(`Toninho: esperava 47 unidades, li ${total}`);
  return predios;
}

/* ============================================================
 * ECTUAL — TABELA ECTUAL LANÇAMENTOS.pdf (16/10/2026)
 * ============================================================ */
const ECT = { fonte: 'Ectual Imóveis (tabela de 16/10/2026)', contato: 'André (13) 98112-7028 · CRECI 028.493-J', tabela: '16/10/2026' };
const GERAL_ECTUAL =
  'Condição geral da tabela Ectual (vale onde não houver forma de pagamento própria): financiamento direto com entrada a partir de 40% e saldo em até 100x, corrigido pela poupança + 0,5% ao mês acumulativo; à vista com desconto a partir de 10%.';
// Reservado/vendido por carimbo na imagem: "unidade na tabela" → status
const STATUS_ECTUAL = { 'spazzio-dellmare|171': 'reservado', 'parque-dos-coqueiros|85 O': 'reservado', 'ocean-park|163 B': 'vendido', 'res-matteo|114': 'reservado' };
// A ordem dos blocos no texto do PDF não é a da página; por isso cada página lista os rótulos esperados, na ordem do texto.
// Formato: [rótulo na tabela, prédio, opções]. A leitura falha se a página trouxer outra sequência.
const PAGINAS_ECTUAL = {
  2: [
    ...['53', '101', '104', '151', '152', '153', '154'].map((r) => [r, 'res-unique']),
    ['71', 'ilhas-de-santorini'],
    ['112', 'spazzio-dellmare'],
    ['171', 'spazzio-dellmare'],
    ['51', 'bellagio'],
    ['65', 'bellagio'],
  ],
  3: [
    ...['143.', '163', '174.', '175.'].map((r) => [r, 'ocean-park', { torre: 'A' }]),
    ...['141.', '143.', '146.', '153', '161', '163', '167'].map((r) => [r, 'ocean-park', { torre: 'B' }]),
    ['191', 'raimundo-gomes'],
    ['197', 'raimundo-gomes'],
    ['26', 'casa-jose-agapito-cardoso-26', { casa: true }],
  ],
  4: [
    ['65 O', 'parque-dos-coqueiros'],
    ['85 O', 'parque-dos-coqueiros'],
    ['137', 'costa-do-mar', { unico: 'cond' }],
    ['147', 'costa-do-mar', { unico: 'cond' }],
    ['225', 'atlantic-ville'],
    ['138 A', 'torres'],
  ],
  5: ['81', '82', '83', '84', '85', '86', '87', '131', '132', '133', '134', '135', '136', '137', '151', '152', '153', '154', '155', '156', '157'].map((r) => [r, 'evora', { torre: 'A' }]),
  6: ['81', '82', '83', '84', '85', '86', '87', '88', '131', '132', '133', '134', '135', '136', '137', '138', '151', '152', '153', '154', '155', '156', '157', '158'].map((r) => [r, 'evora', { torre: 'B' }]),
  7: [['31', 'res-manaca', { manaca: true }], ['81.', 'res-matteo'], ['111', 'res-matteo'], ['114.', 'res-matteo']],
};
const PREDIOS_ECTUAL = {
  'res-unique': { nome: 'Res. Unique', bairro: 'Canto do Forte', endereco: 'Rua General Otelo Rodrigues Franco, 310 - Canto do Forte - Praia Grande/SP', fase: 'obra', entrega: 'Mar/2027', notas: ['Em obras, previsão março/2027. RI R.03, matrícula 235.783.'] },
  'ilhas-de-santorini': { nome: 'Res. Ilhas de Santorini', bairro: 'Canto do Forte', endereco: 'Rua Xixová, 246 - Canto do Forte - Praia Grande/SP', fase: 'pronto', notas: ['Financiamento direto: 50% de entrada e saldo em até 40 meses (não aceita bancário). Locação: pacote de R$ 5.000 (garantia: seguro fiança). Visita só com autorização. RI R.17/25.539.', 'A tabela não informa a fase do prédio; marcado como pronto porque traz condomínio e IPTU.'], condicao: true },
  'spazzio-dellmare': { nome: "Res. Spazzio Dell'Mare", bairro: 'Canto do Forte', endereco: 'Rua Rui Barbosa, 93 - Canto do Forte - Praia Grande/SP', fase: 'pronto', notas: ['Venda somente à vista ou financiamento bancário. Visita com agendamento prévio.', 'Apto 112, matrícula 169.998: totalmente mobiliado e decorado; 3 suítes, adaptado para 1 suíte dupla + 1 suíte normal; 2 vagas demarcadas. Apto 171, matrícula 169.984: totalmente mobiliado; 3 suítes + dormitório + banheiro social; 3 vagas demarcadas.'], condicao: true },
  bellagio: { nome: 'Res. Bellagio', bairro: 'Guilhermina', endereco: 'Alameda das Américas, 162 - Guilhermina - Praia Grande/SP', fase: 'obra', entrega: 'Nov/2026', notas: ['Previsão de entrega nov/2026. RI R.02, matrícula 237.726.'] },
  'raimundo-gomes': { nome: 'Raimundo Gomes', bairro: 'Aviação', endereco: 'Rua Alberto Santos Dumont, 91 - Campo da Aviação - CEP 11702-340 - Praia Grande/SP', fase: 'obra', entrega: 'Dez/2026', notas: ['A Ectual indica previsão de entrega em dez/2026; a pasta do painel de lançamentos tinha o prédio como entregue. RI R.03, matrícula 213.199.'] },
  'ocean-park': { nome: 'Ocean Park', bairro: 'Ocian', endereco: 'Rua Comendador Otto Carlos Golanda, 200 - Ocian - Praia Grande/SP', fase: 'pronto', notas: ['Entregue em 13/12 (ano não informado). Chaves na portaria; visita só com autorização prévia, de seg. a dom. das 8h às 17h. Taxa de R$ 5.000 de rateio dos móveis e equipamentos das áreas comuns. RI R.03, matrícula 204.780.'], condicao: true },
  'casa-jose-agapito-cardoso-26': { nome: 'Casa · Rua José Agapito Cardoso, 26', bairro: 'Maracanã', endereco: 'Rua José Agapito Cardoso, 26 - Maracanã - Praia Grande/SP', fase: 'pronto', notas: ['Casa, não apartamento. Perto da praia; chaves na Bom Lugar Imóveis. Venda somente por financiamento bancário ou à vista. Matrícula individualizada 55.498.'] },
  'parque-dos-coqueiros': { nome: 'Parque dos Coqueiros', bairro: 'Caiçara', endereco: 'Av. Presidente Castelo Branco, 13642 - Vila Caiçara, Praia Grande/SP', fase: 'pronto', notas: ['Usado. À vista com 10% de desconto ou 8% no financiamento bancário. Visita só com autorização. Apto 65 (com móveis planejados), matrícula 198.276: entrada de R$ 450.000 e saldo em até 100x. Apto 85, matrícula 198.728: entrada de R$ 400.000 e saldo em até 50x.'] },
  'costa-do-mar': { nome: 'Costa do Mar', bairro: 'Caiçara', endereco: 'Rua Maria de Lourdes Simões e Simões - Caiçara - Praia Grande/SP', fase: 'pronto', notas: ['Entregue em 20/12/2025. Aptos lado rua: finais 1, 4, 6 e 7; lado prédio: finais 2, 3 e 5. Mobília e equipamentos das áreas comuns cobrados com o condomínio: 24 x R$ 795,00, a 1ª em março/26. Visita só com autorização, sem visitas aos domingos e feriados. RI R.04, matrícula 228.268.'], condicao: true },
  'atlantic-ville': {},
  torres: { nome: 'Torres', bairro: 'Caiçara', endereco: 'Rua São Romério, 15 - Caiçara - Praia Grande/SP', fase: 'obra', entrega: 'Dez/2026', notas: ['Previsão dez/2026. Taxa de R$ 5.000 de rateio dos móveis e equipamentos das áreas comuns. RI R.01, matrícula 142.857.'] },
  evora: { nome: 'Res. Évora', bairro: 'Flórida', endereco: 'Av. Presidente Castelo Branco x Rua André Filho - Flórida - Praia Grande/SP', fase: 'lancamento', entrega: 'Jul/2028', diferenciais: ['Lançamento frente mar', 'Lazer completíssimo'], notas: ['Lançamento frente mar, previsão julho/2028. RI R.01, matrícula 252.439. Taxa de rateio das mobílias e equipamentos das áreas comuns: R$ 7.000 em 5 parcelas de R$ 1.400, a 1ª em janeiro/2028.'], condicao: true },
  'res-manaca': { nome: 'Res. Manacá', bairro: 'Flórida', endereco: 'Av. Presidente Castelo Branco, 17.508 - Flórida - Praia Grande/SP', fase: 'pronto', notas: ['Apartamento tipo garden, frente total para o mar. Visita só com autorização prévia. Matrícula individualizada 216.780.'], condicao: true },
  'res-matteo': { nome: 'Res. Matteo', cidade: 'Mongaguá', bairro: 'A confirmar', endereco: 'Av. Gov. Mario Covas Júnior, 4778 - Mongaguá/SP', fase: 'pronto', notas: ['Condição especial por tempo limitado: à vista com 20% de desconto; financiamento bancário com 18%. Portaria remota: pedir autorização, visitas das 9h às 17h de seg. a sáb. Taxa de R$ 3.600 de rateio dos móveis e equipamentos das áreas comuns, à vista na assinatura do contrato. Apto 111 com porcelanato e varanda envidraçada. RI R.09, matrícula 26.005.'] },
};
// "<id>|<unidade>" → texto próprio da unidade
const OBS_ECTUAL = {
  'spazzio-dellmare|112': 'Totalmente mobiliado e decorado; 3 suítes, adaptado para 1 suíte dupla + 1 normal. 2 vagas demarcadas.',
  'spazzio-dellmare|171': 'Totalmente mobiliado. 3 suítes + dormitório + banheiro social. 3 vagas demarcadas.',
  'parque-dos-coqueiros|65 O': 'Móveis planejados. Entrada de R$ 450.000 e saldo em até 100x no financiamento direto.',
  'parque-dos-coqueiros|85 O': 'Entrada de R$ 400.000 e saldo em até 50x no financiamento direto.',
  'res-matteo|111': 'Com porcelanato e varanda envidraçada.',
  'ilhas-de-santorini|71': 'Financiamento direto: 50% de entrada e saldo em até 40 meses. Não aceita bancário.',
};
function ectual() {
  const arquivo = 'ECTUAL/TABELA ECTUAL LANÇAMENTOS.pdf';
  const paginas = texto(arquivo).split(/^=== PÁGINA (\d+)$/m);
  const porPagina = {};
  for (let i = 1; i < paginas.length; i += 2) porPagina[+paginas[i]] = paginas[i + 1];
  const reLinha = /^(\d+(?:\s?[A-Z]|\.)?)\s+(\d)\s+(\d)\s+(\d)\s+([\d,]+)-?\s*(.*)$/;
  const predios = new Map();
  for (const [pag, esperado] of Object.entries(PAGINAS_ECTUAL)) {
    const linhas = [];
    for (const l of porPagina[pag].split('\n')) {
      let m = l.match(reLinha);
      if (pag === '7' && /^31 /.test(l)) {
        // Manacá: "31 2 3 1 103 168 m² 560 1.046 999.000" (A.U., A. total, IPTU, COND., VALOR)
        m = l.match(/^(31) (\d) (\d) (\d) (\d+) (\d+) m² (\d+) ([\d.]+) ([\d.]+)$/);
        if (m) linhas.push({ rotulo: '31', vagas: m[2], dorms: m[3], suites: m[4], area: m[5], areaTotal: m[6], iptu: m[7], cond: m[8], valor: m[9], manaca: true });
        continue;
      }
      if (!m || +m[1].replace(/\D/g, '') === 0) continue;
      // a tabela do Tupi (casa, sem valor) e as linhas de rodapé não casam com "…M² … VALOR" completo
      const resto = m[6].trim().split(/\s+/).filter(Boolean);
      const ultimo = resto[resto.length - 1];
      if (!ultimo || !/^[\d.]+$/.test(ultimo) || !/\d\.\d{3}$/.test(ultimo)) continue;
      linhas.push({ rotulo: m[1], vagas: m[2], dorms: m[3], suites: m[4], area: m[5], meio: resto.slice(0, -1).filter((x) => x !== '-'), valor: ultimo });
    }
    const ordem = linhas.map((l) => l.rotulo).join('|');
    const alvo = esperado.map(([r]) => r).join('|');
    if (ordem !== alvo) falhar(`Ectual página ${pag}: linhas lidas (${ordem}) ≠ esperadas (${alvo})`);
    linhas.forEach((l, i) => {
      const [rotulo, id, op = {}] = esperado[i];
      const cfg = PREDIOS_ECTUAL[id];
      const unidade = rotulo.replace(/\.$/, '').replace(/^(\d+)\s?O$/, '$1 O') + (op.torre ? ` ${op.torre}` : '');
      const chaveStatus = `${id}|${unidade}`;
      const dorms = +l.dorms;
      const suites = +l.suites;
      const colunas = id === 'ocean-park' ? ['cond', 'iptu'] : ['iptu', 'cond'];
      const meio = l.meio ?? [];
      const cm = {};
      if (l.manaca) Object.assign(cm, { iptu: dinheiro(l.iptu), cond: dinheiro(l.cond) });
      else if (op.casa) {
        if (meio[0]) cm.iptu = dinheiro(meio[0]);
      } else if (meio.length === 2) {
        cm[colunas[0]] = dinheiro(meio[0]);
        cm[colunas[1]] = dinheiro(meio[1]);
      } else if (meio.length === 1) {
        cm[op.unico ?? colunas[0]] = dinheiro(meio[0]);
      }
      const u = limpar({
        unidade,
        andar: op.casa ? undefined : andarDe(rotulo),
        tipologia: op.casa ? `Casa · ${tipologia(dorms, suites)}` : tipologia(dorms, suites),
        dorm: dorms,
        suites,
        area: decimal(l.area),
        det: op.torre ? `Torre ${op.torre}` : l.manaca ? 'Apartamento tipo garden, frente total para o mar' : undefined,
        vagas: l.vagas,
        valor: dinheiro(l.valor),
        ...cm,
        status: STATUS_ECTUAL[chaveStatus] ?? 'disponivel',
        obs: [OBS_ECTUAL[chaveStatus], l.manaca ? `Área total ${l.areaTotal} m².` : undefined].filter(Boolean).join(' ') || undefined,
        ...ECT,
        vistaMar: id === 'evora' || l.manaca ? true : false,
        vista: id === 'evora' ? 'Lançamento frente mar' : l.manaca ? 'Frente total para o mar' : undefined,
        entregaUnidade: cfg.entrega,
      });
      if (!predios.has(id)) predios.set(id, []);
      predios.get(id).push(u);
    });
  }
  return predios;
}

/* ============================================================
 * Monta o arquivo
 * ============================================================ */
function montar() {
  const lista = [harmony(), araucarias(), seven()];
  const gp = gomesPacheco();
  const ton = toninho();
  const ect = ectual();

  // Raimundo Gomes: a unidade 175 (Gomes Pacheco) + 191 e 197 (Ectual)
  const cfgRG = PREDIOS_ECTUAL['raimundo-gomes'];
  const { _arquivo, ...u175 } = gp;
  lista.push({
    id: 'raimundo-gomes',
    nome: cfgRG.nome,
    cidade: 'Praia Grande',
    bairro: cfgRG.bairro,
    endereco: cfgRG.endereco,
    fase: 'pronto',
    notas: cfgRG.notas,
    tabelas: [
      { fonte: 'RA Gomes Pacheco (tabela de vendas)', contato: '(13) 3472-5291 · (13) 3471-4460', atualizadoEm: '20/10/2026', arquivo: _arquivo },
      { fonte: ECT.fonte, contato: ECT.contato, atualizadoEm: ECT.tabela, arquivo: 'ECTUAL/TABELA ECTUAL LANÇAMENTOS.pdf' },
    ],
    unidades: [u175, ...(ect.get('raimundo-gomes') ?? []).map((u) => ({ ...u, fase: 'obra' }))],
  });
  ect.delete('raimundo-gomes');

  // Atlantic Ville: unidades da Toninho + cobertura 225 da Ectual no mesmo prédio
  const atl = ton.find((p) => p.id === 'atlantic-ville');
  atl.unidades.push(...(ect.get('atlantic-ville') ?? []));
  atl.notas.push('A Ectual cita o prédio como Av. Presidente Castelo Branco, 12420 (RI sob R.03, matrícula 217.437); a Toninho, como Rua Flausina de Oliveira Rosa, 52.');
  atl.tabelas.push({ fonte: ECT.fonte, contato: ECT.contato, atualizadoEm: ECT.tabela, arquivo: 'ECTUAL/TABELA ECTUAL LANÇAMENTOS.pdf' });
  ect.delete('atlantic-ville');
  lista.push(...ton);

  for (const [id, unidades] of ect) {
    const cfg = PREDIOS_ECTUAL[id];
    lista.push({
      id,
      nome: cfg.nome,
      cidade: cfg.cidade ?? 'Praia Grande',
      bairro: cfg.bairro,
      endereco: cfg.endereco,
      fase: cfg.fase,
      ...(cfg.entrega ? { entrega: cfg.entrega } : {}),
      ...(cfg.diferenciais ? { diferenciais: cfg.diferenciais } : {}),
      notas: [...cfg.notas, ...(cfg.condicao ? [GERAL_ECTUAL] : [])],
      ...(id === 'evora' ? { lanc: { gravacao: 'a_gravar', modalidade: 'direto', tabelaRecebida: true } } : {}),
      tabelas: [{ fonte: ECT.fonte, contato: ECT.contato, atualizadoEm: ECT.tabela, arquivo: 'ECTUAL/TABELA ECTUAL LANÇAMENTOS.pdf' }],
      unidades,
    });
  }
  return lista;
}

const predios = montar();
const total = predios.reduce((a, p) => a + p.unidades.length, 0);
writeFileSync(
  'dados/origem/pasta-lancamentos.json',
  JSON.stringify(
    {
      pasta: 'OneDrive/Outros/Lesan/Lançamentos',
      lidoEm: '2026-10-25',
      sobre:
        'Tabelas da pasta Lançamentos que ainda não eram painéis: Harmony, Parque das Araucárias, Seven, Gomes Pacheco (Raimundo Gomes), Toninho e Ectual. Texto extraído dos PDFs por scripts/ler-pasta-lancamentos.mjs; reservado/vendido conferido nas imagens das páginas.',
      predios,
    },
    null,
    1,
  ) + '\n',
);
console.log(`${predios.length} prédios, ${total} unidades → dados/origem/pasta-lancamentos.json`);
for (const p of predios) console.log(`  ${p.id.padEnd(30)} ${String(p.unidades.length).padStart(3)} un  ${p.fase}`);
