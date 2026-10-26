import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { ResonaEngine } from "@/lib/audio-engine";

type LevelRef = MutableRefObject<number>;
type EngineRef = MutableRefObject<ResonaEngine | null> | undefined;

interface SphereProps {
  mode: "focus" | "lyrics";
  levelRef: LevelRef;
  engineRef?: EngineRef;
  low?: boolean;
}

// Preallocated reusable Three.js objects to guarantee zero GC allocations in useFrame
const _tempVec = new THREE.Vector3();

function SphereScene({
  mode,
  levelRef,
  engineRef,
}: {
  mode: "focus" | "lyrics";
  levelRef: LevelRef;
  engineRef?: EngineRef;
}) {
  const isLyrics = mode === "lyrics";
  const isFocus = mode === "focus";

  // Visual component refs
  const coreMesh = useRef<THREE.Mesh>(null);
  const glowMesh = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const ring3Ref = useRef<THREE.Group>(null);
  const beads1Ref = useRef<THREE.Group>(null);
  const beads2Ref = useRef<THREE.Group>(null);
  const beads3Ref = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Materials refs for audio-reactive intensity
  const coreMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const ring1MatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ring2MatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ring3MatRef = useRef<THREE.MeshStandardMaterial>(null);
  const particleMatRef = useRef<THREE.PointsMaterial>(null);

  // Particle positions
  const particlePositions = useMemo(() => {
    const count = 96;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.9 + Math.random() * 1.5;
      const sinPhi = Math.sin(phi);
      pos[i * 3] = r * sinPhi * Math.cos(theta);
      pos[i * 3 + 1] = r * sinPhi * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const clampedDt = Math.min(dt, 0.1);

    // Audio frequency bands
    let bass = 0;
    let mid = 0;
    let high = 0;
    let overall = levelRef.current || 0;

    if (engineRef?.current) {
      const bands = engineRef.current.audioBands();
      bass = bands.bass;
      mid = bands.mid;
      high = bands.high;
      overall = Math.max(overall, bands.overall);
    } else {
      bass = overall * 0.9;
      mid = overall * 0.7;
      high = overall * 0.5;
    }

    const motionScale = isFocus ? 0.65 : 0.85;
    const speedMult = isFocus ? 0.7 : 1.0;

    // 1. Central Core Sphere - Gentle Bass Breathing & Surface Motion
    if (coreMesh.current) {
      // Natural organic breath even when paused
      const idlePulse = Math.sin(t * 1.2 * speedMult) * 0.035;
      const audioExpansion = bass * 0.18 + overall * 0.08;
      const s = 1.0 + idlePulse + audioExpansion * motionScale;
      coreMesh.current.scale.set(s, s, s);

      // Subtle surface rotation driven by midrange
      coreMesh.current.rotation.y += clampedDt * (0.2 + mid * 0.4) * speedMult;
      coreMesh.current.rotation.x = Math.sin(t * 0.4) * 0.08;
    }

    // Dynamic core material response
    if (coreMatRef.current) {
      coreMatRef.current.emissiveIntensity = (0.35 + bass * 0.75 + overall * 0.4) * motionScale;
      coreMatRef.current.roughness = 0.22 - overall * 0.08;
    }

    // Outer subtle translucent aura
    if (glowMesh.current) {
      const gs = 1.35 + Math.sin(t * 1.6) * 0.04 + bass * 0.2;
      glowMesh.current.scale.set(gs, gs, gs);
    }

    // 2. Three Intersecting Orbital Rings
    // Ring 1 (Lavender): tilt ~25 deg
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += clampedDt * (0.32 + mid * 0.3) * speedMult;
      ring1Ref.current.rotation.x = 0.42 + Math.sin(t * 0.5) * 0.06;
    }
    if (ring1MatRef.current) {
      ring1MatRef.current.emissiveIntensity = 1.2 + high * 1.8 + overall * 0.6;
    }

    // Ring 2 (Warm Peach / Gold): tilt ~-38 deg
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= clampedDt * (0.24 + bass * 0.25) * speedMult;
      ring2Ref.current.rotation.y = -0.62 + Math.cos(t * 0.4) * 0.08;
    }
    if (ring2MatRef.current) {
      ring2MatRef.current.emissiveIntensity = 1.0 + mid * 1.6 + overall * 0.5;
    }

    // Ring 3 (Ethereal Cyan / Violet): tilt ~58 deg
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y += clampedDt * (0.28 + high * 0.35) * speedMult;
      ring3Ref.current.rotation.z = 0.85 + Math.sin(t * 0.6) * 0.08;
    }
    if (ring3MatRef.current) {
      ring3MatRef.current.emissiveIntensity = 0.9 + high * 1.5 + overall * 0.5;
    }

    // 3. Orbiting Beads along rings
    const beadSpeed = (0.8 + overall * 1.2) * speedMult;
    const a1 = t * beadSpeed;
    const r1 = 1.95;
    if (beads1Ref.current && beads1Ref.current.children.length >= 2) {
      beads1Ref.current.children[0].position.set(Math.cos(a1) * r1, Math.sin(a1) * r1, 0);
      beads1Ref.current.children[1].position.set(Math.cos(a1 + Math.PI) * r1, Math.sin(a1 + Math.PI) * r1, 0);
    }

    const a2 = -t * (beadSpeed * 0.75);
    const r2 = 2.4;
    if (beads2Ref.current && beads2Ref.current.children.length >= 2) {
      beads2Ref.current.children[0].position.set(Math.cos(a2) * r2, Math.sin(a2) * r2, 0);
      beads2Ref.current.children[1].position.set(Math.cos(a2 + Math.PI) * r2, Math.sin(a2 + Math.PI) * r2, 0);
    }

    const a3 = t * (beadSpeed * 0.9);
    const r3 = 2.85;
    if (beads3Ref.current && beads3Ref.current.children.length >= 2) {
      beads3Ref.current.children[0].position.set(Math.cos(a3) * r3, 0, Math.sin(a3) * r3);
      beads3Ref.current.children[1].position.set(Math.cos(a3 + Math.PI) * r3, 0, Math.sin(a3 + Math.PI) * r3);
    }

    // 4. Stardust Particle Cloud (sparkles with high frequency energy)
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.035 * speedMult;
      particlesRef.current.rotation.x = Math.sin(t * 0.02) * 0.05;
    }
    if (particleMatRef.current) {
      particleMatRef.current.opacity = 0.35 + high * 0.45 + overall * 0.2;
    }
  });

  return (
    <>
      <color attach="background" args={["#080912"]} />
      <fog attach="fog" args={["#080912", 12, 30]} />

      {/* Balanced Studio Lighting */}
      <ambientLight intensity={0.65} color="#b4a8d8" />
      <pointLight position={[0, 4, 4]} intensity={4.5} distance={16} color="#d4c2fd" />
      <pointLight position={[-4, -2, -2]} intensity={2.8} distance={14} color="#f5d0a9" />
      <pointLight position={[4, -1, 3]} intensity={3.2} distance={14} color="#7cd5e2" />

      {/* Sphere Group - In Lyrics mode, softly pulled back so lyrics are front and center */}
      <group position={[0, isLyrics ? -0.15 : 0, isLyrics ? -1.0 : 0]}>
        {/* Central Iridescent Physical Core Sphere */}
        <mesh ref={coreMesh}>
          <sphereGeometry args={[1.2, 48, 48]} />
          <meshPhysicalMaterial
            ref={coreMatRef}
            color="#1c1332"
            emissive="#5c389e"
            emissiveIntensity={0.4}
            roughness={0.18}
            metalness={0.25}
            clearcoat={0.9}
            clearcoatRoughness={0.12}
            transmission={0.28}
            ior={1.48}
            transparent={isLyrics}
            opacity={isLyrics ? 0.75 : 1.0}
          />
        </mesh>

        {/* Soft Translucent Aura Glow */}
        <mesh ref={glowMesh}>
          <sphereGeometry args={[1.35, 32, 32]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.14} depthWrite={false} />
        </mesh>

        {/* Ring 1 - Lavender / Purple with beads */}
        <group ref={ring1Ref}>
          <mesh>
            <torusGeometry args={[1.95, 0.018, 16, 120]} />
            <meshStandardMaterial
              ref={ring1MatRef}
              color="#e0d4fc"
              emissive="#a78bfa"
              emissiveIntensity={1.4}
              roughness={0.25}
              metalness={0.4}
            />
          </mesh>
          <group ref={beads1Ref}>
            <mesh>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshBasicMaterial color="#c4b5fd" />
            </mesh>
          </group>
        </group>

        {/* Ring 2 - Warm Gold / Peach with beads */}
        <group ref={ring2Ref}>
          <mesh>
            <torusGeometry args={[2.4, 0.015, 16, 120]} />
            <meshStandardMaterial
              ref={ring2MatRef}
              color="#ffeedb"
              emissive="#f5b980"
              emissiveIntensity={1.2}
              roughness={0.25}
              metalness={0.45}
            />
          </mesh>
          <group ref={beads2Ref}>
            <mesh>
              <sphereGeometry args={[0.048, 16, 16]} />
              <meshBasicMaterial color="#fff4e0" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshBasicMaterial color="#f5d0a9" />
            </mesh>
          </group>
        </group>

        {/* Ring 3 - Ethereal Cyan / Violet with beads */}
        <group ref={ring3Ref}>
          <mesh>
            <torusGeometry args={[2.85, 0.013, 16, 120]} />
            <meshStandardMaterial
              ref={ring3MatRef}
              color="#cff6fc"
              emissive="#59bad1"
              emissiveIntensity={1.1}
              roughness={0.22}
              metalness={0.4}
            />
          </mesh>
          <group ref={beads3Ref}>
            <mesh>
              <sphereGeometry args={[0.044, 16, 16]} />
              <meshBasicMaterial color="#e0f8ff" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial color="#7cd5e2" />
            </mesh>
          </group>
        </group>

        {/* Delicate Stardust Particle Cloud */}
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particlePositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={particleMatRef}
            size={0.038}
            color="#d8c5fc"
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </>
  );
}

export default function AudioReactiveSphere({
  mode,
  levelRef,
  engineRef,
  low = false,
}: SphereProps) {
  const isLyrics = mode === "lyrics";

  return (
    <Canvas
      className="concert-canvas"
      camera={{ position: [0, 0, isLyrics ? 6.8 : 5.6], fov: 44 }}
      dpr={low ? [0.8, 1.0] : [1.0, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
    >
      <SphereScene mode={mode} levelRef={levelRef} engineRef={engineRef} />
    </Canvas>
  );
}
