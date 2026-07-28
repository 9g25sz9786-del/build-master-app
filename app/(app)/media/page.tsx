import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MediaHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, project_type, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="app-root">
      <Sidebar active="media" userEmail={user.email} role={(profile?.role as any) || "owner"} />
      <main className="main-canvas">
        <div className="view">
          <div className="step-header">
            <div className="step-stamp"><ImageIcon size={14} /></div>
            <div>
              <h2 className="step-title">Project Media</h2>
              <p className="step-subtitle">Upload 3D renders, plans and site photos. These are woven into each project's printable report.</p>
            </div>
          </div>

          {(!projects || projects.length === 0) ? (
            <div className="card"><p className="note">No projects available yet.</p></div>
          ) : (
            <div className="projects-grid">
              {projects.map((p) => (
                <a key={p.id} href={`/media/${p.id}`} className="project-card">
                  <div className="project-card-type">{p.project_type}</div>
                  <div className="project-card-name">{p.name}</div>
                  <div className="project-card-stats"><span>Manage media →</span></div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
