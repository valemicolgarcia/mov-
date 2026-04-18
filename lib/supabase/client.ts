import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton: una sola instancia por tab. Sin esto, cada render crea un cliente nuevo
// — el objeto cambia de referencia en cada render y gatilla useEffects en cascada
// (auth subscribe/unsubscribe, re-fetch de routine/logs, remount visible como "recarga").
let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (revisar variables en Vercel)"
    );
  }
  client = createBrowserClient(url!, key!);
  return client;
}
