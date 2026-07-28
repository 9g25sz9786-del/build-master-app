import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, GitCompare, LogOut } from "lucide-react";
import { signOut } from "@/app/actions";

export default function Sidebar({
  active,
  userEmail,
  scoreBadge,
}: {
  active: "projects" | "compare" | "workspace";
  userEmail?: string | null;
  scoreBadge?: { value: string; label: string } | null;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Image src="/logo.png" alt="Build Master" width={44} height={44} className="brand-logo" />
        <div>
          <div className="brand-name">Build Master</div>
          <div className="brand-sub">Project Feasibility App</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <Link href="/projects" className={"nav-btn" + (active === "projects" || active === "workspace" ? " active" : "")}>
          <LayoutGrid size={16} strokeWidth={2} /> Projects
        </Link>
        <Link href="/compare" className={"nav-btn" + (active === "compare" ? " active" : "")}>
          <GitCompare size={16} strokeWidth={2} /> Compare
        </Link>
      </nav>
      <div className="sidebar-footer">
        {scoreBadge && (
          <div className="footer-score">
            <span>{scoreBadge.label}</span>
            <span className="mono footer-score-val">{scoreBadge.value}</span>
          </div>
        )}
        {userEmail && <div className="footer-user">{userEmail}</div>}
        <form action={signOut}>
          <button type="submit" className="footer-signout">
            <LogOut size={12} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
            Sign out
          </button>
        </form>
        <div className="footer-brand" style={{ marginTop: 10 }}>Maharaja Engineers & Contractors</div>
      </div>
    </aside>
  );
}
