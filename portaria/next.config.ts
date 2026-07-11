import type { NextConfig } from "next";

// Content-Security-Policy:
// - script-src precisa de 'unsafe-inline' (runtime inline do Next.js);
//   em dev precisa também de 'unsafe-eval' (react-refresh)
// - connect-src/img-src incluem o Supabase (auth, PostgREST, Storage)
// - style-src/font-src incluem Google Fonts (importadas em globals.css)
// Segunda linha de defesa contra XSS: mesmo que HTML malicioso escape à
// sanitização, scripts externos e iframes são bloqueados pelo browser.
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // @react-pdf/renderer usa dependências nativas (fontkit) — mantê-lo
  // fora do bundle do servidor evita erros de empacotamento.
  serverExternalPackages: ["@react-pdf/renderer", "react-pdf-html"],
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
  experimental: {
    serverActions: {
      // O default do Next é 1 MB — rejeitava qualquer upload maior ANTES
      // de a Server Action correr (500 + "unexpected response" no cliente).
      // Alinha com o máximo que a UI de documentos promete (25 MB).
      // Nota: a função serverless do hosting pode ter o seu próprio limite
      // de payload; ficheiros muito grandes podem exigir upload direto ao
      // Storage no futuro (ver docs/living-lab.md).
      bodySizeLimit: "25mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    // Secções operacionais movidas de /configuracao/* para o topo.
    // Redirecionamento permanente evita links quebrados (bookmarks, emails).
    const movidas = [
      "fracoes",
      "contactos",
      "contratos",
      "conversas",
      "timeline",
      "calendario",
      "pesquisa",
    ];
    return movidas.flatMap((seg) => [
      { source: `/configuracao/${seg}`, destination: `/${seg}`, permanent: true },
      { source: `/configuracao/${seg}/:path*`, destination: `/${seg}/:path*`, permanent: true },
    ]);
  },
  // Multi-tenant: domínios próprios por prédio apontam para a mesma app.
  // O middleware (src/middleware.ts) identifica o tenant pelo hostname
  // via lookup à tabela `tenants` (coluna dominios), com cache.
};

export default nextConfig;
