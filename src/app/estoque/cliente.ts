import { FASE_ROTULO, rotuloMar } from './busca';
import { brl, brl2, m2, vagasTexto } from './formato';
import { Predio, Unidade } from './modelo';

/** Texto pronto para mandar ao cliente: sem número da unidade e sem dados internos (fonte, contato, comissão). */
export function textoCliente(p: Predio, u: Unidade): string {
  return [
    `${p.nome} · ${p.bairro !== 'A confirmar' ? p.bairro + ', ' : ''}${p.cidade}`,
    [u.tipologia, u.area ? m2(u.area) : '', vagasTexto(u.vagas)].filter(Boolean).join(' · '),
    rotuloMar(u, p),
    u.valor ? `Valor: ${brl(u.valor)}` : 'Valor sob consulta',
    u.entrada ? `Entrada a partir de ${brl(u.entrada)}` : '',
    u.cond ? `Condomínio: ${brl2(u.cond)}` : '',
    u.iptu ? `IPTU: ${brl2(u.iptu)}` : '',
    FASE_ROTULO[u.fase] + (p.entrega && u.fase !== 'pronto' ? ` · entrega ${p.entrega}` : ''),
    'Valores sujeitos a confirmação.',
    'Carlos Cavalcanti · CRECI 331032 · @carlos_cavalcanti_imoveis_',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Copia o texto; devolve false quando o navegador não deixa. */
export async function copiarParaCliente(p: Predio, u: Unidade): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(textoCliente(p, u));
    return true;
  } catch {
    return false;
  }
}
