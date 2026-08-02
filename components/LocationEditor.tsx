"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Upload, MapPin, Navigation, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  upsertProjectLocation,
  updateProjectLocationDistances,
  addProjectMedia,
  deleteProjectMedia,
} from "@/app/actions";
import { ProjectLocation, LocationDistance, ProjectMedia } from "@/lib/types";

function PhotoUploader({
  projectId,
  category,
  label,
  hint,
  photos,
  onUploaded,
  onDeleted,
}: {
  projectId: string;
  category: "location_photo" | "map_photo";
  label: string;
  hint: string;
  photos: ProjectMedia[];
  onUploaded: (m: ProjectMedia) => void;
  onDeleted: (id: string) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function publicUrl(path: string) {
    return supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus("No file selected — choose a photo first.");
      return;
    }
    setUploading(true);
    setStatus(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `${projectId}/${category}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-media").upload(path, file);
      if (upErr) throw upErr;
      await addProjectMedia(projectId, category, file.name, "", path);
      onUploaded({
        id: crypto.randomUUID(),
        project_id: projectId,
        uploaded_by: "",
        category,
        title: file.name,
        caption: null,
        storage_path: path,
        sort_order: 0,
        created_at: new Date().toISOString(),
      });
      if (fileRef.current) fileRef.current.value = "";
      setStatus("Photo added.");
      setTimeout(() => setStatus(null), 2500);
    } catch (err: any) {
      console.error("Location photo upload failed:", err);
      setStatus(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(m: ProjectMedia) {
    if (!confirm(`Delete this photo?`)) return;
    try {
      await supabase.storage.from("project-media").remove([m.storage_path]);
      await deleteProjectMedia(m.id, projectId);
      onDeleted(m.id);
    } catch (err: any) {
      setStatus(err?.message || "Could not delete.");
    }
  }

  return (
    <div className="card">
      <div className="card-head">{label}</div>
      <p className="note" style={{ marginBottom: 12 }}>{hint}</p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: photos.length > 0 ? 14 : 0, flexWrap: "wrap" }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="field-input"
          style={{ paddingLeft: 12, paddingTop: 7, maxWidth: 260 }}
          onChange={handleUpload}
        />
        <button className="btn-ghost" type="button" onClick={handleUpload} disabled={uploading}>
          <Upload size={14} /> {uploading ? "Uploading…" : "Add Photo"}
        </button>
        {status && (
          <span style={{ fontSize: 12.5, color: status.includes("added") ? "var(--green)" : "var(--rust)" }}>{status}</span>
        )}
      </div>
      {photos.length > 0 && (
        <div className="media-grid">
          {photos.map((p) => (
            <div className="media-tile" key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl(p.storage_path)} alt="" className="media-thumb" />
              <button className="media-delete" onClick={() => handleDelete(p)} title="Remove"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocationEditor({
  projectId,
  initialLocation,
  initialLocationPhotos,
  initialMapPhotos,
}: {
  projectId: string;
  initialLocation: ProjectLocation | null;
  initialLocationPhotos: ProjectMedia[];
  initialMapPhotos: ProjectMedia[];
}) {
  const [description, setDescription] = useState(initialLocation?.description || "");
  const [latitude, setLatitude] = useState<string>(initialLocation?.latitude != null ? String(initialLocation.latitude) : "");
  const [longitude, setLongitude] = useState<string>(initialLocation?.longitude != null ? String(initialLocation.longitude) : "");
  const [distances, setDistances] = useState<LocationDistance[]>(initialLocation?.distances || []);
  const [locationPhotos, setLocationPhotos] = useState<ProjectMedia[]>(initialLocationPhotos);
  const [mapPhotos, setMapPhotos] = useState<ProjectMedia[]>(initialMapPhotos);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  async function saveCore() {
    setSaving("saving");
    try {
      await upsertProjectLocation(projectId, {
        description,
        latitude: latitude.trim() === "" ? null : Number(latitude),
        longitude: longitude.trim() === "" ? null : Number(longitude),
      });
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1200);
    } catch (err: any) {
      alert(err?.message || "Could not save.");
      setSaving("idle");
    }
  }

  async function saveDistances(next: LocationDistance[]) {
    setDistances(next);
    try {
      await updateProjectLocationDistances(projectId, next);
    } catch (err: any) {
      alert(err?.message || "Could not save distances.");
    }
  }

  function addDistanceRow() {
    saveDistances([...distances, { place: "", distance: "" }]);
  }
  function updateDistanceRow(i: number, field: "place" | "distance", value: string) {
    const next = distances.map((d, idx) => (idx === i ? { ...d, [field]: value } : d));
    setDistances(next);
  }
  function removeDistanceRow(i: number) {
    saveDistances(distances.filter((_, idx) => idx !== i));
  }

  const lat = latitude.trim() === "" ? null : Number(latitude);
  const lng = longitude.trim() === "" ? null : Number(longitude);
  const mapsLink = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <div className="view">
      <div className="card">
        <div className="card-head"><MapPin size={14} /> Description & Advantages</div>
        <p className="note" style={{ marginBottom: 12 }}>Describe the location and why it's a strong site — connectivity, neighbourhood, growth potential, etc.</p>
        <textarea
          className="section-body-input"
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveCore}
          placeholder="e.g. Located in the heart of Kakkanad's IT corridor, minutes from Infopark and the NH bypass…"
        />
        {saving !== "idle" && (
          <span className={"save-badge " + (saving === "saving" ? "saving" : "saved")} style={{ display: "block", marginTop: 8 }}>
            {saving === "saving" ? "Saving…" : "Saved"}
          </span>
        )}
      </div>

      <div className="card">
        <div className="card-head"><Navigation size={14} /> Google Map Coordinates</div>
        <p className="note" style={{ marginBottom: 12 }}>
          Paste the latitude/longitude from Google Maps (right-click the pin on the map → the numbers shown → copy each into the fields below).
        </p>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">Latitude</span>
            <input className="field-input" style={{ paddingLeft: 12 }} value={latitude} onChange={(e) => setLatitude(e.target.value)} onBlur={saveCore} placeholder="e.g. 9.9816" />
          </label>
          <label className="field">
            <span className="field-label">Longitude</span>
            <input className="field-input" style={{ paddingLeft: 12 }} value={longitude} onChange={(e) => setLongitude(e.target.value)} onBlur={saveCore} placeholder="e.g. 76.2999" />
          </label>
        </div>
        {mapsLink && (
          <a href={mapsLink} target="_blank" rel="noreferrer" className="btn-ghost" style={{ marginTop: 12, width: "fit-content" }}>
            <ExternalLink size={14} /> View on Google Maps
          </a>
        )}
      </div>

      <PhotoUploader
        projectId={projectId}
        category="map_photo"
        label="Google Map Photo"
        hint="Take a screenshot of the location on Google Maps and upload it here — this appears in the report alongside the coordinates."
        photos={mapPhotos}
        onUploaded={(m) => setMapPhotos((prev) => [m, ...prev])}
        onDeleted={(id) => setMapPhotos((prev) => prev.filter((x) => x.id !== id))}
      />

      <PhotoUploader
        projectId={projectId}
        category="location_photo"
        label="Pictures of the Place"
        hint="Photos of the site, surroundings, or street view — these appear as the Location section's photo gallery in the report."
        photos={locationPhotos}
        onUploaded={(m) => setLocationPhotos((prev) => [m, ...prev])}
        onDeleted={(id) => setLocationPhotos((prev) => prev.filter((x) => x.id !== id))}
      />

      <div className="card">
        <div className="card-head">Distance to Key Places</div>
        <p className="note" style={{ marginBottom: 12 }}>e.g. Airport — 12 km, Railway Station — 4 km, City Centre — 2.5 km</p>
        {distances.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
            <input
              className="field-input"
              style={{ paddingLeft: 12, flex: 1 }}
              value={d.place}
              placeholder="Place name (e.g. Cochin International Airport)"
              onChange={(e) => updateDistanceRow(i, "place", e.target.value)}
              onBlur={() => saveDistances(distances)}
            />
            <input
              className="field-input"
              style={{ paddingLeft: 12, width: 160 }}
              value={d.distance}
              placeholder="e.g. 12 km"
              onChange={(e) => updateDistanceRow(i, "distance", e.target.value)}
              onBlur={() => saveDistances(distances)}
            />
            <button className="btn-danger" type="button" onClick={() => removeDistanceRow(i)}><Trash2 size={13} /></button>
          </div>
        ))}
        <button className="btn-ghost" type="button" onClick={addDistanceRow}>
          <Plus size={14} /> Add Place
        </button>
      </div>
    </div>
  );
}
