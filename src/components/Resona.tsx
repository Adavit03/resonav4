import { Link } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  AudioLines,
  ChevronDown,
  CircleHelp,
  Film,
  Focus,
  Heart,
  LogIn,
  LogOut,
  Maximize,
  MicVocal,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  ScrollText,
  Search,
  ShieldCheck,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  X,
  Megaphone,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { EQ_FREQS, EQ_PRESETS, ResonaEngine, SPATIAL_PRESETS, type SpatialSettings, type ViewKey } from "@/lib/audio-engine";
import { AUDIO_RE, BUILT_IN, LEGACY_CATALOG, fmt, loadTrackLyrics, trackKey, type LyricLine, type Track } from "@/lib/tracks";
import { getSavedAdminTracks } from "@/lib/catalog";
import { useSite } from "@/lib/site";
import { AuthDialog } from "./AuthDialog";
import { Onboarding, type Profile } from "./Onboarding";
import { SoundPanel, type SoundTab } from "./SoundPanel";
import { KineticLyrics, LyricsWorkspace, type KineticStyle } from "./LyricsRoom";
import { VideoRoom } from "./VideoRoom";
import { FocusSession } from "./FocusSession";

const ConcertScene = lazy(() => import("./ConcertScene"));
const AudioReactiveSphere = lazy(() => import("./AudioReactiveSphere"));

type Mode = "concert" | "focus" | "lyrics" | "video";

