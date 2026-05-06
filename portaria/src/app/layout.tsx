import type { Metadata } from "next";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  return {
    title: {
      default: tenant?.nome ?? "Portaria",
      template: `%s · ${tenant?.nome ?? "Portaria"}`,
    },
    description: tenant
      ? `Plataforma digital do ${tenant.nome}`
      : "Plataforma digital de gestão de condomínios",
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
