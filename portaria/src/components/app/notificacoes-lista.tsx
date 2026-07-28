"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Vote,
  FileText,
  Calendar,
  Info,
} from "lucide-react";
import {
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  apagarNotificacao,
} from "@/lib/actions/notificacoes";
import type { Notificacao } from "@/types/database";

const TIPO_ICON: Record<string, React.ReactNode> = {
  ocorrencia_criada: <AlertTriangle className="w-4 h-4" />,
  ocorrencia_atualizada: <AlertTriangle className="w-4 h-4" />,
  ocorrencia_resolvida: <Check className="w-4 h-4" />,
  aviso_publicado: <MessageSquare className="w-4 h-4" />,
  votacao_aberta: <Vote className="w-4 h-4" />,
  votacao_encerrada: <Vote className="w-4 h-4" />,
  assembleia_agendada: <Calendar className="w-4 h-4" />,
  documento_publicado: <FileText className="w-4 h-4" />,
  sistema: <Info className="w-4 h-4" />,
};

const TIPO_LABEL: Record<string, string> = {
  ocorrencia_criada: "Ocorrência",
  ocorrencia_atualizada: "Ocorrência",
  ocorrencia_resolvida: "Resolvido",
  aviso_publicado: "Aviso",
  votacao_aberta: "Votação",
  votacao_encerrada: "Votação",
  assembleia_agendada: "Assembleia",
  documento_publicado: "Documento",
  sistema: "Sistema",
};

function linkParaEntidade(n: Notificacao): string | null {
  if (!n.entidade_tipo || !n.entidade_id) return null;
  switch (n.entidade_tipo) {
    case "ocorrencia":
      return `/ocorrencias/${n.entidade_id}`;
    case "aviso":
      return `/avisos`;
    case "votacao":
      return `/votacoes/${n.entidade_id}`;
    case "assembleia":
      return `/assembleias/${n.entidade_id}`;
    case "documento":
      return `/documentos`;
    default:
      return null;
  }
}

export function NotificacoesLista({
  notificacoesIniciais,
}: {
  notificacoesIniciais: Notificacao[];
}) {
  const [notificacoes, setNotificacoes] = useState(notificacoesIniciais);
  const [isPending, startTransition] = useTransition();

  async function handleLerTodas() {
    startTransition(async () => {
      await marcarTodasComoLidas();
      setNotificacoes((prev) =>
        prev.map((n) => ({ ...n, lida: true, lida_em: new Date().toISOString() }))
      );
    });
  }

  async function handleLer(id: string) {
    await marcarComoLida(id);
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true, lida_em: new Date().toISOString() } : n))
    );
  }

  async function handleApagar(id: string) {
    await apagarNotificacao(id);
    setNotificacoes((prev) => prev.filter((n) => n.id !== id));
  }

  const naoLidas = notificacoes.filter((n) => !n.lida);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-title text-h1 text-ink">Notificações</h1>
        {naoLidas.length > 0 && (
          <button
            onClick={handleLerTodas}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-warmBeige/40 font-body text-sm text-oliveGray hover:text-ink hover:border-ink transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Marcar todas como lidas
          </button>
        )}
      </div>

      {notificacoes.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-8 h-8 text-oliveGray/40 mx-auto mb-3" />
          <p className="font-body text-sm text-oliveGray">Sem notificações.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notificacoes.map((n) => {
            const href = linkParaEntidade(n);
            return (
              <li
                key={n.id}
                className={`group flex items-start gap-4 p-4 border transition-colors ${
                  n.lida
                    ? "bg-paper border-warmBeige/10"
                    : "bg-cream/30 border-warmBeige/30"
                }`}
              >
                <div className="shrink-0 mt-0.5 text-oliveGray">
                  {TIPO_ICON[n.tipo] ?? <Bell className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!n.lida && (
                      <span className="w-1.5 h-1.5 rounded-full bg-alert shrink-0" />
                    )}
                    <span className="font-body text-[0.65rem] tracking-wider uppercase text-oliveGray">
                      {TIPO_LABEL[n.tipo] ?? n.tipo}
                    </span>
                    <span className="font-body text-[0.65rem] text-oliveGray/60">
                      {new Date(n.criado_em).toLocaleDateString("pt-PT", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {href ? (
                    <Link
                      href={href}
                      className="block font-body text-sm text-ink hover:underline"
                      onClick={() => !n.lida && handleLer(n.id)}
                    >
                      {n.titulo}
                    </Link>
                  ) : (
                    <p className="font-body text-sm text-ink">{n.titulo}</p>
                  )}

                  {n.corpo && (
                    <p className="font-body text-sm text-oliveGray mt-1 line-clamp-2">
                      {n.corpo}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.lida && (
                    <button
                      onClick={() => handleLer(n.id)}
                      title="Marcar como lida"
                      className="p-1.5 text-oliveGray hover:text-ink"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleApagar(n.id)}
                    title="Apagar"
                    className="p-1.5 text-oliveGray hover:text-alert"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
