"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveAuthorPhoto, saveAuthorBackgroundPhoto } from "@/app/actions";

export default function AuthorPhotoUpload({
  ownerId,
  initialPath,
  kind = "portrait",
}: {
  ownerId: string;
  initialPath: string | null;
  kind?: "portrait" | "background";
}) {
  const supabase = createClient();
  const [path, setPath] = useState<string | null>(initialPath);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function publicUrl(p: string) {
    return supabase.storage.from("company-media").getPublicUrl(p).data.publicUrl;
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const newPath = `${ownerId}/author-${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("company-media").upload(newPath, file);
      if (error) throw error;
      if (kind === "background") {
        await saveAuthorBackgroundPhoto(newPath);
      } else {
        await saveAuthorPhoto(newPath);
      }
      setPath(newPath);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      alert(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const label = kind === "background" ? "Author Page — Background Photo (optional)" : "Author Photo";
  const helpText =
    kind === "background"
      ? "Optional second photo (e.g. a site or project shot) blended into the background of the \"About the Author\" page, behind your portrait."
      : "Your clear portrait — appears on the \"About the Author\" page near the end of the printable report.";

  return (
    <div className="logo-upload">
      <div className="logo-upload-preview" style={{ borderRadius: kind === "portrait" ? "50%" : 8 }}>
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicUrl(path)} alt="" style={{ objectFit: "cover" }} />
        ) : (
          <span className="logo-upload-placeholder">No photo</span>
        )}
      </div>
      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>{label}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input ref={fileRef} type="file" accept="image/*" className="field-input" style={{ paddingLeft: 10, paddingTop: 6, maxWidth: 220 }} />
          <button type="button" className="btn-ghost" onClick={handleUpload} disabled={uploading}>
            <Upload size={14} /> {uploading ? "Uploading…" : "Upload Photo"}
          </button>
        </div>
        <p className="note" style={{ marginTop: 6 }}>{helpText}</p>
      </div>
    </div>
  );
}
