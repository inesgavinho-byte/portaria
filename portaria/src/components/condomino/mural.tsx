import Link from "next/link";
import {
  Megaphone,
  CalendarClock,
  Wrench,
  CheckCircle2,
  UserX,
  BookText,
  CreditCard,
  Phone,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizarHtml } from "@/lib/sanitize";
import { EMERGENCIA_NACIONAIS } from "@/lib/emergencia";
import type {
  Aviso,
  Assembleia,
  FuncionarioAusencia,
  ContactoEmergencia,
} from "@/types/database";

function data(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function dataHora(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ESTADO_LABEL: Record<string, string> = {
  novo: "Novo",
  em_curso: "Em curso",
  aguarda_fornecedor: "Aguarda fornecedor",
  resolvido: "Resolvido",
};

function Seccao({
  icon: Icon,
  titulo,
  children,
}: {
  icon: React.ElementType;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-title text-h3 text-warmBeige mb-4">
        <Icon className="w-4 h-4" /> {titulo}
      </h2>
      {children}
    </section>
  );
}

export async function Mural({
  tenantId,
  tenantNome,
  condominoCompleto,
}: {
  tenantId: string;
  tenantNome: string;
  condominoCompleto: boolean;
}) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const hoje = new Date();
  const ha90 = new Date(hoje.getTime() - 90 * 86400000).toISOString();
  const hojeISO = hoje.toISOString().slice(0, 10);

  // Fontes que o RLS de membro permite
  const [avisosRes, assembleiaRes, ausenciasRes] = await Promise.all([
    supabase.from("avisos").select("*").eq("tenant_id", tenantId)
      .eq("ativo", true).order("publicado_em", { ascending: false }).limit(12),
    condominoCompleto
      ? supabase.from("assembleias").select("*").eq("tenant_id", tenantId)
          .eq("estado", "agendada").not("data_hora", "is", null)
          .gte("data_hora", hoje.toISOString())
          .order("data_hora", { ascending: true }).limit(1)
      : Promise.resolve({ data: [] }),
    supabase.from("funcionarios_ausencias").select("*").eq("tenant_id", tenantId)
      .or(`data_fim.is.null,data_fim.gte.${hojeISO}`)
      .order("data_inicio", { ascending: true }),
  ]);

  const avisos = (avisosRes.data ?? []) as Aviso[];
  const proximaAssembleia = (assembleiaRes.data ?? [])[0] as Assembleia | undefined;
  const ausencias = (ausenciasRes.data ?? []) as FuncionarioAusencia[];

  // Fontes privilegiadas (áreas comuns, pagamento, contactos) — via
  // service-role, expondo apenas os campos próprios do mural.
  type OcorrenciaAberta = { titulo: string; estado: string; criado_em: string };
  type Intervencao = { titulo: string; atualizado_em: string };
  type PerfilMural = {
    iban: string | null;
    nif: string | null;
    contactos_emergencia_locais: ContactoEmergencia[];
    regulamento_texto: string | null;
  };
  type FornecedorEmergencia = { nome: string; telefone: string | null };

  let comunsAbertas: OcorrenciaAberta[] = [];
  let intervencoes: Intervencao[] = [];
  let perfil: PerfilMural | null = null;
  let fornecedoresEmergencia: FornecedorEmergencia[] = [];

  if (admin) {
    const [ab, res, pf, fe] = await Promise.all([
      admin.from("ocorrencias").select("titulo, estado, criado_em")
        .eq("tenant_id", tenantId).is("fracao_id", null).is("fracao", null)
        .in("estado", ["novo", "em_curso", "aguarda_fornecedor"])
        .order("criado_em", { ascending: false }).limit(8),
      admin.from("ocorrencias").select("titulo, atualizado_em")
        .eq("tenant_id", tenantId).is("fracao_id", null).is("fracao", null)
        .eq("estado", "resolvido").gte("atualizado_em", ha90)
        .order("atualizado_em", { ascending: false }).limit(8),
      admin.from("tenant_perfil")
        .select("iban, nif, contactos_emergencia_locais, regulamento_texto")
        .eq("tenant_id", tenantId).single(),
      admin.from("fornecedores").select("nome, telefone")
        .eq("tenant_id", tenantId).eq("ativo", true)
        .eq("contacto_emergencia", true).order("nome"),
    ]);
    comunsAbertas = (ab.data ?? []) as OcorrenciaAberta[];
    intervencoes = (res.data ?? []) as Intervencao[];
    perfil = (pf.data as PerfilMural | null) ?? null;
    fornecedoresEmergencia = (fe.data ?? []) as FornecedorEmergencia[];
  }

  const locais = perfil?.contactos_emergencia_locais ?? [];
  const temRegulamento = Boolean(perfil?.regulamento_texto);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-title text-h1 text-ink mb-2">Mural</h1>
        <p className="font-body text-oliveGray">
          A vida do {tenantNome}, num só lugar.
        </p>
      </div>

      {/* 1. Avisos em vigor */}
      <Seccao icon={Megaphone} titulo="Avisos em vigor">
        {avisos.length === 0 ? (
          <p className="font-body text-sm text-oliveGray">Sem avisos de momento.</p>
        ) : (
          <div className="space-y-4">
            {avisos.map((a) => (
              <article key={a.id} className="bg-paper border-l-4 border-warmBeige p-5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-title text-lg text-ink">{a.titulo}</h3>
                  {a.prioridade !== "normal" && (
                    <span className={`shrink-0 font-body text-[11px] tracking-widest uppercase px-2 py-0.5 ${a.prioridade === "urgente" ? "bg-alert text-paper" : "bg-oliveGray text-paper"}`}>
                      {a.prioridade}
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-oliveGray mb-2">{data(a.publicado_em)}</p>
                <div className="prose prose-sm max-w-none font-body text-ink prose-headings:font-title prose-a:text-warmBeige"
                  dangerouslySetInnerHTML={{ __html: sanitizarHtml(a.conteudo) }} />
              </article>
            ))}
          </div>
        )}
      </Seccao>

      {/* 2. Próxima assembleia — só condóminos */}
      {condominoCompleto && proximaAssembleia && (
        <Seccao icon={CalendarClock} titulo="Próxima assembleia">
          <div className="bg-paper border border-warmBeige/20 p-5">
            <p className="font-body text-[11px] tracking-widest uppercase text-oliveGray mb-1">
              Assembleia {proximaAssembleia.tipo}
            </p>
            <h3 className="font-title text-lg text-ink">{proximaAssembleia.titulo}</h3>
            <p className="font-body text-sm text-ink mt-2">{dataHora(proximaAssembleia.data_hora)}</p>
            {proximaAssembleia.local && (
              <p className="font-body text-sm text-oliveGray">{proximaAssembleia.local}</p>
            )}
          </div>
        </Seccao>
      )}

      {/* 3. Ocorrências em áreas comuns */}
      {comunsAbertas.length > 0 && (
        <Seccao icon={Wrench} titulo="Ocorrências em áreas comuns">
          <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
            {comunsAbertas.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-4 p-4">
                <span className="font-body text-ink">{o.titulo}</span>
                <span className="shrink-0 font-body text-xs tracking-widest uppercase text-oliveGray">
                  {ESTADO_LABEL[o.estado] ?? o.estado} · {data(o.criado_em)}
                </span>
              </li>
            ))}
          </ul>
        </Seccao>
      )}

      {/* 4. Últimas intervenções */}
      {intervencoes.length > 0 && (
        <Seccao icon={CheckCircle2} titulo="Últimas intervenções">
          <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
            {intervencoes.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-4 p-4">
                <span className="font-body text-ink">{o.titulo}</span>
                <span className="shrink-0 font-body text-xs text-oliveGray">{data(o.atualizado_em)}</span>
              </li>
            ))}
          </ul>
        </Seccao>
      )}

      {/* 5. Mapa de disponibilidade */}
      {ausencias.length > 0 && (
        <Seccao icon={UserX} titulo="Mapa de disponibilidade">
          <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
            {ausencias.map((f) => (
              <li key={f.id} className="p-4">
                <p className="font-body text-ink">
                  {f.nome}
                  {f.funcao && <span className="text-oliveGray"> · {f.funcao}</span>}
                </p>
                <p className="font-body text-sm text-oliveGray">
                  Ausente de {data(f.data_inicio)}
                  {f.data_fim ? ` a ${data(f.data_fim)}` : ""}
                  {f.motivo ? ` — ${f.motivo}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Seccao>
      )}

      {/* 6. Regulamento */}
      <Seccao icon={BookText} titulo="Regulamento do condomínio">
        <Link href="/regulamento"
          className="group flex items-center justify-between gap-4 bg-paper border border-warmBeige/20 p-5 hover:border-warmBeige transition-colors">
          <span className="font-body text-ink">
            {temRegulamento
              ? "Consultar o regulamento do condomínio"
              : "Regulamento ainda não disponível"}
          </span>
          {temRegulamento && (
            <ArrowRight className="w-4 h-4 text-oliveGray group-hover:translate-x-1 transition-transform" />
          )}
        </Link>
      </Seccao>

      {/* 7. Dados de pagamento — só condóminos */}
      {condominoCompleto && perfil && (perfil.iban || perfil.nif) && (
        <Seccao icon={CreditCard} titulo="Dados de pagamento">
          <dl className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
            {perfil.iban && (
              <div className="flex gap-4 p-4">
                <dt className="w-24 shrink-0 font-body text-xs tracking-widest uppercase text-oliveGray">IBAN</dt>
                <dd className="font-body text-ink">{perfil.iban}</dd>
              </div>
            )}
            {perfil.nif && (
              <div className="flex gap-4 p-4">
                <dt className="w-24 shrink-0 font-body text-xs tracking-widest uppercase text-oliveGray">NIF</dt>
                <dd className="font-body text-ink">{perfil.nif}</dd>
              </div>
            )}
          </dl>
        </Seccao>
      )}

      {/* 8. Contactos de emergência */}
      <Seccao icon={Phone} titulo="Contactos de emergência">
        <div className="grid sm:grid-cols-2 gap-3">
          {EMERGENCIA_NACIONAIS.map((c) => (
            <ContactoLinha key={c.nome} nome={c.nome} numero={c.numero} />
          ))}
          {locais.map((c, i) => (
            <ContactoLinha key={`l${i}`} nome={c.nome} numero={c.telefone} />
          ))}
          {fornecedoresEmergencia.map((f, i) =>
            f.telefone ? <ContactoLinha key={`f${i}`} nome={f.nome} numero={f.telefone} /> : null
          )}
        </div>
      </Seccao>
    </div>
  );
}

function ContactoLinha({ nome, numero }: { nome: string; numero: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-paper border border-warmBeige/20 px-4 py-3">
      <span className="font-body text-sm text-ink">{nome}</span>
      {numero && (
        <a href={`tel:${numero.replace(/\s/g, "")}`} className="font-body text-sm text-warmBeige hover:text-oliveGray whitespace-nowrap">
          {numero}
        </a>
      )}
    </div>
  );
}
