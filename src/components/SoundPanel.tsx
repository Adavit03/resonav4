import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { EQ_FREQS, EQ_PRESETS, SPATIAL_PRESETS, hearingToEq, type ResonaEngine, type SpatialSettings } from "@/lib/audio-engine";

export type SoundTab = "spatial" | "eq" | "hearing";

const label = (f: number) => (f >= 1000 ? `${f / 1000}k` : String(f));
const TEST_FREQS = [125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export function SoundPanel({
  tab,
  setTab,
  settings,
  onSettings,
  eq,
  onEq,
  hearing,
  onHearing,
  engine,
  onClose,
}: {
  tab: SoundTab;
  setTab: (t: SoundTab) => void;
  settings: SpatialSettings;
  onSettings: (s: Partial<SpatialSettings>) => void;
  eq: number[];
  onEq: (g: number[]) => void;
  hearing: number[];
  onHearing: (g: number[]) => void;
  engine: () => ResonaEngine | null;
  onClose: () => void;
}) {
  const sliders: [string, keyof SpatialSettings, number, number, number][] = [
    ["24D orbit", "orbit", 0, 1, 0.01],
    ["Orbit speed", "speed", 0, 1, 0.01],
    ["Stage width", "width", 0, 1, 0.01],
    ["Height movement", "height", 0, 1, 0.01],
    ["Room / reverb", "reverb", 0, 1, 0.01],
    ["Stereo balance", "balance", -1, 1, 0.01],
    ["Bass", "bass", -12, 12, 1],
    ["Treble", "treble", -12, 12, 1],
  ];
  const show = (k: keyof SpatialSettings, v: number) =>
    k === "balance" ? (v === 0 ? "Center" : v < 0 ? "Left" : "Right") : k === "bass" || k === "treble" ? `${v} dB` : `${Math.round(v * 100)}%`;
  const activePreset = Object.entries(SPATIAL_PRESETS).find(([, p]) => p.orbit === settings.orbit && p.speed === settings.speed)?.[0];
  const activeEq = Object.entries(EQ_PRESETS).find(([, g]) => g.every((x, i) => x === eq[i]))?.[0];

  return (
    <div className="fx-panel wide">
      <div className="panel-head">
        <span>
          <SlidersHorizontal size={16} /> SOUND, SHAPED
        </span>
        <button className="icon-button" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="fx-tabs">
        {(["spatial", "eq", "hearing"] as SoundTab[]).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t === "spatial" ? "24D space" : t === "eq" ? "EQ mixer" : "Hearing check"}
          </button>
        ))}
      </div>

      {tab === "spatial" && (
        <>
          <div className="bypass-toggle-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 12px", padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid var(--line)" }}>
            <span style={{ fontSize: 11, color: settings.bypass ? "#dfbb80" : "#a8a598" }}>
              <b>{settings.bypass ? "Neutral Studio (Original Audio)" : "Resona Processing Active"}</b>
            </span>
            <button
              className={`soft-btn ${settings.bypass ? "primary" : ""}`}
              style={{ padding: "4px 9px", fontSize: 10, minHeight: 26 }}
              onClick={() => onSettings({ bypass: !settings.bypass })}
            >
              {settings.bypass ? "Enable Engine" : "A/B Bypass"}
            </button>
          </div>
          <p className="fx-desc">
            Acoustically modeled room space with HRTF binaural speakers, crossover bass protection, and transparent master dynamics. Designed for deep headphone immersion.
          </p>
          <div className="preset-row">
            {Object.keys(SPATIAL_PRESETS).map((p) => (
              <button key={p} className={activePreset === p ? "active" : ""} onClick={() => onSettings(SPATIAL_PRESETS[p])}>
                {p}
              </button>
            ))}
          </div>
          {sliders.map(([name, key, min, max, step]) => (
            <label className="fx-control" key={key}>
              <span>
                {name}
                <b>{show(key, settings[key])}</b>
              </span>
              <input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(e) => onSettings({ [key]: Number(e.target.value) })} />
            </label>
          ))}
          <button className="reset-button" onClick={() => onSettings({ ...SPATIAL_PRESETS["Concert Stage"] })}>
            Reset sound
          </button>
        </>
      )}

      {tab === "eq" && (
        <>
          <p className="fx-desc">Ten bands, from sub-bass to air. Your hearing profile is added on top{hearing.some(Boolean) ? " (active)" : ""}.</p>
          <div className="preset-row">
            {Object.keys(EQ_PRESETS).map((p) => (
              <button key={p} className={activeEq === p ? "active" : ""} onClick={() => onEq(EQ_PRESETS[p])}>
                {p}
              </button>
            ))}
          </div>
          <div className="eq-bands">
            {EQ_FREQS.map((f, i) => (
              <div className="eq-band" key={f}>
                <b>{eq[i] > 0 ? `+${eq[i]}` : eq[i]}</b>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={eq[i]}
                  aria-label={`${label(f)} Hz`}
                  onChange={(e) => onEq(eq.map((g, j) => (j === i ? Number(e.target.value) : g)))}
                />
                <span>{label(f)}</span>
              </div>
            ))}
          </div>
          <button className="reset-button" onClick={() => onEq(EQ_PRESETS.Flat)}>
            Flatten EQ
          </button>
        </>
      )}

      {tab === "hearing" && <HearingCheck engine={engine} hearing={hearing} onHearing={onHearing} />}
    </div>
  );
}

