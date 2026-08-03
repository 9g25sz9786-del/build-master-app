import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { computeAll, buildRecommendation, ProjectState } from "@/lib/engine";
import { CompanyProfile, ProjectMedia, ProjectIntroSection, ProjectLocation } from "@/lib/types";
import { ReportBlockData } from "@/components/report/ReportBlocks";

export async function fetchReportData(id: string) {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, project_type, data, user_id, updated_at")
    .eq("id", id)
    .single();
  if (error || !project) notFound();

  const { data: company } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", project.user_id)
    .single();

  const { data: introSectionsRaw } = await supabase
    .from("project_intro_sections")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });
  const introSections = (introSectionsRaw as ProjectIntroSection[]) || [];

  const { data: mediaRows } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const { data: locationRow } = await supabase
    .from("project_location")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();
  const projectLocation = locationRow as ProjectLocation | null;

  const media = (mediaRows as ProjectMedia[]) || [];

  const state = project.data as ProjectState;
  const mRaw = computeAll(state);
  // computeAll() returns one internal helper function (loanBalanceAfterYears) alongside the
  // plain data. Functions can't cross the server->client component boundary (the canvas editor
  // is a Client Component), so strip it here — nothing in the report ever renders it directly.
  const { loanBalanceAfterYears, ...m } = mRaw;
  const rec = buildRecommendation(mRaw);
  const c = company as CompanyProfile | null;
  const companyName = c?.company_name || "Maharaja Engineers & Contractors";
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const galleryMedia = media.filter((x) => ["render", "plan", "site_photo", "other"].includes(x.category));
  const coverImage = galleryMedia.find((x) => x.category === "render") || galleryMedia[0];
  const renders = media.filter((x) => x.category === "render");
  const plans = media.filter((x) => x.category === "plan");
  const sitePhotos = media.filter((x) => x.category === "site_photo" || x.category === "other");
  const locationPhotos = media.filter((x) => x.category === "location_photo");
  const mapPhotos = media.filter((x) => x.category === "map_photo");
  const hasGalleryMedia = renders.length > 0 || plans.length > 0 || sitePhotos.length > 0;
  const hasLocationContent = !!(
    projectLocation?.description ||
    projectLocation?.latitude != null ||
    locationPhotos.length > 0 ||
    mapPhotos.length > 0 ||
    (projectLocation?.distances?.length || 0) > 0
  );
  const hasAuthorContent = !!(c?.author_name || c?.author_bio || c?.author_photo_storage_path);

  const sectionList = [
    { key: "intro", label: "Project Introduction" },
    ...(hasLocationContent ? [{ key: "location", label: "Location" }] : []),
    { key: "feasibility", label: "Project Feasibility Analysis" },
    ...(hasGalleryMedia ? [{ key: "media", label: "Renderings, Plans & Site Photos" }] : []),
    { key: "conclusion", label: "Conclusion & Recommendation" },
    ...(hasAuthorContent ? [{ key: "author", label: "About the Author" }] : []),
  ];
  const sectionNum: Record<string, string> = {};
  sectionList.forEach((s, i) => (sectionNum[s.key] = String(i + 1).padStart(2, "0")));
  const toc = sectionList.map((s) => ({ n: sectionNum[s.key], label: s.label }));

  const roomCountLabel = state.project.type === "hostel" ? "Number of Rooms" : state.project.type === "apartment" ? "Number of Apartments" : null;
  const roomCountValue = state.project.type === "hostel" ? m.rooms : state.project.type === "apartment" ? state.revenue.apartment.units : null;

  const blockData: ReportBlockData = {
    project: { id: project.id, name: project.name, project_type: project.project_type },
    state, m, rec, c, companyName, today,
    introSections, projectLocation, locationPhotos, mapPhotos, renders, plans, sitePhotos,
    coverImage, roomCountLabel, roomCountValue,
  };

  return { project, blockData, toc, sectionNum, hasGalleryMedia, hasLocationContent, hasAuthorContent };
}
