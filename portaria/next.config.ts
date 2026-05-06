import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagens hospedadas no Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Multi-tenant: domínios próprios por prédio apontam para a mesma app
  // O middleware (em src/middleware.ts) identifica o tenant pelo hostname
};

export default nextConfig;
