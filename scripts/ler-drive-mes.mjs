// Gera dados/origem/drive-mes.json: prédios das tabelas da pasta do mês ("Outubro - Tabelas") do Google Drive
// que ainda não estavam no painel ou estavam incompletos. Valores transcritos dos PDFs lidos pelo conector do Drive.
// Uso: node scripts/ler-drive-mes.mjs
import { writeFileSync } from 'node:fs';


const tip = (dorm, suites) => `${dorm} ${dorm === 1 ? 'dorm' : 'dorms'}` + (suites ? ` (${suites} ${suites === 1 ? 'suíte' : 'suítes'})` : '');
/** Unidade de revenda (valor único), no formato das demais origens. */
const rv = (fonteRef, x) => ({
  unidade: x.un,
  ...(x.andar ? { andar: x.andar } : {}),
  tipologia: x.tipologia ?? tip(x.dorm, x.suites),
  dorm: x.dorm,
  suites: x.suites,
  area: x.area,
  vagas: x.vagas,
  valor: x.valor,
  ...(x.cond ? { cond: x.cond } : {}),
  ...(x.iptu ? { iptu: x.iptu } : {}),
  status: 'disponivel',
  obs: x.obs ?? '',
  fonte: fonteRef.fonte,
  contato: fonteRef.contato,
  tabela: fonteRef.data,
  ...(x.vistaMar ? { vistaMar: true } : {}),
});
const tab = (f, arquivo) => [{ fonte: f.fonte, contato: f.contato, atualizadoEm: f.data, arquivo }];

const GALCON = { fonte: 'Galcon Empreendimentos (proprietário)', contato: '(13) 3592-3093 · (13) 98172-7608', data: 'sem data (arquivo de 21/10/2026)' };
const LITORAL = { fonte: 'Litoral Incorporadora', contato: '(13) 3471-4580', data: '13/10/2026' };
const PG = { fonte: 'P&G Construtora (revenda)', contato: 'Pereira (13) 99764-1519 · escritório (13) 3878-2700', data: 'sem data (arquivo de 21/10/2026)' };
const AEJ = { fonte: 'AEJ (tabela de revenda de 13/10/2026)', contato: 'Afonso Paiva (13) 99661-0903', data: '13/10/2026' };
const JSANTOS = { fonte: 'J Santos Construtora (revenda de 09/10/2026)', contato: '(13) 3494-3976 · WhatsApp (13) 99753-4833', data: '09/10/2026' };
const GRAFFIT = { fonte: 'Graffit (Cicero)', contato: 'Cicero (13) 99156-9953', data: 'sem data (arquivo de 23/10/2026)' };
const PREFIXO = '9. REVENDAS/';

const turim = (un, andar, area, entradaParc, mensal, chaves, total, dorm, suites) => ({
  unidade: un,
  andar,
  tipologia: `${dorm} dorms (${suites} ${suites === 1 ? 'suíte' : 'suítes'})`,
  dorm,
  suites,
  area,
  vagas: '2 (garagem coletiva)',
  valor: total,
  entrada: Math.round(entradaParc * 6 * 100) / 100,
  chaves,
  fluxo: { entrada: Math.round(entradaParc * 6 * 100) / 100, entradaQtd: 6, chaves, anualQtd: 8, anualVal: dorm === 3 ? (area > 100 ? 16250 : 15680) : 12500, parcQtd: 80, parcVal: mensal },
  status: 'disponivel',
  obs: `Entrada em 6x de R$ ${entradaParc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}; 80 mensais; 8 anuais; chaves R$ ${chaves.toLocaleString('pt-BR')}. Parcelas corrigidas pela poupança + 0,5. Desconto de 15% à vista ou 10% com 50% de entrada e saldo em até 24x. Garagem coletiva.`,
  fonte: 'Proprietário Marcelus (tabela atualizada em 29/08/2026)',
  contato: 'Marcelus (13) 97420-8586',
  tabela: '29/08/2026',
  vistaMar: true,
});

