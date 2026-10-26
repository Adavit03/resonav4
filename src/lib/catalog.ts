import { BUILT_IN, type Track, AUDIO_RE } from "@/lib/tracks";
import { supabase } from "@/integrations/supabase/client";

export interface ManagedTrack extends Track {
  id: string;
  album?: string;
  dateAdded: string;
  status: "published" | "draft";
  tags?: string[];
  fileSize?: string;
  durationSec?: number;
}

export const MANAGED_TRACKS_KEY = "resona_admin_managed_tracks";

export function getBuiltInManagedTracks(): ManagedTrack[] {
  return BUILT_IN.map((t, idx) => ({
    id: `builtin-${idx}`,
    title: t.title,
    artist: t.artist,
    src: t.src,
    cover: t.cover,
    album: "Resona Original Suite",
    dateAdded: "2026-10-25",
    status: "published" as const,
    tags: ["Immersive", "Concert Hall"],
    durationSec: 180,
  }));
}

export function getSavedAdminTracks(): ManagedTrack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MANAGED_TRACKS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function saveAdminTracks(tracks: ManagedTrack[]): void {
  if (typeof window === "undefined") return;
  try {
    // Only save custom/uploaded tracks to localStorage to avoid bloating
    const custom = tracks.filter((t) => !t.id.startsWith("builtin-"));
    localStorage.setItem(MANAGED_TRACKS_KEY, JSON.stringify(custom));
    window.dispatchEvent(new CustomEvent("resona:tracks-updated", { detail: tracks }));
  } catch {}
}

/** Fetches all cloud-hosted tracks stored in the Supabase resona-public-audio bucket */
export async function fetchSupabaseCatalog(): Promise<ManagedTrack[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from("resona-public-audio")
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (error || !files) return [];

    const audioFiles = files.filter((f) => AUDIO_RE.test(f.name));

    return audioFiles.map((f, i) => {
      const publicUrl = supabase.storage.from("resona-public-audio").getPublicUrl(f.name).data.publicUrl;

      // Extract clean title and artist if formatted as "Artist - Title.mp3" or "Title.mp3"
      const rawName = f.name.replace(/\.[^.]+$/, "");
      let title = rawName.replace(/[-_]/g, " ").trim();
      let artist = "Resona Cloud Catalog";

      if (rawName.includes(" - ")) {
        const parts = rawName.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
      }

      return {
        id: `supabase-${f.id || i}-${f.name}`,
        title,
        artist,
        src: publicUrl,
        cover: "🎵",
        album: "Cloud Ingestion",
        dateAdded: f.created_at ? f.created_at.slice(0, 10) : "2026-10-25",
        status: "published",
        tags: ["Cloud Catalog", "24D Spatial Ready"],
        fileSize: f.metadata?.size ? `${(f.metadata.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
        durationSec: 210,
      };
    });
  } catch {
    return [];
  }
}

/** Load complete merged tracks list for Admin Library and 24D Audio Studio */
export async function getMergedCatalog(): Promise<ManagedTrack[]> {
  const builtIn = getBuiltInManagedTracks();
  const saved = getSavedAdminTracks();
  const cloud = await fetchSupabaseCatalog();

  const map = new Map<string, ManagedTrack>();

  // Priority: 1) Locally saved custom tracks 2) Cloud catalog 3) Built-in
  for (const t of saved) {
    map.set(t.src, t);
  }
  for (const t of cloud) {
    if (!map.has(t.src)) map.set(t.src, t);
  }
  for (const t of builtIn) {
    if (!map.has(t.src)) map.set(t.src, t);
  }

  return Array.from(map.values());
}
