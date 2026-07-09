import { ArrowRight, Sparkles } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

const PERGUNTAS = [
  "Onde está a ata da última assembleia?",
  "Que assuntos estão pendentes?",
  "Esta decisão precisa de unanimidade?",
  "Que documentos faltam?",
];

/**
 * Secção 03 — Pergunte. A Portaria responde.
 * Fundo claro; perguntas em lista limpa, estilo command palette.
 */
export function SectionIa() {
  return (
    <section className="bg-paper">
      <div className="container-page py-24 md:py-36 grid lg:grid-cols-[1fr_1.4fr] gap-16 items-center">
        <SectionIntro
          numero="03"
          titulo={
            <>
              Pergunte.
              <br />A Portaria responde.
            </>
          }
          linhas={["A inteligência que conhece o seu condomínio."]}
        />

        <div className="space-y-3">
          {PERGUNTAS.map((pergunta, i) => (
            <Reveal key={pergunta} delay={i * 100}>
              <div className="group flex items-center gap-4 border border-ink/10 bg-softCream/50 rounded-lg px-5 py-4 transition-all duration-300 hover:border-warmBeige hover:bg-softCream">
                <Sparkles className="w-4 h-4 text-warmBeige shrink-0" />
                <p className="font-body text-sm md:text-base text-ink flex-1">
                  {pergunta}
                </p>
                <ArrowRight className="w-4 h-4 text-ink/20 shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-oliveGray" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
