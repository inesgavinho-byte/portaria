"use client";

import { useRef } from "react";
import { adicionarMensagem } from "@/lib/actions/conversas";

/** Adiciona uma mensagem/nota à conversa. */
export function ConversaMensagemForm({ conversaId }: { conversaId: string }) {
  const action = adicionarMensagem.bind(null, conversaId);
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
      className="space-y-3"
    >
      <textarea
        name="corpo"
        required
        rows={3}
        placeholder="Escrever uma nota, registar uma chamada, um contacto…"
        className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige"
      />
      <button
        type="submit"
        className="px-6 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors"
      >
        Adicionar
      </button>
    </form>
  );
}
