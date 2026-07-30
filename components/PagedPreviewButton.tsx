"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Loader2 } from "lucide-react";

export default function PagedPreviewButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const targetRef = useRef<HTMLDivElement>(null);
  const renderedOnce = useRef(false);

  useEffect(() => {
    if (!open) {
      renderedOnce.current = false;
      return;
    }
    if (renderedOnce.current) return;
    renderedOnce.current = true;

    async function render() {
      setStatus("rendering");
      try {
        const source = document.getElementById("report-content");
        if (!source) throw new Error("Could not find report content to preview.");
        const html = source.innerHTML;

        const { Previewer } = await import("pagedjs");
        const previewer = new Previewer();
        if (targetRef.current) targetRef.current.innerHTML = "";
        await previewer.preview(html, ["/report-print.css"], targetRef.current);
        setStatus("ready");
      } catch (err: any) {
        setErrorMsg(err?.message || "Could not render the preview.");
        setStatus("error");
      }
    }
    render();
  }, [open]);

  function handlePrint() {
    window.print();
  }

  if (!open) {
    return (
      <button className="btn-ghost no-print" onClick={() => setOpen(true)}>
        Preview Pagination
      </button>
    );
  }

  const overlay = (
    <div className="pagedjs-print-overlay">
      <div className="pagedjs-print-overlay-header no-print">
        <span>Print Preview — A4</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-primary" onClick={handlePrint} disabled={status !== "ready"}>
            <Printer size={14} /> Print / Save as PDF
          </button>
          <button className="btn-ghost" onClick={() => setOpen(false)}>
            <X size={14} /> Close
          </button>
        </div>
      </div>
      {status === "rendering" && (
        <div className="pagedjs-loading no-print">
          <Loader2 size={20} className="spin" /> Laying out pages…
        </div>
      )}
      {status === "error" && (
        <div className="pagedjs-loading no-print" style={{ color: "var(--rust)" }}>
          {errorMsg}
        </div>
      )}
      <div className="pagedjs-print-canvas" ref={targetRef} />
    </div>
  );

  return createPortal(overlay, document.body);
}
