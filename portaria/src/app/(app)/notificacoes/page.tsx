import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { listarNotificacoes } from "@/lib/actions/notificacoes";
import { NotificacoesLista } from "@/components/app/notificacoes-lista";

export default async function NotificacoesPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const notificacoes = await listarNotificacoes(50);

  return <NotificacoesLista notificacoesIniciais={notificacoes} />;
}
