"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { Plus, Save, RotateCcw, Loader2, Grid3x3, AlertTriangle, Scissors, Copy, Trash2 } from "lucide-react";
import { saveReportLayout, resetReportLayout } from "@/app/actions";
import { renderBlockBody, ReportBlockData } from "@/components/report/ReportBlocks";
import { ReportBlock } from "@/lib/types";

// True 1:1 scale (96 CSS px per inch) — what you see here is the actual size that prints,
// no separate "shrink to fit" math needed.
const MM_TO_PX = 96 / 25.4;
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const GRID_MM = 5; // alignment grid spacing, and the snap increment while dragging/resizing
const SPLITTABLE_TYPES = ["intro_topic_text", "location_description"];
// These render their own full-box background image/layout — an inset padding would leave an
// unwanted border gap around them instead of a true bleed to the block's edges.
const FULL_BLEED_TYPES = ["cover", "toc", "author_background"];

type EditableBlock = Pick<
  ReportBlock,
  "id" | "block_key" | "block_type" | "label" | "page_number" | "x" | "y" | "width" | "height" | "z_index" | "content_ref"
>;

function getFullText(block: EditableBlock, blockData: ReportBlockData): string {
  if (block.block_type === "intro_topic_text") {
    return blockData.introSections.find((s) => s.id === block.content_ref.sectionId)?.body || "";
  }
  if (block.block_type === "location_description") {
    return blockData.projectLocation?.description || "";
  }
  return "";
}

/** Flags when a block's content is taller than the box it's in — the content still renders
    (scrollable here in the editor), but this is the visual cue that it will clip when printed. */
