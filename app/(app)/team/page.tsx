import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { inviteDesigner, removeTeamMember } from "@/app/actions";
import { Users, Trash2 } from "lucide-react";
import { TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "designer") redirect("/media");

  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="app-root">
      <Sidebar active="team" userEmail={user.email} role="owner" />
      <main className="main-canvas">
        <div className="view">
          <div className="step-header">
            <div className="step-stamp"><Users size={14} /></div>
            <div>
              <h2 className="step-title">Team</h2>
              <p className="step-subtitle">Invite a designer to upload 3D renders and plans — they get a restricted login limited to media uploads.</p>
            </div>
          </div>

          <div className="card">
            <div className="card-head">Invite a Designer</div>
            <form action={inviteDesigner} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <label className="field" style={{ flex: 1 }}>
                <span className="field-label">Email Address</span>
                <input name="email" type="email" required className="field-input" style={{ paddingLeft: 12 }} placeholder="designer@example.com" />
              </label>
              <button className="btn-primary" type="submit">Send Invite</button>
            </form>
            <p className="note" style={{ marginTop: 10 }}>
              The designer signs up normally at the login page using this exact email. Their account is automatically
              restricted to the Project Media section — they cannot see financial data.
            </p>
          </div>

          <div className="card">
            <div className="card-head">Team Members</div>
            {(!members || members.length === 0) ? (
              <p className="note">No designers invited yet.</p>
            ) : (
              (members as TeamMember[]).map((m) => (
                <div className="summary-row" key={m.id}>
                  <span>
                    {m.invited_email}{" "}
                    <span className={"risk-pill " + (m.status === "active" ? "risk-low" : m.status === "pending" ? "risk-medium" : "risk-high")}>
                      {m.status}
                    </span>
                  </span>
                  <form action={removeTeamMember.bind(null, m.id)}>
                    <button className="trash-btn" type="submit" title="Remove"><Trash2 size={14} /></button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
