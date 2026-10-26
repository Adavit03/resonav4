import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AudioLines } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — RESONA" },
      { name: "description", content: "Choose a new password for your RESONA account." },
      { property: "og:title", content: "Reset password — RESONA" },
      { property: "og:description", content: "Choose a new password for your RESONA account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    void nav({ to: "/", replace: true });
  }
  return (
    <div className="auth-backdrop">
      <section className="auth-card">
        <div className="auth-heading">
          <span className="brandmark">
            <AudioLines size={19} />
          </span>
        </div>
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h2>Choose a new password</h2>
        <form className="auth-form" onSubmit={(e) => void save(e)}>
          <label>
            New password
            <input type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <button className="auth-submit" disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </button>
          {err && <p className="auth-error">{err}</p>}
        </form>
      </section>
    </div>
  );
}
