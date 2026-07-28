"use client";

import { useState, useRef, useEffect } from "react";
import { enviarMensagem, type EnviarMensagemResult } from "@/lib/actions/ia-rag";
import type { ConversaIAMensagem } from "@/types/database";
import { Send, Bot, User, BookOpen } from "lucide-react";

interface Props {
  conversaId: string;
  mensagensIniciais: ConversaIAMensagem[];
}

const SUGESTOES = [
  "O que diz o regulamento sobre animais?",
  "Como devo proceder com uma infiltração?",
  "Resumo da última assembleia",
  "Quais são os meus direitos como condómino?",
];

export function ChatInterface({ conversaId, mensagensIniciais }: Props) {
  const [mensagens, setMensagens] = useState<ConversaIAMensagem[]>(mensagensIniciais);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [fontes, setFontes] = useState<EnviarMensagemResult["fontes"]>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || pending) return;

    const texto = input.trim();
    setInput("");
    setPending(true);
    setFontes(undefined);

    // Adicionar mensagem do utilizador otimisticamente
    const msgUser: ConversaIAMensagem = {
      id: `temp-${Date.now()}`,
      conversa_id: conversaId,
      tenant_id: "",
      role: "user",
      conteudo: texto,
      contexto: null,
      criado_em: new Date().toISOString(),
    };
    setMensagens((prev) => [...prev, msgUser]);

    const result = await enviarMensagem(conversaId, texto);

    if (result.resposta) {
      const msgAssistant: ConversaIAMensagem = {
        id: `temp-${Date.now() + 1}`,
        conversa_id: conversaId,
        tenant_id: "",
        role: "assistant",
        conteudo: result.resposta,
        contexto: null,
        criado_em: new Date().toISOString(),
      };
      setMensagens((prev) => [...prev, msgAssistant]);
      setFontes(result.fontes);
    } else {
      const msgErro: ConversaIAMensagem = {
        id: `temp-${Date.now() + 1}`,
        conversa_id: conversaId,
        tenant_id: "",
        role: "assistant",
        conteudo: result.error ?? "Erro ao processar a mensagem.",
        contexto: null,
        criado_em: new Date().toISOString(),
      };
      setMensagens((prev) => [...prev, msgErro]);
    }

    setPending(false);
  }

  const mostrarSugestoes = mensagens.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {mensagens.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-10 h-10 text-warmBeige mx-auto mb-4" />
            <h2 className="font-title text-h2 text-ink mb-2">
              Assistente do Condomínio
            </h2>
            <p className="font-body text-oliveGray mb-8">
              Pergunta-me qualquer coisa sobre o regulamento, documentos ou histórico do condomínio.
            </p>
          </div>
        )}

        {mensagens.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-softCream border border-warmBeige/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-oliveGray" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 ${
                msg.role === "user"
                  ? "bg-ink text-paper"
                  : "bg-paper border border-warmBeige/20 text-ink"
              }`}
            >
              <p className="font-body text-sm whitespace-pre-wrap">{msg.conteudo}</p>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-warmBeige/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-oliveGray" />
              </div>
            )}
          </div>
        ))}

        {pending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-softCream border border-warmBeige/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-oliveGray animate-pulse" />
            </div>
            <div className="bg-paper border border-warmBeige/20 px-4 py-3">
              <p className="font-body text-sm text-oliveGray">A pensar...</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Fontes */}
      {fontes && fontes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-warmBeige/20">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-oliveGray" />
            <span className="font-body text-xs uppercase tracking-widest text-oliveGray">
              Fontes
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {fontes.map((f, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-softCream/40 border border-warmBeige/20 font-body text-xs text-oliveGray"
              >
                [{i + 1}] {f.origem}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sugestões (quando vazio) */}
      {mostrarSugestoes && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-left px-4 py-3 bg-paper border border-warmBeige/20 font-body text-sm text-oliveGray hover:text-ink hover:border-warmBeige transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunta algo sobre o condomínio..."
          className="flex-1 px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
