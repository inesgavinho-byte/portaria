"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Plus } from "lucide-react";
import { criarExtensoes, EditorToolbar } from "@/components/admin/editor-core";
import { VARIAVEIS_DISPONIVEIS, TIPOS_BLUEPRINT } from "@/lib/blueprints";
import type { TemplateFormState } from "@/lib/actions/blueprints";

type Accao = (
  state: TemplateFormState,
  formData: FormData
) => Promise<TemplateFormState>;

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

export function TemplateEditor({
  action,
  initialContent = "",
  novo = false,
  initialNome = "",
  initialTipo = "circular",
  cancelHref,
  guardarLabel = "Guardar template",
}: {
  action: Accao;
  initialContent?: string;
  novo?: boolean;
  initialNome?: string;
  initialTipo?: string;
  cancelHref: string;
  guardarLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<TemplateFormState, FormData>(
    action,
    {}
  );
  const [html, setHtml] = useState(initialContent);

  const editor = useEditor({
    extensions: criarExtensoes("Escreva o modelo. Use as variáveis à direita."),
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[420px] p-5 font-body",
      },
    },
  });

  function inserirVariavel(token: string) {
    editor?.chain().focus().insertContent(`{{${token}}}`).run();
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      {novo && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="nome" className={labelClass}>Nome</label>
            <input id="nome" name="nome" required maxLength={120}
              defaultValue={initialNome} placeholder="Circular de Quotas"
              className={inputClass} />
            {state.fieldErrors?.nome && (
              <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.nome}</p>
            )}
          </div>
          <div>
            <label htmlFor="tipo" className={labelClass}>Tipo</label>
            <select id="tipo" name="tipo" defaultValue={initialTipo} className={inputClass}>
              {TIPOS_BLUEPRINT.map((t) => (
                <option key={t.valor} value={t.valor}>{t.label}</option>
              ))}
            </select>
            {state.fieldErrors?.tipo && (
              <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.tipo}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_15rem] gap-6 items-start">
        {/* Editor */}
        <div>
          <div className="border border-warmBeige/40 bg-paper">
            {editor ? (
              <>
                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} />
              </>
            ) : (
              <div className="min-h-[420px] p-5 font-body text-oliveGray text-sm">
                A carregar editor…
              </div>
            )}
          </div>
          {state.fieldErrors?.conteudo && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.conteudo}</p>
          )}
          <input type="hidden" name="conteudo" value={html} readOnly />
        </div>

        {/* Painel de variáveis */}
        <aside className="border border-warmBeige/30 bg-softCream/30 p-4">
          <h2 className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Variáveis
          </h2>
          <p className="font-body text-xs text-oliveGray mb-4">
            Clique para inserir no cursor. São substituídas pelos dados reais
            do condomínio.
          </p>
          <ul className="space-y-1.5">
            {VARIAVEIS_DISPONIVEIS.map((v) => (
              <li key={v.token}>
                <button
                  type="button"
                  onClick={() => inserirVariavel(v.token)}
                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 hover:bg-warmBeige/15 rounded transition-colors group"
                  title={`Inserir {{${v.token}}}`}
                >
                  <Plus className="w-3 h-3 text-warmBeige shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-body text-sm text-ink truncate">{v.label}</span>
                    <span className="block font-mono text-[11px] text-oliveGray truncate">{`{{${v.token}}}`}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A guardar..." : guardarLabel}
        </button>
        <Link href={cancelHref}
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
