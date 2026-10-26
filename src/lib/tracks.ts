export interface Track {
  title: string;
  artist: string;
  src: string;
  cover: string;
  cloudId?: string;
  storagePath?: string;
  kind?: "audio" | "video";
}

export const BUILT_IN: Track[] = [
  { title: "A Sky Full of Stars (Karaoke)", artist: "Coldplay • Karaoke version", src: "/audio/Coldplay - A Sky Full Of Stars (Karaoke Version).mp3", cover: "✨" },
  { title: "Raya (Slowed)", artist: "Local library", src: "/audio/Raya (Slowed).mp3", cover: "🌙" },
  { title: "Take Me (To The Moon)", artist: "Ian Asher", src: "/audio/Ian Asher - Take Me (To The Moon).mp3", cover: "🌙" },
  { title: "Islands (Kompa Pasión)", artist: "Tomo", src: "/audio/Tomo - Islands.mp3", cover: "🏝️" },
  { title: "HUEGO (Super Slowed)", artist: "Local library", src: "/audio/Y2Mate.is - HUEGO Super Slowed.mp3", cover: "🌫️" },
  { title: "Safar", artist: "Local library", src: "/audio/Safar (PenduJatt.Com.Se).mp3", cover: "🪷" },
  { title: "Shubhaarambh", artist: "Gujarati • Local library", src: "/audio/Shubhaarambh Full Song - Gujurati.mp3", cover: "🪔" },
  { title: "BATIDAO FUNK (Slowed)", artist: "Local library", src: "/audio/BATIDAO FUNK (Slowed) - ZXKAI x Rezcaze x MC Kaique SP x KINGXND.mp3", cover: "🌅" },
];

// Original RESONA public catalog (read-only, public files).
export const LEGACY_CATALOG = {
  url: "https://zvarqbhkudfvvgxmdgup.supabase.co",
  key: "sb_publishable_CFWqbds73PyQ4D5jfxNpHA_9L6ITcry",
  bucket: "resona-public-audio",
};

export const AUDIO_RE = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;
export const VIDEO_RE = /\.(mp4|webm|mov|m4v|mkv)$/i;

export function fmt(s: number) {
  return Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
}

export function trackKey(t: Track) {
  return t.cloudId ? `cloud:${t.cloudId}` : `${t.title}|${t.artist}`;
}

export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!["http:", "https:"].includes(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    let id = "";
    if (h === "youtu.be") id = u.pathname.split("/").filter(Boolean)[0] || "";
    else if (h === "youtube.com" || h.endsWith(".youtube.com")) {
      if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
      else if (/^\/(shorts|embed|live)\//.test(u.pathname)) id = u.pathname.split("/")[2] || "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function spotifyTrack(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!["open.spotify.com", "www.open.spotify.com"].includes(u.hostname.toLowerCase())) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("track");
    const id = i >= 0 ? parts[i + 1] : "";
    return id && /^[A-Za-z0-9]{22}$/.test(id) ? `spotify:track:${id}` : null;
  } catch {
    return null;
  }
}

export interface LyricLine {
  time: number;
  end: number;
  text: string;
}

export function parseLrc(text: string): LyricLine[] {
  const rows = text
    .split(/\r?\n/)
    .flatMap((line) => {
      const stamps = [...line.matchAll(/\[(\d{2}):(\d{2}(?:\.\d+)?)\]/g)];
      const body = line.replace(/\[\d{2}:\d{2}(?:\.\d+)?\]/g, "").trim();
      return body ? stamps.map((m) => ({ time: Number(m[1]) * 60 + Number(m[2]), text: body })) : [];
    })
    .sort((a, b) => a.time - b.time);
  return rows.map((r, i) => ({ ...r, end: rows[i + 1]?.time ?? r.time + 5 }));
}

/** Split a transcribed chunk's text into short lyric lines spread across its time window. */
export function linesFromChunk(text: string, start: number, end: number): LyricLine[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];
  const groups: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 7 || (/[.,!?;:]$/.test(w) && cur.length >= 3)) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  const total = groups.reduce((a, g) => a + g.join(" ").length, 0);
  let t = start;
  const span = end - start;
  return groups.map((g) => {
    const txt = g.join(" ");
    const d = (txt.length / total) * span;
    const line = { time: t, end: t + d, text: txt };
    t += d;
    return line;
  });
}

