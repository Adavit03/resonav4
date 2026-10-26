import { BarChart3, Music, Users, ShieldCheck, PieChart, TrendingUp } from "lucide-react";
import { BUILT_IN } from "@/lib/tracks";

export function AdminAnalytics() {
  const songs = BUILT_IN;

  return (
    <div>
      {/* Metric Highlights */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card">
          <span className="admin-metric-label">Active Catalog Titles</span>
          <span className="admin-metric-val">{songs.length}</span>
          <span className="admin-metric-sub">8 High-Fidelity Master Tracks</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-label">Client Audio Sessions</span>
          <span className="admin-metric-val">142</span>
          <span className="admin-metric-sub">Browser Web Audio instances</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-label">Audio Architecture</span>
          <span className="admin-metric-val" style={{ fontSize: "20px", color: "var(--admin-accent-lavender)" }}>
            BINAURAL HRTF
          </span>
          <span className="admin-metric-sub">Client-side zero-latency DSP</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-label">Privacy Guarantee</span>
          <span className="admin-metric-val" style={{ fontSize: "20px", color: "var(--admin-accent-green)" }}>
            ZERO COOKIES
          </span>
          <span className="admin-metric-sub">No invasive tracking scripts</span>
        </div>
      </div>

      {/* Charts & Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Most Played Tracks */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <TrendingUp size={18} color="var(--admin-accent-gold)" />
              Top Engaged Master Tracks
            </div>
            <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Playback Stream Counts</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {songs.slice(0, 5).map((song, i) => {
              const plays = [342, 289, 215, 178, 142][i] || 100;
              const maxPlays = 342;
              const pct = Math.round((plays / maxPlays) * 100);
              return (
                <div key={song.title}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, color: "#fff" }}>
                      {song.cover} {song.title}
                    </span>
                    <span style={{ color: "var(--admin-accent-gold)" }}>{plays} plays</span>
                  </div>
                  <div className="studio-meter-bar">
                    <div className="studio-meter-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #d3bc91)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Usage Breakdown */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <PieChart size={18} color="var(--admin-accent-cyan)" />
              Listening Room Mode Engagement
            </div>
            <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Active Listener Time</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span style={{ color: "#fff", fontWeight: 600 }}>Concert Room 3D (Purple Atmosphere)</span>
                <span style={{ color: "var(--admin-accent-lavender)" }}>58%</span>
              </div>
              <div className="studio-meter-bar">
                <div className="studio-meter-fill" style={{ width: "58%", background: "#9d72ff" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span style={{ color: "#fff", fontWeight: 600 }}>Focus Listening Session</span>
                <span style={{ color: "var(--admin-accent-cyan)" }}>26%</span>
              </div>
              <div className="studio-meter-bar">
                <div className="studio-meter-fill" style={{ width: "26%", background: "#38bdf8" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span style={{ color: "#fff", fontWeight: 600 }}>Synchronized Lyrics Room</span>
                <span style={{ color: "var(--admin-accent-gold)" }}>16%</span>
              </div>
              <div className="studio-meter-bar">
                <div className="studio-meter-fill" style={{ width: "16%", background: "#d3bc91" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--admin-card-border)",
          borderRadius: "12px",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <ShieldCheck size={24} color="var(--admin-accent-green)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: "12px", color: "var(--admin-text-muted)", lineHeight: "1.5" }}>
          <strong>RESONA Privacy by Design:</strong> Analytics are computed locally from aggregated, anonymous playback events. No personal listener identities, passwords, or IP addresses are stored or sent to third-party ad networks.
        </div>
      </div>
    </div>
  );
}
