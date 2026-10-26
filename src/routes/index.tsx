import { createFileRoute } from "@tanstack/react-router";
import { Resona } from "@/components/Resona";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RESONA — Listen closer" },
      { name: "description", content: "RESONA — a warm, immersive room for the music you love, in 24D spatial sound." },
      { property: "og:title", content: "RESONA — Listen closer" },
      { property: "og:description", content: "A warm, immersive 24D listening room with lyrics, video concerts and a sound tuned to your ears." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Resona,
});
