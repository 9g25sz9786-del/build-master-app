import { ReportBlockType } from "@/lib/types";
import { ReportBlockData } from "@/components/report/ReportBlocks";

export interface DefaultBlockSeed {
  block_key: string;
  block_type: ReportBlockType;
  label: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  content_ref: Record<string, any>;
}

const PAGE_W = 180; // mm, content width within the A4 page margins
const PAGE_H = 260; // mm, content height within the A4 page margins
const MARGIN = 15;

/**
 * Every block starts as its own full page, in the same order the automatic report uses.
 * This is a deliberately simple, safe starting point — the user then drags, resizes, and
 * combines blocks onto shared pages from here.
 */
export function generateDefaultBlocks(data: ReportBlockData): DefaultBlockSeed[] {
  const seeds: DefaultBlockSeed[] = [];
  let page = 1;
  const add = (block_key: string, block_type: ReportBlockType, label: string, content_ref: Record<string, any> = {}) => {
    seeds.push({ block_key, block_type, label, page_number: page, x: MARGIN, y: MARGIN, width: PAGE_W, height: PAGE_H, z_index: 0, content_ref });
    page += 1;
  };

  add("cover", "cover", "Cover Page");
  add("toc", "toc", "Table of Contents");

  data.introSections.forEach((s) => {
    // Photo (top half) and text (bottom half) of the same topic start paired on one page —
    // still two independent blocks, so either can be moved, resized, or sent to its own page.
    seeds.push({ block_key: `intro_photo:${s.id}`, block_type: "intro_topic_photo", label: `Intro Photo — ${s.title}`, page_number: page, x: MARGIN, y: MARGIN, width: PAGE_W, height: 110, z_index: 0, content_ref: { sectionId: s.id } });
    seeds.push({ block_key: `intro_text:${s.id}`, block_type: "intro_topic_text", label: `Intro Text — ${s.title}`, page_number: page, x: MARGIN, y: MARGIN + 120, width: PAGE_W, height: PAGE_H - 120, z_index: 0, content_ref: { sectionId: s.id } });
    page += 1;
  });

  const hasLocation = !!(
    data.projectLocation?.description ||
    data.projectLocation?.latitude != null ||
    data.locationPhotos.length > 0 ||
    data.mapPhotos.length > 0 ||
    (data.projectLocation?.distances?.length || 0) > 0
  );
  if (hasLocation) {
    if (data.projectLocation?.description) add("location_desc", "location_description", "Location — Description");
    data.locationPhotos.forEach((p) => add(`location_photo:${p.id}`, "location_photo_item", `Location Photo — ${p.title}`, { photoId: p.id }));
    if (data.projectLocation?.latitude != null || data.mapPhotos.length > 0) add("location_map", "location_map", "Location — Map");
    if ((data.projectLocation?.distances?.length || 0) > 0) add("location_distances", "location_distances", "Location — Distances");
  }

  add("feasibility_basics", "feasibility_project_details", "Feasibility — Basics & Costs");
  add("feasibility_financials", "feasibility_cost_revenue", "Feasibility — Financials");
  add("feasibility_score", "feasibility_score", "Feasibility — Charts & Score");

  [...data.renders, ...data.plans, ...data.sitePhotos].forEach((m) =>
    add(`media:${m.id}`, "media_item", `Photo — ${m.title}`, { mediaId: m.id })
  );

  add("conclusion", "conclusion", "Conclusion & Recommendation");

  if (data.c?.author_name || data.c?.author_bio || data.c?.author_photo_storage_path) {
    seeds.push({ block_key: "author_bg", block_type: "author_background", label: "About the Author — Background", page_number: page, x: 0, y: 0, width: 210, height: 297, z_index: 0, content_ref: {} });
    seeds.push({ block_key: "author_text", block_type: "author_text", label: "About the Author — Text", page_number: page, x: MARGIN, y: 150, width: PAGE_W, height: 130, z_index: 1, content_ref: {} });
    page += 1;
  }

  add("closing", "closing", "Closing Page");

  return seeds;
}