function BlockContent({ block, blockData, toc }: { block: EditableBlock; blockData: ReportBlockData; toc: { n: string; label: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const cropTopMm = block.content_ref.cropTopMm || 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > el.clientHeight + 2);
  }, [block.width, block.height, block.block_type, block.content_ref]);

  return (
    <>
      {overflowing && (
        <div className="canvas-overflow-badge" title="This content is taller than the box — it will be cut off when printed. Make the box taller, or use Split (scissors icon) to continue it on another page.">
          <AlertTriangle size={11} /> Overflowing
        </div>
      )}
      <div ref={ref} className={"canvas-block-content" + (FULL_BLEED_TYPES.includes(block.block_type) ? "" : " padded")}>
        <div style={{ marginTop: cropTopMm ? `-${cropTopMm}mm` : 0 }}>
          {renderBlockBody(block.block_type, block.content_ref, blockData, toc)}
        </div>
      </div>
    </>
  );
}

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
  const [showGrid, setShowGrid] = useState(true);

  const maxPage = useMemo(() => Math.max(1, ...blocks.map((b) => b.page_number)), [blocks]);
  const pageBlocks = blocks.filter((b) => b.page_number === activePage).sort((a, b) => a.z_index - b.z_index);
  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  /** Inserts a genuinely new blank page right after the page you're currently viewing, and
      shifts every later page up by one — like inserting a page in a document, not just
      appending an empty page at the very end. */
  function insertPageAfterActive() {
    const insertAt = activePage;
    setBlocks((prev) => prev.map((b) => (b.page_number > insertAt ? { ...b, page_number: b.page_number + 1 } : b)));
    setActivePage(insertAt + 1);
  }

  /** Copies the selected block onto a new page right after it, with the exact same content —
      no auto-splitting. Meant for cases where you want to manually decide what stays on each
      copy (e.g. trim the text range yourself) rather than an automatic even split. */
  function handleDuplicateBlock() {
    if (!selectedBlock) return;
    const newPage = selectedBlock.page_number + 1;
    setBlocks((prev) => prev.map((b) => (b.page_number >= newPage ? { ...b, page_number: b.page_number + 1 } : b)));
    const newBlock: EditableBlock = {
      ...selectedBlock,
      id: crypto.randomUUID(),
      block_key: `${selectedBlock.block_key}:copy${Date.now()}`,
      label: `${selectedBlock.label} (copy)`,
      page_number: newPage,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setActivePage(newPage);
    setSelectedId(newBlock.id);
  }

  /** Removes a page outright and renumbers every later page down by one, closing the gap —
      for when arranging blocks leaves an empty page in the middle. If the page still has
      blocks on it, they're deleted too, after confirming. */
  function handleRemovePage(pageNum: number) {
    const blocksHere = blocks.filter((b) => b.page_number === pageNum);
    if (blocksHere.length > 0) {
      if (!confirm(`Page ${pageNum} still has ${blocksHere.length} block(s) on it. Remove the page and delete ${blocksHere.length === 1 ? "it" : "them"} too?`)) return;
    }
    setBlocks((prev) =>
      prev
        .filter((b) => b.page_number !== pageNum)
        .map((b) => (b.page_number > pageNum ? { ...b, page_number: b.page_number - 1 } : b))
    );
    setActivePage(Math.max(1, pageNum - 1));
  }

  function updateBlock(id: string, patch: Partial<EditableBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function bringToFront(id: string) {
    const maxZ = Math.max(0, ...blocks.map((b) => b.z_index));
    updateBlock(id, { z_index: maxZ + 1 });
  }

  /** Cuts the selected text block's visible content in half, keeping the first half here and
      placing the second half in a brand-new block on a new page — the "add another page for
      overflowing text" facility. Can be used repeatedly if a block is still too long. */
  function handleSplitBlock() {
    if (!selectedBlock) return;
    const fullText = getFullText(selectedBlock, blockData);
    const curStart = selectedBlock.content_ref.textStart ?? 0;
    const curEnd = selectedBlock.content_ref.textEnd ?? fullText.length;
    const mid = curStart + Math.floor((curEnd - curStart) / 2);
    if (mid <= curStart || mid >= curEnd) {
      alert("This block's text is too short to split further.");
      return;
    }
    const newPage = selectedBlock.page_number + 1;
    setBlocks((prev) => prev.map((b) => (b.page_number >= newPage ? { ...b, page_number: b.page_number + 1 } : b)));
    const newBlock: EditableBlock = {
      ...selectedBlock,
      id: crypto.randomUUID(),
      block_key: `${selectedBlock.block_key}:cont${Date.now()}`,
      label: `${selectedBlock.label} (continued)`,
      page_number: newPage,
      content_ref: { ...selectedBlock.content_ref, textStart: mid, textEnd: curEnd },
    };
    updateBlock(selectedBlock.id, { content_ref: { ...selectedBlock.content_ref, textStart: curStart, textEnd: mid } });
    setBlocks((prev) => [...prev, newBlock]);
    setActivePage(newPage);
    setSelectedId(newBlock.id);
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
          <button className="canvas-page-tab canvas-page-add" onClick={insertPageAfterActive} title="Insert a new blank page right after the one you're viewing">
            <Plus size={13} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {selectedBlock && (
            <button className="btn-ghost" onClick={handleDuplicateBlock} title="Copy this block onto a new page, so you can trim each copy yourself">
              <Copy size={14} /> Duplicate Block
            </button>
          )}
          {selectedBlock && SPLITTABLE_TYPES.includes(selectedBlock.block_type) && (
            <button className="btn-ghost" onClick={handleSplitBlock} title="Move the second half of this text onto a new page">
              <Scissors size={14} /> Split Onto New Page
            </button>
          )}
          <button className="btn-ghost" onClick={() => setShowGrid((v) => !v)}>
            <Grid3x3 size={14} /> {showGrid ? "Hide Grid" : "Show Grid"}
          </button>
          <button className="btn-ghost" onClick={insertPageAfterActive}><Plus size={14} /> Add Page</button>
          <button className="btn-ghost" onClick={() => handleRemovePage(activePage)} title="Remove the page you're currently viewing">
            <Trash2 size={14} /> Remove Page
          </button>
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
          <p className="note" style={{ marginBottom: 10 }}>
            Click a block to jump to its page. Use the dropdown to move it to a different page.
            If a text block shows "Overflowing," select it and use "Split Onto New Page" above,
            or "Duplicate Block" and trim each copy's range below.
          </p>
          {selectedBlock && (
            <div className="canvas-trim-panel">
              <div className="canvas-trim-title">Crop from top</div>
              <div className="canvas-trim-row">
                <input
                  type="number" min={0} step={1}
                  value={selectedBlock.content_ref.cropTopMm || 0}
                  onChange={(e) => updateBlock(selectedBlock.id, { content_ref: { ...selectedBlock.content_ref, cropTopMm: Math.max(0, Number(e.target.value)) } })}
                />
                <span>mm hidden from the top of this block's content</span>
              </div>
            </div>
          )}
          {selectedBlock && SPLITTABLE_TYPES.includes(selectedBlock.block_type) && (() => {
            const fullText = getFullText(selectedBlock, blockData);
            const start = selectedBlock.content_ref.textStart ?? 0;
            const end = selectedBlock.content_ref.textEnd ?? fullText.length;
            return (
              <div className="canvas-trim-panel">
                <div className="canvas-trim-title">Trim visible text ({fullText.length} characters total)</div>
                <div className="canvas-trim-row">
                  <label>From</label>
                  <input
                    type="number" min={0} max={fullText.length} value={start}
                    onChange={(e) => updateBlock(selectedBlock.id, { content_ref: { ...selectedBlock.content_ref, textStart: Math.max(0, Math.min(Number(e.target.value), end - 1)) } })}
                  />
                  <label>To</label>
                  <input
                    type="number" min={0} max={fullText.length} value={end}
                    onChange={(e) => updateBlock(selectedBlock.id, { content_ref: { ...selectedBlock.content_ref, textEnd: Math.min(fullText.length, Math.max(Number(e.target.value), start + 1)) } })}
                  />
                </div>
              </div>
            );
          })()}
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
          <div
            className="canvas-page report-page"
            style={{
              width: PAGE_W_MM * MM_TO_PX,
              height: PAGE_H_MM * MM_TO_PX,
              backgroundImage: showGrid
                ? `linear-gradient(to right, rgba(193,39,45,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(193,39,45,0.08) 1px, transparent 1px)`
                : "none",
              backgroundSize: `${GRID_MM * MM_TO_PX}px ${GRID_MM * MM_TO_PX}px`,
            }}
          >
            {pageBlocks.length === 0 && (
              <div className="canvas-empty-page">No blocks on this page yet — assign one here from the sidebar.</div>
            )}
            {pageBlocks.map((b) => (
              <Rnd
                key={b.id}
                size={{ width: b.width * MM_TO_PX, height: b.height * MM_TO_PX }}
                position={{ x: b.x * MM_TO_PX, y: b.y * MM_TO_PX }}
                bounds="parent"
                dragGrid={[GRID_MM * MM_TO_PX, GRID_MM * MM_TO_PX]}
                resizeGrid={[GRID_MM * MM_TO_PX, GRID_MM * MM_TO_PX]}
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
                <BlockContent block={b} blockData={blockData} toc={toc} />
              </Rnd>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
