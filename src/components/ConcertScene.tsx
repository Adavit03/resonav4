import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { ViewKey, ResonaEngine } from "@/lib/audio-engine";

type LevelRef = MutableRefObject<number>;
type EngineRef = MutableRefObject<ResonaEngine | null> | undefined;

/**
 * 6 Calibrated listening position camera presets on the restored purple concert stage:
 * - room: Audience perspective (wide overview of stage, halo backdrop, and audience silhouettes)
 * - front: Center Stage front row view
 * - singer: Standing close at the central microphone
 * - guitar: Standing beside stage-left acoustic/electric guitar
 * - keyboard: Standing beside stage-right keyboard / synthesizer
 * - drums: Standing beside stage-right drum set and cymbal
 */
const CAMERA_PRESETS: Record<ViewKey, { p: [number, number, number]; t: [number, number, number] }> = {
  room: { p: [0, 5.6, 13.8], t: [0, 1.8, -1.7] },
  front: { p: [0, 4.0, 9.5], t: [0, 1.8, -1.8] },
  singer: { p: [0, 2.6, 2.8], t: [0, 1.55, -2.8] },
  guitar: { p: [-3.2, 2.4, 2.2], t: [-2.7, 1.25, -1.8] },
  keyboard: { p: [2.2, 2.4, 2.2], t: [1.9, 1.25, -1.8] },
  drums: { p: [3.8, 2.5, 2.2], t: [3.6, 1.35, -1.8] },
};

// Module-level reusable Vector3 instances to guarantee zero garbage collection in useFrame
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _camCurrentTarget = new THREE.Vector3(0, 1.8, -1.8);

/**
 * Damped exponential camera gliding between listening positions.
 */
function SmoothCameraRig({ view, yaw }: { view: ViewKey; yaw: number }) {
  const { camera } = useThree();
  const viewRef = useRef(view);
  viewRef.current = view;
  const yawRef = useRef(yaw);
  yawRef.current = yaw;

  useFrame((_, dt) => {
    const preset = CAMERA_PRESETS[viewRef.current] || CAMERA_PRESETS.front;
    const clampedDt = Math.min(dt, 0.1);
    const k = 1 - Math.exp(-clampedDt * 2.2);

    // Apply tilt/yaw smoothly
    _camGoalPos.set(
      preset.p[0] + Math.sin(yawRef.current) * 0.85,
      preset.p[1],
      preset.p[2] + Math.cos(yawRef.current) * 0.25 - 0.25
    );
    camera.position.lerp(_camGoalPos, k);

    _camGoalTarget.set(preset.t[0], preset.t[1], preset.t[2]);
    _camCurrentTarget.lerp(_camGoalTarget, k);
    camera.lookAt(_camCurrentTarget);
  });

  return null;
}

/**
 * Center Microphone Graphics on Stage Floor (matching reference design):
 * Base at Y = 0.22, thin vertical chrome stand, angled studio capsule.
 */
function MicrophoneStand({ level }: { level: number }) {
  return (
    <group position={[0, 0.22, -2.8]}>
      {/* Heavy round cast iron base */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.03, 24]} />
        <meshStandardMaterial color="#22242c" roughness={0.65} metalness={0.7} />
      </mesh>

      {/* Upright chrome shaft */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 1.42, 16]} />
        <meshStandardMaterial color="#c2c7d0" roughness={0.2} metalness={0.88} />
      </mesh>

      {/* Height adjustment clutch ring */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.05, 16]} />
        <meshStandardMaterial color="#181920" roughness={0.7} />
      </mesh>

      {/* Boom joint connector */}
      <mesh position={[0, 1.44, 0]}>
        <sphereGeometry args={[0.026, 12, 12]} />
        <meshStandardMaterial color="#353945" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Angled Microphone Clip & Capsule */}
      <group position={[0, 1.48, 0.06]} rotation={[-0.32, 0, 0]}>
        {/* Black mic body */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.022, 0.018, 0.1, 16]} />
          <meshStandardMaterial color="#1a1c22" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Silver wire mesh grille */}
        <mesh position={[0, 0.115, 0]}>
          <sphereGeometry args={[0.024, 16, 14]} />
          <meshStandardMaterial
            color="#d8dde6"
            emissive="#b8b5e9"
            emissiveIntensity={0.2 + level * 0.4}
            roughness={0.3}
            metalness={0.85}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Stage-Left Acoustic Guitar on Stand (matching reference design):
 * Warm acoustic amber body, soundhole, neck, headstock, tuning pegs, and stand.
 */
