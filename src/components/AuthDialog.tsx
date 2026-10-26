import { AudioLines, X } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getGoogleOAuthUrl } from "@/lib/auth.functions";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  name: z.string().trim().max(60).optional(),
});

type Mode = "signin" | "signup" | "forgot";

export function AuthDialog({ initial = "signin", note, onClose }: { initial?: Mode; note?: string; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(note || "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        const em = z.string().trim().email().safeParse(email);
        if (!em.success) throw new Error("Enter a valid email");
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setOk("If that email has an account, a reset link is on its way.");
        return;
      }
      const parsed = schema.safeParse({ email, password, name: mode === "signup" ? name : undefined });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (mode === "signup") {
        if (!parsed.data.name) throw new Error("Tell us what to call you");
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: parsed.data.name } },
        });
        if (error) throw error;
        if (data.session) onClose();
        else setOk("Almost there — check your email for a confirmation link, then come back and sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) throw error;
        onClose();
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const res = await getGoogleOAuthUrl({ data: { redirectTo: window.location.origin } });
      if (!res.success) {
        setErr(res.error || "Google sign-in is not available.");
        setBusy(false);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Google sign-in could not be initiated.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-heading">
          <span className="brandmark">
            <AudioLines size={19} />
          </span>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <span className="eyebrow">YOUR PRIVATE LIBRARY</span>
        <h2 id="auth-title">{mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</h2>
        <p className="auth-copy">
          {mode === "forgot"
            ? "We’ll email you a link to choose a new password."
            : "Your songs, sound profile and lyrics are saved privately to your account and follow you to any device."}
        </p>
        <form className="auth-form" onSubmit={(e) => void submit(e)}>
          {mode === "signup" && (
            <label>
              What should we call you?
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Your name" maxLength={60} required />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
          )}
          <button className="auth-submit" disabled={busy} type="submit">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </button>
          {ok && <p className="auth-success" role="status">{ok}</p>}
          {err && <p className="auth-error" role="alert">{err}</p>}
          {mode !== "forgot" && (
            <>
              <div className="auth-divider">OR</div>
              <button type="button" className="auth-google" onClick={() => void google()}>
                {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
              </button>
            </>
          )}
          {mode === "signin" && (
            <button className="auth-switch" type="button" onClick={() => (setMode("forgot"), setErr(""), setOk(""))}>
              Forgot your password?
            </button>
          )}
          <button className="auth-switch" type="button" onClick={() => (setMode(mode === "signup" ? "signin" : "signup"), setErr(""), setOk(""))}>
            {mode === "signup" ? "Already have an account? Sign in" : "New to RESONA? Create an account"}
          </button>
        </form>
        <p className="auth-privacy">Only you can list, play, and manage your uploaded audio.</p>
      </section>
    </div>
  );
}
