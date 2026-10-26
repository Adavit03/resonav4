import {
  AudioLines,
  LayoutDashboard,
  Music2,
  Disc3,
  SlidersHorizontal,
  FileText,
  BarChart3,
  Users,
  Activity,
  Settings,
  LogOut,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { AdminUser } from "@/lib/admin.functions";

export type AdminTab =
  | "overview"
  | "music"
  | "studio"
  | "settings"
  | "changelog"
  | "analytics"
  | "admins"
  | "system"
  | "preferences";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: AdminUser;
  onLogout: () => void;
}

export function AdminSidebar({ activeTab, onSelectTab, user, onLogout }: AdminSidebarProps) {
  const isOwner = user.role === "owner";

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; ownerOnly?: boolean }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "music", label: "Music Library", icon: Music2 },
    { id: "studio", label: "24D Audio Studio", icon: Disc3 },
    { id: "settings", label: "Website Controls", icon: SlidersHorizontal },
    { id: "changelog", label: "Update Log", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "admins", label: "Admin Accounts", icon: Users, ownerOnly: true },
    { id: "system", label: "System Health", icon: Activity },
    { id: "preferences", label: "Settings", icon: Settings },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    return true;
  });

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <span className="admin-brand-logo">
          <AudioLines size={18} />
        </span>
        <div>
          <div className="admin-brand-title">RESONA</div>
          <div style={{ fontSize: "10px", color: "var(--admin-text-muted)", letterSpacing: "0.06em" }}>
            ADMIN CONTROL
          </div>
        </div>
        <span className="admin-brand-badge">24D STUDIO</span>
      </div>

      <div className="admin-user-pill">
        <div className="admin-user-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: isOwner ? "var(--admin-accent-gold)" : "var(--admin-accent-lavender)" }}>
            <Shield size={11} />
            <span style={{ fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      <nav className="admin-nav">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`admin-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <Link
          to="/"
          className="admin-btn admin-btn-outline"
          style={{ textDecoration: "none", width: "100%", justifyContent: "flex-start" }}
        >
          <ExternalLink size={14} />
          <span>Public Listening Room</span>
        </Link>
        <button
          className="admin-btn admin-btn-danger"
          onClick={onLogout}
          style={{ width: "100%", justifyContent: "flex-start" }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
