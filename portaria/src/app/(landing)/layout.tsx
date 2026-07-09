import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: { absolute: "Portaria — Clareza. Memória. Tranquilidade." },
  description:
    "A Portaria organiza o presente, guarda o passado e prepara o futuro do seu condomínio.",
};

/**
 * Layout da landing pública da Portaria (produto).
 * Não depende de tenant: é a montra do produto, igual em qualquer domínio.
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-night">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
