// Report branding. The same report structure can be issued under different company brands —
// pick one with `?brand=<key>` on the full-report URL (the toggle in the report top bar does this).
// "maharaja" is the default and keeps the report exactly as it was (logo/contacts from the
// Company Profile, Maharaja office addresses, Build Master colophon).

export type BrandKey = "maharaja" | "eastay";

export type TeamMember = { name: string; role: string; bio: string; photo: string };

export type ReportBrand = {
  key: BrandKey;
  label: string;
  /** Accent colour used for dots, section numbers, rules, score bars, etc. */
  accent: string;
  /** Static logo for cover + closing page. null = use the logo uploaded in Company Profile. */
  logo: string | null;
  /** Small square mark used in page eyebrows (e.g. "THE TEAM"). */
  mark: string | null;
  /** Company name shown on the cover. null = Company Profile name. */
  companyName: string | null;
  /** Whether Company Profile tagline / "since" year belong to this brand. */
  useProfileTagline: boolean;
  /** Shown instead of the office-addresses page when set. */
  team: { eyebrow: string; title: string; members: TeamMember[] } | null;
  /** Closing-page contacts for brands that replace the Build Master colophon. Email falls back
   *  to the Company Profile email when not set here. null = keep the Build Master colophon. */
  contacts: { phones: string[]; whatsapp: string[]; email?: string; website?: string } | null;
};

export const BRANDS: Record<BrandKey, ReportBrand> = {
  maharaja: {
    key: "maharaja",
    label: "Maharaja",
    accent: "#C1272D",
    logo: null,
    mark: null,
    companyName: null,
    useProfileTagline: true,
    team: null,
    contacts: null,
  },
  eastay: {
    key: "eastay",
    label: "Eastay",
    accent: "#029B69",
    logo: "/brands/eastay/logo.png",
    mark: "/brands/eastay/mark.png",
    companyName: "Eastay Hostels",
    useProfileTagline: false,
    team: {
      eyebrow: "The Team",
      title: "Why this team",
      members: [
        {
          name: "Althaf K Shaphy",
          role: "Operations & Technology",
          bio: "16 years in IT and software, having built and scaled multiple applications — owns the Eastay operating platform.",
          photo: "/brands/eastay/team-althaf.jpg",
        },
        {
          name: "Nandu Jithendran",
          role: "Projects & Construction",
          bio: "22 years in construction and interiors across the GCC and India — project manager and project director on infrastructure builds.",
          photo: "/brands/eastay/team-nandu.jpg",
        },
        {
          name: "Rashad M",
          role: "Growth & Business",
          bio: "M.Tech in structural engineering and an MBA; project director on infrastructure projects.",
          photo: "/brands/eastay/team-rashad.jpg",
        },
      ],
    },
    contacts: {
      phones: ["+91 7561000480", "9567100048"],
      whatsapp: ["+91 7561000480", "9567100048"],
    },
  },
};

export function getBrand(key: string | string[] | undefined | null): ReportBrand {
  const k = Array.isArray(key) ? key[0] : key;
  return k && k in BRANDS ? BRANDS[k as BrandKey] : BRANDS.maharaja;
}
