import { createClient } from "@/lib/supabase/server";
import { computeAll, fmtINR, fmtNum, ProjectState } from "@/lib/engine";
import Sidebar from "@/components/Sidebar";
import ProjectCard from "@/components/ProjectCard";
import { createProject } from "@/app/actions";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { hostel: "Hostel", apartment: "Apartment Building", commercial: "Commercial Building" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "designer") redirect("/media");

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, project_type, data, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="app-root">
      <Sidebar active="projects" userEmail={user.email} />
      <main className="main-canvas">
        <div className="view">
          <div className="blueprint-hero">
            <div className="blueprint-grid" />
            <div className="hero-content">
              <div className="hero-eyebrow">BUILD MASTER · FEASIBILITY DASHBOARD</div>
              <h1 className="hero-title">Your Projects</h1>
              <div className="hero-meta">
                <span>{projects?.length || 0} saved project{(projects?.length || 0) === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          <div className="projects-grid">
            <form action={createProject}>
              <button type="submit" className="new-project-card" style={{ width: "100%" }}>
                <Plus size={16} /> New Project
              </button>
            </form>

            {(projects || []).map((p) => {
              const m = computeAll(p.data as ProjectState);
              return (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  typeLabel={TYPE_LABEL[p.project_type] || p.project_type}
                  roiText={fmtNum(m.roiPct) + "%"}
                  scoreText={fmtNum(m.overallScore) + "/10"}
                  investmentText={fmtINR(m.totalInvestment)}
                />
              );
            })}
          </div>

          {(!projects || projects.length === 0) && (
            <div className="card">
              <p className="note">No projects yet. Create your first one to start the feasibility wizard.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
