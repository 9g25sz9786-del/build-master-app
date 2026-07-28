import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MediaManager from "@/components/MediaManager";
import { ProjectMedia } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, project_type")
    .eq("id", id)
    .single();
  if (error || !project) notFound();

  const { data: media } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="app-root">
      <Sidebar active="media" userEmail={user.email} role={(profile?.role as any) || "owner"} />
      <main className="main-canvas">
        <MediaManager
          projectId={project.id}
          projectName={project.name}
          initialMedia={(media as ProjectMedia[]) || []}
        />
      </main>
    </div>
  );
}
