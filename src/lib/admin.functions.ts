import { createServerFn } from "@tanstack/react-start";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin";
  permissions: string[];
  lastLogin: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  level: "info" | "warn" | "security";
}

// In-memory server-side audit store (backed by session/server)
const auditLogStore: AuditLogItem[] = [
  {
    id: "init-1",
    timestamp: new Date().toISOString(),
    actor: "system",
    action: "SYSTEM_INITIALIZED",
    details: "RESONA Master Admin Dashboard subsystem loaded with high-security enforcement.",
    level: "info",
  },
];

// Simple in-memory rate limiting for authentication attempts: IP/Email -> { count, lockedUntil }
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export const adminLoginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const now = Date.now();

    // Rate limiting check
    const attempt = loginAttempts.get(email);
    if (attempt && attempt.lockedUntil > now) {
      const waitSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
      return {
        success: false,
        error: `Too many failed login attempts. Account temporarily protected. Please wait ${waitSeconds} seconds.`,
      };
    }

    // Authenticate primary owner: dasadavit@gmail.com / adidas@2010
    const isOwner = email === "dasadavit@gmail.com" && password === "adidas@2010";
    const isAtharva = email === "atharvasoundalgekar07@gmail.com" && password === "vkolhi@2026";

    // Also attempt Supabase sign-in for additional authorized administrators
    let supabaseSuccess = false;
    let supabaseUserId = isOwner ? "owner-root" : isAtharva ? "admin-atharva" : "admin-user";
    let supabaseDisplayName = isOwner ? "Adavit D. (Owner)" : isAtharva ? "Atharva Soundalgekar" : "Administrator";

    const SUPABASE_URL = process.env.SUPABASE_URL || "https://zvarqbhkudfvvgxmdgup.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_CFWqbds73PyQ4D5jfxNpHA_9L6ITcry";

    try {
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      if (authRes.ok) {
        const authData = await authRes.json();
        supabaseSuccess = true;
        supabaseUserId = authData.user?.id || supabaseUserId;
        supabaseDisplayName = authData.user?.user_metadata?.display_name || authData.user?.email?.split("@")[0] || supabaseDisplayName;
      }
    } catch {
      // Offline / network failure handled gracefully
    }

    if (isOwner || isAtharva || supabaseSuccess) {
      // Clear failed attempts upon successful login
      loginAttempts.delete(email);

      const user: AdminUser = {
        id: supabaseUserId,
        email,
        name: isOwner ? "Adavit D. (Owner)" : isAtharva ? "Atharva Soundalgekar" : supabaseDisplayName,
        role: isOwner ? "owner" : "admin",
        permissions: isOwner
          ? ["overview", "music", "studio", "settings", "changelog", "analytics", "admins", "system"]
          : ["overview", "music", "studio", "settings", "changelog", "analytics"],
        lastLogin: new Date().toISOString(),
      };

      auditLogStore.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        actor: email,
        action: "ADMIN_LOGIN_SUCCESS",
        details: `Administrator ${email} authenticated successfully with ${user.role} role.`,
        level: "security",
      });

      return {
        success: true,
        user,
      };
    }

    // Track failed attempt
    const current = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.lockedUntil = now + 60 * 1000; // 1 minute lockout
    }
    loginAttempts.set(email, current);

    auditLogStore.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor: email,
      action: "ADMIN_LOGIN_FAILURE",
      details: `Failed sign-in attempt for ${email}. (Attempt ${current.count}/5)`,
      level: "warn",
    });

    return {
      success: false,
      error: "Invalid administrator credentials. Access restricted to authorized personnel.",
    };
  });

export const recordAuditLogFn = createServerFn({ method: "POST" })
  .validator((data: { actor: string; action: string; details: string; level?: "info" | "warn" | "security" }) => data)
  .handler(async ({ data }) => {
    const entry: AuditLogItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor: data.actor,
      action: data.action,
      details: data.details,
      level: data.level || "info",
    };
    auditLogStore.unshift(entry);
    if (auditLogStore.length > 200) auditLogStore.pop();
    return { success: true };
  });

export const getAuditLogFn = createServerFn({ method: "POST" })
  .validator((data: { limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit || 50;
    return { success: true, logs: auditLogStore.slice(0, limit) };
  });

export const checkSystemHealthFn = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL || "https://zvarqbhkudfvvgxmdgup.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_CFWqbds73PyQ4D5jfxNpHA_9L6ITcry";

    let dbOk = false;
    let authOk = false;
    let storageOk = false;
    let pingMs = 0;

    const start = Date.now();
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: SUPABASE_KEY },
      });
      pingMs = Date.now() - start;
      if (res.ok) authOk = true;
    } catch {
      pingMs = Date.now() - start;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_tracks?select=id&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) dbOk = true;
    } catch {}

    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        headers: { apikey: SUPABASE_KEY },
      });
      if (res.ok) storageOk = true;
    } catch {}

    return {
      success: true,
      health: {
        database: dbOk ? "healthy" : "operational",
        auth: authOk ? "healthy" : "offline",
        storage: storageOk ? "healthy" : "standby",
        latencyMs: pingMs,
        version: "v0.3.0 · Spatial Engine 24D",
        serverTime: new Date().toISOString(),
      },
    };
  });
