"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { contarNaoLidas } from "@/lib/actions/notificacoes";

/**
 * Indicador leve de notificações. A atualização periódica evita que uma falha
 * de Realtime no cliente possa interromper o carregamento da área autenticada.
 */
export function NotificacoesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function atualizarContagem() {
      try {
        const total = await contarNaoLidas();
        if (mounted) setCount(total);
      } catch {
        // O indicador é não crítico: mantém a última contagem disponível.
      }
    }

    void atualizarContagem();
    const interval = window.setInterval(() => void atualizarContagem(), 60_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/notificacoes"
      className="relative p-2 text-oliveGray hover:text-ink transition-colors"
      aria-label="Notificações"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
