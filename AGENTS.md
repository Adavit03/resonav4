<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- src/styles.css is the original RESONA stylesheet plus appended additions; new UI reuses its class names (no Tailwind preflight) so the look stays identical.
- All audio (songs and local videos) goes through ResonaEngine in src/lib/audio-engine.ts; YouTube/Spotify embeds cannot be processed, so never claim 24D for them.
- Lyrics are auto-transcribed in ~15 s chunks via the transcribeChunk server function and cached per user in lyrics_cache, because the gateway returns no timestamps.
