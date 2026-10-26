import { useState } from "react";
import { youtubeId } from "@/lib/tracks";
import { YouTubePlayer } from "./Providers";

export function VideoRoom({
  videoRef,
  videoSrc,
  videoTitle,
  onLocalFile,
  ytId,
  setYtId,
  onPlay,
  onEnded,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  videoTitle: string;
  onLocalFile: (f: File) => void;
  ytId: string;
  setYtId: (s: string) => void;
  onPlay: () => void;
  onEnded: () => void;
}) {
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  return (
    <section className="video-room">
      <span className="eyebrow">VIDEO & CONCERT ROOM</span>
      <h2>Watch it here. Hear it all around you.</h2>
      <p className="honest-note">
        Open a concert, music video or film you’ve downloaded and RESONA plays it right here with the full 24D engine, your EQ and hearing profile, and head
        tracking. YouTube links also play inside RESONA — you’re never sent away.
      </p>
      <div className="video-tools">
        <label className="button-soft">
          Open video file
          <input
            type="file"
            accept="video/*,.mp4,.webm,.mov,.m4v,.mkv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setYtId("");
                onLocalFile(f);
              }
              e.currentTarget.value = "";
            }}
          />
        </label>
        <form
          style={{ display: "flex", gap: 8, flex: 1 }}
          onSubmit={(e) => {
            e.preventDefault();
            const id = youtubeId(link);
            if (!id) return setErr("Paste a YouTube link (youtube.com/watch?v=… or youtu.be/…).");
            setErr("");
            videoRef.current?.pause();
            setYtId(id);
          }}
        >
          <input type="url" value={link} onChange={(e) => (setLink(e.target.value), setErr(""))} placeholder="https://www.youtube.com/watch?v=…" />
          <button className="soft-btn" type="submit">
            Play here
          </button>
        </form>
      </div>
      {err && <div className="youtube-error" role="alert">{err}</div>}
      <div className="video-frame" style={{ display: ytId || videoSrc ? undefined : "none" }}>
        {ytId ? (
          <YouTubePlayer videoId={ytId} onProgress={() => {}} className="youtube-frame" />
        ) : (
          <video ref={videoRef} src={videoSrc || undefined} controls playsInline crossOrigin="anonymous" onPlay={onPlay} onEnded={onEnded} />
        )}
      </div>
      {videoSrc && !ytId && <p className="honest-note">Now playing: {videoTitle} · 24D, EQ and hearing profile active.</p>}
      {ytId && (
        <p className="honest-note">
          YouTube plays inside RESONA, but YouTube locks its sound inside its own player, so 24D and EQ can’t be applied to it. For the full 24D concert,
          open a downloaded copy of the video above.
        </p>
      )}
    </section>
  );
}
