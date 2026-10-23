// Report branding. The same report structure can be issued under different company brands —
// pick one with `?brand=<key>` on the full-report URL (the toggle in the report top bar does this).
// "maharaja" is the default and keeps the report exactly as it was (logo/contacts from the
// Company Profile, Maharaja office addresses, Build Master colophon).

export type BrandKey = "maharaja" | "eastay";

export type TeamMember = { name: string; role: string; bio: string; photo: string };

export type AdvisorySection = {
  title: string;
  /** Fee range as a share of total project investment, e.g. [5, 10]. */
  feePct: [number, number];
  intro: string;
  services: { title: string; text: string }[];
  why: string;
  benefits: string[];
};

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
  /** Brand fee section shown after Conclusion & Recommendation. null = none. */
  advisory: AdvisorySection | null;
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
    advisory: null,
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
    advisory: {
      title: "Eastay Development Management Fee",
      feePct: [5, 10],
      intro:
        "Eastay charges a development management fee of 5–10% of the total project investment. The exact rate is agreed upfront for each project and depends on its size, complexity and location. In return, the investor gets a single, accountable partner that takes the project from an empty plot to a finished, operating building.",
      services: [
        { title: "Land identification", text: "Sourcing and shortlisting plots that fit the investment brief, with location, access and demand checked before any money is committed." },
        { title: "Legal checks", text: "Title verification, encumbrance and ownership history, zoning and land-use confirmation, and documentation for a clean purchase." },
        { title: "Construction planning", text: "Design coordination, budgeting, scheduling and contractor selection, so the build is priced and planned before it starts." },
        { title: "Approvals", text: "Building permits and the related statutory clearances, followed through with the authorities until they are issued." },
        { title: "End-to-end construction", text: "Day-to-day site management, quality checks and cost and timeline control through to handover." },
      ],
      why:
        "Each of these stages needs local market knowledge, working relationships and real time on the ground. The fee pays for experienced Eastay partners to dedicate that time to your project, instead of the investor coordinating separate brokers, lawyers, consultants and contractors on their own.",
      benefits: [
        "One point of contact and accountability from land search to handover.",
        "Lower risk: title, zoning and approval issues are caught before capital is committed.",
        "Tighter cost control through experienced budgeting, contractor selection and site supervision.",
        "Faster time to revenue, with fewer delays in approvals and construction.",
        "The investor's time is freed to focus on investment decisions rather than day-to-day execution.",
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