function GuitarStand({ level }: { level: number }) {
  return (
    <group position={[-2.7, 0.22, -1.8]}>
      {/* Guitar Tripod Stand */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 16]} />
          <meshStandardMaterial color="#1e2026" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.45, -0.06]}>
          <cylinderGeometry args={[0.014, 0.014, 0.88, 12]} />
          <meshStandardMaterial color="#1a1b22" roughness={0.7} metalness={0.5} />
        </mesh>
      </group>

      {/* Upright Acoustic Guitar tilted slightly back into stand */}
      <group position={[0, 0.05, 0]} rotation={[0.08, 0.25, 0]}>
        {/* Lower Bout (curved body) */}
        <mesh position={[0, 0.42, 0]} scale={[1, 1.15, 0.4]}>
          <sphereGeometry args={[0.38, 24, 20]} />
          <meshStandardMaterial
            color="#b35a27"
            emissive="#632d12"
            emissiveIntensity={0.15 + level * 0.25}
            roughness={0.36}
            metalness={0.08}
          />
        </mesh>

        {/* Upper Bout */}
        <mesh position={[0, 0.78, 0]} scale={[1, 1.05, 0.36]}>
          <sphereGeometry args={[0.3, 24, 20]} />
          <meshStandardMaterial
            color="#ba622d"
            emissive="#632d12"
            emissiveIntensity={0.15 + level * 0.25}
            roughness={0.36}
            metalness={0.08}
          />
        </mesh>

        {/* Dark Soundhole */}
        <mesh position={[0, 0.72, 0.145]}>
          <circleGeometry args={[0.08, 24]} />
          <meshBasicMaterial color="#120e0c" />
        </mesh>

        {/* Soundhole decorative rosette ring */}
        <mesh position={[0, 0.72, 0.146]}>
          <ringGeometry args={[0.082, 0.098, 24]} />
          <meshBasicMaterial color="#f0d0aa" />
        </mesh>

        {/* Bridge */}
        <mesh position={[0, 0.38, 0.155]}>
          <boxGeometry args={[0.18, 0.035, 0.02]} />
          <meshStandardMaterial color="#201511" roughness={0.7} />
        </mesh>

        {/* Maple Wood Neck */}
        <mesh position={[0, 1.28, 0.04]}>
          <boxGeometry args={[0.065, 0.76, 0.035]} />
          <meshStandardMaterial color="#dfb889" roughness={0.4} />
        </mesh>

        {/* Rosewood Fretboard & Frets */}
        <mesh position={[0, 1.28, 0.06]}>
          <boxGeometry args={[0.06, 0.75, 0.01]} />
          <meshStandardMaterial color="#2d221c" roughness={0.6} />
        </mesh>

        {/* Headstock at top */}
        <mesh position={[0, 1.72, 0.04]}>
          <boxGeometry args={[0.085, 0.16, 0.03]} />
          <meshStandardMaterial color="#964b22" roughness={0.45} />
        </mesh>

        {/* Silver Tuning Pegs */}
        {[-0.05, 0.05].map((x, xi) =>
          [1.67, 1.72, 1.77].map((y, yi) => (
            <mesh key={`${xi}-${yi}`} position={[x, y, 0.04]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
            </mesh>
          ))
        )}

        {/* Strings (Silver Lines) */}
        {[-0.02, -0.012, -0.004, 0.004, 0.012, 0.02].map((sx, i) => (
          <mesh key={i} position={[sx, 0.98, 0.065]}>
            <boxGeometry args={[0.0018, 1.22, 0.0018]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Stage-Right Electronic Keyboard / Synthesizer (matching reference design):
 * Matte black stand, keyboard chassis, glowing cyan display, white and black keys.
 */
function KeyboardStand({ level }: { level: number }) {
  // Generate white keys (arrayed along the keyboard)
  const whiteKeys = useMemo(() => {
    const keys = [];
    const count = 28;
    const keyWidth = 0.044;
    const startX = -((count - 1) * keyWidth) / 2;
    for (let i = 0; i < count; i++) {
      keys.push(startX + i * keyWidth);
    }
    return keys;
  }, []);

  // Generate black keys (realistic 2-3 piano pattern)
  const blackKeys = useMemo(() => {
    const keys: number[] = [];
    const pattern = [true, true, false, true, true, true, false]; // C#, D#, skip, F#, G#, A#, skip
    const count = 28;
    const keyWidth = 0.044;
    const startX = -((count - 1) * keyWidth) / 2;
    for (let i = 0; i < count - 1; i++) {
      if (pattern[i % 7]) {
        keys.push(startX + i * keyWidth + keyWidth / 2);
      }
    }
    return keys;
  }, []);

  return (
    <group position={[1.9, 0.22, -1.8]}>
      {/* Matte Black Dual Support Stand */}
      <group position={[0, 0, 0]}>
        {/* Left and Right Vertical Legs */}
        <mesh position={[-0.62, 0.4, 0]}>
          <boxGeometry args={[0.04, 0.8, 0.38]} />
          <meshStandardMaterial color="#1a1c24" roughness={0.7} metalness={0.4} />
        </mesh>
        <mesh position={[0.62, 0.4, 0]}>
          <boxGeometry args={[0.04, 0.8, 0.38]} />
          <meshStandardMaterial color="#1a1c24" roughness={0.7} metalness={0.4} />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.28, 0.035, 0.035]} />
          <meshStandardMaterial color="#1a1c24" roughness={0.7} metalness={0.4} />
        </mesh>
      </group>

      {/* Main Keyboard Chassis */}
      <group position={[0, 0.82, 0]}>
        {/* Body Casing */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.56, 0.1, 0.44]} />
          <meshStandardMaterial color="#161820" roughness={0.45} metalness={0.3} />
        </mesh>

        {/* Glowing Cyan Synth LED Screen / Status Bar */}
        <mesh position={[0, 0.052, -0.12]}>
          <boxGeometry args={[0.26, 0.005, 0.08]} />
          <meshStandardMaterial
            color="#4897bc"
            emissive="#50b8e0"
            emissiveIntensity={0.8 + level * 1.5}
            roughness={0.2}
          />
        </mesh>

        {/* Knobs / Control Sliders */}
        {[-0.45, -0.38, -0.31, 0.31, 0.38, 0.45].map((kx, i) => (
          <mesh key={i} position={[kx, 0.055, -0.12]}>
            <cylinderGeometry args={[0.016, 0.016, 0.018, 12]} />
            <meshStandardMaterial color="#353844" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}

        {/* Keybed Recess */}
        <mesh position={[0, 0.035, 0.08]}>
          <boxGeometry args={[1.38, 0.02, 0.25]} />
          <meshStandardMaterial color="#0d0e12" roughness={0.8} />
        </mesh>

        {/* White Keys */}
        {whiteKeys.map((x, i) => (
          <mesh key={`w-${i}`} position={[x, 0.055, 0.09]}>
            <boxGeometry args={[0.038, 0.024, 0.22]} />
            <meshStandardMaterial color="#f8f7f2" roughness={0.3} metalness={0.05} />
          </mesh>
        ))}

        {/* Black Keys */}
        {blackKeys.map((x, i) => (
          <mesh key={`b-${i}`} position={[x, 0.075, 0.05]}>
            <boxGeometry args={[0.022, 0.03, 0.13]} />
            <meshStandardMaterial color="#121318" roughness={0.35} metalness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Stage-Right Drum Set (matching reference design):
 * Blue cylindrical drum shell, chrome hoops/lugs, parchment head, and brass cymbal on stand.
 */
function DrumSet({ level }: { level: number }) {
  return (
    <group position={[3.6, 0.22, -1.8]}>
      {/* 1. Main Drum (Deep Blue Metallic Shell) */}
      <group position={[0, 0, 0]}>
        {/* Wooden / Chrome Tripod Legs for Drum */}
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.28, 12]} />
          <meshStandardMaterial color="#2b2d36" roughness={0.5} metalness={0.7} />
        </mesh>

        {/* Blue Cylindrical Drum Shell */}
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.48, 32]} />
          <meshStandardMaterial
            color="#3b5998"
            emissive="#1e2c4d"
            emissiveIntensity={0.25 + level * 0.4}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>

        {/* Top Chrome Hoop / Rim */}
        <mesh position={[0, 0.68, 0]}>
          <torusGeometry args={[0.425, 0.016, 12, 36]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Bottom Chrome Hoop / Rim */}
        <mesh position={[0, 0.2, 0]}>
          <torusGeometry args={[0.425, 0.016, 12, 36]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* White / Cream Drum Head (Battered Surface) */}
        <mesh position={[0, 0.675, 0]}>
          <cylinderGeometry args={[0.41, 0.41, 0.008, 32]} />
          <meshStandardMaterial color="#f5f0e6" roughness={0.5} />
        </mesh>

        {/* Chrome Tuning Lugs */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.43, 0.44, Math.sin(angle) * 0.43]}
            >
              <boxGeometry args={[0.025, 0.28, 0.03]} />
              <meshStandardMaterial color="#e0e5ed" metalness={0.9} roughness={0.2} />
            </mesh>
          );
        })}
      </group>

      {/* 2. Elevated Brass Crash Cymbal on Stand */}
      <group position={[0.55, 0, 0.28]}>
        {/* Chrome Stand Pole */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.1, 16]} />
          <meshStandardMaterial color="#d4d8e0" metalness={0.88} roughness={0.18} />
        </mesh>

        {/* Tilter Joint */}
        <mesh position={[0, 1.08, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshStandardMaterial color="#2d3038" roughness={0.5} metalness={0.6} />
        </mesh>

        {/* Golden Brass Cymbal Disc (tilted slightly towards drummer) */}
        <group position={[0, 1.1, 0]} rotation={[0.22, 0.15, -0.1]}>
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.012, 36]} />
            <meshStandardMaterial
              color="#dfba75"
              emissive="#c5a059"
              emissiveIntensity={0.35 + level * 0.6}
              metalness={0.85}
              roughness={0.18}
            />
          </mesh>
          {/* Center Bell of Cymbal */}
          <mesh position={[0, 0.012, 0]}>
            <sphereGeometry args={[0.075, 16, 12]} />
            <meshStandardMaterial
              color="#eed18e"
              emissive="#c5a059"
              emissiveIntensity={0.4 + level * 0.6}
              metalness={0.9}
              roughness={0.15}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * The Restored Purple Concert Room Scene Rig:
 * Faithfully incorporates the complete purple atmospheric design from the reference screenshot:
 * - Circular purple backdrop
 * - Concentric illuminated lavender, gold and cyan rings
 * - Deep purple wall with 84 stars
 * - 5 Overhead spotlights with translucent volumetric beams
 * - Dark stage deck with circular glowing boundary
 * - 9 Vertical pulsating light ribbons
 * - 46 Ambient stage particles
 * - 15 Foreground audience silhouettes
 * - Original instrument graphics (microphone, guitar, keyboard, drum set)
 */
function PurpleConcertStageRig({
  view,
  levelRef,
  yaw,
}: {
  view: ViewKey;
  levelRef: LevelRef;
  yaw: number;
}) {
  const beams = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const ribbons = useRef<THREE.Mesh[]>([]);
  const particles = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const level = levelRef.current || 0;

    // Gentle ceiling spotlight rig sway
    if (beams.current) {
      beams.current.rotation.y = Math.sin(t * 0.19) * 0.08;
    }

    // Breathing aura pulsation of central purple backdrop halo
    if (halo.current) {
      halo.current.rotation.z = Math.sin(t * 0.12) * 0.025;
      const aura = 1 + Math.sin(t * 0.48) * 0.025 + level * 0.075;
      halo.current.scale.setScalar(aura);
    }

    // 9 Vertical pulsating light ribbons
    if (ribbons.current.length) {
      ribbons.current.forEach((m, i) => {
        if (m) {
          const h = 1 + Math.abs(Math.sin(t * 0.72 + i * 0.62)) * 0.75 + level * (0.65 + (i % 3) * 0.2);
          m.scale.y = h;
          m.position.y = 0.22 + h * 0.5;
        }
      });
    }

    // Floating ambient stardust particles
    if (particles.current) {
      particles.current.rotation.y = t * 0.025;
    }
  });

  const level = levelRef.current || 0;

  return (
    <>
      {/* Dark Cinematic Purple Atmosphere */}
      <color attach="background" args={["#080912"]} />
      <fog attach="fog" args={["#080912", 18, 38]} />

      {/* Balanced Lighting */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#b8b5e9", "#11121e", 0.75]} />
      <directionalLight position={[-4, 8, 6]} intensity={0.65} color="#d7d4ff" />
      <pointLight position={[0, 3.2, -3.5]} intensity={5 + level * 5} distance={17} color="#aa79ff" />
      <pointLight position={[-4, 2, 0]} intensity={1.8} distance={9} color="#e49dca" />
      <pointLight position={[4, 2, -1]} intensity={1.8} distance={9} color="#78c9e9" />

      {/* Ground Floor Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#080a12" roughness={0.3} metalness={0.28} />
      </mesh>

      {/* Deep Purple Backdrop Wall */}
      <mesh position={[0, 3.25, -5.3]}>
        <boxGeometry args={[12.5, 7, 0.35]} />
        <meshBasicMaterial color="#17152b" />
      </mesh>

      {/* 84 Star Dots Scattered Across Backdrop */}
      {Array.from({ length: 84 }, (_, i) => (
        <mesh
          key={i}
          position={[-5.5 + (i % 12) * 1, 0.65 + Math.floor(i / 12) * 0.73, -5.08]}
        >
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial
            color={i % 4 === 0 ? "#f0d0aa" : "#c2a6ff"}
            transparent
            opacity={0.62 + level * 0.15}
          />
        </mesh>
      ))}

      {/* The Iconic Concentric Halo Rings & Glowing Sphere */}
      <group ref={halo} position={[0, 3.1, -4.95]}>
        {/* Central purple glowing sphere */}
        <mesh>
          <sphereGeometry args={[1.78, 48, 32]} />
          <meshBasicMaterial
            color="#7954ed"
            transparent
            opacity={0.42 + level * 0.12}
            depthWrite={false}
          />
        </mesh>
        {/* Outer illuminated lavender ring */}
        <mesh>
          <torusGeometry args={[2.28, 0.055, 14, 100]} />
          <meshStandardMaterial
            color="#cbb5ff"
            emissive="#8859e9"
            emissiveIntensity={1.8 + level * 2.2}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
        {/* Middle illuminated peach/gold ring */}
        <mesh rotation={[0, 0, 0.38]}>
          <torusGeometry args={[1.92, 0.025, 10, 96]} />
          <meshStandardMaterial
            color="#f5cf9b"
            emissive="#f5b980"
            emissiveIntensity={0.9 + level}
          />
        </mesh>
        {/* Inner illuminated cyan ring */}
        <mesh rotation={[0, 0, -0.27]}>
          <torusGeometry args={[1.56, 0.018, 10, 96]} />
          <meshStandardMaterial
            color="#7cd5e2"
            emissive="#4897bc"
            emissiveIntensity={0.8 + level}
          />
        </mesh>
      </group>

      {/* 5 Overhead Ceiling Spotlight Fixtures & Translucent Beams */}
      <group ref={beams}>
        {[-4.4, -2.2, 0, 2.2, 4.4].map((x, i) => (
          <group key={x}>
            {/* Fixture box housing */}
            <mesh position={[x, 5.7, -4.4]}>
              <boxGeometry args={[0.48, 0.12, 0.25]} />
              <meshStandardMaterial
                color="#e9e2ff"
                emissive={i % 2 ? "#a479ed" : "#edbd8b"}
                emissiveIntensity={1.2 + level * 2}
              />
            </mesh>
            {/* Real spotlight hitting stage floor */}
            <spotLight
              position={[x, 5.5, -4.2]}
              target-position={[x * 0.55, 0.2, -0.5]}
              angle={0.38}
              penumbra={0.88}
              intensity={i === 2 ? 14 + level * 14 : 8 + level * 10}
              color={i % 2 ? "#a377ec" : "#efbb91"}
              distance={15}
            />
            {/* Volumetric downward light cone */}
            <mesh
              position={[x * 0.67, 2.7, -2.3]}
              rotation={[0.1, 0, -x * 0.025]}
            >
              <coneGeometry args={[0.78, 5.5, 24, 1, true]} />
              <meshBasicMaterial
                color={i % 2 ? "#9870ec" : "#f0bc99"}
                transparent
                opacity={0.035 + level * 0.018}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Dark Elegant Concert Stage Deck */}
      <mesh position={[0, 0.04, -1.65]} receiveShadow castShadow>
        <boxGeometry args={[11.8, 0.34, 5.7]} />
        <meshStandardMaterial color="#171a27" roughness={0.34} metalness={0.32} />
      </mesh>

      {/* Circular Glowing Stage Boundary Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.225, -1.65]}>
        <ringGeometry args={[4.3, 4.36, 96]} />
        <meshBasicMaterial color="#d4b7ff" transparent opacity={0.72 + level * 0.2} />
      </mesh>

      {/* 9 Vertical Pulsating Light Ribbons (Equalizer Bars) */}
      <group>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              if (m) ribbons.current[i] = m;
            }}
            position={[-4 + (i % 9), 1, -1.3]}
          >
            <boxGeometry args={[0.065, 1, 0.06]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? "#f1bf9d" : i % 3 === 1 ? "#b997ff" : "#8bd4e2"}
              emissive={i % 3 === 0 ? "#a9688d" : i % 3 === 1 ? "#7146bd" : "#3c94ad"}
              emissiveIntensity={1.1 + level * 3}
              transparent
              opacity={0.82}
            />
          </mesh>
        ))}
      </group>

      {/* 46 Drifting Ambient Stage Particles */}
      <group ref={particles}>
        {Array.from({ length: 46 }, (_, i) => {
          const x = Math.sin(i * 91.7) * 5.1;
          const y = 0.6 + ((i * 37) % 47) / 10;
          const z = -4.4 + Math.sin(i * 17.3) * 2.1;
          return (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.018 + (i % 4) * 0.004, 8, 8]} />
              <meshBasicMaterial
                color={i % 3 === 0 ? "#eacbff" : i % 3 === 1 ? "#9cdbf4" : "#f0c396"}
                transparent
                opacity={0.35 + level * 0.3}
              />
            </mesh>
          );
        })}
      </group>

      {/* Original Instrument Graphics (No GLB mannequins) */}
      <MicrophoneStand level={level} />
      <GuitarStand level={level} />
      <KeyboardStand level={level} />
      <DrumSet level={level} />

      {/* 15 Audience Silhouettes in the Foreground Pit */}
      {Array.from({ length: 15 }, (_, i) => {
        const x = (i - 7) * 0.48;
        const z = 3.25 + (i % 3) * 0.42;
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Head */}
            <mesh position={[0, 0.58, 0]} scale={[1, 0.85, 1]}>
              <sphereGeometry args={[0.2, 12, 10]} />
              <meshStandardMaterial color="#131620" roughness={1} />
            </mesh>
            {/* Torso Capsule */}
            <mesh position={[0, 0.18, 0]}>
              <capsuleGeometry args={[0.21, 0.48, 3, 8]} />
              <meshStandardMaterial color="#10121b" roughness={1} />
            </mesh>
          </group>
        );
      })}

      {/* Smooth Camera Navigation Rig */}
      <SmoothCameraRig view={view} yaw={yaw} />
    </>
  );
}

export default function ConcertScene({
  view,
  levelRef,
  yaw,
  low = false,
}: {
  view: ViewKey;
  levelRef: LevelRef;
  yaw: number;
  low?: boolean;
  mode?: string;
  engineRef?: EngineRef;
}) {
  return (
    <Canvas
      className="concert-canvas"
      fallback={
        <div className="concert-fallback" aria-label="Restored purple concert room">
          <span />
          <span />
          <span />
          <b>RESONA · CONCERT ROOM</b>
        </div>
      }
      camera={{ position: [0, 5.6, 13.8], fov: 42 }}
      dpr={low ? [0.8, 1.0] : [1.0, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
    >
      <PurpleConcertStageRig view={view} levelRef={levelRef} yaw={yaw} />
    </Canvas>
  );
}
