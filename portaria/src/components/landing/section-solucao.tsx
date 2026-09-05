import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

const ASSUNTOS = [
  {
    estado: "Próximo",
    titulo: "Assembleia geral",
    detalhe: "15 de maio · 16:30",
  },
  {
    estado: "Atenção",
    titulo: "Renovação do seguro",
    detalhe: "Termina dentro de 19 dias",
  },
  {
    estado: "Concluído",
    titulo: "Infiltração · 2.º Dto.",
    detalhe: "Intervenção e documentos associados",
  },
];

export function SectionSolucao() {
  return (
    <section id="produto" className="bg-paper">
      <div className="container-page grid items-start gap-16 py-24 md:py-36 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
        <SectionIntro
          numero="02"
          titulo={
            <>
              Um lugar
              <br />para cada coisa.
            </>
          }
          linhas={[
            "Assuntos, documentos e pessoas ligados pelo mesmo contexto.",
            "Menos procura. Melhores decisões.",
          ]}
        />

        <Reveal delay={100}>
          <div className="border border-ink/20 bg-softCream">
            <div className="flex items-end justify-between border-b border-ink/15 px-5 py-5 md:px-7 md:py-6">
              <div>
                <p className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-doorkeeperTurquoise">Hoje</p>
                <p className="mt-1 font-title text-3xl text-ink">3 assuntos a acompanhar</p>
              </div>
              <span className="hidden font-body text-xs text-ink/45 sm:block">Condomínio · visão geral</span>
            </div>

            <div>
              {ASSUNTOS.map((assunto, i) => (
                <div
                  key={assunto.titulo}
                  className="group grid gap-3 border-b border-ink/15 px-5 py-5 transition-colors hover:bg-white md:grid-cols-[2.5rem_1fr_auto] md:items-center md:px-7"
                >
                  <span className="font-body text-xs text-ink/35">0{i + 1}</span>
                  <div>
                    <p className="font-body text-sm font-semibold text-ink">{assunto.titulo}</p>
                    <p className="mt-1 font-body text-xs text-ink/50">{assunto.detalhe}</p>
                  </div>
                  <span className="w-fit border border-ink/15 px-2.5 py-1 font-body text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink/55">
                    {assunto.estado}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 bg-doorkeeperGreen px-5 py-5 text-white md:px-7">
              <span className="font-body text-sm text-white/65">Perguntar ao The DoorKeeper…</span>
              <span className="flex h-9 w-9 items-center justify-center bg-doorkeeperTurquoise text-ink">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
