import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ccbcklbomtncagmueiob.supabase.co"),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_iDZ_P5BpkMcMKbWB_pClJw_6lE07JTK"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; middleware refreshes sessions instead.
          }
        },
      },
    }
  );
}
