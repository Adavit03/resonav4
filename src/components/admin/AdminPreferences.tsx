import { Settings, Save, CheckCircle2, Trash2 } from "lucide-react";
import { useState } from "react";

export function AdminPreferences() {
  const [fpsCap, setFpsCap] = useState("60");
  const [autoPreview, setAutoPreview] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("24h");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleClearCache() {
    try {
      localStorage.removeItem("resona-admin-session");
      alert("Local administrative cache cleared.");
    } catch {}
  }

  return (
    <div>
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <Settings size={18} color="var(--admin-accent-gold)" />
            Dashboard Studio Configuration
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "600px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "6px" }}>
              24D STUDIO VISUALIZER REFRESH RATE
            </label>
            <select
              value={fpsCap}
              onChange={(e) => setFpsCap(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0d0f0c",
                border: "1px solid var(--admin-card-border)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
              }}
            >
              <option value="60">60 FPS (Ultra-smooth responsive audio reactivity)</option>
              <option value="30">30 FPS (Power-saver & low GPU consumption)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "6px" }}>
              ADMINISTRATIVE SESSION EXPIRATION
            </label>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0d0f0c",
                border: "1px solid var(--admin-card-border)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
              }}
            >
              <option value="1h">1 Hour (High Security)</option>
              <option value="8h">8 Hours (Standard Working Day)</option>
              <option value="24h">24 Hours (Convenient Session Duration)</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Auto-Play Track Previews</div>
              <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Automatically start previewing when a track is clicked</div>
            </div>
            <input
              type="checkbox"
              checked={autoPreview}
              onChange={(e) => setAutoPreview(e.target.checked)}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
          </div>

          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--admin-accent-green)", fontSize: "12px" }}>
              <CheckCircle2 size={16} />
              <span>Preferences saved.</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
            <button className="admin-btn admin-btn-danger" onClick={handleClearCache}>
              <Trash2 size={14} />
              <span>Clear Local Cache</span>
            </button>

            <button className="admin-btn admin-btn-primary" onClick={handleSave}>
              <Save size={14} />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
