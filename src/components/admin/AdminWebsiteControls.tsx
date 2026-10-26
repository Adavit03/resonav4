import { Megaphone, Type, ToggleLeft, ToggleRight, Save, RotateCcw, CheckCircle2, Eye, Copy, Check, ExternalLink, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { useSite, type SiteSettings, DEFAULT_SETTINGS, saveLocalSettings } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

interface AdminWebsiteControlsProps {
  initialSettings?: SiteSettings;
  onSaved?: () => void;
}

export function AdminWebsiteControls({ initialSettings, onSaved }: AdminWebsiteControlsProps) {
  const { settings } = useSite();
  const activeSettings = initialSettings || settings || DEFAULT_SETTINGS;

  const [hero, setHero] = useState<SiteSettings["hero"]>(activeSettings?.hero || DEFAULT_SETTINGS.hero);
  const [announcement, setAnnouncement] = useState<SiteSettings["announcement"]>(activeSettings?.announcement || DEFAULT_SETTINGS.announcement);
  const [featureConcert, setFeatureConcert] = useState(true);
  const [featureFocus, setFeatureFocus] = useState(true);
  const [featureLyrics, setFeatureLyrics] = useState(true);
  const [featureVision, setFeatureVision] = useState(true);

  // Sync state when activeSettings changes
  useEffect(() => {
    if (activeSettings?.hero) setHero(activeSettings.hero);
    if (activeSettings?.announcement) setAnnouncement(activeSettings.announcement);
  }, [activeSettings]);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean; needsSchema?: boolean } | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  const SUPABASE_SETUP_SQL = `-- Create Site Settings & Changelog tables with Realtime
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.site_settings TO anon, authenticated, service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_settings_all" ON public.site_settings;
CREATE POLICY "site_settings_all" ON public.site_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.changelog TO anon, authenticated, service_role;
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "changelog_all" ON public.changelog;
CREATE POLICY "changelog_all" ON public.changelog FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.changelog;
EXCEPTION WHEN duplicate_object THEN null; END $$;`;

  function copySetupSql() {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  }

  async function handleSave() {
    setSaving(true);
    setStatusMsg(null);

    // Save locally immediately so live preview and public website reflect changes right away
    saveLocalSettings({ hero, announcement });

    try {
      const heroPromise = supabase.from("site_settings").upsert({
        key: "hero",
        value: hero as never,
        updated_at: new Date().toISOString(),
      });

      const annPromise = supabase.from("site_settings").upsert({
        key: "announcement",
        value: announcement as never,
        updated_at: new Date().toISOString(),
      });

      const [res1, res2] = await Promise.all([heroPromise, annPromise]);

      if (res1.error || res2.error) {
        const errMsg = res1.error?.message || res2.error?.message || "";
        if (errMsg.includes("schema cache") || errMsg.includes("site_settings")) {
          setStatusMsg({
            text: "Announcement banner is now LIVE locally on this device! Notice: Supabase table 'site_settings' was not found in your database. Run the 1-click setup SQL below in your Supabase SQL Editor to sync globally across all devices.",
            error: false,
            needsSchema: true,
          });
        } else {
          setStatusMsg({ text: errMsg || "Failed to update settings.", error: true });
        }
      } else {
        setStatusMsg({ text: "Website controls saved to Supabase! Changes are live across all visitor devices." });
        onSaved?.();
      }
    } catch {
      setStatusMsg({
        text: "Website controls saved locally and live on this device. (Cloud sync pending).",
        error: false,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setHero(DEFAULT_SETTINGS.hero);
    setAnnouncement(DEFAULT_SETTINGS.announcement);
    setFeatureConcert(true);
    setFeatureFocus(true);
    setFeatureLyrics(true);
    setFeatureVision(true);
    setStatusMsg({ text: "Defaults restored. Click 'Publish Changes' to persist." });
  }

  return (
    <div>
      {/* Live Preview Panel */}
      {showLivePreview && (
        <div className="admin-panel" style={{ background: "#0a0c09", borderColor: "rgba(211, 188, 145, 0.2)" }}>
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Eye size={16} color="var(--admin-accent-gold)" />
              Live Public Website Preview
            </div>
            <button
              className="admin-btn admin-btn-outline"
              onClick={() => setShowLivePreview(false)}
              style={{ padding: "4px 8px", fontSize: "10px" }}
            >
              Hide Preview
            </button>
          </div>

          {/* Simulated Public Header Preview */}
          <div style={{ background: "#11130f", borderRadius: "10px", padding: "18px 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
            {announcement.enabled && announcement.text && (
              <div
                style={{
                  background: "rgba(211, 188, 145, 0.12)",
                  border: "1px solid rgba(211, 188, 145, 0.25)",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  color: "#d3bc91",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <Megaphone size={14} />
                <span>{announcement.text}</span>
              </div>
            )}

            <div style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#a8a497", textTransform: "uppercase", marginBottom: "6px" }}>
              • {hero.topCenter || "YOUR PERSONAL LISTENING ROOM"}
            </div>
            <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: "28px", fontWeight: 700, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
              {hero.concertTitle || "Come a little closer."}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--admin-text-muted)", margin: 0 }}>
              {hero.concertSub || "A small, warm room for the songs that mean something."}
            </p>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <Megaphone size={18} color="var(--admin-accent-gold)" />
            Public Announcement Banner
          </div>
          <button
            onClick={() => setAnnouncement({ ...announcement, enabled: !announcement.enabled })}
            style={{
              background: "transparent",
              border: "none",
              color: announcement.enabled ? "var(--admin-accent-green)" : "var(--admin-text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {announcement.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            <span>{announcement.enabled ? "Banner Active" : "Banner Hidden"}</span>
          </button>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "6px" }}>
            BANNER MESSAGE TEXT
          </label>
          <input
            type="text"
            value={announcement.text}
            onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
            placeholder="e.g. Welcome to the new 24D Spatial Concert experience."
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
          />
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <Type size={18} color="var(--admin-accent-lavender)" />
            Concert Room Headlines & Typography
          </div>
          <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Homepage Hero Section</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "6px" }}>
              MAIN HEADLINE
            </label>
            <input
              type="text"
              value={hero.concertTitle}
              onChange={(e) => setHero({ ...hero, concertTitle: e.target.value })}
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
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "6px" }}>
              SUBTITLE DESCRIPTION
            </label>
            <input
              type="text"
              value={hero.concertSub}
              onChange={(e) => setHero({ ...hero, concertSub: e.target.value })}
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
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "6px" }}>
              TOP BAR EYEBROW TEXT
            </label>
            <input
              type="text"
              value={hero.topCenter}
              onChange={(e) => setHero({ ...hero, topCenter: e.target.value })}
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
            />
          </div>
        </div>
      </div>

      {/* Feature Availability Toggles */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <ToggleRight size={18} color="var(--admin-accent-cyan)" />
            Feature Availability Toggles
          </div>
          <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Control public spaces</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>Concert Room 3D</div>
              <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>Interactive purple venue</div>
            </div>
            <button
              onClick={() => setFeatureConcert(!featureConcert)}
              style={{ background: "transparent", border: "none", color: featureConcert ? "var(--admin-accent-green)" : "#666", cursor: "pointer" }}
            >
              {featureConcert ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>Focus Listening Room</div>
              <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>Deep work timer & audio</div>
            </div>
            <button
              onClick={() => setFeatureFocus(!featureFocus)}
              style={{ background: "transparent", border: "none", color: featureFocus ? "var(--admin-accent-green)" : "#666", cursor: "pointer" }}
            >
              {featureFocus ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>Synchronized Lyrics</div>
              <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>Audio-aligned text display</div>
            </div>
            <button
              onClick={() => setFeatureLyrics(!featureLyrics)}
              style={{ background: "transparent", border: "none", color: featureLyrics ? "var(--admin-accent-green)" : "#666", cursor: "pointer" }}
            >
              {featureLyrics ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>VR Headset Concept</div>
              <div style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>Product vision page (/vision)</div>
            </div>
            <button
              onClick={() => setFeatureVision(!featureVision)}
              style={{ background: "transparent", border: "none", color: featureVision ? "var(--admin-accent-green)" : "#666", cursor: "pointer" }}
            >
              {featureVision ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: statusMsg.needsSchema ? "12px" : "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: statusMsg.error ? "rgba(248, 113, 113, 0.15)" : "rgba(52, 211, 153, 0.15)",
              color: statusMsg.error ? "#fca5a5" : "#6ee7b7",
              border: `1px solid ${statusMsg.error ? "rgba(248, 113, 113, 0.3)" : "rgba(52, 211, 153, 0.3)"}`,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{statusMsg.text}</span>
          </div>

          {statusMsg.needsSchema && (
            <div
              style={{
                padding: "16px",
                borderRadius: "8px",
                background: "rgba(211, 188, 145, 0.08)",
                border: "1px solid rgba(211, 188, 145, 0.25)",
                marginBottom: "20px",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontWeight: 700, color: "#d3bc91", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Database size={15} /> 1-Click Database Setup for Supabase
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={copySetupSql}
                    className="admin-btn admin-btn-outline"
                    style={{ padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    {copiedSql ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                    <span>{copiedSql ? "Copied SQL!" : "Copy SQL"}</span>
                  </button>
                  <a
                    href="https://supabase.com/dashboard/project/zvarqbhkudfvvgxmdgup/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="admin-btn admin-btn-primary"
                    style={{ padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
                  >
                    <span>Open Supabase SQL Editor</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
              <p style={{ margin: 0, color: "#a8a497", fontSize: "11px", lineHeight: "1.5" }}>
                Click <strong>"Copy SQL"</strong>, then click <strong>"Open Supabase SQL Editor"</strong>, paste it into the query box and click <strong>"Run"</strong>. Once run, website controls will instantly sync across every device in real-time!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save / Reset Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="admin-btn admin-btn-outline" onClick={handleReset} disabled={saving}>
          <RotateCcw size={14} />
          <span>Restore Default Settings</span>
        </button>

        <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} />
          <span>{saving ? "Publishing to Website…" : "Publish Changes"}</span>
        </button>
      </div>
    </div>
  );
}