function HearingCheck({ engine, hearing, onHearing }: { engine: () => ResonaEngine | null; hearing: number[]; onHearing: (g: number[]) => void }) {
  const [i, setI] = useState(-1);
  const [level, setLevel] = useState(-30);
  const [results, setResults] = useState<Record<number, number>>({});

  const play = (db = level) => engine()?.tone(TEST_FREQS[i], db);
  const start = () => {
    setResults({});
    setI(0);
    setLevel(-30);
    setTimeout(() => engine()?.tone(TEST_FREQS[0], -30), 50);
  };
  const quieter = () => {
    const n = level - 6;
    setLevel(n);
    play(n);
  };
  const louder = () => {
    const n = Math.min(-6, level + 6);
    setLevel(n);
    play(n);
  };
  const record = (db: number) => {
    const next = { ...results, [TEST_FREQS[i]]: db };
    setResults(next);
    if (i + 1 < TEST_FREQS.length) {
      setI(i + 1);
      setLevel(-30);
      setTimeout(() => engine()?.tone(TEST_FREQS[i + 1], -30), 200);
    } else {
      setI(TEST_FREQS.length);
      onHearing(hearingToEq(next));
    }
  };

  if (i < 0 || i >= TEST_FREQS.length)
    return (
      <div className="hearing-step">
        <strong>{i >= TEST_FREQS.length ? "Your ears are mapped." : "Understand how you hear."}</strong>
        {i >= TEST_FREQS.length
          ? "RESONA now gently lifts the frequencies you hear least. It stays on for every song, video and concert, and is saved to your account."
          : "Headphones on, volume at a comfortable level. For each tone, make it quieter until you can only just hear it. Takes about two minutes."}
        {hearing.some(Boolean) && (
          <div className="eq-bands" style={{ height: 70 }}>
            {EQ_FREQS.map((f, k) => (
              <div className="eq-band" key={f}>
                <b>+{hearing[k]}</b>
                <span>{label(f)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="row-gap">
          <button className="soft-btn primary" onClick={start}>
            {hearing.some(Boolean) ? "Re-run check" : "Start hearing check"}
          </button>
          {hearing.some(Boolean) && (
            <button className="soft-btn" onClick={() => onHearing(EQ_FREQS.map(() => 0))}>
              Turn off
            </button>
          )}
        </div>
      </div>
    );

  return (
    <div className="hearing-step">
      <strong>{label(TEST_FREQS[i])} Hz tone</strong>
      Tap <b>Quieter</b> until the tone is just barely there, then tap <b>That’s my limit</b>. If you can’t hear it at all, tap <b>Louder</b>.
      <div className="hearing-bar">
        <span style={{ width: `${((i + 1) / TEST_FREQS.length) * 100}%` }} />
      </div>
      <small>Level {level} dB</small>
      <div className="row-gap">
        <button className="soft-btn" onClick={louder}>
          Louder
        </button>
        <button className="soft-btn" onClick={() => play()}>
          Replay
        </button>
        <button className="soft-btn" onClick={quieter} disabled={level <= -84}>
          Quieter
        </button>
      </div>
      <div className="row-gap">
        <button className="soft-btn primary" onClick={() => record(level)}>
          That’s my limit
        </button>
      </div>
    </div>
  );
}
