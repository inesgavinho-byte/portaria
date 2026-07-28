"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { criarConversa, apagarConversa } from "@/lib/actions/ia-rag";
import type { ConversaIA } from "@/types/database";

interface Props {
  conversas: ConversaIA[];
  conversaAtivaId?: string;
}

export function ChatSidebar({ conversas, conversaAtivaId }: Props) {
  const [lista, setLista] = useState(conversas);
  const [isPending, startTransition] = useTransition();

  async function handleNova() {
    const { id } = await criarConversa();
    if (id) {
      window.location.href = `/ia?id=${id}`;
    }
  }

  function handleApagar(id: string) {
    startTransition(async () => {
      await apagarConversa(id);
      setLista((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div className="w-64 shrink-0 border-r border-warmBeige/20 bg-paper h-full flex flex-col">
      <div className="p-4 border-b border-warmBeige/20">
        <button
          onClick={handleNova}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {lista.length === 0 ? (
          <p className="px-3 py-4 font-body text-xs text-oliveGray text-center">
            Ainda não existem conversas.
          </p>
        ) : (
          lista.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                c.id === conversaAtivaId
                  ? "bg-warmBeige/20 text-ink"
                  : "text-oliveGray hover:text-ink hover:bg-softCream/60"
              }`}
            >
              <Link
                href={`/ia?id=${c.id}`}
                className="flex-1 flex items-center gap-2 min-w-0"
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="font-body text-sm truncate">
                  {c.titulo ?? "Nova conversa"}
                </span>
              </Link>
              <button
                onClick={() => handleApagar(c.id)}
                disabled={isPending}
                className="opacity-0 group-hover:opacity-100 p-1 text-oliveGray hover:text-alert transition-opacity"
                title="Apagar"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
