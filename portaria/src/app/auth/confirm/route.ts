import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Confirmação de links de email (convite, recuperação de password).
 *
 * Suporta os dois formatos de link do Supabase:
 * - token_hash + type (template personalizado com {{ .TokenHash }} —
 *   o formato recomendado para SSR: funciona em qualquer browser)
 * - code (template default com {{ .ConfirmationURL }} + fluxo PKCE)
 *
 * Em sucesso, a sessão fica em cookies e redireciona-se para `next`
 * (apenas paths internos — nunca URLs externos).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("verifyOtp falhou:", error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("exchangeCodeForSession falhou:", error);
  }

  return NextResponse.redirect(`${origin}/login?erro=link`);
}
