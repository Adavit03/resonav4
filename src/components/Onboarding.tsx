import { AudioLines } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  listening_setup: string | null;
  favorite_genres: string[];
  listening_goal: string | null;
  eq_profile: { user?: number[]; hearing?: number[]; style?: string } | null;
  onboarded: boolean;
}

const SETUPS = ["Over-ear headphones", "Earbuds / AirPods", "Laptop speakers", "Home speakers", "Car"];
const GENRES = ["Pop", "Bollywood", "Lo-fi", "Slowed + reverb", "EDM", "Hip-hop", "Rock", "Classical", "Indie", "Devotional", "Phonk", "Jazz"];
const GOALS = ["Feel the concert", "Deep focus", "Unwind & sleep", "Sing along", "Discover the detail"];
const STYLES = ["Warm", "Balanced", "Bright", "Bass boost", "Vocal"];

export function Onboarding({ profile, onDone }: { profile: Profile; onDone: (p: Profile, runHearing: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.display_name || "");
  const [setup, setSetup] = useState(profile.listening_setup || "");
  const [genres, setGenres] = useState<string[]>(profile.favorite_genres || []);
  const [goal, setGoal] = useState(profile.listening_goal || "");
  const [style, setStyle] = useState(profile.eq_profile?.style || "Balanced");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function finish(runHearing: boolean) {
    setBusy(true);
    setErr("");
    const patch = {
      display_name: name.trim().slice(0, 60) || null,
      listening_setup: setup || null,
      favorite_genres: genres,
      listening_goal: goal || null,
      eq_profile: { ...(profile.eq_profile || {}), style },
      onboarded: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone({ ...profile, ...patch }, runHearing);
  }

  const steps = [
    <>
      <h2>What’s your name?</h2>
      <p className="auth-copy">So RESONA knows who it’s playing for.</p>
      <div className="auth-form">
        <label>
          Your name
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Adavit" />
        </label>
      </div>
    </>,
    <>
      <h2>How do you usually listen?</h2>
      <p className="auth-copy">24D sound is tuned differently for headphones and speakers.</p>
      <div className="chips">
        {SETUPS.map((s) => (
          <button key={s} className={setup === s ? "active" : ""} onClick={() => setSetup(s)}>
            {s}
          </button>
        ))}
      </div>
    </>,
    <>
      <h2>What do you love listening to?</h2>
      <p className="auth-copy">Pick as many as you like.</p>
      <div className="chips">
        {GENRES.map((g) => (
          <button key={g} className={genres.includes(g) ? "active" : ""} onClick={() => setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])}>
            {g}
          </button>
        ))}
      </div>
    </>,
    <>
      <h2>What brings you to RESONA?</h2>
      <div className="chips">
        {GOALS.map((g) => (
          <button key={g} className={goal === g ? "active" : ""} onClick={() => setGoal(g)}>
            {g}
          </button>
        ))}
      </div>
      <p className="auth-copy" style={{ marginTop: 18 }}>
        And how do you like your sound?
      </p>
      <div className="chips">
        {STYLES.map((s) => (
          <button key={s} className={style === s ? "active" : ""} onClick={() => setStyle(s)}>
            {s}
          </button>
        ))}
      </div>
    </>,
    <>
      <h2>Tune RESONA to your ears</h2>
      <p className="auth-copy">
        A 2-minute hearing check plays soft tones and builds an EQ that fills in what your ears and headphones miss. Put your headphones on in a quiet spot.
      </p>
    </>,
  ];

  return (
    <div className="auth-backdrop">
      <section className="auth-card" role="dialog" aria-modal="true">
        <div className="auth-heading">
          <span className="brandmark">
            <AudioLines size={19} />
          </span>
          <span className="eyebrow">
            STEP {step + 1} OF {steps.length}
          </span>
        </div>
        <div className="step-dots">
          {steps.map((_, i) => (
            <span key={i} className={i <= step ? "on" : ""} />
          ))}
        </div>
        {steps[step]}
        {err && <p className="auth-error">{err}</p>}
        <div className="row-gap" style={{ marginTop: 20 }}>
          {step > 0 && (
            <button className="soft-btn" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button className="soft-btn primary" disabled={step === 0 && !name.trim()} onClick={() => setStep(step + 1)}>
              Continue
            </button>
          ) : (
            <>
              <button className="soft-btn" disabled={busy} onClick={() => void finish(false)}>
                Skip for now
              </button>
              <button className="soft-btn primary" disabled={busy} onClick={() => void finish(true)}>
                Start hearing check
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
