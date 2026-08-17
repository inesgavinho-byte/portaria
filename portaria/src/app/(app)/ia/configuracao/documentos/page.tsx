import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { obterConfiguracaoDocumental } from "@/lib/actions/ia-documental";
import { IADocumentalConfiguracao } from "@/components/admin/ia-documental-configuracao";

export default async function IADocumentosConfiguracaoPage() {
  const ctx = await requireAdmin();
  if (!ctx) return null;
  const resultado = await obterConfiguracaoDocumental();
  if (!("config" in resultado) || !resultado.config) return null;

  return (
    <div className="max-w-4xl">
      <Link href="/ia/configuracao" className="mb-6 inline-flex items-center gap-1 font-body text-xs uppercase tracking-widest text-oliveGray hover:text-ink">
        <ChevronLeft className="h-3 w-3" /> Configuração da IA
      </Link>
      <div className="mb-8 flex items-start gap-3">
        <Sparkles className="mt-1 h-6 w-6 text-warmBeige" />
        <div>
          <h1 className="font-title text-h1 text-ink">Assistente documental</h1>
          <p className="mt-2 max-w-2xl font-body text-oliveGray">Defina como a IA apoia a redação de atas, convocatórias, circulares e outros documentos, sempre com revisão humana.</p>
        </div>
      </div>
      <IADocumentalConfiguracao configuracao={resultado.config} fontes={resultado.fontes ?? []} />
    </div>
  );
}
