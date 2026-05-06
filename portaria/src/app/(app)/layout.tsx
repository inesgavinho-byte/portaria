import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { AppHeader } from "@/components/layout/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-softCream/30">
      <AppHeader user={ctx.user} tenant={ctx.tenant} membership={ctx.membership} />
      <main className="flex-1 container-page py-12">{children}</main>
    </div>
  );
}
