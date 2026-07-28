import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { EspacoForm } from "@/components/admin/espaco-form";

export default async function NovoEspacoPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");
  if (ctx.membership.role !== "admin") redirect("/inicio");

  return <EspacoForm />;
}
