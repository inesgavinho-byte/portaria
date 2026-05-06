"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";

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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: initialContent,
    immediatelyRender: false, // evita warning de hydration em Next.js
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
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Hidden input que carrega o HTML para o FormData */}
      <input type="hidden" name={name} value={editor.getHTML()} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-warmBeige/20 bg-softCream/30 p-2">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Negrito"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Itálico"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        active={editor.isActive("heading", { level: 2 })}
        label="Título"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        active={editor.isActive("heading", { level: 3 })}
        label="Subtítulo"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Lista"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Lista numerada"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        label="Citação"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() => {
          const url = window.prompt("URL do link:");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          } else if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
          }
        }}
        active={editor.isActive("link")}
        label="Link"
      >
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>

      <div className="flex-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="Anular"
      >
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="Refazer"
      >
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-warmBeige/30 mx-1" />;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`
        p-2 rounded transition-colors
        disabled:opacity-30 disabled:cursor-not-allowed
        ${
          active
            ? "bg-warmBeige text-paper"
            : "text-ink hover:bg-warmBeige/20"
        }
      `}
    >
      {children}
    </button>
  );
}
