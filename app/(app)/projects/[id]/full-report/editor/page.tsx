import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeftCircle, LayoutTemplate } from "lucide-react";
import { fetchReportData } from "@/lib/report/fetchReportData";
import { generateDefaultReportLayout } from "@/app/actions";
import ReportCanvasEditor from "@/components/ReportCanvasEditor";
import { ReportBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { project, blockData, toc } = await fetchReportData(id);

  const { data: blockRows } = await supabase
    .from("project_report_blocks")
    .select("*")
    .eq("project_id", id)
    .order("page_number", { ascending: true });
  const blocks = (blockRows as ReportBlock[]) || [];

  if (blocks.length === 0) {
    const seedAction = generateDefaultReportLayout.bind(null, id);
    return (
      <div className="app-root">
        <main className="main-canvas" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div className="card" style={{ maxWidth: 460, textAlign: "center" }}>
            <div className="card-head" style={{ justifyContent: "center", display: "flex", gap: 8 }}>
              <LayoutTemplate size={16} /> Manual Layout Editor
            </div>
            <p className="note" style={{ margin: "14px 0 20px" }}>
              This starts you off with every part of "{project.name}"'s report as its own full page, in the same
              order the automatic report uses. From there you can drag, resize, and reassign pages freely.
              Once you start using this, this project's report will render from your manual layout instead of
              the automatic one.
            </p>
            <form action={seedAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn-primary" type="submit" style={{ justifyContent: "center" }}>
                Start Manual Layout
              </button>
              <Link href={`/projects/${id}/full-report`} className="btn-ghost" style={{ justifyContent: "center" }}>
                <ArrowLeftCircle size={15} /> Back to Report
              </Link>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-root">
      <main className="main-canvas" style={{ maxWidth: "100%", padding: 0 }}>
        <div className="canvas-header">
          <Link href={`/projects/${id}/full-report`} className="btn-ghost">
            <ArrowLeftCircle size={15} /> Back to Report
          </Link>
          <div className="canvas-header-title">{project.name} — Manual Layout</div>
        </div>
        <ReportCanvasEditor projectId={id} initialBlocks={blocks} blockData={blockData} toc={toc} />
      </main>
    </div>
  );
}
