"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Upload, GripVertical, LayoutTemplate } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createProjectIntroSection,
  updateProjectIntroSection,
  updateProjectIntroSectionLayout,
  deleteProjectIntroSection,
  addIntroSectionPhoto,
  removeIntroSectionPhoto,
} from "@/app/actions";
import { ProjectIntroSection, SectionPhoto } from "@/lib/types";

function SectionCard({ section, projectId, onDeleted }: { section: ProjectIntroSection; projectId: string; onDeleted: (id: string) => void }) {
  const supabase = createClient();
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body);
  const [photos, setPhotos] = useState<SectionPhoto[]>(section.photos || []);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showLayout, setShowLayout] = useState(false);
  const [pageBreak, setPageBreak] = useState(!!section.force_page_break_before);
  const [marginTop, setMarginTop] = useState(section.extra_margin_top_mm ?? 0);
  const [marginBottom, setMarginBottom] = useState(section.extra_margin_bottom_mm ?? 0);
  const [layoutSaving, setLayoutSaving] = useState<"idle" | "saving" | "saved">("idle");

  async function saveText() {
    setSaving("saving");
    try {
      await updateProjectIntroSection(section.id, title, body, projectId);
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1500);
    } catch {
      setSaving("idle");
    }
  }

  async function saveLayout(next: { pageBreak?: boolean; marginTop?: number; marginBottom?: number }) {
    const merged = {
      force_page_break_before: next.pageBreak ?? pageBreak,
      extra_margin_top_mm: next.marginTop ?? marginTop,
      extra_margin_bottom_mm: next.marginBottom ?? marginBottom,
    };
    setLayoutSaving("saving");
    try {
      await updateProjectIntroSectionLayout(section.id, merged, projectId);
      setLayoutSaving("saved");
      setTimeout(() => setLayoutSaving("idle"), 1200);
    } catch {
      setLayoutSaving("idle");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete the section "${title}"? This also removes its photos.`)) return;
    try {
      for (const p of photos) await supabase.storage.from("project-media").remove([p.storage_path]);
      await deleteProjectIntroSection(section.id, projectId);
      onDeleted(section.id);
    } catch (err: any) {
      alert(err?.message || "Could not delete section.");
    }
  }

  async function handleAddPhoto() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${projectId}/intro/${section.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-media").upload(path, file);
      if (upErr) throw upErr;
      await addIntroSectionPhoto(section.id, path, "", projectId);
      setPhotos((prev) => [...prev, { storage_path: path, caption: "" }]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      alert(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto(p: SectionPhoto) {
    try {
      await supabase.storage.from("project-media").remove([p.storage_path]);
      await removeIntroSectionPhoto(section.id, p.storage_path, projectId);
      setPhotos((prev) => prev.filter((x) => x.storage_path !== p.storage_path));
    } catch (err: any) {
      alert(err?.message || "Could not remove photo.");
    }
  }

  function publicUrl(path: string) {
    return supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="card section-card">
      <div className="section-card-head">
        <GripVertical size={15} className="section-drag-handle" />
        <input
          className="section-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveText}
          placeholder="Section heading, e.g. Where it Began"
        />
        <span className={"save-badge " + (saving === "saving" ? "saving" : saving === "saved" ? "saved" : "")}>
          {saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : ""}
        </span>
        <button className="btn-danger" onClick={handleDelete}><Trash2 size={13} /></button>
      </div>

      <textarea
        className="section-body-input"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={saveText}
        rows={10}
        placeholder="Paste the full text for this topic here (500+ words is fine)…"
      />

      <div className="media-grid" style={{ marginTop: 14 }}>
        {photos.map((p) => (
          <div className="media-tile" key={p.storage_path}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicUrl(p.storage_path)} alt="" className="media-thumb" />
            <button className="media-delete" onClick={() => handleRemovePhoto(p)} title="Remove"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
        <input ref={fileRef} type="file" accept="image/*" className="field-input" style={{ paddingLeft: 12, paddingTop: 7, maxWidth: 260 }} />
        <button className="btn-ghost" type="button" onClick={handleAddPhoto} disabled={uploading}>
          <Upload size={14} /> {uploading ? "Uploading…" : "Add Photo"}
        </button>
        <button className="btn-ghost" type="button" onClick={() => setShowLayout((v) => !v)} style={{ marginLeft: "auto" }}>
          <LayoutTemplate size={14} /> Adjust Layout
        </button>
      </div>

      {showLayout && (
        <div className="section-layout-panel">
          <label className="section-layout-row">
            <input
              type="checkbox"
              checked={pageBreak}
              onChange={(e) => {
                setPageBreak(e.target.checked);
                saveLayout({ pageBreak: e.target.checked });
              }}
            />
            Start this section on a fresh page
          </label>

          <div className="section-layout-row">
            <span>Nudge space above</span>
            <input
              type="number"
              className="field-input"
              style={{ width: 90, paddingLeft: 10 }}
              value={marginTop}
              min={-60}
              max={120}
              onChange={(e) => setMarginTop(Number(e.target.value))}
              onBlur={() => saveLayout({ marginTop })}
            />
            <span className="section-layout-unit">mm</span>
          </div>

          <div className="section-layout-row">
            <span>Nudge space below</span>
            <input
              type="number"
              className="field-input"
              style={{ width: 90, paddingLeft: 10 }}
              value={marginBottom}
              min={-60}
              max={120}
              onChange={(e) => setMarginBottom(Number(e.target.value))}
              onBlur={() => saveLayout({ marginBottom })}
            />
            <span className="section-layout-unit">mm</span>
          </div>

          <p className="section-layout-hint">
            Negative values pull content closer together, positive values add breathing room. Changes apply to the
            printable report and the pagination preview — not this editing screen.
          </p>
          {layoutSaving !== "idle" && (
            <span className={"save-badge " + (layoutSaving === "saving" ? "saving" : "saved")}>
              {layoutSaving === "saving" ? "Saving…" : "Saved"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectIntroSections({ projectId, initialSections }: { projectId: string; initialSections: ProjectIntroSection[] }) {
  const [sections, setSections] = useState<ProjectIntroSection[]>(initialSections);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    try {
      const row = await createProjectIntroSection(projectId);
      setSections((prev) => [...prev, row as ProjectIntroSection]);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="view">
      {sections.map((s) => (
        <SectionCard key={s.id} section={s} projectId={projectId} onDeleted={(id) => setSections((prev) => prev.filter((x) => x.id !== id))} />
      ))}
      <button className="new-project-card" onClick={handleAdd} disabled={adding} style={{ width: "100%" }}>
        <Plus size={16} /> {adding ? "Adding…" : "Add Section"}
      </button>
    </div>
  );
}
