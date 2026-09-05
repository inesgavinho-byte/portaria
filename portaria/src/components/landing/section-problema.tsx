import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

const FRAGMENTOS = [
  {
    titulo: "Documentos",
    texto: "Atas, contratos e comprovativos espalhados por pastas e emails.",
  },
  {
    titulo: "Conversas",
    texto: "Decisões importantes perdidas entre mensagens sem histórico comum.",
  },
  {
    titulo: "Prazos",
    texto: "Seguros, inspeções e tarefas que só aparecem quando já são urgentes.",
  },
  {
    titulo: "Contexto",
    texto: "Informação que depende da memória de uma única pessoa.",
  },
];

export function SectionProblema() {
  return (
    <section className="bg-graphite">
      <div className="container-page grid gap-16 py-24 md:py-36 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <SectionIntro
          numero="01"
          escuro
          titulo={
            <>
              O trabalho acontece.
              <br />O contexto perde-se.
            </>
          }
          linhas={["A gestão fragmentada cria urgência onde devia existir continuidade."]}
        />

        <div className="border-t border-white/20">
          {FRAGMENTOS.map((fragmento, i) => (
            <Reveal key={fragmento.titulo} delay={i * 80}>
              <div className="grid gap-3 border-b border-white/20 py-6 transition-colors hover:border-doorkeeperTurquoise sm:grid-cols-[3.5rem_10rem_1fr] sm:gap-5">
                <span className="font-body text-[0.65rem] font-semibold tracking-[0.16em] text-doorkeeperTurquoise">
                  0{i + 1}
                </span>
                <h3 className="font-title text-2xl text-white">{fragmento.titulo}</h3>
                <p className="max-w-md font-body text-sm leading-6 text-white/55">{fragmento.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
