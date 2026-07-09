"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

/**
 * Cliente Supabase para uso em Client Components ('use client').
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
