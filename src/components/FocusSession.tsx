import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const INTENTIONS = ["Study", "Deep work", "Create", "Unwind", "Sleep"];
const LENGTHS = [15, 25, 50, 90];

export function FocusSession({
  userId,
  isPlaying,
  onStart,
  onEnd,
  notify,
}: {
  userId: string | null;
  isPlaying: boolean;
  onStart: (intention: string) => void;
  onEnd: () => void;
  notify: (s: string) => void;
}) {
  const [intention, setIntention] = useState("Deep work");
  const [length, setLength] = useState(25);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [week, setWeek] = useState(0);
  const started = useRef(0);

  useEffect(() => {
    if (!userId) return setWeek(0);
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    void supabase
      .from("focus_sessions")
      .select("minutes")
      .gte("created_at", since)
      .then(({ data }) => setWeek((data || []).reduce((a, r) => a + r.minutes, 0)));
  }, [userId, running]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      if (!isPlaying) return; // the session only counts while music plays
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(t);
          void finish(true);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, isPlaying]);

  async function finish(complete: boolean) {
    setRunning(false);
    onEnd();
    const mins = Math.round((length * 60 - left) / 60);
    if (complete) notify(`Session complete — ${length} focused minutes. Take a breath.`);
    if (userId && (complete ? length : mins) >= 1) {
      await supabase.from("focus_sessions").insert({ user_id: userId, minutes: complete ? length : mins, intention });
    }
  }

  const total = length * 60;
  const p = running ? ((total - left) / total) * 100 : 0;
  const shown = running ? left : total;

  return (
    <div className="focus-panel">
      <div className="focus-ring" style={{ "--p": `${p}%` } as React.CSSProperties}>
        <b>
          {Math.floor(shown / 60)}:{String(shown % 60).padStart(2, "0")}
          <small>{running ? (isPlaying ? "IN FOCUS" : "PAUSED") : "MINUTES"}</small>
        </b>
      </div>
      <div>
        <span className="eyebrow">A FOCUS SESSION</span>
        <h3>{running ? `${intention}. Just you and the music.` : "Give this listening a purpose."}</h3>
        <p>
          Pick what you’re here to do. RESONA narrows the 24D orbit so it never pulls your attention, softens harsh highs, keeps the next song coming, and
          gently fades out when time is up.
        </p>
        {!running && (
          <>
            <div className="preset-row">
              {INTENTIONS.map((i) => (
                <button key={i} className={intention === i ? "active" : ""} onClick={() => setIntention(i)}>
                  {i}
                </button>
              ))}
            </div>
            <div className="preset-row">
              {LENGTHS.map((l) => (
                <button key={l} className={length === l ? "active" : ""} onClick={() => setLength(l)}>
                  {l} min
                </button>
              ))}
            </div>
          </>
        )}
        <div className="row-gap" style={{ maxWidth: 320 }}>
          {running ? (
            <button className="soft-btn" onClick={() => void finish(false)}>
              End session
            </button>
          ) : (
            <button
              className="soft-btn primary"
              onClick={() => {
                started.current = Date.now();
                setLeft(length * 60);
                setRunning(true);
                onStart(intention);
              }}
            >
              Begin {length}-minute session
            </button>
          )}
        </div>
        <div className="focus-stats">{userId ? `${week} focused minutes this week` : "Sign in to keep track of your focused minutes."}</div>
      </div>
    </div>
  );
}
