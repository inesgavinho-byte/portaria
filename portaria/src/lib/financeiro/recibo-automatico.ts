/**
 * Recibo automático — núcleo puro (sem Supabase, sem "use server").
 *
 * Decide e prepara a emissão/envio automático de recibo quando um
 * pagamento é confirmado. As funções aqui são testáveis em isolado;
 * a orquestração (BD, PDF, email) vive em src/lib/actions/recibo-automatico.ts.
 */

export type ContactoFraccao = {
  papel: string | null;
  email: string | null;
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Prioridade de papel na ordem de destinatários do email. */
const PRIORIDADE_PAPEL: Record<string, number> = {
  proprietario: 0,
  inquilino: 1,
  representante: 2,
};

export function emailValido(email: string | null | undefined): email is string {
  if (!email) return false;
  return EMAIL_VALIDO.test(email.trim());
}

/**
 * Emails de destino do recibo da fração: todos os contactos com email
 * válido (proprietário e inquilino — quem paga nem sempre é o
 * proprietário), sem duplicados (case-insensitive), proprietário primeiro.
 */
export function resolverDestinatarios(contactos: ContactoFraccao[]): string[] {
  const vistos = new Set<string>();
  const ordenados = contactos
    .filter((c) => emailValido(c.email))
    .sort(
      (a, b) =>
        (PRIORIDADE_PAPEL[a.papel ?? ""] ?? 9) -
        (PRIORIDADE_PAPEL[b.papel ?? ""] ?? 9)
    );
  const destinos: string[] = [];
  for (const c of ordenados) {
    const chave = (c.email as string).trim().toLowerCase();
    if (!vistos.has(chave)) {
      vistos.add(chave);
      destinos.push((c.email as string).trim());
    }
  }
  return destinos;
}

export type DecisaoEmissao = {
  /** O pagamento já tem recibo associado (idempotência). */
  jaTemRecibo: boolean;
  /** Toggle recibo_auto_email do condomínio. */
  automatico: boolean;
};

/** Emite automaticamente só quando o toggle está ON e não há recibo ainda. */
export function decidirEmissao({ jaTemRecibo, automatico }: DecisaoEmissao): boolean {
  return automatico && !jaTemRecibo;
}

export const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** "Janeiro de 2026" */
export function periodoLabel(ano: number, mes: number): string {
  const nome = MESES_PT[Math.min(Math.max(mes, 1), 12) - 1];
  return `${nome} de ${ano}`;
}

/** "10 800,00 €" (pt-PT; espaços normalizados para espaço simples). */
export function formatarEuros(cents: number): string {
  return (cents / 100).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).replace(/\u00a0/g, " ");
}

export const METODO_LABEL: Record<string, string> = {
  transferencia: "Transferência bancária",
  mbway: "MBway",
  dinheiro: "Dinheiro",
  debito_direto: "Débito direto",
  outro: "Outro",
};
