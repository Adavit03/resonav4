import { Users, UserPlus, Shield, Trash2, CheckCircle2, Lock } from "lucide-react";
import { useState } from "react";
import type { AdminUser } from "@/lib/admin.functions";

interface AdminAccountsProps {
  currentUser: AdminUser;
}

interface StoredAdmin {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin";
  permissions: string[];
  dateAdded: string;
}

export function AdminAccounts({ currentUser }: AdminAccountsProps) {
  const [admins, setAdmins] = useState<StoredAdmin[]>([
    {
      id: "owner-root",
      name: "Adavit D.",
      email: "dasadavit@gmail.com",
      role: "owner",
      permissions: ["overview", "music", "studio", "settings", "changelog", "analytics", "admins", "system"],
      dateAdded: "2026-10-25",
    },
    {
      id: "admin-atharva",
      name: "Atharva Soundalgekar",
      email: "atharvasoundalgekar07@gmail.com",
      role: "admin",
      permissions: ["overview", "music", "studio", "settings", "changelog", "analytics"],
      dateAdded: "2026-10-25",
    },
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "owner">("admin");
  const [newPerms, setNewPerms] = useState<string[]>(["overview", "music", "studio", "settings", "changelog"]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isOwner = currentUser.role === "owner";

  function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    const newAdmin: StoredAdmin = {
      id: `admin-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      permissions: newPerms,
      dateAdded: new Date().toISOString().slice(0, 10),
    };

    setAdmins((prev) => [...prev, newAdmin]);
    setShowInviteModal(false);
    setNewEmail("");
    setNewName("");
    setStatusMsg(`Administrator account created for ${newAdmin.email}.`);
  }

  function handleRevoke(id: string, email: string) {
    if (email === "dasadavit@gmail.com") {
      setStatusMsg("The primary Owner account cannot be revoked.");
      return;
    }
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    setStatusMsg(`Access revoked for ${email}.`);
  }

  function togglePerm(perm: string) {
    setNewPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  }

  return (
    <div>
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div className="admin-panel-title">
            <Users size={18} color="var(--admin-accent-lavender)" />
            Administrator Credentials & Role-Based Access Control
          </div>
          {isOwner && (
            <button className="admin-btn admin-btn-primary" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={14} />
              <span>Invite Administrator</span>
            </button>
          )}
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

        <table className="admin-table">
          <thead>
            <tr>
              <th>Administrator</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Date Provisioned</th>
              <th style={{ textAlign: "right" }}>Access</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((adm) => (
              <tr key={adm.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: adm.role === "owner" ? "linear-gradient(135deg, #d3bc91, #bfa373)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        color: adm.role === "owner" ? "#181610" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      {adm.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{adm.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>{adm.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status-pill ${adm.role === "owner" ? "published" : "draft"}`}>
                    <Shield size={11} />
                    {adm.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: "11px", color: "var(--admin-accent-lavender)" }}>
                    {adm.role === "owner" ? "Full Master Permissions (Root)" : adm.permissions.join(", ")}
                  </div>
                </td>
                <td>{adm.dateAdded}</td>
                <td style={{ textAlign: "right" }}>
                  {adm.email === "dasadavit@gmail.com" ? (
                    <span style={{ fontSize: "11px", color: "var(--admin-accent-gold)", fontWeight: 600 }}>
                      Primary Owner (Protected)
                    </span>
                  ) : isOwner ? (
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleRevoke(adm.id, adm.email)}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                    >
                      <Trash2 size={12} />
                      <span>Revoke</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
              Provision Administrator Account
            </h2>

            <form onSubmit={handleCreateAdmin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Lead Sound Designer"
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="collaborator@resona.internal"
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "4px" }}>
                  ADMINISTRATIVE ROLE
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as never)}
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0f0c", border: "1px solid var(--admin-card-border)", borderRadius: "6px", color: "#fff" }}
                >
                  <option value="admin">Administrator (Restricted to granted features)</option>
                  <option value="owner">Owner (Full administrative control)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--admin-text-muted)", marginBottom: "8px" }}>
                  GRANULAR PERMISSIONS
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { id: "music", label: "Music Library (Upload/Edit)" },
                    { id: "studio", label: "24D Audio Studio (Diagnostics)" },
                    { id: "settings", label: "Website Controls (Headlines)" },
                    { id: "changelog", label: "Update Log (Release Notes)" },
                    { id: "analytics", label: "Analytics (Metrics)" },
                    { id: "system", label: "System Health (Audit Log)" },
                  ].map((p) => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#dfdbcf", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={newPerms.includes(p.id)}
                        onChange={() => togglePerm(p.id)}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
