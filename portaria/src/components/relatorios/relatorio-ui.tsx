/**
 * Peças de apresentação do relatório do fornecedor.
 *
 * São componentes de servidor sem estado: existem para que a página não tenha
 * de repetir as mesmas dezenas de classes, não para introduzir uma segunda
 * implementação. Há UMA árvore de HTML — estas peças produzem-na, e o ecrã e o
 * papel divergem apenas em CSS (`src/styles/relatorio-print.css`).
 *
 * As marcas `data-*` são o contrato com esse CSS:
 *   data-bloco      unidade que não deve ser cortada entre páginas
 *   data-tabela     contentor de scroll que no papel deixa de o ser
 *   data-numerico   célula de valor: alinhada à direita, algarismos tabulares
 *   data-natureza   classificação, que no papel passa a contorno e texto
 *   data-realce     cor com significado, a preservar na impressão
 *   data-rodape     rodapé do documento
 */

import type { ContratoMemoriaNatureza } from "@/types/database";

/*
 * `useGrouping: "always"` é deliberado. O pt-PT usa `minimumGroupingDigits: 2`,
 * pelo que 6360 sai sem separador e 15 900 sai com — numa coluna de valores
 * lado a lado isso lê-se como ordens de grandeza diferentes. Num relatório
 * financeiro os milhares separam-se sempre.
 */
export const euro = (cents: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    useGrouping: "always",
  }).format(cents / 100);

/**
 * Formata uma data, tolerando valores inválidos.
 *
 * `Intl.DateTimeFormat.format()` lança `RangeError: Invalid time value` quando
 * recebe uma Data inválida. Num Server Component isso derruba o render inteiro
 * e o utilizador vê apenas um digest. Uma data ilegível deve degradar para um
 * travessão, não para uma página em branco.
 */
export const dataCurta = (valor: string | null) => {
  if (!valor) return "—";
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(instante);
};

export const dataLonga = (valor: string) => {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instante);
};

/* ------------------------------------------------------------------ secções */

export function Secao({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-britishGreen/25 pb-2">
        <h2 className="font-title text-[1.35rem] leading-tight text-ink">{titulo}</h2>
        {nota && <p className="font-body text-[11px] uppercase tracking-[0.14em] text-oliveGray">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p data-bloco className="border-l-2 border-warmBeige/60 bg-softCream/40 px-4 py-3 font-body text-sm text-oliveGray">
      {children}
    </p>
  );
}

export function NotaRodape({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 font-body text-xs leading-5 text-oliveGray">{children}</p>;
}

/* ----------------------------------------------------------------- natureza */

const NATUREZA_TEXTO: Record<ContratoMemoriaNatureza, string> = {
  facto: "FACTO",
  inferencia: "INFERÊNCIA",
  conflito: "CONFLITO",
  pendente: "PENDENTE",
};

/*
 * No ecrã a cor distingue depressa; no papel a cor pode não existir. Por isso a
 * marca é sempre textual e entre parênteses rectos, e o CSS de impressão troca
 * o preenchimento por contorno. Em escala de cinzas continua a ler-se
 * `[CONFLITO]` — a informação não vive na cor.
 */
const NATUREZA_ECRA: Record<ContratoMemoriaNatureza, string> = {
  facto: "bg-britishGreenSoft text-britishGreen",
  inferencia: "bg-softCream text-oliveGray ring-1 ring-inset ring-oliveGray/25",
  conflito: "bg-alert/10 text-alert ring-1 ring-inset ring-alert/40",
  pendente: "bg-warmBeige/25 text-ink ring-1 ring-inset ring-warmBeige",
};

export function MarcaNatureza({ natureza }: { natureza: ContratoMemoriaNatureza }) {
  const texto = NATUREZA_TEXTO[natureza] ?? natureza.toUpperCase();
  return (
    <span
      data-natureza={natureza}
      data-realce={natureza === "conflito" ? "" : undefined}
      className={`inline-block whitespace-nowrap px-1.5 py-0.5 font-body text-[9px] font-semibold uppercase tracking-[0.12em] ${
        NATUREZA_ECRA[natureza] ?? NATUREZA_ECRA.facto
      }`}
    >
      [{texto}]
    </span>
  );
}

/** Referências às fontes, no formato [E01] [E04]. */
export function Referencias({ codigos }: { codigos: string[] }) {
  if (codigos.length === 0) return null;
  return (
    <span className="font-body text-[10px] font-semibold tracking-[0.08em] text-britishGreen">
      {codigos.map((codigo) => `[${codigo}]`).join(" ")}
    </span>
  );
}

/* ------------------------------------------------------------------ números */

/**
 * Um número do resumo executivo.
 *
 * Tipografia grande, rótulo pequeno, divisória discreta — não um cartão de
 * dashboard. `destaque` reserva-se aos quatro valores que respondem à pergunta
 * "quanto foi facturado, quanto saiu, quanto falta e quanto está travado".
 */
export function Numero({
  rotulo,
  valor,
  nota,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div className="px-1 py-1">
      <p className="font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-oliveGray">{rotulo}</p>
      <p
        className={`mt-1.5 font-title tabular-nums leading-none text-ink ${
          destaque ? "text-[1.9rem]" : "text-[1.15rem]"
        }`}
      >
        {valor}
      </p>
      {nota && <p className="mt-1.5 font-body text-[11px] leading-4 text-oliveGray">{nota}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ tabelas */

export type Coluna = {
  cabecalho: string;
  /** Percentagem da largura, para o `table-layout: fixed` da impressão. */
  largura: string;
  numerico?: boolean;
};

export function Tabela({ colunas, children }: { colunas: Coluna[]; children: React.ReactNode }) {
  return (
    <div data-tabela className="overflow-x-auto border-y border-britishGreen/20">
      <table className="w-full min-w-[640px] border-collapse text-left font-body text-xs text-oliveGray">
        <colgroup>
          {colunas.map((coluna) => (
            <col key={coluna.cabecalho} style={{ width: coluna.largura }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-britishGreen/25">
            {colunas.map((coluna) => (
              <th
                key={coluna.cabecalho}
                scope="col"
                data-numerico={coluna.numerico ? "" : undefined}
                className="px-3 py-2.5 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-ink"
              >
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Celula({
  children,
  numerico = false,
  esbatido = false,
}: {
  children: React.ReactNode;
  numerico?: boolean;
  esbatido?: boolean;
}) {
  return (
    <td
      data-numerico={numerico ? "" : undefined}
      className={`border-t border-britishGreen/10 px-3 py-2.5 align-top ${
        numerico ? "text-right tabular-nums" : ""
      } ${esbatido ? "text-oliveGray/70" : ""}`}
    >
      {children}
    </td>
  );
}
