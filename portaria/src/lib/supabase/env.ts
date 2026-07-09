/**
 * Resolução das credenciais Supabase a partir do ambiente.
 *
 * Nomes canónicos: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Aceita como fallback os nomes criados pela extensão Supabase da Netlify
 * (NEXT_PUBLIC_SUPABASE_DATABASE_URL, SUPABASE_ANON_KEY, ...), para que o
 * deploy funcione sem duplicar variáveis à mão.
 *
 * Nota: as referências a process.env.NEXT_PUBLIC_* têm de ser estáticas
 * (nome completo) para o Next.js as inlinar no bundle de cliente.
 */

export function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    "";
  // Guarda contra a variável da extensão vir como connection string postgres://
  return url.startsWith("https://") ? url : "";
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  );
}
