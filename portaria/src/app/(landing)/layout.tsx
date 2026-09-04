import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: { absolute: "The DoorKeeper — O edifício, finalmente em ordem." },
  description:
    "Operação diária, arquivo e comunicação do seu condomínio num único lugar.",
};

/**
 * Layout da landing pública do The DoorKeeper (produto).
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
