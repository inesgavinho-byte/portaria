import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { criarBlueprint } from "@/lib/actions/blueprints";
import { TemplateEditor } from "@/components/admin/template-editor";
import { BLUEPRINTS_BASE } from "@/lib/blueprints";

const chipClass = (ativa: boolean) =>
  `inline-flex items-center px-4 py-2 border font-body text-sm transition-colors ${
    ativa
      ? "border-ink bg-ink text-paper"
      : "border-warmBeige/40 text-ink hover:border-warmBeige hover:bg-softCream/40"
  }`;

export default async function NovoBlueprintPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const { de } = await searchParams;
  const base = BLUEPRINTS_BASE.find((b) => b.nome === de);

  return (
    <div className="max-w-5xl">
      <Link href="/blueprints"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Modelos
      </Link>

      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Novo modelo</h1>
        <p className="font-body text-oliveGray">
          Comece de um modelo base ou escreva do zero. Use as variáveis à
          direita para inserir os dados do condomínio, que são substituídos ao
          pré-visualizar.
        </p>
      </div>

      <div className="mb-8">
        <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
          Ponto de partida
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/blueprints/novo" className={chipClass(!base)}>
            Em branco
          </Link>
          {BLUEPRINTS_BASE.map((b) => (
            <Link
              key={b.nome}
              href={`/blueprints/novo?de=${encodeURIComponent(b.nome)}`}
              className={chipClass(base?.nome === b.nome)}
            >
              {b.nome}
            </Link>
          ))}
        </div>
      </div>

      <TemplateEditor
        // Remonta ao mudar de modelo base — o Tiptap guarda o conteúdo
        // inicial em estado interno e ignoraria novas props.
        key={base?.nome ?? "em-branco"}
        action={criarBlueprint}
        novo
        initialContent={base?.conteudo_template ?? ""}
        initialNome={base?.nome ?? ""}
        initialTipo={base?.tipo ?? "circular"}
        cancelHref="/blueprints"
        guardarLabel="Criar modelo"
      />
    </div>
  );
}
