import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ProjectIntroSections from "@/components/ProjectIntroSections";
import { ProjectIntroSection } from "@/lib/types";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { ArrowLeftCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectIntroPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: sections } = await supabase
    .from("project_intro_sections")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div className="app-root">
      <Sidebar active="intro" userEmail={user.email} role={(profile?.role as any) || "owner"} />
      <main className="main-canvas">
        <div className="view">
          <Link href="/intro" className="nav-btn" style={{ display: "inline-flex", width: "fit-content", marginBottom: -6 }}>
            <ArrowLeftCircle size={16} /> All Project Intros
          </Link>
          <div className="step-header">
            <div className="step-stamp"><BookOpen size={14} /></div>
            <div>
              <h2 className="step-title">{project.name}</h2>
              <p className="step-subtitle">e.g. "Building More than Structures", "Where it Began" — paste long text and add photos for each. This becomes the "Project Introduction" section of this project's printable report.</p>
            </div>
          </div>
          <ProjectIntroSections projectId={project.id} initialSections={(sections as ProjectIntroSection[]) || []} />
        </div>
      </main>
    </div>
  );
}
