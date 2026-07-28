"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { contarNaoLidas } from "@/lib/actions/notificacoes";

export function NotificacoesBadge() {
  const [count, setCount] = useState(0);

  // Contagem inicial
  useEffect(() => {
    contarNaoLidas().then(setCount);
  }, []);

  // Realtime: escuta inserções na tabela notificacoes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notificacoes-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
        },
        () => {
          // Incrementa contador em vez de fazer fetch
          setCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
