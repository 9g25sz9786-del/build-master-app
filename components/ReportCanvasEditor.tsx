"use client";

import { useState, useMemo } from "react";
import { Rnd } from "react-rnd";
import { Plus, Save, RotateCcw, Loader2 } from "lucide-react";
import { saveReportLayout, resetReportLayout } from "@/app/actions";
import { renderBlockBody, ReportBlockData } from "@/components/report/ReportBlocks";
import { ReportBlock } from "@/lib/types";

// True 1:1 scale (96 CSS px per inch) — what you see here is the actual size that prints,
// no separate "shrink to fit" math needed.
const MM_TO_PX = 96 / 25.4;
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

type EditableBlock = Pick<
  ReportBlock,
  "id" | "block_key" | "block_type" | "label" | "page_number" | "x" | "y" | "width" | "height" | "z_index" | "content_ref"
>;

export default function ReportCanvasEditor({
  projectId,
  initialBlocks,
  blockData,
  toc,
}: {
  projectId: string;
  initialBlocks: ReportBlock[];
  blockData: ReportBlockData;
  toc: { n: string; label: string }[];
}) {
  const [blocks, setBlocks] = useState<EditableBlock[]>(initialBlocks);
  const [activePage, setActivePage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  const maxPage = useMemo(() => Math.max(1, ...blocks.map((b) => b.page_number)), [blocks]);
  const pageBlocks = blocks.filter((b) => b.page_number === activePage).sort((a, b) => a.z_index - b.z_index);

  function updateBlock(id: string, patch: Partial<EditableBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function bringToFront(id: string) {
    const maxZ = Math.max(0, ...blocks.map((b) => b.z_index));
    updateBlock(id, { z_index: maxZ + 1 });
  }

  async function handleSave() {
    setSaving("saving");
    try {
      await saveReportLayout(
        projectId,
        blocks.map(({ block_key, block_type, label, page_number, x, y, width, height, z_index, content_ref }) => ({
          block_key, block_type, label, page_number, x, y, width, height, z_index, content_ref,
        }))
      );
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1500);
    } catch (err: any) {
      alert(err?.message || "Could not save layout.");
      setSaving("idle");
    }
  }

  async function handleReset() {
    if (!confirm("Reset to the automatic layout? This deletes your manual arrangement for this project's report.")) return;
    await resetReportLayout(projectId);
    window.location.href = `/projects/${projectId}/full-report`;
  }

  return (
    <div className="canvas-editor">
      <div className="canvas-toolbar">
        <div className="canvas-pages">
          {Array.from({ length: maxPage }, (_, i) => i + 1).map((p) => (
            <button key={p} className={"canvas-page-tab" + (p === activePage ? " active" : "")} onClick={() => setActivePage(p)}>
              {p}
            </button>
          ))}
          <button className="canvas-page-tab canvas-page-add" onClick={() => setActivePage(maxPage + 1)} title="Go to a new blank page — assign a block here to create it">
            <Plus size={13} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset to Automatic</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving === "saving"}>
            {saving === "saving" ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : "Save Layout"}
          </button>
        </div>
      </div>

      <div className="canvas-body">
        <div className="canvas-sidebar">
          <div className="canvas-sidebar-title">Blocks ({blocks.length})</div>
          <p className="note" style={{ marginBottom: 10 }}>Click a block to jump to its page. Use the dropdown to move it to a different page.</p>
          {blocks
            .slice()
            .sort((a, b) => a.page_number - b.page_number)
            .map((b) => (
              <div
                key={b.id}
                className={"canvas-block-row" + (selectedId === b.id ? " active" : "")}
                onClick={() => {
                  setActivePage(b.page_number);
                  setSelectedId(b.id);
                }}
              >
                <span>{b.label}</span>
                <select
                  value={b.page_number}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateBlock(b.id, { page_number: Number(e.target.value) })}
                >
                  {Array.from({ length: maxPage + 1 }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>Page {p}</option>
                  ))}
                </select>
              </div>
            ))}
        </div>

        <div className="canvas-page-wrap">
          <div className="canvas-page report-page" style={{ width: PAGE_W_MM * MM_TO_PX, height: PAGE_H_MM * MM_TO_PX }}>
            {pageBlocks.length === 0 && (
              <div className="canvas-empty-page">No blocks on this page yet — assign one here from the sidebar.</div>
            )}
            {pageBlocks.map((b) => (
              <Rnd
                key={b.id}
                size={{ width: b.width * MM_TO_PX, height: b.height * MM_TO_PX }}
                position={{ x: b.x * MM_TO_PX, y: b.y * MM_TO_PX }}
                bounds="parent"
                style={{ zIndex: b.z_index }}
                onDragStart={() => setSelectedId(b.id)}
                onDragStop={(_e, d) => updateBlock(b.id, { x: d.x / MM_TO_PX, y: d.y / MM_TO_PX })}
                onResizeStop={(_e, _dir, ref, _delta, pos) =>
                  updateBlock(b.id, {
                    width: ref.offsetWidth / MM_TO_PX,
                    height: ref.offsetHeight / MM_TO_PX,
                    x: pos.x / MM_TO_PX,
                    y: pos.y / MM_TO_PX,
                  })
                }
                onMouseDown={() => {
                  setSelectedId(b.id);
                  bringToFront(b.id);
                }}
                className={"canvas-block" + (selectedId === b.id ? " selected" : "")}
              >
                <div className="canvas-block-label">{b.label}</div>
                <div className="canvas-block-content">
                  {renderBlockBody(b.block_type, b.content_ref, blockData, toc)}
                </div>
              </Rnd>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
