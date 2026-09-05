import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

const PERGUNTAS = [
  "Onde está a ata da última assembleia?",
  "Que assuntos continuam pendentes?",
  "Esta decisão precisa de unanimidade?",
  "Que documentos ainda estão em falta?",
];

export function SectionIa() {
  return (
    <section className="bg-doorkeeperTurquoise text-ink">
      <div className="container-page grid gap-14 py-24 md:py-36 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
        <Reveal>
          <p className="mb-6 flex items-center gap-4 font-body text-xs font-semibold tracking-[0.25em] text-ink/55">
            03 <span className="h-px w-10 bg-ink/25" />
          </p>
          <h2 className="font-title text-[clamp(2.8rem,5.5vw,5.2rem)] leading-[0.94] text-ink">
            Pergunte.
            <br />O edifício responde.
          </h2>
          <p className="mt-8 max-w-sm font-body text-base leading-7 text-ink/65">
            Inteligência ligada à informação do condomínio — para encontrar, relacionar e explicar.
          </p>
        </Reveal>

        <div className="border-t border-ink/25">
          {PERGUNTAS.map((pergunta, i) => (
            <Reveal key={pergunta} delay={i * 80}>
              <div className="group flex items-center gap-5 border-b border-ink/25 py-6">
                <span className="font-body text-[0.65rem] font-semibold tracking-[0.14em] text-ink/45">0{i + 1}</span>
                <p className="flex-1 font-title text-xl leading-tight text-ink md:text-2xl">{pergunta}</p>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
