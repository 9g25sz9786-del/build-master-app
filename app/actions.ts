"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STATE } from "@/lib/engine";

export async function createProject() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user!.id,
      name: "Untitled Project",
      project_type: DEFAULT_STATE.project.type,
      data: DEFAULT_STATE,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message || "Could not create project");

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  redirect("/projects");
}

export async function saveProject(id: string, name: string, projectType: string, data: unknown) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ name, project_type: projectType, data })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/compare");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* ─────────────────────────────── Company Profile ─────────────────────────────── */

export async function saveCompanyProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const highlights = String(formData.get("portfolio_highlights") || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    id: user!.id,
    company_name: String(formData.get("company_name") || "Maharaja Engineers & Contractors"),
    tagline: String(formData.get("tagline") || "") || null,
    about: String(formData.get("about") || "") || null,
    established_year: formData.get("established_year") ? Number(formData.get("established_year")) : null,
    completed_projects_count: formData.get("completed_projects_count") ? Number(formData.get("completed_projects_count")) : null,
    address: String(formData.get("address") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    email: String(formData.get("email") || "") || null,
    website: String(formData.get("website") || "") || null,
    portfolio_highlights: highlights,
  };

  const { error } = await supabase.from("company_profiles").upsert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/company-profile");
  revalidatePath("/projects");
}

/* ─────────────────────────────── Team / Designer invites ─────────────────────────────── */

export async function inviteDesigner(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  const { error } = await supabase.from("team_members").insert({
    owner_id: user!.id,
    invited_email: email,
    role: "designer",
    status: "pending",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function removeTeamMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

/* ─────────────────────────────── Project media ─────────────────────────────── */

export async function addProjectMedia(
  projectId: string,
  category: string,
  title: string,
  caption: string,
  storagePath: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("project_media").insert({
    project_id: projectId,
    uploaded_by: user!.id,
    category,
    title,
    caption: caption || null,
    storage_path: storagePath,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/media/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectMedia(id: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_media").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/media/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
}

/* ─────────────────────────────── Company Profile Sections ─────────────────────────────── */

export async function createCompanySection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("company_profile_sections")
    .insert({ owner_id: user!.id, title: "New Section", body: "", sort_order: Date.now() })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/company-profile");
  return data;
}

export async function updateCompanySection(id: string, title: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("company_profile_sections").update({ title, body }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/company-profile");
}

export async function deleteCompanySection(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("company_profile_sections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/company-profile");
}

export async function addSectionPhoto(sectionId: string, storagePath: string, caption: string) {
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("company_profile_sections")
    .select("photos")
    .eq("id", sectionId)
    .single();
  if (readErr) throw new Error(readErr.message);

  const photos = Array.isArray(existing?.photos) ? existing!.photos : [];
  photos.push({ storage_path: storagePath, caption });

  const { error } = await supabase.from("company_profile_sections").update({ photos }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath("/company-profile");
}

export async function removeSectionPhoto(sectionId: string, storagePath: string) {
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("company_profile_sections")
    .select("photos")
    .eq("id", sectionId)
    .single();
  if (readErr) throw new Error(readErr.message);

  const photos = (Array.isArray(existing?.photos) ? existing!.photos : []).filter(
    (p: any) => p.storage_path !== storagePath
  );

  const { error } = await supabase.from("company_profile_sections").update({ photos }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath("/company-profile");
}

