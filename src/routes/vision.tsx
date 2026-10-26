import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  AudioLines,
  Compass,
  Eye,
  Headphones,
  Layers,
  Mic2,
  Music2,
  Sliders,
  Sparkles,
  Volume2,
} from "lucide-react";

export const Route = createFileRoute("/vision")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "What We're Developing — RESONA Product Vision" },
      {
        name: "description",
        content: "Music has always been more than sound. Explore the product vision behind RESONA's immersive listening experience.",
      },
      { property: "og:title", content: "What We're Developing — RESONA Product Vision" },
      {
        property: "og:description",
        content: "Don't just listen to music. Enter it. Explore how sound, visuals, and interaction come together in RESONA.",
      },
    ],
  }),
  component: VisionPage,
});

function VisionPage() {
  return (
    <div className="vision-page">
      {/* Top Header */}
      <header className="vision-topbar">
        <Link to="/" className="brand" style={{ textDecoration: "none" }}>
          <span className="brandmark">
            <AudioLines size={20} />
          </span>
          <span>
            RESONA<small>PRODUCT VISION · ADAVIT D</small>
          </span>
        </Link>
        <Link to="/" className="soft-btn" style={{ textDecoration: "none" }}>
          <ArrowLeft size={14} style={{ verticalAlign: -2 }} /> Return to Listening Room
        </Link>
      </header>

      <main className="vision-content">
        {/* Section 1: Hero */}
        <section className="vision-hero">
          <div className="eyebrow">
            <span className="live-dot" /> PRODUCT EXPLORATION
          </div>
          <h1>See what we're developing.</h1>
          <p className="vision-lead">
            “Music has always been more than sound. It's a feeling, a place, a moment you can lose yourself in. We're exploring a new way to experience it.”
          </p>
          <div className="vision-tagline">
            <b>“Don't just listen to music. Enter it.”</b>
          </div>
        </section>

        {/* Section 2: The Vision */}
        <section className="vision-section">
          <div className="vision-card main-vision">
            <span className="eyebrow">THE CORE IDEA</span>
            <h2>Listening that feels like a place</h2>
            <p>
              When people listen to music, they often imagine the artist performing, the instruments playing around them, and the warm atmosphere of a live performance.
            </p>
            <p>
              RESONA aims to bring that imagination closer to reality by exploring immersive audio, visual environments, and interactive music experiences. The goal is to make listening feel like entering a world shaped around the music rather than simply playing tracks through headphones.
            </p>
          </div>
        </section>

        {/* Section: Resona VR Headset Concept Prototype */}
        <section className="vision-section headset-section">
          <div className="headset-card">
            <div className="headset-glow" />

            <div className="headset-header-block">
              <span className="concept-pill">CONCEPT PROTOTYPE · IN DEVELOPMENT</span>
              <h2>Meet the Resona Headset Concept</h2>
              <p className="headset-copy">
                Resona is exploring a new way to experience music by combining immersive audio with virtual environments. This headset concept represents our vision of bringing listeners closer to the music through immersive concert experiences, spatial listening perspectives and a more engaging way to experience sound.
              </p>
              <p className="headset-copy">
                We are developing the software experience first, while exploring how dedicated hardware could take it further.
              </p>
            </div>

            <div className="headset-showcase-wrap">
              <div className="headset-image-frame">
                <img
                  src="/assets/resona/resona_vr_headset_reference.jpg"
                  alt="Resona VR Headset Concept Prototype — Original Reference Sheet"
                  className="headset-reference-image"
                  width={1024}
                  height={935}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Imagine the Experience */}
        <section className="vision-section">
          <div className="section-head">
            <span className="eyebrow">EXPERIENCE PILLARS</span>
            <h2>Imagine the Experience</h2>
            <p>Five complementary concepts shaping the future of interactive music.</p>
          </div>

          <div className="vision-grid">
            <div className="vision-card">
              <div className="card-icon">
                <Headphones size={22} />
              </div>
              <div className="badge-row">
                <span className="prototype-pill active">Prototype Active</span>
              </div>
              <h3>Immersive Listening</h3>
              <p>
                Explore a more spatial and atmospheric way of experiencing music, with sound and visuals designed to complement each other in real-time.
              </p>
            </div>

            <div className="vision-card">
              <div className="card-icon">
                <Music2 size={22} />
              </div>
              <div className="badge-row">
                <span className="prototype-pill active">Prototype Active</span>
              </div>
              <h3>Virtual Concerts</h3>
              <p>
                Enter an interactive virtual performance environment with a realistic stage, atmospheric acoustics, and stylized band performers.
              </p>
            </div>

            <div className="vision-card">
              <div className="card-icon">
                <Compass size={22} />
              </div>
              <div className="badge-row">
                <span className="prototype-pill active">Prototype Active</span>
              </div>
              <h3>Choose Your Perspective</h3>
              <p>
                Move closer to the singer, stand beside the drummer, or explore the stage from another vantage point with corresponding acoustic shifts.
              </p>
            </div>

            <div className="vision-card">
              <div className="card-icon">
                <Mic2 size={22} />
              </div>
              <div className="badge-row">
                <span className="prototype-pill active">Prototype Active</span>
              </div>
              <h3>Lyrics Within the Experience</h3>
              <p>
                Synchronize lyrics directly within the listening environment so they feel like a natural part of the world rather than a separate screen of text.
              </p>
            </div>

            <div className="vision-card">
              <div className="card-icon">
                <Sliders size={22} />
              </div>
              <div className="badge-row">
                <span className="prototype-pill active">Prototype Active</span>
              </div>
              <h3>Studio and Sound Exploration</h3>
              <p>
                Experiment with listening environments and sound presentation—from focused, distraction-free listening to rich spatial immersion.
              </p>
            </div>

            <div className="vision-card future-card">
              <div className="card-icon">
                <Layers size={22} />
              </div>
              <div className="badge-row">
                <span className="prototype-pill future">Future Exploration</span>
              </div>
              <h3>More Than a Concert</h3>
              <p>
                Beyond concert venues, we are exploring the future possibility of cinematic environments, ambient acoustic worlds, and interactive audio landscapes.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 & 5: What We're Building Toward */}
        <section className="vision-section">
          <div className="vision-card roadmap-card">
            <span className="eyebrow">ROADMAP & TRANSPARENCY</span>
            <h2>What We're Building Toward</h2>
            <p>
              RESONA is being developed progressively. Our initial focus is on perfecting immersive audio, spatial calibration, and interactive listening experiences through software in the browser.
            </p>
            <p>
              Our longer-term vision explores bringing these acoustic and visual experiences together with purpose-built immersive hardware. While dedicated hardware remains in early conceptual design and is not currently manufactured or available for purchase, each software milestone brings that unified experience closer to reality.
            </p>
          </div>
        </section>

        {/* Section 6: Closing */}
        <section className="vision-closing">
          <h2>“The future of listening could be a place you can step into.”</h2>
          <p>
            RESONA is an ongoing exploration of how sound, visuals, and interaction can come together to create a more immersive relationship with music.
          </p>
          <div className="closing-actions">
            <Link to="/" className="soft-btn primary large-btn" style={{ textDecoration: "none" }}>
              <Sparkles size={16} style={{ verticalAlign: -2 }} /> Enter the RESONA Listening Experience
            </Link>
          </div>
        </section>
      </main>

      <footer className="vision-footer">
        <div>
          <b>RESONA</b> · Listen closer
        </div>
        <small>© 2026 Resona Project by Adavit D. Exploration prototype.</small>
      </footer>
    </div>
  );
}
