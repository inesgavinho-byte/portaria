import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  Home,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

const ASSUNTOS = [
  {
    icon: CalendarDays,
    titulo: "Assembleia quinta-feira",
    detalhe: "15 de maio às 16:30",
  },
  {
    icon: ShieldCheck,
    titulo: "Seguro termina em 19 dias",
    detalhe: "Apólice n.º 123456789",
  },
  {
    icon: CheckCircle2,
    titulo: "Infiltração resolvida",
    detalhe: "Rua das Flores, 12 — 2.º Dto.",
  },
];

/**
 * Secção 02 — A Portaria coloca tudo no lugar.
 * Fundo escuro; mockup glass do dashboard com anel de luz atrás.
 */
export function SectionSolucao() {
  return (
    <section id="produto" className="relative bg-night overflow-hidden">
      {/* Anel de luz elíptico atrás do mockup */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/2 w-[120vmin] h-[60vmin] rounded-[50%] border border-warmBeige/15 blur-[1px] [mask-image:linear-gradient(180deg,transparent_30%,black)]"
      />

      <div className="container-page relative py-24 md:py-36 grid lg:grid-cols-[1fr_1.3fr] gap-16 items-center">
        <SectionIntro
          numero="02"
          escuro
          titulo={
            <>
              A Portaria coloca
              <br />
              tudo no lugar.
            </>
          }
          linhas={["Contexto.", "Memória.", "Clareza."]}
        />

        <Reveal delay={150}>
          <div className="glass-card rounded-2xl p-2 md:p-3 flex gap-3 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
            {/* Mini sidebar do mockup */}
            <div
              aria-hidden
              className="hidden sm:flex flex-col items-center gap-5 border-r border-white/5 px-3 py-6 text-paper/30"
            >
              <span className="block w-4 h-5 border border-paper/40 rounded-t-full mb-2" />
              <Home className="w-4 h-4 text-paper/70" />
              <Bell className="w-4 h-4" />
              <FileText className="w-4 h-4" />
              <CalendarDays className="w-4 h-4" />
              <Users className="w-4 h-4" />
            </div>

            {/* Conteúdo do mockup */}
            <div className="flex-1 p-5 md:p-7">
              <p className="font-title text-2xl text-paper mb-1">Bom dia.</p>
              <p className="font-body text-xs text-paper/50 mb-6">
                Hoje existem 3 assuntos que merecem atenção.
              </p>

              <div className="space-y-3">
                {ASSUNTOS.map((assunto) => (
                  <div
                    key={assunto.titulo}
                    className="glass-card rounded-lg px-4 py-3 flex items-center gap-4 hover:bg-white/[0.07] transition-colors"
                  >
                    <assunto.icon className="w-4 h-4 text-warmBeige shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-paper/90 truncate">
                        {assunto.titulo}
                      </p>
                      <p className="font-body text-xs text-paper/40 truncate">
                        {assunto.detalhe}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-paper/30 shrink-0" />
                  </div>
                ))}
              </div>

              {/* Campo de pergunta */}
              <div className="mt-6 rounded-full border border-white/10 bg-night/60 px-5 py-3 flex items-center justify-between gap-4">
                <span className="font-body text-sm text-paper/40">
                  Perguntar à Portaria…
                </span>
                <ArrowRight className="w-4 h-4 text-warmBeige/70" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
