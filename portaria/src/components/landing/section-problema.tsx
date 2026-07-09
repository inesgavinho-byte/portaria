import { X } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

const FRAGMENTOS = [
  {
    label: "Documentos por todo o lado",
    tom: "bg-[linear-gradient(160deg,#26262c,#17171b_65%)]",
  },
  {
    label: "Conversas que se perdem",
    tom: "bg-[linear-gradient(200deg,#222228,#141418_60%)]",
  },
  {
    label: "Prazos que falham",
    tom: "bg-[linear-gradient(150deg,#2a2822,#18170f_70%)]",
  },
  {
    label: "Histórico sem ligação",
    tom: "bg-[linear-gradient(190deg,#242424,#101012_65%)]",
  },
];

/**
 * Secção 01 — O problema é o caos.
 * Fundo claro; fragmentos escuros e dispersos representam o ruído.
 */
export function SectionProblema() {
  return (
    <section className="bg-softCream">
      <div className="container-page py-24 md:py-36 grid lg:grid-cols-[1fr_1.4fr] gap-16 items-center">
        <SectionIntro
          numero="01"
          titulo={
            <>
              O problema
              <br />é o caos.
            </>
          }
          linhas={[
            "Informação espalhada.",
            "Decisões sem contexto.",
            "Tempo perdido.",
          ]}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FRAGMENTOS.map((fragmento, i) => (
            <Reveal key={fragmento.label} delay={i * 120}>
              <div
                className={`${fragmento.tom} group relative aspect-[3/4] border border-ink/10 p-4 flex flex-col justify-end transition-transform duration-500 hover:-translate-y-1.5 ${
                  i % 2 === 1 ? "md:translate-y-6" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="absolute top-3 right-3 w-6 h-6 rounded-full border border-white/15 text-white/40 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </span>
                <span
                  aria-hidden
                  className="absolute inset-x-4 top-1/3 space-y-2 opacity-30"
                >
                  <span className="block h-px bg-white/40 w-4/5" />
                  <span className="block h-px bg-white/40 w-3/5" />
                  <span className="block h-px bg-white/40 w-2/3" />
                </span>
                <p className="font-body text-sm text-paper/90 leading-snug">
                  {fragmento.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
