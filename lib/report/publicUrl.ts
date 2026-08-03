// Supabase's storage.from(bucket).getPublicUrl(path) is just string construction under the
// hood — no network call, no client instance actually needed. Building it as a plain function
// here (rather than a closure over a Supabase client instance) means it can be imported and
// called directly by both server-rendered content and client components, instead of being
// passed as a function prop across that boundary — which React/Next.js does not allow.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ccbcklbomtncagmueiob.supabase.co";

export function publicMediaUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${path}`;
}

export function publicCompanyMediaUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/company-media/${path}`;
}
