import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import {
  EstadoBadge,
  OCORRENCIA_CATEGORIA_LABEL,
  OCORRENCIA_ESTADO_LABEL,
} from "@/components/app/ocorrencia-badges";
import { OcorrenciaEstadoControl } from "@/components/admin/ocorrencia-estado-control";
import { OcorrenciaNotaForm } from "@/components/app/ocorrencia-nota-form";
import type {
  Ocorrencia,
  OcorrenciaEvento,
  OcorrenciaEstado,
} from "@/types/database";

type OcorrenciaComFracao = Ocorrencia & {
  fracoes: { identificacao: string } | null;
};

function descreverEvento(ev: OcorrenciaEvento): string {
  switch (ev.tipo) {
    case "criacao":
      return "Ocorrência registada";
    case "foto":
      return "Fotografia adicionada";
    case "atribuicao":
      return "Responsável atribuído";
    case "nota":
      return ev.conteudo ?? "Nota";
    case "mudanca_estado": {
      const partes = (ev.conteudo ?? "").split(" → ") as OcorrenciaEstado[];
      if (partes.length === 2) {
        return `Estado: ${OCORRENCIA_ESTADO_LABEL[partes[0]] ?? partes[0]} → ${
          OCORRENCIA_ESTADO_LABEL[partes[1]] ?? partes[1]
        }`;
      }
      return "Estado alterado";
    }
    default:
      return "Atualização";
  }
}

export default async function OcorrenciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) notFound();

  const supabase = await createClient();

  const { data: ocorrencia } = await supabase
    .from("ocorrencias")
    .select("*, fracoes(identificacao)")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single<OcorrenciaComFracao>();

  if (!ocorrencia) notFound();

  const { data: eventosData } = await supabase
    .from("ocorrencia_eventos")
    .select("*")
    .eq("ocorrencia_id", id)
    .eq("tenant_id", ctx.tenant.id)
    .order("criado_em", { ascending: true });

  const eventos = (eventosData ?? []) as OcorrenciaEvento[];

  // Gerar URLs assinados para as fotografias (eventos do tipo 'foto')
  const fotoPaths = eventos
    .filter((e) => e.tipo === "foto" && e.conteudo)
    .map((e) => e.conteudo as string);

  let fotoUrls: string[] = [];
  if (fotoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("ocorrencias")
      .createSignedUrls(fotoPaths, 300);
    fotoUrls = (signed ?? [])
      .map((s) => s.signedUrl)
      .filter((u): u is string => Boolean(u));
  }

  const isAdmin = ctx.membership.role === "admin";

  return (
    <div className="max-w-3xl">
      <Link
        href="/ocorrencias"
        className="inline-flex items-center gap-2 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar às ocorrências
      </Link>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-title text-h1 text-ink">{ocorrencia.titulo}</h1>
        <EstadoBadge estado={ocorrencia.estado} />
      </div>
      <p className="font-body text-sm text-oliveGray mb-8">
        {OCORRENCIA_CATEGORIA_LABEL[ocorrencia.categoria]}
        {ocorrencia.fracoes?.identificacao &&
          ` · ${ocorrencia.fracoes.identificacao}`}
        {" · "}
        {new Date(ocorrencia.criado_em).toLocaleDateString("pt-PT", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      {ocorrencia.descricao && (
        <div className="bg-paper border border-warmBeige/20 p-6 mb-8">
          <p className="font-body text-ink whitespace-pre-wrap">
            {ocorrencia.descricao}
          </p>
        </div>
      )}

      {fotoUrls.length > 0 && (
        <div className="mb-8">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Fotografias
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fotoUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative aspect-square overflow-hidden border border-warmBeige/20 bg-softCream/30"
              >
                <Image
                  src={url}
                  alt={`Fotografia ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 200px"
                  className="object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-paper border border-warmBeige/20 p-6 mb-8">
          <OcorrenciaEstadoControl
            id={ocorrencia.id}
            estadoAtual={ocorrencia.estado}
          />
        </div>
      )}

      {/* Timeline */}
      <div className="mb-8">
        <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-4">
          Histórico
        </p>
        <ol className="border-l-2 border-warmBeige/30 space-y-5 pl-5">
          {eventos.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-warmBeige" />
              <p className="font-body text-sm text-ink">
                {descreverEvento(ev)}
              </p>
              <p className="font-body text-xs text-oliveGray/70 mt-0.5">
                {new Date(ev.criado_em).toLocaleString("pt-PT", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-paper border border-warmBeige/20 p-6">
        <OcorrenciaNotaForm id={ocorrencia.id} />
      </div>
    </div>
  );
}
