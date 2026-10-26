// Gera dados/origem/drive-mes.json: prédios das tabelas da pasta do mês ("Outubro - Tabelas") do Google Drive
// que ainda não estavam no painel ou estavam incompletos. Valores transcritos dos PDFs lidos pelo conector do Drive.
// Uso: node scripts/ler-drive-mes.mjs
import { writeFileSync } from 'node:fs';

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
];

writeFileSync('dados/origem/drive-mes.json', JSON.stringify({ arquivo: 'Google Drive/Outubro - Tabelas', lidoEm: '2026-10-26', sobre: 'Prédios das tabelas da pasta do mês que ainda não estavam no painel ou estavam incompletos.', predios }, null, 1) + '\n');
console.log(predios.length, 'prédios,', predios.reduce((n, p) => n + p.unidades.length, 0), 'unidades');
