"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { criarExtensoes, EditorToolbar } from "@/components/admin/editor-core";

interface RichEditorProps {
  /**
   * Conteúdo inicial em HTML. O Tiptap parsa automaticamente.
   */
  initialContent?: string;
  /**
   * Nome do input hidden que vai ser submetido com o conteúdo HTML.
   * O formulário pai deve ler este nome via FormData.
   */
  name: string;
  /**
   * Mensagem placeholder quando vazio.
   */
  placeholder?: string;
}

export function RichEditor({
  initialContent = "",
  name,
  placeholder = "Escreva aqui...",
}: RichEditorProps) {
  // Fonte da verdade para o input submetido. Sincronizada em cada
  // transação do editor (onUpdate) — garante que estruturas como tabelas
  // ficam sempre capturadas, sem depender do re-render do useEditor.
  const [html, setHtml] = useState(initialContent);

  const editor = useEditor({
    extensions: criarExtensoes(placeholder),
    content: initialContent,
    immediatelyRender: false, // evita warning de hydration em Next.js
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 font-body",
      },
    },
  });

  if (!editor) {
    return (
      <div className="border border-warmBeige/40 bg-paper">
        <div className="h-12 border-b border-warmBeige/20 bg-softCream/30" />
        <div className="min-h-[200px] p-4 font-body text-oliveGray text-sm">
          A carregar editor…
        </div>
      </div>
    );
  }

  return (
    <div className="border border-warmBeige/40 bg-paper">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Hidden input que carrega o HTML para o FormData.
          O valor vem do estado sincronizado em onUpdate. */}
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
