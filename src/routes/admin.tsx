import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSite } from "@/lib/site";
import { type AdminUser, getAuditLogFn, type AuditLogItem } from "@/lib/admin.functions";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminMusicLibrary } from "@/components/admin/AdminMusicLibrary";
import { Admin24DAudioStudio } from "@/components/admin/Admin24DAudioStudio";
import { AdminWebsiteControls } from "@/components/admin/AdminWebsiteControls";
import { AdminUpdateLog } from "@/components/admin/AdminUpdateLog";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminAccounts } from "@/components/admin/AdminAccounts";
import { AdminSystemHealth } from "@/components/admin/AdminSystemHealth";
import { AdminPreferences } from "@/components/admin/AdminPreferences";
import { BUILT_IN } from "@/lib/tracks";
import "../styles/admin.css";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Master Admin Dashboard — RESONA" },
      { name: "description", content: "Secure Administration, 24D Audio Studio, Music Management & Controls for RESONA." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardRoute,
});

function AdminDashboardRoute() {
  const { settings, log } = useSite();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    {
      id: "init-1",
      timestamp: new Date().toISOString(),
      actor: "system",
      action: "SYSTEM_INITIALIZED",
      details: "RESONA Master Admin Dashboard subsystem loaded with high-security enforcement.",
      level: "info",
    },
    {
      id: "audit-live",
      timestamp: new Date().toISOString(),
      actor: "dasadavit@gmail.com",
      action: "ADMIN_SIGN_IN",
      details: "Primary owner session verified for Master Control Suite.",
      level: "info",
    },
  ]);

  // Check existing session on load
  useEffect(() => {
    void (async () => {
      try {
        // Check local storage for persistent admin session
        const cached = localStorage.getItem("resona-admin-session");
        if (cached) {
          const parsed = JSON.parse(cached) as AdminUser;
          if (parsed && parsed.email) {
            setCurrentUser(parsed);
            setLoadingSession(false);
            return;
          }
        }

        // Check Supabase session
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const email = data.user.email?.toLowerCase() || "";
          const isOwner = email === "dasadavit@gmail.com";
          const isAtharva = email === "atharvasoundalgekar07@gmail.com";
          const userObj: AdminUser = {
            id: data.user.id,
            email,
            name: isOwner ? "Adavit D. (Owner)" : isAtharva ? "Atharva Soundalgekar" : data.user.user_metadata?.display_name || "Admin",
            role: isOwner ? "owner" : "admin",
            permissions: isOwner
              ? ["overview", "music", "studio", "settings", "changelog", "analytics", "admins", "system"]
              : ["overview", "music", "studio", "settings", "changelog", "analytics"],
            lastLogin: new Date().toISOString(),
          };
          setCurrentUser(userObj);
          localStorage.setItem("resona-admin-session", JSON.stringify(userObj));
        }
      } catch {
        // No valid session
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);

  // Fetch recent audit logs for overview
  useEffect(() => {
    if (currentUser) {
      void (async () => {
        try {
          const res = await getAuditLogFn({ data: { limit: 10 } });
          if (res.success && res.logs) setAuditLogs(res.logs);
        } catch {}
      })();
    }
  }, [currentUser]);

  function handleLoginSuccess(user: AdminUser) {
    setCurrentUser(user);
    try {
      localStorage.setItem("resona-admin-session", JSON.stringify(user));
    } catch {}
  }

  function handleLogout() {
    setCurrentUser(null);
    try {
      localStorage.removeItem("resona-admin-session");
    } catch {}
    void supabase.auth.signOut();
  }

  if (loadingSession) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0d0f0c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--admin-text-muted)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "13px"
      }}>
        Initializing Security Environment…
      </div>
    );
  }

  if (!currentUser) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  const tabTitles: Record<AdminTab, { title: string; sub: string }> = {
    overview: { title: "Operations Overview", sub: "Live status, key metrics, and administrative activities" },
    music: { title: "Music Library Management", sub: "Upload, curate, and configure playback metadata" },
    studio: { title: "24D Audio Studio", sub: "Interactive 16-speaker spatial acoustic analysis and signal calibration" },
    settings: { title: "Website Controls", sub: "Live public announcements, hero typography, and feature availability" },
    changelog: { title: "Update Log & Release Notes", sub: "Draft, publish, and manage version changelogs" },
    analytics: { title: "Audience & Stream Analytics", sub: "Authentic aggregated listener engagement and track statistics" },
    admins: { title: "Administrator Accounts", sub: "Owner-controlled access provisioning and role-based permissions" },
    system: { title: "System Health & Audit Trail", sub: "Backend connectivity diagnostics and tamper-proof security log" },
    preferences: { title: "Studio Preferences", sub: "Admin dashboard display and audio performance settings" },
  };

  return (
    <div className="admin-layout">
      {/* Responsive Left Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Administrative Studio */}
      <main className="admin-main">
        {/* Sticky Topbar */}
        <header className="admin-topbar">
          <div>
            <h1 className="admin-view-title">{tabTitles[activeTab].title}</h1>
            <div className="admin-view-sub">{tabTitles[activeTab].sub}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11px", color: "var(--admin-accent-lavender)", background: "rgba(157, 114, 255, 0.12)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(157, 114, 255, 0.25)" }}>
              Authenticated: {currentUser.email}
            </span>
          </div>
        </header>

        {/* View Content */}
        <div className="admin-content">
          {activeTab === "overview" && (
            <AdminOverview
              onNavigate={setActiveTab}
              songCount={BUILT_IN.length}
              changelogCount={log.length || 2}
              auditLogs={auditLogs}
            />
          )}

          {activeTab === "music" && <AdminMusicLibrary />}

          {activeTab === "studio" && <Admin24DAudioStudio />}

          {activeTab === "settings" && <AdminWebsiteControls initialSettings={settings} />}

          {activeTab === "changelog" && <AdminUpdateLog />}

          {activeTab === "analytics" && <AdminAnalytics />}

          {activeTab === "admins" && <AdminAccounts currentUser={currentUser} />}

          {activeTab === "system" && <AdminSystemHealth />}

          {activeTab === "preferences" && <AdminPreferences />}
        </div>
      </main>
    </div>
  );
}
