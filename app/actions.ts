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
