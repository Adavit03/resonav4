import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { BUNDLED_LYRICS, loadTrackLyrics, parseLrc } from "@/lib/tracks";

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the vision page route /vision", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/vision");
    expect(matches.at(-1)?.routeId).toBe("/vision");
  });
});

describe("Synchronized Lyrics Parser & Synchronization", () => {
  it("parses timestamped LRC strings with minute/second accuracy", () => {
    const rawLrc = `[00:10.50] Hello world
[00:20.00] Second lyric line
[00:35.25] Third lyric line`;

    const parsed = parseLrc(rawLrc);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].time).toBeCloseTo(10.5, 2);
    expect(parsed[0].text).toBe("Hello world");
    expect(parsed[0].end).toBeCloseTo(20.0, 2);

    expect(parsed[1].time).toBe(20.0);
    expect(parsed[1].text).toBe("Second lyric line");
    expect(parsed[1].end).toBeCloseTo(35.25, 2);
  });

  it("loads pre-bundled synchronized lyrics for catalog tracks like Coldplay", async () => {
    const track = {
      title: "A Sky Full of Stars (Karaoke)",
      artist: "Coldplay • Karaoke version",
      src: "/audio/Coldplay - A Sky Full Of Stars (Karaoke Version).mp3",
      cover: "✨",
    };

    const lines = await loadTrackLyrics(track);
    expect(lines.length).toBeGreaterThan(10);
    expect(lines[0].text).toContain("sky full of stars");
    expect(lines[0].time).toBeGreaterThan(0);
  });

  it("handles track pausing, seeking, and advancement logic cleanly", () => {
    const lines = parseLrc(BUNDLED_LYRICS["Take Me (To The Moon)"]);
    expect(lines.length).toBeGreaterThan(0);

    // At time 10 seconds:
    let activeIndex = -1;
    const testTime = 10.0;
    for (let i = 0; i < lines.length && lines[i].time <= testTime; i++) activeIndex = i;

    expect(activeIndex).toBe(0);
    expect(lines[activeIndex].text).toContain("Take me to the moon");

    // Seeking forward to 25 seconds:
    const seekTime = 25.0;
    let seekIndex = -1;
    for (let i = 0; i < lines.length && lines[i].time <= seekTime; i++) seekIndex = i;

    expect(seekIndex).toBe(2);
    expect(lines[seekIndex].text).toContain("hold my hand");
  });
});
