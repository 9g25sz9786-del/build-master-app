import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CompanySections from "@/components/CompanySections";
import CompanyLogoUpload from "@/components/CompanyLogoUpload";
import { saveCompanyProfile } from "@/app/actions";
import { Building2 } from "lucide-react";
import { CompanyProfile, CompanyProfileSection } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "designer") redirect("/media");

  const { data: company } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: sections } = await supabase
    .from("company_profile_sections")
    .select("*")
    .eq("owner_id", user.id)
    .order("sort_order", { ascending: true });

  const c = (company as CompanyProfile) || null;

  return (
    <div className="app-root">
      <Sidebar active="company-profile" userEmail={user.email} role="owner" />
      <main className="main-canvas">
        <div className="view">
          <div className="step-header">
            <div className="step-stamp"><Building2 size={14} /></div>
            <div>
              <h2 className="step-title">Company Profile</h2>
              <p className="step-subtitle">The Basics appear on every report's cover and contact block. Add as many Content Sections as you need below — each becomes its own heading, paragraph and photo gallery in the report's introduction.</p>
            </div>
          </div>

          <form action={saveCompanyProfile} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card-head">The Basics</div>
            <CompanyLogoUpload ownerId={user.id} initialPath={c?.logo_storage_path || null} />
            <div className="field-grid">
              <label className="field">
                <span className="field-label">Company Name</span>
                <input name="company_name" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.company_name || "Maharaja Engineers & Contractors"} />
              </label>
              <label className="field">
                <span className="field-label">Tagline</span>
                <input name="tagline" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.tagline || ""} placeholder="Building trust, one project at a time" />
              </label>
              <label className="field">
                <span className="field-label">Established Year</span>
                <input name="established_year" type="number" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.established_year || ""} />
              </label>
              <label className="field">
                <span className="field-label">Completed Projects</span>
                <input name="completed_projects_count" type="number" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.completed_projects_count || ""} />
              </label>
              <label className="field">
                <span className="field-label">Phone</span>
                <input name="phone" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.phone || ""} />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input name="email" type="email" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.email || ""} />
              </label>
              <label className="field">
                <span className="field-label">Website</span>
                <input name="website" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.website || ""} />
              </label>
              <label className="field">
                <span className="field-label">Address</span>
                <input name="address" className="field-input" style={{ paddingLeft: 12 }} defaultValue={c?.address || ""} />
              </label>
            </div>
            <button className="btn-primary" type="submit" style={{ width: "fit-content" }}>Save The Basics</button>
          </form>

          <div className="step-header" style={{ marginTop: 8 }}>
            <div className="step-stamp">+</div>
            <div>
              <h2 className="step-title" style={{ fontSize: 17 }}>Content Sections</h2>
              <p className="step-subtitle">e.g. "Building More than Structures", "Where it Began" — paste long text and add photos for each.</p>
            </div>
          </div>
          <CompanySections initialSections={(sections as CompanyProfileSection[]) || []} />
        </div>
      </main>
    </div>
  );
}
