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
    <section className="border-t border-black/[0.07] pt-8">
      <h2 className="mb-5 flex items-center gap-2 font-title text-2xl font-normal text-ink">
        <Icon className="h-4 w-4 text-doorkeeperTurquoise" /> {titulo}
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
  const avisoPrincipal = avisos[0];
  const ocorrenciaPrincipal = comunsAbertas[0];

  return (
    <div className="pb-10">
      <header className="mb-9 border-b border-black/[0.07] pb-8 sm:mb-12 sm:pb-10">
        <p className="doorkeeper-eyebrow mb-4">Hoje no teu edifício</p>
        <h1 className="font-title text-[clamp(3.1rem,12vw,5.6rem)] font-normal leading-[0.92] text-ink">
          Bom dia.
        </h1>
        <p className="mt-5 max-w-xl font-body text-sm leading-relaxed text-oliveGray sm:text-base">
          O essencial de {tenantNome}, sem ruído.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.75rem] bg-britishGreenSoft p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="doorkeeper-eyebrow text-doorkeeperTurquoise">Aviso em vigor</p>
            <Megaphone className="h-4 w-4 text-doorkeeperTurquoise" />
          </div>
          {avisoPrincipal ? (
            <article className="mt-8">
              <h2 className="font-title text-3xl font-normal leading-tight text-ink sm:text-4xl">
                {avisoPrincipal.titulo}
              </h2>
              <p className="mt-3 font-body text-xs text-oliveGray">
                {data(avisoPrincipal.publicado_em)}
              </p>
              <div
                className="prose prose-sm mt-5 max-w-none font-body leading-relaxed text-ink prose-headings:font-title prose-a:text-doorkeeperTurquoise"
                dangerouslySetInnerHTML={{ __html: sanitizarHtml(avisoPrincipal.conteudo) }}
              />
            </article>
          ) : (
            <div className="mt-10 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-doorkeeperTurquoise" />
              <p className="font-body text-sm text-oliveGray">Sem avisos de momento.</p>
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <section className="rounded-[1.75rem] border border-black/[0.07] bg-white p-6">
            <p className="doorkeeper-eyebrow">No prédio</p>
            {ocorrenciaPrincipal ? (
              <div className="mt-7">
                <span className="inline-flex rounded-full bg-doorkeeperTerracotta/10 px-3 py-1 font-body text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-doorkeeperTerracotta">
                  {ESTADO_LABEL[ocorrenciaPrincipal.estado] ?? ocorrenciaPrincipal.estado}
                </span>
                <h2 className="mt-4 font-title text-2xl font-normal leading-tight text-ink">
                  {ocorrenciaPrincipal.titulo}
                </h2>
                <p className="mt-3 font-body text-xs text-oliveGray">
                  Desde {data(ocorrenciaPrincipal.criado_em)}
                </p>
              </div>
            ) : (
              <p className="mt-7 font-body text-sm leading-relaxed text-oliveGray">
                Não existem ocorrências abertas nas áreas comuns.
              </p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-black/[0.07] bg-white p-6">
            <p className="doorkeeper-eyebrow">Próximo encontro</p>
            {condominoCompleto && proximaAssembleia ? (
              <div className="mt-7">
                <h2 className="font-title text-2xl font-normal leading-tight text-ink">
                  {proximaAssembleia.titulo}
                </h2>
                <p className="mt-3 font-body text-sm font-medium text-doorkeeperTurquoise">
                  {dataHora(proximaAssembleia.data_hora)}
                </p>
                {proximaAssembleia.local && (
                  <p className="mt-1 font-body text-xs text-oliveGray">{proximaAssembleia.local}</p>
                )}
              </div>
            ) : (
              <p className="mt-7 font-body text-sm leading-relaxed text-oliveGray">
                Sem assembleias agendadas.
              </p>
            )}
          </section>
        </div>
      </div>

      <Link
        href="/ocorrencias/nova"
        className="mt-4 flex min-h-16 items-center justify-between rounded-2xl bg-doorkeeperTerracotta px-6 font-body text-sm font-semibold text-white transition-colors hover:bg-doorkeeperBrown"
      >
        Reportar uma ocorrência
        <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="mt-14 space-y-10">
        {avisos.length > 1 && (
          <Seccao icon={Megaphone} titulo="Mais avisos">
            <div className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
              {avisos.slice(1).map((a) => (
                <article key={a.id} className="py-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-title text-xl font-normal text-ink">{a.titulo}</h3>
                    <span className="shrink-0 font-body text-xs text-oliveGray">{data(a.publicado_em)}</span>
                  </div>
                  <div
                    className="prose prose-sm mt-3 max-w-none font-body text-oliveGray prose-a:text-doorkeeperTurquoise"
                    dangerouslySetInnerHTML={{ __html: sanitizarHtml(a.conteudo) }}
                  />
                </article>
              ))}
            </div>
          </Seccao>
        )}

        {comunsAbertas.length > 1 && (
          <Seccao icon={Wrench} titulo="Outras ocorrências no prédio">
            <ul className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
              {comunsAbertas.slice(1).map((o, i) => (
                <li key={i} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="font-body text-sm font-medium text-ink">{o.titulo}</span>
                  <span className="shrink-0 font-body text-xs uppercase tracking-wider text-oliveGray">
                    {ESTADO_LABEL[o.estado] ?? o.estado} · {data(o.criado_em)}
                  </span>
                </li>
              ))}
            </ul>
          </Seccao>
        )}

      {intervencoes.length > 0 && (
        <Seccao icon={CheckCircle2} titulo="Últimas intervenções">
          <ul className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
            {intervencoes.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-4">
                <span className="font-body text-sm text-ink">{o.titulo}</span>
                <span className="shrink-0 font-body text-xs text-oliveGray">{data(o.atualizado_em)}</span>
              </li>
            ))}
          </ul>
        </Seccao>
      )}

      {ausencias.length > 0 && (
        <Seccao icon={UserX} titulo="Mapa de disponibilidade">
          <ul className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
            {ausencias.map((f) => (
              <li key={f.id} className="py-4">
                <p className="font-body text-sm font-medium text-ink">
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

      <Seccao icon={BookText} titulo="Regulamento do condomínio">
        <Link href="/regulamento"
          className="group flex items-center justify-between gap-4 border-y border-black/[0.07] py-5 transition-colors hover:text-doorkeeperTurquoise">
          <span className="font-body text-sm text-ink">
            {temRegulamento
              ? "Consultar o regulamento do condomínio"
              : "Regulamento ainda não disponível"}
          </span>
          {temRegulamento && (
            <ArrowRight className="h-4 w-4 text-oliveGray transition-transform group-hover:translate-x-1" />
          )}
        </Link>
      </Seccao>

      {condominoCompleto && perfil && (perfil.iban || perfil.nif) && (
        <Seccao icon={CreditCard} titulo="Dados de pagamento">
          <dl className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
            {perfil.iban && (
              <div className="flex gap-4 py-4">
                <dt className="w-24 shrink-0 font-body text-xs tracking-widest uppercase text-oliveGray">IBAN</dt>
                <dd className="font-body text-ink">{perfil.iban}</dd>
              </div>
            )}
            {perfil.nif && (
              <div className="flex gap-4 py-4">
                <dt className="w-24 shrink-0 font-body text-xs tracking-widest uppercase text-oliveGray">NIF</dt>
                <dd className="font-body text-ink">{perfil.nif}</dd>
              </div>
            )}
          </dl>
        </Seccao>
      )}

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
    </div>
  );
}

function ContactoLinha({ nome, numero }: { nome: string; numero: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.07] bg-white px-4 py-3">
      <span className="font-body text-sm text-ink">{nome}</span>
      {numero && (
        <a href={`tel:${numero.replace(/\s/g, "")}`} className="whitespace-nowrap font-body text-sm font-medium text-doorkeeperTurquoise hover:text-doorkeeperGreen">
          {numero}
        </a>
      )}
    </div>
  );
}