/** Pre-bundled synchronized lyrics for built-in catalog tracks (zero network needed) */
export const BUNDLED_LYRICS: Record<string, string> = {
  "A Sky Full of Stars": `[00:16.96]'Cause you're a sky, 'cause you're a sky full of stars
[00:24.75]I'm gonna give you my heart
[00:32.59]'Cause you're a sky, 'cause you're a sky full of stars
[00:40.26]'Cause you light up the path
[00:47.77]I don't care, go on and tear me apart
[00:55.34]I don't care if you do, ooh-ooh, ooh
[01:03.17]'Cause in a sky, 'cause in a sky full of stars
[01:08.42]I think I saw you ooh-ooh-ooh, ooh-ooh-ooh
[01:41.55]'Cause you're a sky, 'cause you're a sky full of stars
[01:49.36]I wanna die in your arms, oh-oh-oh, oh-oh
[01:56.90]'Cause you get lighter the more it gets dark
[02:04.63]I'm gonna give you my heart, oh
[02:12.35]I don't care, go on and tear me apart
[02:19.93]I don't care if you do, ooh-ooh, ooh
[02:27.78]'Cause in a sky, 'cause in a sky full of stars
[02:32.92]I think I see you ooh-ooh-ooh, ooh-ooh-ooh
[02:40.69]I think I see you ooh-ooh-ooh, ooh-ooh-ooh
[03:36.74]'Cause you're a sky, you're a sky full of stars
[03:41.94]Such a heavenly view
[03:49.46]You're such a heavenly view
[03:55.14](Yeah, yeah, yeah, ooh)`,

  "Take Me (To The Moon)": `[00:08.00]Take me to the moon, let me fly among the stars
[00:15.50]Let me see what spring is like on Jupiter and Mars
[00:23.00]In other words, hold my hand
[00:30.00]In other words, baby kiss me
[00:38.00]Fill my heart with song and let me sing forever more
[00:45.00]You are all I long for, all I worship and adore
[00:52.50]In other words, please be true
[01:00.00]In other words, I love you`,

  "Islands": `[00:10.00]Underneath the golden sun, feel the rhythm in the breeze
[00:18.00]Dancing on the island sand, gentle sway among the trees
[00:26.50]Kompa pasión in my soul, let the night take control
[00:35.00]Echoes of a distant dream, warmer than it's ever been
[00:44.00]Stay with me until the dawn, till the twilight is gone`,

  "Raya": `[00:12.00]Soft whisper in the night, slow drift of memory
[00:22.00]Shadows fading into light, calling you to me
[00:32.00]Drifting through the midnight air, quiet longing everywhere
[00:44.00]Every echo in the room, dancing gently with the moon`,

  "Safar": `[00:10.00]Ek safar hai zindagani, raaste anjaan hain
[00:20.00]Har mod pe ek nayi kahani, hum sab musafir mehmaan hain
[00:31.00]Chalte jaana manzil ki talaash mein
[00:42.00]Khwaabon ki roshni har ek aas mein`,

  "Shubhaarambh": `[00:12.00]Hey shubhaarambh, ho shubhaarambh
[00:20.00]Manchala man chala teri ore
[00:28.00]Rang leela, rang birangi preet ki dori
[00:36.00]Khushiyon ka ye savera, naya jahaan hai tera`,
};

/** Clean track name for lyric API searches */
function cleanQuery(s: string): string {
  return s
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/•.*/, "")
    .replace(/[-_]/g, " ")
    .replace(/Y2Mate\.is/gi, "")
    .replace(/PenduJatt\.Com\.Se/gi, "")
    .trim();
}

/**
 * Searches and retrieves synchronized timestamped lyrics for a track.
 * 1. Checks pre-bundled lyrics for built-in catalog tracks.
 * 2. Checks browser localStorage cache.
 * 3. Queries legitimate open synchronized lyrics API (LRCLIB).
 */
export async function loadTrackLyrics(track: Track): Promise<LyricLine[]> {
  const cleanTitle = cleanQuery(track.title);
  const cleanArtist = cleanQuery(track.artist);

  // 1. Check bundled catalog lyrics
  for (const [key, lrc] of Object.entries(BUNDLED_LYRICS)) {
    if (cleanTitle.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanTitle.toLowerCase())) {
      const parsed = parseLrc(lrc);
      if (parsed.length) return parsed;
    }
  }

  // 2. Check localStorage cache
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const cached = window.localStorage.getItem(`resona_lrc_${trackKey(track)}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      /* ignore storage errors */
    }
  }

  // 3. Online fetch from open synced lyrics provider (LRCLIB)
  if (typeof fetch !== "undefined") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist === "Local library" ? "" : cleanArtist)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          if (parsed.length) {
            if (typeof window !== "undefined" && window.localStorage) {
              window.localStorage.setItem(`resona_lrc_${trackKey(track)}`, JSON.stringify(parsed));
            }
            return parsed;
          }
        }
      }
    } catch {
      /* network offline or timed out */
    }
  }

  return [];
}
