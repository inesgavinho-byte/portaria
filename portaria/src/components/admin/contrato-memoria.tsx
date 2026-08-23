import { ExternalLink, FileText } from "lucide-react";
import type {
  ContratoMemoriaEvidencia,
  ContratoMemoriaEvento,
  ContratoMemoriaNatureza,
  ContratoMemoriaTipo,
} from "@/types/database";

const TIPO: Record<ContratoMemoriaTipo, string> = {
  proposta: "Proposta",
  adjudicacao: "Adjudicação",
  comunicacao: "Comunicação",
  fatura: "Fatura",
  pagamento: "Pagamento",
  execucao: "Execução",
  decisao: "Decisão",
  garantia: "Garantia",
  conflito: "Conflito",
  outro: "Outro",
};

const NATUREZA: Record<ContratoMemoriaNatureza, string> = {
  facto: "Facto",
  inferencia: "Inferência",
  conflito: "Conflito",
  pendente: "Pendente",
};

const NATUREZA_CLASSE: Record<ContratoMemoriaNatureza, string> = {
  facto: "border-britishGreen/25 bg-britishGreenSoft/70 text-britishGreenDeep",
  inferencia: "border-oliveGray/20 bg-softCream/70 text-oliveGray",
  conflito: "border-alert/25 bg-alert/10 text-alert",
  pendente: "border-warmBeige/35 bg-warmBeige/10 text-ink",
};

const PAPEL: Record<ContratoMemoriaEvidencia["papel"], string> = {
  primaria: "Primária",
  corroboracao: "Corroboração",
  contradicao: "Contradição",
};

function dataCurta(data: string) {
  const partes = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).formatToParts(new Date(data));
  const valor = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valor.day} ${valor.month.replace(".", "").toUpperCase()} ${valor.year}`;
}

function Evidencia({ evidencia, mostrarPapel }: { evidencia: ContratoMemoriaEvidencia; mostrarPapel: boolean }) {
  const fonte = evidencia.ia_documental_fontes[0];

  return (
    <article className="border-l-2 border-britishGreen/20 pl-4 py-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="font-body text-sm font-medium text-ink">{fonte?.titulo ?? "Fonte documental"}</p>
        {mostrarPapel && <span className="font-body text-[10px] uppercase tracking-widest text-oliveGray">{PAPEL[evidencia.papel]}</span>}
      </div>
      {evidencia.localizador && <p className="mt-1 font-body text-xs text-oliveGray">{evidencia.localizador}</p>}
      <blockquote className="mt-2 font-body text-sm leading-relaxed text-ink/80">“{evidencia.citacao}”</blockquote>
      {fonte?.url && (
        <a href={fonte.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-body text-xs font-medium text-britishGreen hover:text-britishGreenDeep">
          Ver fonte <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {fonte?.referencia && <p className="mt-2 font-body text-xs text-oliveGray">{fonte.referencia}</p>}
    </article>
  );
}

export function ContratoMemoria({ eventos }: { eventos: ContratoMemoriaEvento[] }) {
  return (
    <section className="mt-10 border-t border-warmBeige/25 pt-8">
      <div className="mb-6">
        <p className="font-body text-xs uppercase tracking-widest text-oliveGray">Narrativa documental</p>
        <h2 className="mt-1 font-title text-h3 text-ink">Memória da contratação</h2>
        <p className="mt-2 max-w-2xl font-body text-sm text-oliveGray">Cronologia curada de acontecimentos relevantes, sempre suportada pelas respetivas fontes.</p>
      </div>

      {eventos.length === 0 ? (
        <div className="border-l-2 border-warmBeige/50 bg-softCream/30 px-5 py-4">
          <p className="font-body text-sm font-medium text-ink">Este contrato ainda não tem memória estruturada.</p>
          <p className="mt-1 font-body text-sm text-oliveGray">Os eventos documentais relevantes aparecerão aqui à medida que forem reconciliados com as respetivas fontes.</p>
        </div>
      ) : (
        <ol className="relative ml-2 border-l border-britishGreen/20 pl-6 sm:pl-8">
          {eventos.map((evento) => {
            const evidencias = evento.contrato_memoria_evidencias ?? [];
            const mostrarPapel = evidencias.length > 1 || evidencias.some((evidencia) => evidencia.papel !== "primaria");

            return (
              <li key={evento.id} className="relative pb-10 last:pb-0">
                <span className="absolute -left-[2.05rem] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-britishGreen sm:-left-[2.55rem]" aria-hidden />
                <time className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-oliveGray">{dataCurta(evento.data_evento)}</time>
                <div className="mt-3 border-b border-warmBeige/20 pb-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-britishGreen">{TIPO[evento.tipo]}</p>
                    <span className={`border px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-widest ${NATUREZA_CLASSE[evento.natureza]}`}>{NATUREZA[evento.natureza]}</span>
                  </div>
                  <h3 className="mt-2 font-title text-xl text-ink">{evento.titulo}</h3>
                  <p className="mt-2 max-w-3xl whitespace-pre-line font-body text-sm leading-relaxed text-oliveGray">{evento.resumo}</p>
                  {evidencias.length > 0 && (
                    <details className="group mt-4">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-body text-xs font-semibold uppercase tracking-widest text-britishGreen hover:text-britishGreenDeep">
                        <FileText className="h-3.5 w-3.5" />
                        Ver evidência{evidencias.length > 1 ? ` (${evidencias.length})` : ""}
                      </summary>
                      <div className="mt-4 space-y-4 border-t border-warmBeige/20 pt-4">
                        {evidencias.map((evidencia) => <Evidencia key={evidencia.id} evidencia={evidencia} mostrarPapel={mostrarPapel} />)}
                      </div>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