const VIEW_NAMES: Record<ViewKey, string> = {
  room: "Audience · Room overview",
  front: "Center Stage · Front row",
  singer: "Singer · At the microphone",
  guitar: "Guitar · Beside stage-left guitar",
  keyboard: "Piano / Keyboard · Beside keyboard",
  drums: "Drums · Behind the drum kit",
};

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export function Resona() {
  const hydrated = useHydrated();
  const { settings: site, log } = useSite();
  const [tracks, setTracks] = useState<Track[]>(BUILT_IN);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<Mode>("concert");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [auth, setAuth] = useState<null | { mode: "signin" | "signup"; note?: string }>(null);
  const [loadingLib, setLoadingLib] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [gentle, setGentle] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewKey>("front");
  const [tilt, setTilt] = useState(false);
  const [yaw, setYaw] = useState(0);
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);
  const [panel, setPanel] = useState<SoundTab | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [lastSeen, setLastSeen] = useState("");
  const [toast, setToast] = useState("");
  const [spatial, setSpatial] = useState<SpatialSettings>({ ...SPATIAL_PRESETS["16D"], reverb: 0, balance: 0, bass: 0, treble: 0 } as SpatialSettings);
  const [eq, setEq] = useState<number[]>(EQ_PRESETS.Flat);
  const [hearing, setHearing] = useState<number[]>(EQ_FREQS.map(() => 0));
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [kStyle, setKStyle] = useState<KineticStyle>("kinetic");
  const [spotifyUri, setSpotifyUri] = useState("");
  const [ytId, setYtId] = useState("");
  const [pTime, setPTime] = useState(0);
  const [pDur, setPDur] = useState(0);
  const [videoSrc, setVideoSrc] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoYt, setVideoYt] = useState("");
  const [focusing, setFocusing] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engine = useRef<ResonaEngine | null>(null);
  const tiltView = useRef<ViewKey>("front");
  const alpha0 = useRef<number | null>(null);
  const preFocus = useRef<Partial<SpatialSettings> | null>(null);
  const blobUrl = useRef<string | null>(null);

  const track = tracks[idx] || BUILT_IN[0];
  const provider = !!(spotifyUri || ytId);
  const notify = useCallback((s: string) => setToast(s), []);

  /* ---------- engine ---------- */
  const ensure = useCallback(() => {
    if (!engine.current) {
      engine.current = new ResonaEngine();
      engine.current.update(spatial);
      engine.current.setEq(eq);
      engine.current.setHearing(hearing);
      engine.current.setView(view);
    }
    engine.current.resume();
    return engine.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => engine.current?.update(spatial), [spatial]);
  useEffect(() => engine.current?.setEq(eq), [eq]);
  useEffect(() => engine.current?.setHearing(hearing), [hearing]);
  useEffect(() => engine.current?.setView(view), [view]);
  useEffect(() => {
    if (engine.current) engine.current.yaw = yaw;
  }, [yaw]);
  useEffect(() => {
    engine.current?.setModeProfile(mode);
  }, [mode]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume, videoSrc]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let prev = 0;
    const tick = (ts: number) => {
      if (engine.current) {
        const l = engine.current.level();
        levelRef.current = l;
        // React state only feeds the small HUD bars; throttle it so the page
        // doesn't re-render every animation frame (the 3D scene reads levelRef).
        if (ts - last > 140 && Math.abs(l - prev) > 0.05) {
          prev = l;
          setLevel(l);
          last = ts;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(
    () => () => {
      engine.current?.dispose();
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    },
    [],
  );

  /* ---------- prefs ---------- */
  useEffect(() => {
    try {
      const a = localStorage.getItem("resona.autoplay");
      if (a !== null) setAutoplay(a === "1");
      setLastSeen(localStorage.getItem("resona.lastSeenUpdate") || "");
    } catch {
      /* private mode */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("resona.autoplay", autoplay ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [autoplay]);

  /* ---------- auth & profile ---------- */
  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => alive && setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED" || ev === "INITIAL_SESSION") setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    void (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      let p = data as Profile | null;
      if (!p) {
        const { data: ins } = await supabase
          .from("profiles")
          .insert({ id: user.id, display_name: (user.user_metadata?.display_name as string) || (user.user_metadata?.full_name as string) || null })
          .select("*")
          .single();
        p = ins as Profile | null;
      }
      if (p) {
        setProfile(p);
        if (p.eq_profile?.user?.length === EQ_FREQS.length) setEq(p.eq_profile.user);
        else if (p.eq_profile?.style && EQ_PRESETS[p.eq_profile.style]) setEq(EQ_PRESETS[p.eq_profile.style]);
        if (p.eq_profile?.hearing?.length === EQ_FREQS.length) setHearing(p.eq_profile.hearing);
      }
      const { data: admin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!admin);
    })();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save EQ + hearing profile to the account (debounced)
  useEffect(() => {
    if (!profile?.onboarded) return;
    const t = window.setTimeout(() => {
      void supabase
        .from("profiles")
        .update({ eq_profile: { ...(profile.eq_profile || {}), user: eq, hearing }, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
    }, 900);
    return () => window.clearTimeout(t);
  }, [eq, hearing, profile?.id, profile?.onboarded]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- library ---------- */
  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoadingLib(true);
      const extra: Track[] = [];
      // Original RESONA public catalog
      try {
        const legacy = createClient(LEGACY_CATALOG.url, LEGACY_CATALOG.key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data } = await legacy.storage.from(LEGACY_CATALOG.bucket).list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
        for (const f of data || []) {
          if (!AUDIO_RE.test(f.name)) continue;
          const { data: u } = legacy.storage.from(LEGACY_CATALOG.bucket).getPublicUrl(f.name);
          extra.push({ title: f.name.replace(/\.[^.]+$/, "").replace(/_+/g, " ").trim(), artist: "Public song catalog", cover: "🎵", src: u.publicUrl });
        }
      } catch {
        /* catalog offline */
      }
      // New catalog managed from the admin page
      const { data: pub } = await supabase.storage.from("resona-public-audio").list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
      const pubFiles = (pub || []).filter((f) => AUDIO_RE.test(f.name));
      if (pubFiles.length) {
        const { data: signed } = await supabase.storage.from("resona-public-audio").createSignedUrls(pubFiles.map((f) => f.name), 86400);
        (signed || []).forEach((s, i) => {
          if (s.signedUrl) extra.push({ title: pubFiles[i].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(), artist: "RESONA catalog", cover: "🎶", src: s.signedUrl });
        });
      }
      const mine: Track[] = [];
      if (user) {
        const { data: rows, error } = await supabase.from("user_tracks").select("*").order("created_at", { ascending: false });
        if (error) notify(`Could not load your saved songs: ${error.message}`);
        if (rows?.length) {
          const { data: signed } = await supabase.storage.from("user-audio").createSignedUrls(rows.map((r) => r.storage_path), 86400);
          rows.forEach((r, i) => {
            const url = signed?.[i]?.signedUrl;
            if (url) mine.push({ title: r.title, artist: r.artist, cover: r.cover, src: url, cloudId: r.id, storagePath: r.storage_path });
          });
        }
      }
      const adminSaved: Track[] = getSavedAdminTracks().map((t) => ({
        title: t.title,
        artist: t.artist,
        cover: t.cover,
        src: t.src,
      }));
      if (alive) {
        setTracks([...mine, ...adminSaved, ...BUILT_IN, ...extra]);
        setIdx(0);
        setLoadingLib(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- playback ---------- */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.crossOrigin = "anonymous";
    a.src = track.src;
    a.load();
    setTime(0);
    setDur(0);
    if (playing) a.play().catch(() => setPlaying(false));
    // load synchronized lyrics for this track
    setLines([]);
    void loadTrackLyrics(track).then((l) => {
      if (l && l.length) {
        setLines(l);
      } else if (user) {
        void supabase
          .from("lyrics_cache")
          .select("lines")
          .eq("track_key", trackKey(track))
          .maybeSingle()
          .then(({ data }) => data?.lines && setLines(data.lines as unknown as LyricLine[]));
      }
    });
  }, [track.src]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    setIdx((i) => (shuffle ? Math.floor(Math.random() * tracks.length) : (i + 1) % tracks.length));
  }, [shuffle, tracks.length]);

  function prev() {
    if (time > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      return;
    }
    setIdx((i) => (i - 1 + tracks.length) % tracks.length);
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => {
      if (repeat) {
        a.currentTime = 0;
        void a.play();
      } else if (autoplay || focusing) {
        setPlaying(true);
        next();
      } else setPlaying(false);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [repeat, autoplay, focusing, next]);

  function playAudio() {
    const e = ensure();
    const a = audioRef.current;
    if (!a) return;
    videoRef.current?.pause();
    e.attach(a);
    a.play()
      .then(() => setPlaying(true))
      .catch(() => notify("This audio file could not be played in your browser."));
  }
  function toggle() {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else playAudio();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches?.("input,textarea,select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- tilt / head tracking ---------- */
  async function toggleTilt() {
    if (tilt) {
      setTilt(false);
      setYaw(0);
      notify("Tilt control turned off.");
      return;
    }
    if (provider) return notify("Tilt focus works with local audio in RESONA. Provider players bypass the local audio effects.");
    if (!("DeviceOrientationEvent" in window)) return notify("This browser has no motion sensor access. Try RESONA on a phone or tablet over HTTPS.");
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DOE.requestPermission) {
      try {
        if ((await DOE.requestPermission()) !== "granted") return notify("Motion sensor permission was not granted.");
      } catch {
        return notify("Could not access the motion sensor. Check browser permissions and try again.");
      }
    }
    alpha0.current = null;
    tiltView.current = "front";
    setView("front");
    setTilt(true);
    notify(
      "Head tracking is on. Turn your device and the band stays put in the room; tilt left for drums, right for guitar. Browsers can’t read the motion sensors inside AirPods or other headphones — mount your phone on your headphones or hold it to steer.",
    );
  }
  useEffect(() => {
    if (!tilt) return;
    const onOri = (e: DeviceOrientationEvent) => {
      if (e.alpha != null) {
        if (alpha0.current == null) alpha0.current = e.alpha;
        let d = e.alpha - alpha0.current;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        setYaw((d * Math.PI) / 180);
      }
      if (e.gamma == null) return;
      const g = e.gamma;
      let v = tiltView.current;
      if (g >= 12) v = "guitar";
      else if (g <= -12) v = "drums";
      else if (Math.abs(g) <= 5) v = "front";
      if (v !== tiltView.current) {
        tiltView.current = v;
        setView(v);
      }
    };
    window.addEventListener("deviceorientation", onOri);
    return () => window.removeEventListener("deviceorientation", onOri);
  }, [tilt]);

  /* ---------- uploads ---------- */
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (!user) return setAuth({ mode: "signin", note: "Sign in or create an account before uploading. Your songs will be private to you." });
    const list = Array.from(files).filter((f) => f.type.startsWith("audio/") || AUDIO_RE.test(f.name));
    if (!list.length) return notify("Choose audio files such as MP3, WAV, OGG, M4A, FLAC or AAC.");
    const big = list.filter((f) => f.size > 50 * 1024 * 1024);
    if (big.length) return notify(`${big.map((f) => f.name).join(", ")} exceeds the 50 MB per-track limit.`);
    setLoadingLib(true);
    const added: Track[] = [];
    const failed: string[] = [];
    for (const f of list) {
      const safe = f.name.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-110) || "audio-file";
      const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
      const type = f.type || "application/octet-stream";
      const { error } = await supabase.storage.from("user-audio").upload(path, f, { contentType: type, cacheControl: "3600", upsert: false });
      if (error) {
        failed.push(`${f.name}: ${error.message}`);
        continue;
      }
      const title = f.name.replace(/\.[^.]+$/, "");
      const { data: row, error: e2 } = await supabase
        .from("user_tracks")
        .insert({ user_id: user.id, title, artist: "Your library", cover: "🎧", storage_path: path, content_type: type, size_bytes: f.size })
        .select("id")
        .single();
      if (e2) {
        await supabase.storage.from("user-audio").remove([path]);
        failed.push(`${f.name}: ${e2.message}`);
        continue;
      }
      const { data: s } = await supabase.storage.from("user-audio").createSignedUrl(path, 86400);
      if (s) added.push({ title, artist: "Your library", cover: "🎧", src: s.signedUrl, cloudId: row.id, storagePath: path });
    }
    if (added.length) {
      setTracks((t) => [...added, ...t]);
      setIdx(0);
      setSpotifyUri("");
      setYtId("");
      notify(`${added.length} song${added.length === 1 ? "" : "s"} saved privately to your account${failed.length ? `; ${failed.length} could not be saved` : ""}.`);
    } else if (failed.length) notify(`Could not save tracks: ${failed.join(" · ")}`);
    setLoadingLib(false);
  }

  async function removeTrack(t: Track) {
    if (!t.cloudId || !t.storagePath) return;
    await supabase.from("user_tracks").delete().eq("id", t.cloudId);
    await supabase.storage.from("user-audio").remove([t.storagePath]);
    setTracks((all) => all.filter((x) => x !== t));
    setIdx(0);
    notify(`Removed “${t.title}”.`);
  }

  async function signOut() {
    audioRef.current?.pause();
    setPlaying(false);
    const { error } = await supabase.auth.signOut();
    if (error) return notify(`Could not sign out: ${error.message}`);
    setEq(EQ_PRESETS.Flat);
    setHearing(EQ_FREQS.map(() => 0));
    notify("Signed out. Your cloud songs remain saved to your account.");
  }

  /* ---------- video ---------- */
  function openVideo(f: File) {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    const url = URL.createObjectURL(f);
    blobUrl.current = url;
    setVideoSrc(url);
    setVideoTitle(f.name.replace(/\.[^.]+$/, ""));
    setVideoYt("");
    audioRef.current?.pause();
    setPlaying(false);
    setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      ensure().attach(v);
      void v.play().catch(() => {});
    }, 60);
  }

  /* ---------- focus ---------- */
  function startFocus() {
    preFocus.current = { orbit: spatial.orbit, speed: spatial.speed, treble: spatial.treble, reverb: spatial.reverb };
    setSpatial((s) => ({ ...s, orbit: 0, speed: 0.15, treble: Math.min(s.treble, -1.5), reverb: Math.min(s.reverb, 0.08) }));
    setFocusing(true);
    setGentle(true);
    engine.current?.setModeProfile("focus");
    if (!playing) playAudio();
  }
  function endFocus() {
    setFocusing(false);
    if (preFocus.current) setSpatial((s) => ({ ...s, ...preFocus.current }));
    preFocus.current = null;
    engine.current?.setModeProfile(mode);
    // gentle fade out
    const a = audioRef.current;
    if (!a || a.paused) return;
    const start = a.volume;
    let n = 0;
    const t = window.setInterval(() => {
      n++;
      a.volume = Math.max(0, start * (1 - n / 40));
      if (n >= 40) {
        window.clearInterval(t);
        a.pause();
        a.volume = volume;
        setPlaying(false);
      }
    }, 100);
  }

  const lyricTime = provider ? pTime : time;
  const filtered = tracks.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(search.toLowerCase()));
  const latest = log[0]?.created_at || "";
  const unseen = !!latest && latest > lastSeen;

  function fullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.();
  }

  const heads: Record<Mode, [string, string, string]> = {
    concert: [
      "THE ROOM",
      site?.hero?.concertTitle || "Come a little closer.",
      site?.hero?.concertSub || "A small, warm room for the songs that mean something.",
    ],
    focus: ["JUST YOU & THE MUSIC", "You’re here for the show.", "Set an intention, press play, and let the room hold your attention for you."],
    lyrics: ["IN THE MOMENT", "Stay with every word.", "RESONA listens and writes the words as they’re sung."],
    video: ["THE BIG SCREEN", "Concerts, all around you.", "Your videos and concerts, played here in 24D."],
  };

  return (
    <div className={`app ${mode === "lyrics" ? "lyrics-mode" : ""}`}>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brandmark">
            <AudioLines size={20} />
          </span>
          <span>
            RESONA<small>LISTEN CLOSER · A PROJECT BY ADAVIT D</small>
          </span>
        </a>
        <div className="top-center">
          <span className="live-dot" /> {profile?.display_name ? `${profile.display_name.toUpperCase()}'S LISTENING ROOM` : (site?.hero?.topCenter || "YOUR PERSONAL LISTENING ROOM")}
        </div>
        <div className="top-actions">
          <button className="icon-button" title="Sound, EQ & hearing" onClick={() => setPanel(panel ? null : "spatial")}>
            <SlidersHorizontal size={18} />
          </button>
          <button
            className="icon-button"
            title="What’s new"
            style={{ position: "relative" }}
            onClick={() => {
              setShowLog(!showLog);
              if (latest) {
                setLastSeen(latest);
                try {
                  localStorage.setItem("resona.lastSeenUpdate", latest);
                } catch {
                  /* ignore */
                }
              }
            }}
          >
            <ScrollText size={18} />
            {unseen && <span className="update-dot" />}
          </button>
          <button className="icon-button" title="Help" onClick={() => notify("Keyboard: Space play or pause · ←/→ change track. Audio is processed in your browser.")}>
            <CircleHelp size={18} />
          </button>
          <Link to="/vision" className="account-button" title="See what we're developing" style={{ textDecoration: "none", color: "var(--gold)", borderColor: "rgba(211,188,145,0.28)" }}>
            <Sparkles size={14} />
            <span>Our Vision</span>
          </Link>
          <Link to="/admin" className="icon-button" title="Admin Portal">
            <ShieldCheck size={18} />
          </Link>
          {user ? (
            <div className="account-signed">
              <span className="avatar">{profile?.display_name ? profile.display_name[0].toUpperCase() : <User size={16} />}</span>
              <span className="account-email">{profile?.display_name || user.email || "Your account"}</span>
              <button className="account-button" onClick={() => void signOut()} title="Sign out">
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <button className="account-button" onClick={() => setAuth({ mode: "signin" })}>
              <LogIn size={15} />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {site?.announcement?.enabled && site?.announcement?.text && (
        <div className="announcement">
          <Megaphone size={14} /> {site.announcement.text}
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <div className="side-label">YOUR SPACE</div>
          <button className={`nav-item ${mode === "concert" ? "selected" : ""}`} onClick={() => setMode("concert")}>
            <Music2 size={17} /> Concert room <span className="nav-pill">LIVE</span>
          </button>
          <button className={`nav-item ${mode === "focus" ? "selected" : ""}`} onClick={() => setMode("focus")}>
            <Focus size={17} /> Focus listening
          </button>
          <button className={`nav-item ${mode === "lyrics" ? "selected" : ""}`} onClick={() => setMode("lyrics")}>
            <MicVocal size={17} /> Lyrics room
          </button>
          <button className={`nav-item ${mode === "video" ? "selected" : ""}`} onClick={() => setMode("video")}>
            <Film size={17} /> Video & concerts <span className="nav-pill">NEW</span>
          </button>
          <div className="library-head">
            <span className="side-label">YOUR LIBRARY</span>
            <label className={`icon-button tiny ${loadingLib ? "uploading" : ""}`} title={user ? "Upload audio to your private library" : "Sign in to upload and save songs"}>
              <Plus size={17} />
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
                multiple
                disabled={loadingLib}
                onChange={(e) => {
                  void upload(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {loadingLib && <div className="library-status">Loading or saving your private songs…</div>}
          <label className="search">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a track" />
          </label>
          <div className="track-list">
            {filtered.map((t) => {
              const i = tracks.indexOf(t);
              return (
                <button
                  key={t.src}
                  className={`track-row ${i === idx ? "playing" : ""}`}
                  onClick={() => {
                    setSpotifyUri("");
                    setYtId("");
                    setIdx(i);
                    setPlaying(true);
                    ensure();
                    setTimeout(() => playAudio(), 0);
                  }}
                  onContextMenu={(e) => {
                    if (!t.cloudId) return;
                    e.preventDefault();
                    if (confirm(`Remove “${t.title}” from your library?`)) void removeTrack(t);
                  }}
                >
                  <span className="cover-mini">{t.cover}</span>
                  <span className="track-meta">
                    <b>{t.title}</b>
                    <small>{t.artist}</small>
                  </span>
                  {i === idx && playing ? <AudioLines size={15} className="row-playing" /> : null}
                </button>
              );
            })}
            {!filtered.length && <div className="empty-small">No tracks match.</div>}
          </div>
          <div className="sidebar-bottom">
            <Link to="/vision" className="nav-item" style={{ marginTop: 0, marginBottom: 12, textDecoration: "none", color: "var(--gold)" }}>
              <Sparkles size={17} /> What we're developing
            </Link>
            <div className="offline">
              <span className="offline-icon">
                <Heart size={16} />
              </span>
              <span>
                <b>Your music stays yours</b>
                <small>{user ? "Private cloud library" : "Sign in to sync your uploads"}</small>
              </span>
            </div>
          </div>
        </aside>

        <section className="main-area">
          <div className="mode-head">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> {heads[mode][0]}
              </div>
              <h1>{heads[mode][1]}</h1>
              <p>{heads[mode][2]}</p>
            </div>
            <div className="head-tools">
              <button className="quality" onClick={() => setGentle(!gentle)}>
                <span className={`quality-dot ${gentle ? "low" : ""}`} />
                {gentle ? "Gentle" : "Balanced"} <ChevronDown size={13} />
              </button>
              <button className="circle-control" title="Fullscreen" onClick={fullscreen}>
                <Maximize size={16} />
              </button>
            </div>
          </div>

          {mode !== "video" && (
            <div className={`stage-card ${mode === "focus" ? "focus-stage" : ""} ${mode === "lyrics" ? "lyrics-stage" : ""}`}>
              <div className="stage-scene">
                {hydrated && (
                  <Suspense fallback={null}>
                    {mode === "concert" ? (
                      <ConcertScene view={view} levelRef={levelRef} yaw={yaw} low={gentle} engineRef={engine} />
                    ) : (
                      <AudioReactiveSphere mode={mode === "lyrics" ? "lyrics" : "focus"} levelRef={levelRef} engineRef={engine} low={gentle} />
                    )}
                  </Suspense>
                )}
                <div className="scene-vignette" />
                <div className="scene-chip">
                  <span className="live-dot" />
                  {mode === "concert" ? "CONCERT ROOM" : mode === "focus" ? (focusing ? "FOCUS SESSION" : "FOCUS MODE") : "LYRICS MODE"}
                </div>
                {mode === "lyrics" && <KineticLyrics lines={lines} time={lyricTime} style={kStyle} />}
                {mode === "focus" && lines.length > 0 && <FocusOverlay lines={lines} time={lyricTime} />}
                <div className="sound-react">
                  {[30, 42, 24, 34, 22].map((m, i) => (
                    <span key={i} style={{ height: `${[10, 16, 9, 18, 12][i] + level * m}px` }} />
                  ))}
                </div>
              </div>
              <div className="stage-foot">
                <span>{gentle ? "LOW GRAPHICS" : provider ? "PROVIDER AUDIO · ROOM AMBIENCE" : playing ? "AUDIO REACTIVE VISUALS" : "READY FOR YOUR MUSIC"}</span>
              </div>
            </div>
          )}

          {mode === "focus" && (
            <FocusSession userId={user?.id ?? null} isPlaying={playing} onStart={startFocus} onEnd={endFocus} notify={notify} />
          )}

          {(mode === "concert" || mode === "focus") && (
            <div className="view-controls">
              <div className="view-topline">
                <div>
                  <span className="eyebrow">{mode === "focus" ? "YOUR PLACE ON STAGE" : "CHOOSE YOUR PLACE"}</span>
                  <strong className="view-current">{VIEW_NAMES[view]}</strong>
                </div>
                {tilt && <span className="mix-note">Turn to look around · Tilt left: drummer · Tilt right: guitar</span>}
                <button className={`tilt-toggle ${tilt ? "active" : ""}`} onClick={() => void toggleTilt()} disabled={provider} aria-pressed={tilt}>
                  {tilt ? "Turn tilt off" : "Enable tilt control"}
                </button>
              </div>
              <div className="view-buttons">
                {(
                  [
                    ["singer", "Singer"],
                    ["guitar", "Guitar"],
                    ["drums", "Drums"],
                    ["keyboard", "Piano / Keyboard"],
                    ["front", "Center Stage"],
                    ["room", "Audience"],
                  ] as [ViewKey, string][]
                ).map(([k, l]) => (
                  <button key={k} className={view === k ? "active" : ""} aria-pressed={view === k} onClick={() => setView(k)}>
                    {l}
                  </button>
                ))}
              </div>
              <p className="view-detail">
                {view === "room" || view === "front"
                  ? "Take in the full band, stage lights and instruments."
                  : "Camera moves in close; the selected instrument gets a gentle EQ lift in the mixed track."}{" "}
                MP3s don’t contain separate instrument tracks.
              </p>
              {provider ? (
                <p className="provider-spatial-note">
                  Spotify and YouTube Music play inside protected embeds, so RESONA cannot route their audio through the spatial mix. Choose a local track for
                  stage-positioned HRTF audio.
                </p>
              ) : (
                <p className="tilt-note">
                  Tilt control uses your phone or tablet’s motion sensor as a head tracker: the soundstage stays fixed while you turn. Browsers can’t read the
                  sensors inside headphones like AirPods.
                </p>
              )}
            </div>
          )}

          {mode === "video" && (
            <VideoRoom
              videoRef={videoRef}
              videoSrc={videoSrc}
              videoTitle={videoTitle}
              onLocalFile={openVideo}
              ytId={videoYt}
              setYtId={(s) => {
                setVideoYt(s);
                if (s) {
                  audioRef.current?.pause();
                  setPlaying(false);
                }
              }}
              onPlay={() => {
                if (videoRef.current) ensure().attach(videoRef.current);
                audioRef.current?.pause();
                setPlaying(false);
              }}
              onEnded={() => {}}
            />
          )}

          {(mode === "lyrics" || provider) && mode !== "video" && (
            <LyricsWorkspace
              inLyrics={mode === "lyrics"}
              track={track}
              time={lyricTime}
              lines={lines}
              setLines={setLines}
              signedIn={!!user}
              askSignIn={() => setAuth({ mode: "signin", note: "Sign in so RESONA can write and save lyrics for your songs." })}
              onSeek={(t) => {
                if (audioRef.current) audioRef.current.currentTime = t;
              }}
              style={kStyle}
              setStyle={setKStyle}
              spotifyUri={spotifyUri}
              setSpotifyUri={setSpotifyUri}
              ytId={ytId}
              setYtId={setYtId}
              onProviderProgress={(t, d) => {
                setPTime(t);
                setPDur(d);
              }}
              providerTime={pTime}
              providerDur={pDur}
              stopLocal={() => {
                audioRef.current?.pause();
                setPlaying(false);
                setTilt(false);
              }}
              notify={notify}
            />
          )}

          {!provider && mode !== "video" && (
            <section className="player-card">
              <div className="now-playing">
                <div className="cover-large">
                  {track.cover}
                  <span className="cover-glow" />
                </div>
                <div className="now-meta">
                  <span className="eyebrow">NOW LISTENING</span>
                  <h2>{track.title}</h2>
                  <p>{track.artist}</p>
                </div>
                <button
                  className={`autoplay-pill ${autoplay ? "toggled" : ""}`}
                  title="Automatically play the next song"
                  onClick={() => setAutoplay(!autoplay)}
                  aria-pressed={autoplay}
                >
                  AUTOPLAY {autoplay ? "ON" : "OFF"}
                </button>
              </div>
              <div className="transport">
                <div className="transport-buttons">
                  <button className={shuffle ? "toggled" : ""} title="Shuffle" onClick={() => setShuffle(!shuffle)}>
                    <Shuffle size={16} />
                  </button>
                  <button title="Previous" onClick={prev}>
                    <SkipBack size={19} fill="currentColor" />
                  </button>
                  <button className="play-button" title={playing ? "Pause" : "Play"} onClick={toggle}>
                    {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button title="Next" onClick={next}>
                    <SkipForward size={19} fill="currentColor" />
                  </button>
                  <button className={repeat ? "toggled" : ""} title="Repeat" onClick={() => setRepeat(!repeat)}>
                    <Repeat size={17} />
                  </button>
                </div>
                <div className="seek-row">
                  <span>{fmt(time)}</span>
                  <input
                    aria-label="Seek track"
                    type="range"
                    min="0"
                    max={dur || 100}
                    value={Math.min(time, dur || 100)}
                    onChange={(e) => {
                      if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
                    }}
                    style={{ "--progress": `${dur ? (time / dur) * 100 : 0}%` } as React.CSSProperties}
                  />
                  <span>{fmt(dur)}</span>
                </div>
              </div>
              <div className="volume-control">
                <button title="Volume" onClick={() => setVolume(volume ? 0 : 0.8)}>
                  {volume ? <Volume2 size={17} /> : <VolumeX size={17} />}
                </button>
                <input aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              </div>
            </section>
          )}

          {mode !== "video" && (
            <div className="lower-row">
              <div className="sound-note">
                <span className="note-icon">
                  <Heart size={18} />
                </span>
                <div>
                  <b>Hear it your way</b>
                  <p>{hearing.some(Boolean) ? "Your hearing profile is active on everything you play." : "Take the hearing check and RESONA tunes itself to your ears."}</p>
                </div>
                <button onClick={() => setPanel(panel ? null : "eq")}>
                  <SlidersHorizontal size={16} /> Tune sound
                </button>
              </div>
              <div className="ambient-note">
                <span className="ambient-icon">
                  <Sparkles size={17} />
                </span>
                <div>
                  <b>A softer kind of immersion</b>
                  <p>No flashing lights. Just a room that moves with the music.</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {panel && (
        <SoundPanel
          tab={panel}
          setTab={setPanel}
          settings={spatial}
          onSettings={(s) => setSpatial((p) => ({ ...p, ...s }))}
          eq={eq}
          onEq={setEq}
          hearing={hearing}
          onHearing={setHearing}
          engine={() => ensure()}
          onClose={() => setPanel(null)}
        />
      )}

      {showLog && (
        <div className="fx-panel wide">
          <div className="panel-head">
            <span>
              <ScrollText size={16} /> WHAT’S NEW
            </span>
            <button className="icon-button" onClick={() => setShowLog(false)}>
              <X size={16} />
            </button>
          </div>
          {!log.length && <p className="fx-desc">No updates yet.</p>}
          {log.map((e) => (
            <div className="update-item" key={e.id}>
              <small>
                v{e.version} · {new Date(e.created_at).toLocaleDateString()}
              </small>
              <b>{e.title}</b>
              <p>{e.body}</p>
            </div>
          ))}
        </div>
      )}

      {auth && <AuthDialog initial={auth.mode} note={auth.note} onClose={() => setAuth(null)} />}

      {profile && !profile.onboarded && (
        <Onboarding
          profile={profile}
          onDone={(p, runHearing) => {
            setProfile(p);
            if (p.eq_profile?.style && EQ_PRESETS[p.eq_profile.style]) setEq(EQ_PRESETS[p.eq_profile.style]);
            if (p.listening_goal === "Deep focus") setMode("focus");
            if (p.listening_goal === "Sing along") setMode("lyrics");
            if (runHearing) setPanel("hearing");
            notify(`Welcome to RESONA${p.display_name ? `, ${p.display_name}` : ""}.`);
          }}
        />
      )}

      {toast && (
        <button className="toast" onClick={() => setToast("")}>
          {toast}
          <X size={14} />
        </button>
      )}

      <audio ref={audioRef} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />

      <footer className="footer">
        <span>
          RESONA <i>·</i> YOUR MUSIC, YOUR ROOM
        </span>
        <span>Project by Adavit D.</span>
      </footer>
    </div>
  );
}

function FocusOverlay({ lines, time }: { lines: LyricLine[]; time: number }) {
  let i = -1;
  for (let k = 0; k < lines.length && lines[k].time <= time; k++) i = k;
  return (
    <div className="lyric-overlay focus-lyric-overlay">
      <small>{i > 0 ? lines[i - 1].text : " "}</small>
      <strong>{lines[i]?.text || "…"}</strong>
      <small>{lines[i + 1]?.text || " "}</small>
    </div>
  );
}
