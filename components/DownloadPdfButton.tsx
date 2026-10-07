"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

export default function DownloadPdfButton({ projectId, brand }: { projectId: string; brand?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleDownload() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/projects/${projectId}/report-pdf${brand && brand !== "maharaja" ? `?brand=${encodeURIComponent(brand)}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Server responded with ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      a.download = match ? match[1] : "feasibility-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (err: any) {
      alert(err?.message || "Could not generate the PDF. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <button className="btn-primary no-print" onClick={handleDownload} disabled={status === "loading"}>
      {status === "loading" ? <Loader2 size={15} className="spin" /> : <FileDown size={15} />}
      {status === "loading" ? "Generating…" : "Download PDF"}
    </button>
  );
}
