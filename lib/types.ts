export type UserRole = "owner" | "designer";

export interface CompanyProfile {
  id: string;
  company_name: string;
  tagline: string | null;
  about: string | null;
  established_year: number | null;
  completed_projects_count: number | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  portfolio_highlights: string[];
  logo_storage_path: string | null;
  author_name: string | null;
  author_bio: string | null;
  author_photo_storage_path: string | null;
  author_background_photo_storage_path: string | null;
  updated_at: string;
}

export type MediaCategory = "render" | "plan" | "site_photo" | "other" | "location_photo" | "map_photo";

export interface ProjectMedia {
  id: string;
  project_id: string;
  uploaded_by: string;
  category: MediaCategory;
  title: string;
  caption: string | null;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface SectionPhoto {
  storage_path: string;
  caption: string;
}

export interface CompanyProfileSection {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  photos: SectionPhoto[];
  sort_order: number;
  created_at: string;
}

export interface ProjectIntroSection {
  id: string;
  project_id: string;
  title: string;
  body: string;
  photos: SectionPhoto[];
  sort_order: number;
  created_at: string;
  /** Manual print-layout overrides — set from the "Adjust Layout" controls on the Project Intro page. */
  force_page_break_before: boolean;
  extra_margin_top_mm: number;
  extra_margin_bottom_mm: number;
}

export interface LocationDistance {
  place: string;
  distance: string;
}

export interface ProjectLocation {
  id: string;
  project_id: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  distances: LocationDistance[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  owner_id: string;
  member_id: string | null;
  invited_email: string;
  role: "designer";
  status: "pending" | "active" | "removed";
  created_at: string;
}

export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, string> = {
  render: "3D Render",
  plan: "Plan / Drawing",
  site_photo: "Site Photo",
  other: "Other",
  location_photo: "Location Photo",
  map_photo: "Map Screenshot",
};

export function mediaPublicUrl(supabaseUrl: string, storagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/project-media/${storagePath}`;
}
