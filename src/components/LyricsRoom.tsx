import { FileText, Play, RefreshCw, Sparkles, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { transcribeChunk } from "@/lib/transcribe.functions";
import { chunkSong } from "@/lib/audio-chunks";
import { fmt, linesFromChunk, loadTrackLyrics, parseLrc, spotifyTrack, trackKey, youtubeId, type LyricLine, type Track } from "@/lib/tracks";
import { SpotifyPlayer, YouTubePlayer } from "./Providers";

export type KineticStyle = "kinetic" | "type" | "glow";

export function KineticLyrics({ lines, time, style }: { lines: LyricLine[]; time: number; style: KineticStyle }) {
  let idx = -1;
  for (let i = 0; i < lines.length && lines[i].time <= time; i++) idx = i;
  const line = lines[idx];
  const words = line ? line.text.split(" ") : [];
  const dur = line ? Math.max(0.5, line.end - line.time) : 1;
  const prog = line ? (time - line.time) / dur : 0;
  const lit = Math.floor(prog * words.length * 1.15) + 1;
  return (
    <div className={`kinetic style-${style}`}>
      {line && <span key={idx} className="k-flash" />}
      <div className="k-prev">{lines[idx - 1]?.text || " "}</div>
      <div className="k-line" key={`l-${idx}`}>
        {line
          ? words.map((w, i) => (
              <span key={i} className={`k-word ${i < lit ? "on" : ""} ${i === lit - 1 ? "now" : ""}`}>
                {w}
              </span>
            ))
          : <span className="k-word on">{lines.length ? "…" : "Your song, in its own words."}</span>}
      </div>
      <div className="k-next">{lines[idx + 1]?.text || " "}</div>
    </div>
  );
}

export function LyricsWorkspace({
  inLyrics,
  track,
  time,
  lines,
  setLines,
  signedIn,
  askSignIn,
  onSeek,
  style,
  setStyle,
  spotifyUri,
  setSpotifyUri,
  ytId,
  setYtId,
  onProviderProgress,
  providerTime,
  providerDur,
  stopLocal,
  notify,
}: {
  inLyrics: boolean;
  track: Track;
  time: number;
  lines: LyricLine[];
  setLines: (l: LyricLine[]) => void;
  signedIn: boolean;
  askSignIn: () => void;
  onSeek: (t: number) => void;
  style: KineticStyle;
  setStyle: (s: KineticStyle) => void;
  spotifyUri: string;
  setSpotifyUri: (s: string) => void;
  ytId: string;
  setYtId: (s: string) => void;
  onProviderProgress: (t: number, d: number) => void;
  providerTime: number;
  providerDur: number;
  stopLocal: () => void;
  notify: (s: string) => void;
}) {
  const [spLink, setSpLink] = useState("");
  const [ytLink, setYtLink] = useState("");
  const [spErr, setSpErr] = useState("");
  const [ytErr, setYtErr] = useState("");
  const [progress, setProgress] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const cancel = useRef(false);
  const transcribe = useServerFn(transcribeChunk);

  let current = -1;
  for (let i = 0; i < lines.length && lines[i].time <= time; i++) current = i;

  // Auto-fetch synchronized lyrics on track mount if not yet loaded
  useEffect(() => {
    if (lines.length > 0) return;
    let isCancelled = false;
    setFetching(true);
    void loadTrackLyrics(track).then((found) => {
      if (!isCancelled && found && found.length > 0) {
        setLines(found);
      }
      if (!isCancelled) setFetching(false);
    });
    return () => {
      isCancelled = true;
    };
  }, [track.title, track.artist]);

  async function searchSyncedLyrics() {
    setFetching(true);
    try {
      const found = await loadTrackLyrics(track);
      if (found.length) {
        setLines(found);
        notify(`${found.length} synchronized lyric lines loaded.`);
      } else {
        notify("No synchronized lyrics found online for this track. You can import or paste .LRC lyrics.");
      }
    } catch {
      notify("Could not retrieve lyrics. Check network connection or import an .LRC file.");
    } finally {
      setFetching(false);
    }
  }

  async function autoTranscribe() {
    if (!signedIn) return askSignIn();
    if (spotifyUri || ytId) return notify("Auto-lyrics work on songs from your library. Spotify and YouTube audio is locked inside their players.");
    setBusy(true);
    cancel.current = false;
    try {
      const key = trackKey(track);
      const { data: cached } = await supabase.from("lyrics_cache").select("lines").eq("track_key", key).maybeSingle();
      if (cached?.lines && Array.isArray(cached.lines) && cached.lines.length) {
        setLines(cached.lines as unknown as LyricLine[]);
        notify("Lyrics loaded from your library.");
        return;
      }
      setProgress("Listening to the song…");
      const { chunks } = await chunkSong(track.src, 15);
      const all: LyricLine[] = [];
      let prev = "";
      for (let i = 0; i < chunks.length; i++) {
        if (cancel.current) break;
        const c = chunks[i];
        setProgress(`Writing lyrics… ${Math.round((i / chunks.length) * 100)}%`);
        if (c.silent) continue;
        const fd = new FormData();
        fd.append("file", new File([c.blob], `chunk-${i}.wav`, { type: "audio/wav" }));
        fd.append("hint", `Song: ${track.title} by ${track.artist}. Previous words: ${prev.slice(-150)}`);
        let r = await transcribe({ data: fd });
        if (r.retry) {
          await new Promise((res) => setTimeout(res, 4000));
          r = await transcribe({ data: fd });
        }
        if (r.stop) {
          notify(r.error || "Transcription stopped.");
          break;
        }
        if (r.text) {
          prev = r.text;
          all.push(...linesFromChunk(r.text, c.start + 0.3, c.end - 0.2));
          setLines([...all]);
        }
      }
      if (all.length) {
        await supabase.from("lyrics_cache").upsert(
          { user_id: (await supabase.auth.getUser()).data.user!.id, track_key: key, lines: all as never },
          { onConflict: "user_id,track_key" },
        );
        notify(`${all.length} lyric lines written for “${track.title}”.`);
      } else if (!cancel.current) notify("No sung words were found in this track — it may be instrumental.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not transcribe this song.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function forget() {
    await supabase.from("lyrics_cache").delete().eq("track_key", trackKey(track));
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(`resona_lrc_${trackKey(track)}`);
    }
    setLines([]);
    notify("Lyrics cleared.");
  }

  function importLrc(file?: File) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const l = parseLrc(String(fr.result));
      setLines(l);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(`resona_lrc_${trackKey(track)}`, JSON.stringify(l));
      }
      notify(l.length ? `${l.length} timed lyric lines loaded.` : "No timestamped lines found in that file.");
    };
    fr.readAsText(file);
  }

  function applyPastedLyrics() {
    if (!pastedText.trim()) return;
    const l = parseLrc(pastedText);
    if (l.length) {
      setLines(l);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(`resona_lrc_${trackKey(track)}`, JSON.stringify(l));
      }
      notify(`${l.length} synchronized lines parsed.`);
      setPasteOpen(false);
      setPastedText("");
    } else {
      notify("Please paste lyrics with standard timestamps like [00:15.50] Line text.");
    }
  }

  return (
    <section className={`lyrics-workspace ${!inLyrics ? "provider-background" : ""}`}>
      <div className="lyrics-title">
        <div>
          <span className="eyebrow">YOUR WORDS, YOUR TIMING</span>
          <h2>Lyrics for this moment</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="soft-btn" onClick={() => setPasteOpen(!pasteOpen)}>
            <FileText size={13} style={{ verticalAlign: -2 }} /> Paste .LRC
          </button>
          <label className="button-soft">
            <Upload size={13} style={{ verticalAlign: -2 }} /> Import .LRC
            <input type="file" accept=".lrc,.txt,text/plain" onChange={(e) => importLrc(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      {pasteOpen && (
        <div style={{ margin: "12px 0", padding: "14px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid var(--line)" }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
            Paste timestamped .LRC lyrics format (e.g. <code>[00:15.50] Lyric line</code>):
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={5}
            style={{ width: "100%", background: "#10120f", color: "#eee", border: "1px solid var(--line)", borderRadius: 8, padding: 8, fontSize: 11, fontFamily: "monospace" }}
            placeholder="[00:12.00] First line of the song&#10;[00:18.50] Second line of the song"
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="soft-btn primary" onClick={applyPastedLyrics}>Apply lyrics</button>
            <button className="soft-btn" onClick={() => setPasteOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="transcribe-box">
        {busy ? (
          <button className="soft-btn" onClick={() => (cancel.current = true)}>
            Stop
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="soft-btn primary" onClick={() => void searchSyncedLyrics()} disabled={fetching}>
              <RefreshCw size={13} className={fetching ? "spin" : ""} style={{ verticalAlign: -2 }} /> {fetching ? "Searching…" : "Find Synced Lyrics"}
            </button>
            <button className="soft-btn" onClick={() => void autoTranscribe()}>
              <Sparkles size={13} style={{ verticalAlign: -2 }} /> AI Auto-write
            </button>
          </div>
        )}
        <small>
          {progress || (fetching ? "Searching synchronized lyrics database…" : lines.length ? `${lines.length} lines in sync · line ${current + 1}` : "No timestamped lyrics loaded yet. Click 'Find Synced Lyrics' or import an .LRC file.")}
        </small>
        {!busy && lines.length > 0 && (
          <button className="soft-btn" onClick={() => void forget()}>
            Clear
          </button>
        )}
      </div>

      <div className="preset-row">
        {(["kinetic", "type", "glow"] as KineticStyle[]).map((s) => (
          <button key={s} className={style === s ? "active" : ""} onClick={() => setStyle(s)}>
            {s === "kinetic" ? "Kinetic edit" : s === "type" ? "Typewriter" : "Spotlight glow"}
          </button>
        ))}
      </div>

      {lines.length > 0 ? (
        <div className="lyric-lines">
          {lines.map((l, i) => (
            <button key={i} className={i === current ? "current" : ""} onClick={() => onSeek(l.time)}>
              <i>{fmt(l.time)}</i>
              {l.text}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: "28px 14px", textAlign: "center", color: "var(--muted)", fontSize: 11 }}>
          <p style={{ margin: "0 0 8px" }}>No synchronized lyrics found for “{track.title}”.</p>
          <small style={{ color: "var(--line)" }}>Click "Find Synced Lyrics" above, or import a .LRC timestamped file.</small>
        </div>
      )}

      <div className="provider-box" style={{ marginTop: 16 }}>
        <div className="provider-intro">
          <span className="provider-icon">
            <Play size={14} fill="currentColor" />
          </span>
          <div>
            <b>Listen from Spotify or YouTube Music</b>
            <small>Both players stay inside RESONA. Load a song below.</small>
          </div>
        </div>
        <div className="provider-grid">
          <div className="provider-card">
            <form
              className="provider-form"
              onSubmit={(e) => {
                e.preventDefault();
                const u = spotifyTrack(spLink);
                if (!u) return setSpErr("Paste a Spotify track link (open.spotify.com/track/…).");
                stopLocal();
                setYtId("");
                setSpotifyUri(u);
                setSpErr("");
              }}
            >
              <label htmlFor="spotify-link">Spotify track link</label>
              <div>
                <input id="spotify-link" type="url" value={spLink} onChange={(e) => (setSpLink(e.target.value), setSpErr(""))} placeholder="https://open.spotify.com/track/…" />
                <button type="submit">Load Spotify</button>
              </div>
            </form>
            {spErr && <div className="youtube-error" role="alert">{spErr}</div>}
            {spotifyUri && (
              <>
                <SpotifyPlayer uri={spotifyUri} onProgress={onProviderProgress} />
                <div className="provider-foot">
                  <span>
                    {fmt(providerTime)} / {fmt(providerDur)}
                  </span>
                  <span>{lines.length ? "Timed lyrics follow Spotify playback." : "Import a timed .LRC file to show lyrics in sync."}</span>
                </div>
              </>
            )}
          </div>
          <div className="provider-card">
            <form
              className="provider-form"
              onSubmit={(e) => {
                e.preventDefault();
                const id = youtubeId(ytLink);
                if (!id) return setYtErr("Paste a YouTube or YouTube Music link.");
                stopLocal();
                setSpotifyUri("");
                setYtId(id);
                setYtErr("");
              }}
            >
              <label htmlFor="youtube-music-link">YouTube Music link</label>
              <div>
                <input id="youtube-music-link" type="url" value={ytLink} onChange={(e) => (setYtLink(e.target.value), setYtErr(""))} placeholder="https://music.youtube.com/watch?v=…" />
                <button type="submit">Play in RESONA</button>
              </div>
            </form>
            {ytErr && <div className="youtube-error" role="alert">{ytErr}</div>}
            {ytId && (
              <>
                <YouTubePlayer videoId={ytId} onProgress={onProviderProgress} />
                <div className="provider-foot">
                  <span>
                    {fmt(providerTime)} / {fmt(providerDur)}
                  </span>
                  <span>{lines.length ? "Timed lyrics follow YouTube playback." : "Import a timed .LRC file to show lyrics in sync."}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <p className="youtube-caption-note">
          Spotify and YouTube keep their audio locked inside their own players, so RESONA can’t process or transcribe it. For full 24D and auto-lyrics, add the
          song to your library.
        </p>
      </div>
    </section>
  );
}
