import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LocationEditor from "@/components/LocationEditor";
import { ProjectLocation, ProjectMedia } from "@/lib/types";
import { MapPin, ArrowLeftCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectLocationPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: location } = await supabase
    .from("project_location")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

  const { data: mediaRows } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", id)
    .in("category", ["location_photo", "map_photo"])
    .order("sort_order", { ascending: true });

  const media = (mediaRows as ProjectMedia[]) || [];

  return (
    <div className="app-root">
      <Sidebar active="location" userEmail={user.email} role={(profile?.role as any) || "owner"} />
      <main className="main-canvas">
        <div className="view">
          <Link href="/location" className="nav-btn" style={{ display: "inline-flex", width: "fit-content", marginBottom: -6 }}>
            <ArrowLeftCircle size={16} /> All Project Locations
          </Link>
          <div className="step-header">
            <div className="step-stamp"><MapPin size={14} /></div>
            <div>
              <h2 className="step-title">{project.name}</h2>
              <p className="step-subtitle">Describe the site, add a Google Maps screenshot and photos, and list distances to key places.</p>
            </div>
          </div>
          <LocationEditor
            projectId={project.id}
            initialLocation={location as ProjectLocation | null}
            initialLocationPhotos={media.filter((m) => m.category === "location_photo")}
            initialMapPhotos={media.filter((m) => m.category === "map_photo")}
          />
        </div>
      </main>
    </div>
  );
}
