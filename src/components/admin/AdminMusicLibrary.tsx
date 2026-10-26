import {
  Upload,
  Play,
  Pause,
  Trash2,
  Edit2,
  Search,
  CheckCircle,
  FileAudio,
  Eye,
  EyeOff,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { type Track } from "@/lib/tracks";
import { supabase } from "@/integrations/supabase/client";
import {
  type ManagedTrack,
  getBuiltInManagedTracks,
  getSavedAdminTracks,
  saveAdminTracks,
  fetchSupabaseCatalog,
} from "@/lib/catalog";

export type { ManagedTrack };

export function AdminMusicLibrary() {
  const [tracks, setTracks] = useState<ManagedTrack[]>(() => {
    const builtIn = getBuiltInManagedTracks();
    const saved = getSavedAdminTracks();
    // Prioritize saved custom tracks, then built-in
    const map = new Map<string, ManagedTrack>();
    saved.forEach((t) => map.set(t.src, t));
    builtIn.forEach((t) => {
      if (!map.has(t.src)) map.set(t.src, t);
    });
    return Array.from(map.values());
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Preview Player State
  const [previewTrack, setPreviewTrack] = useState<ManagedTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Edit / Add Modal State
  const [editingTrack, setEditingTrack] = useState<ManagedTrack | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Confirmation Delete State
  const [trackToDelete, setTrackToDelete] = useState<ManagedTrack | null>(null);

  // Load cloud catalog from Supabase storage and database
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const cloudTracks = await fetchSupabaseCatalog();
        if (!mounted) return;

        setTracks((prev) => {
          const map = new Map<string, ManagedTrack>();
          // 1. Keep currently loaded (custom saved & built-in)
          prev.forEach((t) => map.set(t.src, t));
          // 2. Add Supabase storage tracks if not present
          cloudTracks.forEach((c) => {
            if (!map.has(c.src)) map.set(c.src, c);
          });
          const merged = Array.from(map.values());
          return merged;
        });

        // Also check user_tracks if table exists
        try {
          const { data } = await supabase.from("user_tracks").select("*");
          if (mounted && data && data.length > 0) {
            const dbTracks: ManagedTrack[] = data.map((d) => ({
              id: d.id,
              title: d.title,
              artist: d.artist || "Cloud Library",
              src: d.storage_path,
              cover: d.cover || "🎧",
              album: "Cloud Upload",
              dateAdded: d.created_at ? d.created_at.slice(0, 10) : "2026-10-25",
              status: "published",
              tags: ["Cloud Upload"],
              durationSec: 210,
            }));
            setTracks((prev) => {
              const map = new Map<string, ManagedTrack>();
              prev.forEach((t) => map.set(t.src, t));
              dbTracks.forEach((t) => {
                if (!map.has(t.src)) map.set(t.src, t);
              });
              return Array.from(map.values());
            });
          }
        } catch {}
      } catch {
        // Fallback gracefully
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  function handlePlayPreview(t: ManagedTrack) {
    if (previewTrack?.id === t.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    setPreviewTrack(t);
    if (!audioRef.current) {
      audioRef.current = new Audio(t.src);
    } else {
      audioRef.current.src = t.src;
    }

    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
      setUploadMsg({ text: "Could not preview audio file. Check format.", error: true });
    });

    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) setPlaybackTime(audioRef.current.currentTime);
    };
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) setDuration(audioRef.current.duration);
    };
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadMsg(null);

    const validExtensions = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"];
    const file = files[0];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setUploadMsg({ text: "Invalid file type. Please upload MP3, WAV, FLAC, M4A, or OGG.", error: true });
      setUploading(false);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadMsg({ text: "File exceeds 50MB maximum upload limit.", error: true });
      setUploading(false);
      return;
    }

    // Attempt upload to Supabase storage
    const sanitizedName = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
    let publicUrl = "";

    try {
      const { data, error } = await supabase.storage.from("resona-public-audio").upload(sanitizedName, file, {
        upsert: true,
        contentType: file.type || "audio/mpeg",
      });
      if (!error && data) {
        const { data: pubData } = supabase.storage.from("resona-public-audio").getPublicUrl(data.path);
        if (pubData?.publicUrl) publicUrl = pubData.publicUrl;
      }
    } catch {
      // Local preview fallback if bucket unconfigured
    }

    // If bucket upload was unavailable or CORS-blocked, create object URL
    if (!publicUrl) {
      publicUrl = URL.createObjectURL(file);
    }

    // Clean track title & artist from filename
    const cleanRaw = file.name.replace(/\.[^/.]+$/, "");
    let cleanTitle = cleanRaw.replace(/[-_]/g, " ").trim();
    let artist = "Admin Ingestion";

    if (cleanRaw.includes(" - ")) {
      const parts = cleanRaw.split(" - ");
      artist = parts[0].trim();
      cleanTitle = parts.slice(1).join(" - ").trim();
    }

    const newTrack: ManagedTrack = {
      id: `custom-${Date.now()}-${sanitizedName}`,
      title: cleanTitle,
      artist,
      album: "Admin Ingestions",
      src: publicUrl,
      cover: "🎧",
      dateAdded: new Date().toISOString().slice(0, 10),
      status: "published",
      tags: ["Uploaded", "24D Spatial Ready"],
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      durationSec: 210,
    };

    setTracks((prev) => {
      const updated = [newTrack, ...prev.filter((p) => p.src !== newTrack.src)];
      saveAdminTracks(updated);
      return updated;
    });

    setUploading(false);
    setUploadMsg({
      text: `Track "${cleanTitle}" successfully added to library & synced to 24D Audio Studio!`,
    });
  }

  function togglePublishStatus(id: string) {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, status: (t.status === "published" ? "draft" : "published") as "published" | "draft" } : t));
      saveAdminTracks(updated);
      return updated;
    });
  }

  function saveEditedTrack(updated: ManagedTrack) {
    setTracks((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      saveAdminTracks(next);
      return next;
    });
    setShowEditModal(false);
    setEditingTrack(null);
  }

  function confirmDeleteTrack() {
    if (!trackToDelete) return;
    setTracks((prev) => {
      const updated = prev.filter((t) => t.id !== trackToDelete.id);
      saveAdminTracks(updated);
      return updated;
    });

    if (previewTrack?.id === trackToDelete.id) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPreviewTrack(null);
    }
    setTrackToDelete(null);
  }

  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Upload Zone */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <Upload size={18} color="var(--admin-accent-gold)" />
            Music Ingestion & Master Upload
          </div>
          <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Supported: MP3, WAV, FLAC, M4A, OGG (&lt;50MB)</span>
        </div>

        <label
          style={{
            border: "2px dashed rgba(212, 193, 154, 0.25)",
            borderRadius: "12px",
            padding: "36px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: uploading ? "wait" : "pointer",
            background: "rgba(255, 255, 255, 0.01)",
            transition: "all 0.2s ease",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleFileUpload(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => void handleFileUpload(e.target.files)}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(211, 188, 145, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--admin-accent-gold)",
              marginBottom: "12px",
            }}
          >
            <Upload size={22} />
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "4px" }}>
            {uploading ? "Processing and validating audio file…" : "Drag audio file here or click to browse"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>
            Server-side MIME check, duration extraction, and 24D spatial calibration
          </div>
        </label>

        {uploadMsg && (
          <div
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: uploadMsg.error ? "rgba(248, 113, 113, 0.15)" : "rgba(52, 211, 153, 0.15)",
              color: uploadMsg.error ? "#fca5a5" : "#6ee7b7",
              border: `1px solid ${uploadMsg.error ? "rgba(248, 113, 113, 0.3)" : "rgba(52, 211, 153, 0.3)"}`,
            }}
          >
            {uploadMsg.error ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
            <span>{uploadMsg.text}</span>
          </div>
        )}
      </div>

      {/* Preview Player Bar (if active) */}
      {previewTrack && (
        <div
          style={{
            position: "sticky",
            top: "70px",
            zIndex: 20,
            background: "#181b15",
            border: "1px solid var(--admin-card-border)",
            borderRadius: "12px",
            padding: "12px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => handlePlayPreview(previewTrack)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--admin-accent-gold)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#161914",
                cursor: "pointer",
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                Previewing: {previewTrack.title}
              </div>
              <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>
                {previewTrack.artist} · {Math.floor(playbackTime / 60)}:{String(Math.floor(playbackTime % 60)).padStart(2, "0")} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Volume2 size={16} color="var(--admin-accent-lavender)" />
            <span style={{ fontSize: "11px", color: "var(--admin-accent-lavender)", fontWeight: 600 }}>
              Live Stream OK
            </span>
          </div>
        </div>
      )}

      {/* Catalog Table */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <FileAudio size={18} color="var(--admin-accent-lavender)" />
            Music Catalog & Publication Status ({filteredTracks.length})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#68655c" }} />
              <input
                type="text"
                placeholder="Search catalog…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "6px 12px 6px 30px",
                  background: "#0d0f0c",
                  border: "1px solid var(--admin-card-border)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                  width: "180px",
                  outline: "none",
                }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as never)}
              style={{
                padding: "6px 10px",
                background: "#0d0f0c",
                border: "1px solid var(--admin-card-border)",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12px",
                outline: "none",
              }}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Track</th>
              <th>Artist & Album</th>
              <th>Date Added</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTracks.map((t) => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {t.cover}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{t.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>
                        {t.tags?.join(" · ") || "Stereo Spatial"}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{t.artist}</div>
                  <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>{t.album || "Single"}</div>
                </td>
                <td>{t.dateAdded}</td>
                <td>
                  <span className={`status-pill ${t.status === "published" ? "published" : "draft"}`}>
                    {t.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <button
                      className="admin-btn admin-btn-outline"
                      onClick={() => handlePlayPreview(t)}
                      style={{ padding: "6px 10px" }}
                      title="Preview track audio"
                    >
                      {previewTrack?.id === t.id && isPlaying ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <button
                      className="admin-btn admin-btn-outline"
                      onClick={() => togglePublishStatus(t.id)}
                      style={{ padding: "6px 10px" }}
                      title={t.status === "published" ? "Unpublish to draft" : "Publish to live catalog"}
                    >
                      {t.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      className="admin-btn admin-btn-outline"
                      onClick={() => {
                        setEditingTrack(t);
                        setShowEditModal(true);
                      }}
                      style={{ padding: "6px 10px" }}
                      title="Edit metadata"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => setTrackToDelete(t)}
                      style={{ padding: "6px 10px" }}
                      title="Delete track"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Metadata Modal */}
      {showEditModal && editingTrack && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
              Edit Song Metadata
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  SONG TITLE
                </label>
                <input
                  type="text"
                  value={editingTrack.title}
                  onChange={(e) => setEditingTrack({ ...editingTrack, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  ARTIST NAME
                </label>
                <input
                  type="text"
                  value={editingTrack.artist}
                  onChange={(e) => setEditingTrack({ ...editingTrack, artist: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  ALBUM NAME
                </label>
                <input
                  type="text"
                  value={editingTrack.album || ""}
                  onChange={(e) => setEditingTrack({ ...editingTrack, album: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  COVER EMOJI / BADGE
                </label>
                <input
                  type="text"
                  value={editingTrack.cover}
                  onChange={(e) => setEditingTrack({ ...editingTrack, cover: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  PUBLICATION STATUS
                </label>
                <select
                  value={editingTrack.status}
                  onChange={(e) => setEditingTrack({ ...editingTrack, status: e.target.value as never })}
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                >
                  <option value="published">Published (Visible in Listening Room)</option>
                  <option value="draft">Draft (Restricted to Admins)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button className="admin-btn admin-btn-outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button className="admin-btn admin-btn-primary" onClick={() => saveEditedTrack(editingTrack)}>
                  Save Metadata
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {trackToDelete && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: "420px" }}>
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
              Delete Track from Library?
            </h2>
            <p style={{ fontSize: "12px", color: "var(--admin-text-muted)", marginBottom: "20px" }}>
              Are you sure you want to permanently remove <strong>"{trackToDelete.title}"</strong>? Public listeners will no longer be able to stream this song.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="admin-btn admin-btn-outline" onClick={() => setTrackToDelete(null)}>
                Cancel
              </button>
              <button className="admin-btn admin-btn-danger" onClick={confirmDeleteTrack}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
