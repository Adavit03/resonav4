import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useThree } from "@react-three/fiber";

function Controls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls>(null);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return (
    <primitive
      ref={controlsRef}
      object={new OrbitControls(camera, gl.domElement)}
      enableDamping
      dampingFactor={0.06}
      maxDistance={6.0}
      minDistance={1.6}
      enablePan={false}
      autoRotate
      autoRotateSpeed={0.8}
    />
  );
}

function HeadsetModel() {
  const gltf = useLoader(GLTFLoader, "/assets/resona/Models/Resona_VR_Headset_Concept.glb");

  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);

    clone.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.geometry.computeVertexNormals();

        const name = mesh.name;

        if (name.includes("Main_silver_visor_shell")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#dce2ea",
            metalness: 0.88,
            roughness: 0.24,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Obsidian_front_visor")) {
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: "#080a0e",
            metalness: 0.94,
            roughness: 0.07,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            reflectivity: 0.95,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Lower_shell_lip")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#252830",
            metalness: 0.75,
            roughness: 0.38,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Blue_status_light")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#00e5ff",
            emissive: new THREE.Color("#00e5ff"),
            emissiveIntensity: 3.5,
            roughness: 0.08,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Face_gasket") || name.includes("Nose_relief")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#15171b",
            roughness: 0.96,
            metalness: 0.02,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Side_hinge")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#c2c8d2",
            metalness: 0.92,
            roughness: 0.16,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Audio_cup_inner")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#121418",
            roughness: 0.94,
            metalness: 0.0,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Audio_cup")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#1b1d24",
            metalness: 0.7,
            roughness: 0.3,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Rear_headband") || name.includes("Top_support")) {
          if (name.includes("end")) {
            mesh.material = new THREE.MeshStandardMaterial({
              color: "#9aa2b0",
              metalness: 0.85,
              roughness: 0.22,
              side: THREE.DoubleSide,
            });
          } else {
            mesh.material = new THREE.MeshStandardMaterial({
              color: "#20242c",
              roughness: 0.75,
              metalness: 0.35,
              side: THREE.DoubleSide,
            });
          }
        } else if (name.includes("Resona_side_accent")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#d3bc91",
            metalness: 0.92,
            roughness: 0.18,
            side: THREE.DoubleSide,
          });
        } else if (name.includes("Vent")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#0f1115",
            roughness: 0.9,
            metalness: 0.2,
            side: THREE.DoubleSide,
          });
        }
      }
    });

    return clone;
  }, [gltf]);

  return (
    <group position={[0, -0.05, 0]}>
      <primitive object={model} />
    </group>
  );
}

export default function HeadsetViewer() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [2.5, 1.1, 2.3], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 5, 4]} intensity={3.5} />
        <directionalLight position={[-4, 3, -3]} color="#38bdf8" intensity={2.5} />
        <directionalLight position={[0, -2, 4]} color="#ffe8d0" intensity={1.5} />
        <directionalLight position={[0, 6, 0]} intensity={1.8} />

        <Suspense fallback={null}>
          <HeadsetModel />
          <Controls />
        </Suspense>
      </Canvas>
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10.5px",
          color: "#8e95a2",
          background: "rgba(15, 17, 21, 0.75)",
          backdropFilter: "blur(6px)",
          padding: "3px 10px",
          borderRadius: "999px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
