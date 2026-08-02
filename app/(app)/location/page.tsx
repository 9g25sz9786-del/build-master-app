import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LocationHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "designer") redirect("/media");

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, project_type, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="app-root">
      <Sidebar active="location" userEmail={user.email} role="owner" />
      <main className="main-canvas">
        <div className="view">
          <div className="step-header">
            <div className="step-stamp"><MapPin size={14} /></div>
            <div>
              <h2 className="step-title">Location</h2>
              <p className="step-subtitle">Describe the site, add photos and a map screenshot, and list distances to key places — this becomes the "Location" section of this project's printable report.</p>
            </div>
          </div>

          {(!projects || projects.length === 0) ? (
            <div className="card"><p className="note">No projects available yet.</p></div>
          ) : (
            <div className="projects-grid">
              {projects.map((p) => (
                <a key={p.id} href={`/location/${p.id}`} className="project-card">
                  <div className="project-card-type">{p.project_type}</div>
                  <div className="project-card-name">{p.name}</div>
                  <div className="project-card-stats"><span>Edit location →</span></div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
