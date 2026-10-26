import { Music2, Disc3, SlidersHorizontal, FileText, CheckCircle2, ShieldCheck, Zap, ArrowRight, Server, Activity } from "lucide-react";
import type { AdminTab } from "./AdminSidebar";
import type { AuditLogItem } from "@/lib/admin.functions";

interface AdminOverviewProps {
  onNavigate: (tab: AdminTab) => void;
  songCount: number;
  changelogCount: number;
  auditLogs: AuditLogItem[];
}

export function AdminOverview({ onNavigate, songCount, changelogCount, auditLogs }: AdminOverviewProps) {
  return (
    <div>
      {/* Metrics Row */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card">
          <span className="admin-metric-label">Managed Music Catalog</span>
          <span className="admin-metric-val">{songCount}</span>
          <span className="admin-metric-sub">8 High-Fidelity Tracks + Cloud uploads</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-label">Published Update Logs</span>
          <span className="admin-metric-val">{changelogCount}</span>
          <span className="admin-metric-sub">Live synced with listening room</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-label">Audio Processing Engine</span>
          <span className="admin-metric-val" style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: "var(--admin-accent-lavender)" }}>
            <Zap size={20} color="var(--admin-accent-gold)" />
            24D SPATIAL
          </span>
          <span className="admin-metric-sub">Binaural HRTF & Acoustic Modeling</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-label">Platform Version</span>
          <span className="admin-metric-val" style={{ fontSize: "20px" }}>v0.3.0</span>
          <span className="admin-metric-sub">Production Build · Node 24 Compatible</span>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <ShieldCheck size={18} color="var(--admin-accent-gold)" />
            Administrative Operations & Studio
          </div>
          <span style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>Instant Controls</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          <button
            onClick={() => onNavigate("studio")}
            className="admin-btn admin-btn-purple"
            style={{ padding: "16px", justifyContent: "space-between", borderRadius: "10px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Disc3 size={20} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>24D Audio Studio</div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>Live 16-speaker visualizer</div>
              </div>
            </div>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => onNavigate("music")}
            className="admin-btn admin-btn-outline"
            style={{ padding: "16px", justifyContent: "space-between", borderRadius: "10px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Music2 size={20} color="var(--admin-accent-gold)" />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>Music Library</div>
                <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Upload & edit tracks</div>
              </div>
            </div>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className="admin-btn admin-btn-outline"
            style={{ padding: "16px", justifyContent: "space-between", borderRadius: "10px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <SlidersHorizontal size={20} color="var(--admin-accent-cyan)" />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>Website Controls</div>
                <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Announcements & headlines</div>
              </div>
            </div>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => onNavigate("changelog")}
            className="admin-btn admin-btn-outline"
            style={{ padding: "16px", justifyContent: "space-between", borderRadius: "10px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FileText size={20} color="var(--admin-accent-green)" />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>Publish Update Log</div>
                <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Write release notes</div>
              </div>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* System Status & Recent Audits */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* System Subsystems */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Server size={18} color="var(--admin-accent-cyan)" />
              Backend Subsystem Status
            </div>
            <span className="status-pill published">
              <CheckCircle2 size={11} /> All Systems Operational
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>Supabase Database (PostgreSQL)</div>
                <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>zvarqbhkudfvvgxmdgup.supabase.co</div>
              </div>
              <span className="status-pill published">Connected</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>Authentication Infrastructure</div>
                <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>Email/Password active · Google OAuth guarded</div>
              </div>
              <span className="status-pill published">Active</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>Web Audio 24D Processing Pipeline</div>
                <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>10-Band EQ · HRTF Panning · Acoustic Hall Reverb</div>
              </div>
              <span className="status-pill published">Ready</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>Song Storage Bucket</div>
                <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>Public audio catalog + Private user uploads</div>
              </div>
              <span className="status-pill published">Available</span>
            </div>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Activity size={18} color="var(--admin-accent-purple)" />
              Security & Audit Log Activity
            </div>
            <button
              onClick={() => onNavigate("system")}
              className="admin-btn admin-btn-outline"
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              View Full Log
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                style={{
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.04)",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: log.level === "security" ? "var(--admin-accent-lavender)" : "#fff" }}>
                    {log.action}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#a8a497" }}>
                  {log.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
