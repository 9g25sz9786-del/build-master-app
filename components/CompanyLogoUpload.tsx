"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveCompanyLogo } from "@/app/actions";

export default function CompanyLogoUpload({ ownerId, initialPath }: { ownerId: string; initialPath: string | null }) {
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
      const newPath = `${ownerId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("company-media").upload(newPath, file);
      if (error) throw error;
      await saveCompanyLogo(newPath);
      setPath(newPath);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      alert(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="logo-upload">
      <div className="logo-upload-preview">
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicUrl(path)} alt="Company logo" />
        ) : (
          <span className="logo-upload-placeholder">No logo</span>
        )}
      </div>
      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>Company Logo</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input ref={fileRef} type="file" accept="image/*" className="field-input" style={{ paddingLeft: 10, paddingTop: 6, maxWidth: 220 }} />
          <button type="button" className="btn-ghost" onClick={handleUpload} disabled={uploading}>
            <Upload size={14} /> {uploading ? "Uploading…" : "Upload Logo"}
          </button>
        </div>
        <p className="note" style={{ marginTop: 6 }}>Appears on the cover of the printable report instead of the Build Master mark.</p>
      </div>
    </div>
  );
}
