import { FileText, Plus, Edit2, Trash2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UpdateLogEntry {
  id: string;
  version: string;
  title: string;
  releaseDate: string;
  category: "Audio Engine" | "Visuals" | "Platform" | "Release";
  body: string;
  status: "published" | "draft";
  bulletPoints?: string[];
}

export function AdminUpdateLog() {
  const [entries, setEntries] = useState<UpdateLogEntry[]>([
    {
      id: "entry-1",
      version: "0.3.0",
      title: "24D Spatial Engine & Concert Stage Upgrade",
      releaseDate: "2026-10-25",
      category: "Audio Engine",
      body: "Comprehensive upgrade of the audio processing pipeline with 16-speaker spatial expansion, acoustic hall convolution, and restored purple concert atmosphere.",
      status: "published",
      bulletPoints: [
        "16-Speaker virtual spatial soundstage with real-time level meters",
        "Acoustic hall convolution reverb with natural early reflection modeling",
        "Restored purple Concert Room visual geometry with illuminated lavender rings",
        "Master Peak Limiter to prevent clipping and distortion",
      ],
    },
    {
      id: "entry-2",
      version: "0.2.1",
      title: "Focus Listening & Synchronized Lyrics Improvements",
      releaseDate: "2026-10-20",
      category: "Platform",
      body: "Refined the Focus Mode timer and audio visualizer responsiveness for enhanced concentration sessions.",
      status: "published",
      bulletPoints: [
        "Improved Focus session timer persistence across tab switching",
        "Synchronized lyrics visual flow smoothness",
      ],
    },
  ]);

  const [editingEntry, setEditingEntry] = useState<UpdateLogEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Load from Supabase changelog
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.from("changelog").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) {
          const loaded: UpdateLogEntry[] = data.map((d) => ({
            id: d.id,
            version: d.version,
            title: d.title,
            releaseDate: d.created_at ? d.created_at.slice(0, 10) : "2026-10-25",
            category: "Release",
            body: d.body,
            status: "published",
            bulletPoints: d.body.split("\n").filter((l: string) => l.startsWith("-")).map((l: string) => l.replace(/^-\s*/, "")),
          }));
          setEntries((prev) => {
            const ids = new Set(loaded.map((l) => l.id));
            const retained = prev.filter((p) => !ids.has(p.id));
            return [...loaded, ...retained];
          });
        }
      } catch {
        // Fallback to local entries
      }
    })();
  }, []);

  function handleOpenCreate() {
    setEditingEntry({
      id: `entry-${Date.now()}`,
      version: "",
      title: "",
      releaseDate: new Date().toISOString().slice(0, 10),
      category: "Audio Engine",
      body: "",
      status: "published",
      bulletPoints: [""],
    });
    setShowModal(true);
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;

    if (!editingEntry.version.trim() || !editingEntry.title.trim()) {
      setStatusMsg("Version and Title are required.");
      return;
    }

    // Persist to Supabase changelog table if published
    if (editingEntry.status === "published") {
      try {
        await supabase.from("changelog").upsert({
          id: editingEntry.id.startsWith("entry-") ? undefined : editingEntry.id,
          version: editingEntry.version.trim(),
          title: editingEntry.title.trim(),
          body: editingEntry.body.trim(),
        });
      } catch {
        // Saved locally
      }
    }

    setEntries((prev) => {
      const exists = prev.some((p) => p.id === editingEntry.id);
      if (exists) {
        return prev.map((p) => (p.id === editingEntry.id ? editingEntry : p));
      }
      return [editingEntry, ...prev];
    });

    setShowModal(false);
    setEditingEntry(null);
    setStatusMsg("Update entry saved and synced.");
  }

  async function handleDelete(id: string) {
    try {
      await supabase.from("changelog").delete().eq("id", id);
    } catch {}
    setEntries((prev) => prev.filter((p) => p.id !== id));
    setStatusMsg("Update log removed.");
  }

  function togglePublish(id: string) {
    setEntries((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === "published" ? "draft" : "published" } : p))
    );
  }

  return (
    <div>
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <FileText size={18} color="var(--admin-accent-green)" />
            Release Notes & Update Log Manager
          </div>
          <button className="admin-btn admin-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            <span>New Update Log</span>
          </button>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(52, 211, 153, 0.15)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "8px",
              color: "#6ee7b7",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <CheckCircle2 size={15} />
            <span>{statusMsg}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {entries.map((item) => (
            <div
              key={item.id}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--admin-card-border)",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontFamily: "Manrope, sans-serif",
                        fontWeight: 800,
                        fontSize: "14px",
                        color: "var(--admin-accent-gold)",
                        padding: "2px 8px",
                        background: "rgba(211, 188, 145, 0.12)",
                        borderRadius: "4px",
                      }}
                    >
                      v{item.version}
                    </span>
                    <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: "16px", color: "#fff" }}>
                      {item.title}
                    </span>
                    <span className={`status-pill ${item.status === "published" ? "published" : "draft"}`}>
                      {item.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>
                    {item.releaseDate} · Category: {item.category}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    className="admin-btn admin-btn-outline"
                    onClick={() => togglePublish(item.id)}
                    style={{ padding: "6px 10px" }}
                    title={item.status === "published" ? "Switch to draft" : "Publish to site"}
                  >
                    {item.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    className="admin-btn admin-btn-outline"
                    onClick={() => {
                      setEditingEntry(item);
                      setShowModal(true);
                    }}
                    style={{ padding: "6px 10px" }}
                    title="Edit entry"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="admin-btn admin-btn-danger"
                    onClick={() => handleDelete(item.id)}
                    style={{ padding: "6px 10px" }}
                    title="Delete entry"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <p style={{ fontSize: "13px", color: "#cfcbbf", lineHeight: "1.5", margin: "8px 0" }}>
                {item.body}
              </p>

              {item.bulletPoints && item.bulletPoints.length > 0 && (
                <ul style={{ margin: "10px 0 0", paddingLeft: "20px", fontSize: "12px", color: "var(--admin-accent-lavender)", lineHeight: "1.6" }}>
                  {item.bulletPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && editingEntry && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: "600px" }}>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
              {editingEntry.id.startsWith("entry-") ? "New Release Update Log" : "Edit Update Log"}
            </h2>

            <form onSubmit={handleSaveEntry} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                    VERSION NUMBER
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEntry.version}
                    onChange={(e) => setEditingEntry({ ...editingEntry, version: e.target.value })}
                    placeholder="0.3.0"
                    style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                    UPDATE TITLE
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEntry.title}
                    onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
                    placeholder="Spatial Listening & Studio Upgrade"
                    style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                    CATEGORY
                  </label>
                  <select
                    value={editingEntry.category}
                    onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value as never })}
                    style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                  >
                    <option value="Audio Engine">Audio Engine</option>
                    <option value="Visuals">Visuals</option>
                    <option value="Platform">Platform</option>
                    <option value="Release">Release</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                    PUBLICATION STATUS
                  </label>
                  <select
                    value={editingEntry.status}
                    onChange={(e) => setEditingEntry({ ...editingEntry, status: e.target.value as never })}
                    style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                  >
                    <option value="published">Published (Visible Publicly)</option>
                    <option value="draft">Draft (Admin Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  SUMMARY DESCRIPTION
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingEntry.body}
                  onChange={(e) => setEditingEntry({ ...editingEntry, body: e.target.value })}
                  placeholder="Summary of improvements and changes introduced in this release..."
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Update Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
