import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, RefreshCw, BookOpen, FileText, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { estadoConhecimento, reindexarTenantAction } from "@/lib/actions/ia-rag";

export default async function IAConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const { dados, total } = await estadoConhecimento();
  const { status } = await searchParams;

  return (
    <div className="max-w-2xl">
      <Link
        href="/ia"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Assistente IA
      </Link>

      <h1 className="font-title text-h1 text-ink mb-2">Configuração da IA</h1>
      <p className="font-body text-oliveGray mb-8">
        Gerir a base de conhecimento do assistente.
      </p>

      {/* Feedback status */}
      {status === "ok" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-3 mb-6">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-body text-sm">Base de conhecimento reindexada com sucesso.</p>
        </div>
      )}
      {status === "erro" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 mb-6">
          <XCircle className="w-4 h-4 shrink-0" />
          <p className="font-body text-sm">Erro ao reindexar. Verifica as permissões e tenta novamente.</p>
        </div>
      )}

      {/* Estado */}
      <div className="bg-paper border border-warmBeige/20 p-6 mb-8">
        <h2 className="font-title text-h3 text-ink mb-4">Base de conhecimento</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-oliveGray flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Regulamento
            </span>
            <span className="font-title text-lg text-ink">{dados.regulamento ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-oliveGray flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos
            </span>
            <span className="font-title text-lg text-ink">{dados.documento ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-oliveGray flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Ocorrências resolvidas
            </span>
            <span className="font-title text-lg text-ink">{dados.ocorrencia_resolvida ?? 0}</span>
          </div>
          <div className="pt-3 border-t border-warmBeige/20 flex items-center justify-between">
            <span className="font-body text-sm text-ink">Total de chunks</span>
            <span className="font-title text-xl text-ink">{total}</span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="space-y-4">
        <form action={reindexarTenantAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reindexar todos os documentos
          </button>
        </form>

        <p className="font-body text-xs text-oliveGray">
          A reindexação apaga todos os embeddings existentes e recria-os a partir do regulamento e ocorrências resolvidas.
          Documentos PDF ainda requerem extração manual de texto.
        </p>
      </div>
    </div>
  );
}
