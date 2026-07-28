"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Upload, Trash2, ArrowLeftCircle, Image as ImageIcon, FileText, Camera, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addProjectMedia, deleteProjectMedia } from "@/app/actions";
import { ProjectMedia, MediaCategory, MEDIA_CATEGORY_LABEL } from "@/lib/types";

const CATEGORY_ICON: Record<MediaCategory, any> = {
  render: ImageIcon,
  plan: FileText,
  site_photo: Camera,
  other: MoreHorizontal,
};
const CATEGORIES: MediaCategory[] = ["render", "plan", "site_photo", "other"];

export default function MediaManager({
  projectId,
  projectName,
  initialMedia,
}: {
  projectId: string;
  projectName: string;
  initialMedia: ProjectMedia[];
}) {
  const supabase = createClient();
  const [media, setMedia] = useState<ProjectMedia[]>(initialMedia);
  const [category, setCategory] = useState<MediaCategory>("render");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image file first.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${projectId}/${category}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-media").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      await addProjectMedia(projectId, category, title || file.name, caption, path);

      const { data: urlData } = supabase.storage.from("project-media").getPublicUrl(path);
      const newRow: ProjectMedia = {
        id: crypto.randomUUID(),
        project_id: projectId,
        uploaded_by: "",
        category,
        title: title || file.name,
        caption: caption || null,
        storage_path: path,
        sort_order: 0,
        created_at: new Date().toISOString(),
      };
      setMedia((prev) => [newRow, ...prev]);
      setTitle("");
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(m: ProjectMedia) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      await supabase.storage.from("project-media").remove([m.storage_path]);
      await deleteProjectMedia(m.id, projectId);
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err: any) {
      alert(err?.message || "Could not delete.");
    }
  }

  function publicUrl(path: string) {
    return supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="view">
      <Link href="/media" className="nav-btn" style={{ display: "inline-flex", width: "fit-content", marginBottom: -6 }}>
        <ArrowLeftCircle size={16} /> All Project Media
      </Link>
      <div className="step-header">
        <div className="step-stamp"><ImageIcon size={14} /></div>
        <div>
          <h2 className="step-title">{projectName}</h2>
          <p className="step-subtitle">Upload 3D renders, plans and site photos for this project's report.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><Upload size={14} /> Upload New Media</div>
        <form onSubmit={handleUpload} className="field-grid" style={{ alignItems: "end" }}>
          <label className="field">
            <span className="field-label">Category</span>
            <select className="field-input" style={{ paddingLeft: 12 }} value={category} onChange={(e) => setCategory(e.target.value as MediaCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{MEDIA_CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Title</span>
            <input className="field-input" style={{ paddingLeft: 12 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Front Elevation" />
          </label>
          <label className="field">
            <span className="field-label">Caption (optional)</span>
            <input className="field-input" style={{ paddingLeft: 12 }} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Shown under the image in the report" />
          </label>
          <label className="field">
            <span className="field-label">Image File</span>
            <input ref={fileRef} type="file" accept="image/*" className="field-input" style={{ paddingLeft: 12, paddingTop: 7 }} />
          </label>
          <button className="btn-primary" type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</button>
        </form>
        {error && <p className="note" style={{ color: "var(--rust)", marginTop: 10 }}>{error}</p>}
      </div>

      {CATEGORIES.map((cat) => {
        const items = media.filter((m) => m.category === cat);
        if (items.length === 0) return null;
        const Icon = CATEGORY_ICON[cat];
        return (
          <div className="card" key={cat}>
            <div className="card-head"><Icon size={14} /> {MEDIA_CATEGORY_LABEL[cat]}s</div>
            <div className="media-grid">
              {items.map((m) => (
                <div className="media-tile" key={m.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl(m.storage_path)} alt={m.title} className="media-thumb" />
                  <div className="media-tile-info">
                    <div className="media-tile-title">{m.title}</div>
                    {m.caption && <div className="media-tile-caption">{m.caption}</div>}
                  </div>
                  <button className="media-delete" onClick={() => handleDelete(m)} title="Delete"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {media.length === 0 && (
        <div className="card"><p className="note">No media uploaded yet for this project.</p></div>
      )}
    </div>
  );
}
