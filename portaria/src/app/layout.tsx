import type { Metadata } from "next";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import "./globals.css";
// Regras de impressão do relatório do fornecedor. Está todo debaixo de
// `@media print` e limitado a `.relatorio`, pelo que não pesa no ecrã de
// nenhuma página; fica aqui, e não numa importação da rota, para o Next não o
// tratar como CSS de rota e o duplicar entre navegações.
import "@/styles/relatorio-print.css";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  return {
    title: {
      default: tenant?.nome ?? "The DoorKeeper",
      template: `%s · ${tenant?.nome ?? "The DoorKeeper"}`,
    },
    description: tenant
      ? `Plataforma digital do ${tenant.nome}`
      : "Gestão operacional e memória digital de condomínios",
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
