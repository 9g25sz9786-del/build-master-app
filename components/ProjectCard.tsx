"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { renameProject } from "@/app/actions";

export default function ProjectCard({
  id,
  name,
  typeLabel,
  roiText,
  scoreText,
  investmentText,
}: {
  id: string;
  name: string;
  typeLabel: string;
  roiText: string;
  scoreText: string;
  investmentText: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    try {
      await renameProject(id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="project-card" style={{ cursor: "default" }}>
        <div className="project-card-type">{typeLabel}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            className="field-input"
            style={{ paddingLeft: 10, fontSize: 14 }}
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setValue(name); } }}
          />
          <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={save} disabled={saving} title="Save">
            <Check size={14} />
          </button>
          <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => { setEditing(false); setValue(name); }} title="Cancel">
            <X size={14} />
          </button>
        </div>
        <div className="project-card-stats">
          <span>ROI <b className="mono">{roiText}</b></span>
          <span>Score <b className="mono">{scoreText}</b></span>
        </div>
        <div className="project-card-stats" style={{ marginTop: 6 }}>
          <span>Investment <span className="mono">{investmentText}</span></span>
        </div>
      </div>
    );
  }

  return (
    <a href={`/projects/${id}`} className="project-card">
      <div className="project-card-type">{typeLabel}</div>
      <div className="project-card-name" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span>{name}</span>
        <button
          className="trash-btn"
          style={{ color: "var(--slate)" }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
          title="Rename project"
        >
          <Pencil size={13} />
        </button>
      </div>
      <div className="project-card-stats">
        <span>ROI <b className="mono">{roiText}</b></span>
        <span>Score <b className="mono">{scoreText}</b></span>
      </div>
      <div className="project-card-stats" style={{ marginTop: 6 }}>
        <span>Investment <span className="mono">{investmentText}</span></span>
      </div>
    </a>
  );
}
