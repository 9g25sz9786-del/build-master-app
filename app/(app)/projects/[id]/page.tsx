import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Workspace from "@/components/Workspace";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "designer") redirect(`/media/${id}`);

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, project_type, data, updated_at")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  return <Workspace project={project} userEmail={user.email ?? ""} />;
}
