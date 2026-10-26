import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BYTES = 4 * 1024 * 1024;

export const transcribeChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected form data");
    const file = data.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) throw new Error("Invalid audio chunk");
    const hint = String(data.get("hint") || "").slice(0, 300);
    return { file, hint };
  })
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { text: "", error: "Transcription is not configured." };
    const form = new FormData();
    form.append("model", "openai/gpt-transcribe");
    form.append("file", new File([data.file], "chunk.wav", { type: "audio/wav" }));
    form.append("response_format", "json");
    form.append("stream", "true");
    form.append("prompt", `Song lyrics. Transcribe only the sung words. ${data.hint}`.trim());
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok || !res.body) {
      const msg = await res.text().catch(() => "");
      console.error("transcribe failed", res.status, msg.slice(0, 300));
      if (res.status === 402) return { text: "", error: "AI credits are used up for this workspace.", stop: true };
      if (res.status === 429) return { text: "", error: "Too many requests — slowing down.", retry: true };
      return { text: "", error: "Could not transcribe this part.", stop: res.status < 500 };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let deltas = "";
    let done = "";
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, i);
        buf = buf.slice(i + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "transcript.text.delta" && ev.delta) deltas += ev.delta;
            if (ev.type === "transcript.text.done" && typeof ev.text === "string") done = ev.text;
          } catch {
            /* partial */
          }
        }
      }
    }
    return { text: (done || deltas).trim() };
  });
