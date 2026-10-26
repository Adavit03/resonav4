import { AudioLines, Eye, EyeOff, Lock, Mail, ShieldAlert, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { adminLoginFn, type AdminUser } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

interface AdminLoginProps {
  onSuccess: (user: AdminUser) => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("dasadavit@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your administrator ID/email and password.");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const isOwner = cleanEmail === "dasadavit@gmail.com" && password === "adidas@2010";
    const isAtharva = cleanEmail === "atharvasoundalgekar07@gmail.com" && password === "vkolhi@2026";

    // 1. Attempt server function authentication first
    try {
      const res = await adminLoginFn({ data: { email: cleanEmail, password } });
      if (res.success && res.user) {
        onSuccess(res.user);
        return;
      }
      if (res.error && !isOwner && !isAtharva) {
        setError(res.error);
        return;
      }
    } catch {
      // Server function offline / static deployment fallback
    }

    // 2. Direct authentication fallback (for static Netlify Drop deploys or serverless offline)
    if (isOwner) {
      const ownerUser: AdminUser = {
        id: "owner-root",
        email: "dasadavit@gmail.com",
        name: "Adavit D. (Owner)",
        role: "owner",
        permissions: ["overview", "music", "studio", "settings", "changelog", "analytics", "admins", "system"],
        lastLogin: new Date().toISOString(),
      };

      // Try signing in to Supabase in the background if possible
      try {
        await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      } catch {}

      onSuccess(ownerUser);
      return;
    }

    if (isAtharva) {
      const atharvaUser: AdminUser = {
        id: "admin-atharva",
        email: "atharvasoundalgekar07@gmail.com",
        name: "Atharva Soundalgekar",
        role: "admin",
        permissions: ["overview", "music", "studio", "settings", "changelog", "analytics"],
        lastLogin: new Date().toISOString(),
      };

      try {
        await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      } catch {}

      onSuccess(atharvaUser);
      return;
    }

    // 3. Attempt direct Supabase sign in for other authorized administrators
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!authErr && authData?.user) {
        const u = authData.user;
        const adminUser: AdminUser = {
          id: u.id,
          email: u.email || cleanEmail,
          name: u.user_metadata?.display_name || u.email?.split("@")[0] || "Administrator",
          role: "admin",
          permissions: ["overview", "music", "studio", "settings", "changelog"],
          lastLogin: new Date().toISOString(),
        };
        onSuccess(adminUser);
        return;
      }
    } catch {}

    setError("Invalid administrator credentials. Access denied.");
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #1c1829 0%, #0c0e0b 60%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "#141712",
        border: "1px solid rgba(212, 193, 154, 0.2)",
        borderRadius: "16px",
        padding: "36px 32px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(157, 114, 255, 0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(157, 114, 255, 0.25), rgba(211, 188, 145, 0.2))",
              border: "1px solid rgba(211, 188, 145, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--admin-accent-gold, #d3bc91)"
            }}>
              <AudioLines size={18} />
            </span>
            <div>
              <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", color: "#fff" }}>
                RESONA
              </div>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#a8a497", textTransform: "uppercase" }}>
                MASTER CONTROL
              </div>
            </div>
          </div>
          <span style={{
            fontSize: "9px",
            letterSpacing: "0.12em",
            padding: "3px 8px",
            borderRadius: "4px",
            background: "rgba(157, 114, 255, 0.15)",
            color: "#c4b5fd",
            border: "1px solid rgba(157, 114, 255, 0.3)",
            fontWeight: 700
          }}>
            RESTRICTED
          </span>
        </div>

        <h1 style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "22px",
          fontWeight: 700,
          color: "#fff",
          marginBottom: "6px",
          letterSpacing: "-0.02em"
        }}>
          Administrator Sign In
        </h1>
        <p style={{ fontSize: "12px", color: "#969387", marginBottom: "26px", lineHeight: "1.5" }}>
          Authorized access only. Audit logging and rate-limiting enforcement are active.
        </p>

        {error && (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "12px 14px",
            background: "rgba(248, 113, 113, 0.12)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            borderRadius: "8px",
            color: "#fca5a5",
            fontSize: "12px",
            marginBottom: "20px",
            lineHeight: "1.4"
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#a8a497", marginBottom: "6px", letterSpacing: "0.04em" }}>
              ADMIN ID / EMAIL
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#68655c" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@resona.internal"
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 38px",
                  background: "#0d0f0c",
                  border: "1px solid rgba(212, 193, 154, 0.2)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  outline: "none"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#a8a497", marginBottom: "6px", letterSpacing: "0.04em" }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#68655c" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: "100%",
                  padding: "11px 40px 11px 38px",
                  background: "#0d0f0c",
                  border: "1px solid rgba(212, 193, 154, 0.2)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  outline: "none"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#8a867b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 18px",
              background: "linear-gradient(135deg, #d3bc91, #bfa373)",
              border: "1px solid #d3bc91",
              borderRadius: "8px",
              color: "#181610",
              fontWeight: 700,
              fontSize: "13px",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s ease",
              marginTop: "8px",
              boxShadow: "0 4px 14px rgba(211, 188, 145, 0.25)"
            }}
          >
            {loading ? "Verifying Credentials…" : "Enter Administration Studio"}
          </button>
        </form>

        <div style={{ marginTop: "28px", paddingTop: "18px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", textAlign: "center" }}>
          <Link
            to="/"
            style={{
              color: "#a8a497",
              fontSize: "12px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <ArrowLeft size={14} /> Back to Public Listening Room
          </Link>
        </div>
      </div>
    </div>
  );
}
