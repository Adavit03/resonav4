import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    onSpotifyIframeApiReady?: (api: any) => void;
  }
}

let spotifyApi: any = null;
const spotifyWaiters: { resolve: (a: any) => void; reject: (e: Error) => void }[] = [];
let spotifyLoading = false;
function loadSpotify(): Promise<any> {
  if (spotifyApi) return Promise.resolve(spotifyApi);
  const p = new Promise<any>((resolve, reject) => spotifyWaiters.push({ resolve, reject }));
  if (!spotifyLoading) {
    spotifyLoading = true;
    window.onSpotifyIframeApiReady = (api) => {
      spotifyApi = api;
      spotifyWaiters.splice(0).forEach((w) => w.resolve(api));
    };
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    s.onerror = () => {
      spotifyLoading = false;
      spotifyWaiters.splice(0).forEach((w) => w.reject(new Error("Spotify embed could not load")));
    };
    document.body.appendChild(s);
  }
  return p;
}

export function SpotifyPlayer({ uri, onProgress }: { uri: string; onProgress: (t: number, d: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const [err, setErr] = useState("");
  useEffect(() => {
    let dead = false;
    let ctl: any;
    setErr("");
    loadSpotify()
      .then((api) => {
        if (dead || !ref.current) return;
        api.createController(ref.current, { uri, height: 152 }, (c: any) => {
          if (dead) return c.destroy?.();
          ctl = c;
          c.addListener("playback_update", (e: any) => cb.current((e.data?.position || 0) / 1000, (e.data?.duration || 0) / 1000));
        });
      })
      .catch(() => !dead && setErr("Spotify’s embedded player could not load in this browser. Try again later."));
    const el = ref.current;
    return () => {
      dead = true;
      ctl?.destroy?.();
      el?.replaceChildren();
    };
  }, [uri]);
  return (
    <>
      <div className="spotify-embed" ref={ref} />
      {err && <div className="youtube-error" role="alert">{err}</div>}
    </>
  );
}

let ytApi: any = null;
const ytWaiters: { resolve: (a: any) => void; reject: (e: Error) => void }[] = [];
let ytLoading = false;
export function loadYouTube(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApi) return Promise.resolve(ytApi);
  const p = new Promise<any>((resolve, reject) => ytWaiters.push({ resolve, reject }));
  if (!ytLoading) {
    ytLoading = true;
    window.onYouTubeIframeAPIReady = () => {
      ytApi = window.YT || null;
      ytWaiters.splice(0).forEach((w) => (ytApi ? w.resolve(ytApi) : w.reject(new Error("unavailable"))));
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      ytLoading = false;
      ytWaiters.splice(0).forEach((w) => w.reject(new Error("YouTube player API could not load")));
    };
    document.body.appendChild(s);
  }
  return p;
}

export function YouTubePlayer({
  videoId,
  onProgress,
  onEnded,
  className = "youtube-frame provider-youtube-frame",
}: {
  videoId: string;
  onProgress: (t: number, d: number) => void;
  onEnded?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const endCb = useRef(onEnded);
  endCb.current = onEnded;
  const [err, setErr] = useState("");
  useEffect(() => {
    let dead = false;
    let timer = 0;
    let player: any;
    setErr("");
    loadYouTube()
      .then((YT) => {
        if (dead || !ref.current) return;
        player = new YT.Player(ref.current, {
          width: "100%",
          height: "100%",
          videoId,
          // youtube-nocookie + modestbranding keeps viewers inside RESONA
          host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, enablejsapi: 1, fs: 1, origin: window.location.origin },
          events: {
            onReady: () => !dead && player?.playVideo(),
            onStateChange: (e: any) => {
              const tick = () => cb.current(player?.getCurrentTime() || 0, player?.getDuration() || 0);
              if (e.data === YT.PlayerState.PLAYING) {
                window.clearInterval(timer);
                tick();
                timer = window.setInterval(tick, 250);
              } else {
                window.clearInterval(timer);
                tick();
              }
              if (e.data === YT.PlayerState.ENDED) endCb.current?.();
            },
            onError: (e: any) =>
              !dead &&
              setErr(e.data === 101 || e.data === 150 ? "This video’s owner blocks playback inside other sites." : "YouTube could not load this video in the embedded player."),
          },
        });
      })
      .catch(() => !dead && setErr("YouTube’s embedded player could not load in this browser."));
    const el = ref.current;
    return () => {
      dead = true;
      window.clearInterval(timer);
      player?.destroy?.();
      el?.replaceChildren();
    };
  }, [videoId]);
  return (
    <div className={`${className} ${err ? "youtube-unavailable" : ""}`}>
      <div ref={ref} />
      {err && (
        <div className="youtube-player-message" role="alert">
          <strong>{err}</strong>
          <small>
            The video owner decides whether it can play inside other sites. Try a different link, or download the video/concert you own and open it from
            your device for the full 24D treatment.
          </small>
        </div>
      )}
    </div>
  );
}
