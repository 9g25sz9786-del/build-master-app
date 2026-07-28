import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ccbcklbomtncagmueiob.supabase.co"),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_iDZ_P5BpkMcMKbWB_pClJw_6lE07JTK")
  );
}