const predios = [
  {
    id: 'res-turim',
    nome: 'Res. Turim',
    cidade: 'Praia Grande',
    bairro: 'Caiçara',
    endereco: 'Rua José Alexandre Có, 213 (esquina com Rua Salvador Molinari) - Caiçara - Praia Grande/SP',
    fase: 'obra',
    entrega: '03/2026 (prevista na tabela)',
    diferenciais: [
      'Uma quadra do centro do Caiçara e 200 m da praia; vista para o mar das duas ruas',
      'Lazer completo: piscinas adulto e infantil, deck/solarium, prainha, coworking, sala movie, beauty spa, saunas',
      'Áreas comuns entregues mobiliadas pela construtora',
      'Terraço gourmet e terraço técnico para ar-condicionado; porcelanato em todo o apartamento',
    ],
    notas: [
      'Construmoura. Finais 1, 6 e 7 têm 3 dorms (2 suítes); finais 2, 3, 4 e 5 têm 2 dorms (1 suíte).',
      'Aceita imóvel como parte do pagamento (até 40%) e financiamento bancário para quitação. Prêmio de 0,5% ao corretor. Comissão de 5% inclusa.',
    ],
    tabelas: [{ fonte: 'Proprietário Marcelus (tabela atualizada em 29/08/2026)', contato: 'Marcelus (13) 97420-8586', atualizadoEm: '29/08/2026', arquivo: '4. FINANCIAMENTO DIRETO/MARCELUS CONDE - Aptos 2 e 3 dorm (Caiçara).pdf' }],
    unidades: [
      turim('142', 18, 79.73, 22058.67, 4102.91, 101175, 661760, 2, 1),
      turim('144', 18, 79.73, 22083.34, 4107.5, 101400, 662500, 2, 1),
      turim('146', 18, 111.53, 32343.67, 6015.92, 164975, 970311, 3, 2),
      turim('151', 19, 99.34, 27152.94, 5050.44, 122188.2, 814588, 3, 2),
      turim('153', 19, 80.31, 22352.94, 4157.65, 104446.95, 670588, 2, 1),
      turim('164', 20, 79.73, 22191.5, 4127.62, 102385.8, 665745, 2, 1),
      turim('165', 20, 79.73, 22138, 4117.68, 101907.6, 664150, 2, 1),
    ],
  },
  {
    id: 'monaco-canto-do-forte',
    nome: 'Mônaco',
    cidade: 'Praia Grande',
    bairro: 'Canto do Forte',
    endereco: 'Rua Tiradentes, 345 - Canto do Forte - Praia Grande/SP',
    fase: 'pronto',
    tabelas: tab(GALCON, PREFIXO + 'GALCON - Cobertura duplex 4 dorm (Forte) + Casa em Cond 2 dorm (Melvi).pdf'),
    notas: ['Cobertura pronta, porteira fechada. Somente financiamento bancário ou à vista. A casa em condomínio da mesma tabela (Balneário Melvi, em construção) entra na etapa de casas.'],
    unidades: [rv(GALCON, { un: '162', tipologia: 'Cobertura duplex 4 dorms (3 suítes)', dorm: 4, suites: 3, area: 166.26, vagas: '3 determinadas', valor: 2850000, obs: 'Cobertura duplex, 166,26 m² + 5,1 m² de armário. Pronto, porteira fechada. Somente financiamento bancário ou à vista.' })],
  },
  {
    id: 'ed-las-vegas-ocian',
    nome: 'Ed. Las Vegas',
    cidade: 'Praia Grande',
    bairro: 'Ocian',
    endereco: 'Rua Mario de Andrade, 128 - Ocian - Praia Grande/SP',
    fase: 'pronto',
    tabelas: tab(LITORAL, PREFIXO + 'LITORAL - Apto 3 dorm (Ocian).pdf'),
    unidades: [rv(LITORAL, { un: '81', dorm: 3, suites: 2, area: 114.1, vagas: '2', valor: 750000, cond: 1049.39, iptu: 754.51, obs: 'Salão de festas, salão de jogos, piscinas, 2 elevadores, gás encanado. Aceita financiamento bancário. A tabela marca o apto 81 "com proposta" (confirmar disponibilidade).' })],
  },
  {
    id: 'ed-italia-canto-do-forte',
    nome: 'Ed. Itália',
    cidade: 'Praia Grande',
    bairro: 'Canto do Forte',
    endereco: 'Avenida Mauricio José Cardoso, 574 - Canto do Forte - Praia Grande/SP',
    fase: 'pronto',
    lazer: ['Piscina na cobertura', 'Salão de jogos', 'Academia', 'Brinquedoteca', 'Espaço gourmet', 'Sauna', 'Cinema'],
    tabelas: tab(PG, PREFIXO + 'P&G - Aptos 1 dorm (Forte).pdf'),
    notas: ['A sala comercial 713 do Wave Offices (Santos) da mesma tabela entra na etapa de comerciais.'],
    unidades: [
      rv(PG, { un: '82', dorm: 2, suites: 1, area: 87.27, vagas: '2 (coletivas)', valor: 690000, cond: 954.03, iptu: 524.89, obs: 'Sacada com churrasqueira. Aceita financiamento bancário. Chaves na Av. Paris, 245, Boqueirão.' }),
      rv(PG, { un: '84', dorm: 1, suites: 0, area: 59.37, vagas: '1 (coletiva)', valor: 450000, cond: 696.78, iptu: 346.41, obs: 'Semimobiliado, com os planejados. Sacada com churrasqueira. Aceita financiamento bancário. Agendar visita.' }),
    ],
  },
  {
    id: 'personnalite-aej',
    nome: 'Personnalité',
    cidade: 'Praia Grande',
    bairro: 'Aviação',
    endereco: 'Rua João Ramalho, nº 486 - Aviação - Praia Grande/SP',
    fase: 'obra',
    tabelas: tab(AEJ, PREFIXO + 'AEJ - Aptos 2 dorm (Mirim-Mongaguá-SP).pdf'),
    unidades: [rv(AEJ, { un: '93', dorm: 2, suites: 1, area: 81.54, vagas: '2 livres', valor: 495000, cond: 582, obs: 'Revenda. Varanda gourmet com churrasqueira. Somente à vista ou banco. Bonificação de R$ 10 mil ao corretor. Chaves no local da obra.' })],
  },
  {
    id: 'mr-seas-palace',
    nome: 'Res. Mr. Seas Palace',
    cidade: 'Praia Grande',
    bairro: 'Mirim',
    endereco: 'Rua 23 de Maio, 80 - Mirim - Praia Grande/SP',
    fase: 'obra',
    entrega: 'Fev/2027',
    tabelas: tab(AEJ, PREFIXO + 'AEJ - Aptos 2 dorm (Mirim-Mongaguá-SP).pdf'),
    unidades: [rv(AEJ, { un: '104', dorm: 2, suites: 1, area: 57.72, vagas: '1 livre', valor: 395000, obs: 'Revenda. Sacada gourmet com churrasqueira; 50 m da praia. Obra em alvenaria, entrega prevista para fev/2027. Somente à vista ou banco.' })],
  },
  {
    id: 'res-montreal-mongagua',
    nome: 'Res. Montreal',
    cidade: 'Mongaguá',
    bairro: 'Centro',
    endereco: 'Av. Gov. Mario Covas Jr., 6420 - Mongaguá/SP',
    fase: 'pronto',
    lazer: ['Prédio frente mar', 'Salão de festas', 'Salão de jogos', 'Terraço coberto', 'Brinquedoteca', 'Piscina adulto e infantil'],
    tabelas: tab(AEJ, PREFIXO + 'AEJ - Aptos 2 dorm (Mirim-Mongaguá-SP).pdf'),
    notas: ['Prédio frente mar entregue em dez/2025, 144 apartamentos. Bônus de R$ 5 mil ao corretor. Aceita financiamento bancário.'],
    unidades: [
      rv(AEJ, { un: '35', dorm: 2, suites: 1, area: 68.21, vagas: '1 livre', valor: 389000, cond: 500, vistaMar: true, obs: 'Varanda com vista mar. Chaves na portaria.' }),
      rv(AEJ, { un: '44', dorm: 2, suites: 1, area: 67.55, vagas: '1 livre', valor: 389000, cond: 500, vistaMar: true, obs: 'Varanda com vista mar. Chaves na portaria.' }),
    ],
  },
  {
    id: 'jocelino-viii',
    nome: 'Jocelino VIII',
    cidade: 'Praia Grande',
    bairro: 'Aviação',
    endereco: 'R. Dr. Júlio de Mesquita Filho, 152 - Aviação - Praia Grande/SP',
    fase: 'pronto',
    tabelas: tab(JSANTOS, PREFIXO + 'J SANTOS - Aptos 1 e 2 dorm (Aviação) + Cobertura 4 dorm (Aviação).pdf'),
    notas: ['Unidades de revenda da J Santos. Correção: poupança acumulativa + 0,5%. A comissão é dividida entre o corretor e a construtora.'],
    unidades: [
      rv(JSANTOS, { un: '53', dorm: 2, suites: 1, area: 80.03, vagas: '1 (coletiva)', valor: 550000, cond: 874.15, obs: 'Sacada gourmet. Entrada e parcelas a combinar. Chaves na portaria.' }),
      rv(JSANTOS, { un: '66', dorm: 2, suites: 1, area: 80.03, vagas: '1 (coletiva)', valor: 550000, cond: 874.15, obs: 'Sacada gourmet. Entrada e parcelas a combinar. Chaves na portaria.' }),
      rv(JSANTOS, { un: '161', tipologia: 'Cobertura 4 dorms (2 suítes)', dorm: 4, suites: 2, area: 180.31, vagas: '3 demarcadas', valor: 1800000, cond: 1658.67, obs: 'Cobertura com terraço gourmet e piscina. Entrada e parcelas a combinar. Chaves na portaria.' }),
    ],
  },
  {
    id: 'ed-itamaraca',
    nome: 'Ed. Itamaracá',
    cidade: 'Praia Grande',
    bairro: 'Aviação',
    endereco: 'Av. Castelo Branco, 4100 - Aviação - Praia Grande/SP',
    fase: 'pronto',
    tabelas: tab(JSANTOS, PREFIXO + 'J SANTOS - Aptos 1 e 2 dorm (Aviação) + Cobertura 4 dorm (Aviação).pdf'),
    unidades: [rv(JSANTOS, { un: '34-A', dorm: 1, suites: 0, area: 50, vagas: '1 (coletiva)', valor: 350000, cond: 620, iptu: 260, obs: 'Somente à vista. Chaves na portaria (autorização no escritório da J Santos).' })],
  },
  {
    id: 'itarare-149',
    nome: 'Rua Itararé, 149',
    cidade: 'Praia Grande',
    bairro: 'Guilhermina',
    endereco: 'R. Itararé, 149 - Vila Guilhermina - Praia Grande/SP',
    fase: 'pronto',
    notas: ['Prédio sem nome na tabela da Graffit; identificado pelo endereço. A tabela traz também um aluguel (2 dorms, frente mar, Caiçara), fora do painel de venda.'],
    tabelas: tab(GRAFFIT, PREFIXO + 'GRAFFIT - Apto 2 dorm (Caiçara) + Apto 3 dorm (Guilhermina).pdf'),
    unidades: [rv(GRAFFIT, { un: '31', dorm: 3, suites: 2, area: 156, vagas: '2', valor: 950000, cond: 1422.5, iptu: 626.3, obs: 'Quarto de serviço com banheiro, sacadas na sala e nos 3 dormitórios, móveis planejados, 4 banheiros, porcelanato, portaria 24h, acesso cadeirante.' })],
  },
];

writeFileSync('dados/origem/drive-mes.json', JSON.stringify({ arquivo: 'Google Drive/Outubro - Tabelas', lidoEm: '2026-10-26', sobre: 'Prédios das tabelas da pasta do mês que ainda não estavam no painel ou estavam incompletos.', predios }, null, 1) + '\n');
console.log(predios.length, 'prédios,', predios.reduce((n, p) => n + p.unidades.length, 0), 'unidades');
