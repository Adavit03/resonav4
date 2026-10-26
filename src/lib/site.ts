import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  hero: { concertTitle: string; concertSub: string; topCenter: string };
  announcement: { text: string; enabled: boolean };
}

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  body: string;
  created_at: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    concertTitle: "Come a little closer.",
    concertSub: "A small, warm room for the songs that mean something.",
    topCenter: "YOUR PERSONAL LISTENING ROOM",
  },
  announcement: { text: "", enabled: false },
};

const STORAGE_KEY = "resona_site_settings";

export function getLocalSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hero: { ...DEFAULT_SETTINGS.hero, ...(parsed.hero || {}) },
        announcement: { ...DEFAULT_SETTINGS.announcement, ...(parsed.announcement || {}) },
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveLocalSettings(settings: SiteSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("resona:settings-updated", { detail: settings }));
  } catch {}
}

/** Live site settings + update log; admins' edits arrive instantly via realtime or local broadcast. */
export function useSite() {
  const [settings, setSettings] = useState<SiteSettings>(() => getLocalSettings());
  const [log, setLog] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s, error: sErr }, { data: c }] = await Promise.all([
          supabase.from("site_settings").select("key,value"),
          supabase.from("changelog").select("*").order("created_at", { ascending: false }).limit(50),
        ]);

        if (!sErr && s && s.length > 0) {
          const next = { ...DEFAULT_SETTINGS } as SiteSettings;
          for (const row of s) {
            if (row.key === "hero") next.hero = { ...DEFAULT_SETTINGS.hero, ...(row.value as object) };
            if (row.key === "announcement") next.announcement = { ...DEFAULT_SETTINGS.announcement, ...(row.value as object) };
          }
          setSettings(next);
          saveLocalSettings(next);
        } else {
          // Fallback to local settings if table not yet migrated
          setSettings(getLocalSettings());
        }

        if (c) setLog(c as ChangelogEntry[]);
      } catch {
        setSettings(getLocalSettings());
      }
    };

    void load();

    // Listen to local broadcast updates from admin controls
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SiteSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getLocalSettings());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSettings(getLocalSettings());
      }
    };

    window.addEventListener("resona:settings-updated", handleLocalUpdate);
    window.addEventListener("storage", handleStorage);

    // Supabase Realtime channel
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelId = `site-live-${Math.random().toString(36).slice(2, 9)}`;
      ch = supabase
        .channel(channelId)
        .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => void load())
        .on("postgres_changes", { event: "*", schema: "public", table: "changelog" }, () => void load());
      ch.subscribe();
    } catch {
      // Realtime subscription failure handled gracefully
    }

    return () => {
      window.removeEventListener("resona:settings-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleStorage);
      if (ch) {
        try {
          void supabase.removeChannel(ch);
        } catch {}
      }
    };
  }, []);

  return { settings, log };
}
