"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  RotateCw,
  Scan,
  Info,
  Play,
  Pause,
} from "lucide-react";
import {
  AnatomicalMuscle,
  DetailedMuscleStat,
  MuscleTimeframe,
} from "@/lib/muscle-engine";
import { haptics } from "@/lib/haptics";

interface ThreeMuscleViewerProps {
  muscleStats: Record<AnatomicalMuscle, DetailedMuscleStat>;
  timeframe: MuscleTimeframe;
  onTimeframeChange?: (timeframe: MuscleTimeframe) => void;
  className?: string;
}

// 3D Centroids for each anatomical muscle in model coordinates (model oriented with +X=front, +Z=right, Y=up)
// In model local space before rotation:
interface MuscleCentroid {
  muscle: AnatomicalMuscle;
  x: number; // Front (+) / Back (-)
  y: number; // Height (-0.5 to +0.5)
  z: number; // Left (-) / Right (+)
  radius: number;
}

const MUSCLE_CENTROIDS: MuscleCentroid[] = [
  // CHEST (Pectorales)
  { muscle: "chest", x: 0.045, y: 0.17, z: -0.042, radius: 0.065 },
  { muscle: "chest", x: 0.045, y: 0.17, z: 0.042, radius: 0.065 },

  // DELTOIDS ANTERIOR
  { muscle: "deltoids_ant", x: 0.032, y: 0.23, z: -0.095, radius: 0.05 },
  { muscle: "deltoids_ant", x: 0.032, y: 0.23, z: 0.095, radius: 0.05 },

  // DELTOIDS LATERAL
  { muscle: "deltoids_lat", x: 0.0, y: 0.23, z: -0.13, radius: 0.05 },
  { muscle: "deltoids_lat", x: 0.0, y: 0.23, z: 0.13, radius: 0.05 },

  // DELTOIDS POSTERIOR
  { muscle: "deltoids_post", x: -0.035, y: 0.22, z: -0.095, radius: 0.05 },
  { muscle: "deltoids_post", x: -0.035, y: 0.22, z: 0.095, radius: 0.05 },

  // BICEPS
  { muscle: "biceps", x: 0.02, y: 0.12, z: -0.125, radius: 0.055 },
  { muscle: "biceps", x: 0.02, y: 0.12, z: 0.125, radius: 0.055 },

  // TRICEPS
  { muscle: "triceps", x: -0.028, y: 0.12, z: -0.125, radius: 0.055 },
  { muscle: "triceps", x: -0.028, y: 0.12, z: 0.125, radius: 0.055 },

  // FOREARMS
  { muscle: "forearms", x: 0.005, y: -0.04, z: -0.135, radius: 0.06 },
  { muscle: "forearms", x: 0.005, y: -0.04, z: 0.135, radius: 0.06 },

  // ABS (Rectus Abdominis)
  { muscle: "abs", x: 0.045, y: 0.06, z: 0.0, radius: 0.07 },
  { muscle: "abs", x: 0.045, y: -0.01, z: 0.0, radius: 0.06 },

  // OBLIQUES
  { muscle: "obliques", x: 0.03, y: 0.04, z: -0.065, radius: 0.055 },
  { muscle: "obliques", x: 0.03, y: 0.04, z: 0.065, radius: 0.055 },

  // TRAPEZIUS
  { muscle: "traps", x: -0.032, y: 0.26, z: 0.0, radius: 0.075 },
  { muscle: "traps", x: -0.038, y: 0.18, z: 0.0, radius: 0.06 },

  // LATS (Dorsales)
  { muscle: "lats", x: -0.038, y: 0.12, z: -0.065, radius: 0.065 },
  { muscle: "lats", x: -0.038, y: 0.12, z: 0.065, radius: 0.065 },

  // LOWER BACK (Lumbares)
  { muscle: "lower_back", x: -0.038, y: 0.02, z: 0.0, radius: 0.06 },

  // GLUTES (Glúteos)
  { muscle: "glutes", x: -0.042, y: -0.11, z: -0.045, radius: 0.075 },
  { muscle: "glutes", x: -0.042, y: -0.11, z: 0.045, radius: 0.075 },

  // QUADS (Cuádriceps)
  { muscle: "quads", x: 0.038, y: -0.25, z: -0.052, radius: 0.08 },
  { muscle: "quads", x: 0.038, y: -0.25, z: 0.052, radius: 0.08 },
  { muscle: "quads", x: 0.032, y: -0.34, z: -0.048, radius: 0.06 }, // Vastus medialis
  { muscle: "quads", x: 0.032, y: -0.34, z: 0.048, radius: 0.06 },

  // HAMSTRINGS (Isquiosurales)
  { muscle: "hamstrings", x: -0.035, y: -0.26, z: -0.052, radius: 0.08 },
  { muscle: "hamstrings", x: -0.035, y: -0.26, z: 0.052, radius: 0.08 },

  // CALVES (Gemelos & Sóleo)
  { muscle: "calves", x: -0.015, y: -0.42, z: -0.052, radius: 0.065 },
  { muscle: "calves", x: -0.015, y: -0.42, z: 0.052, radius: 0.065 },
  { muscle: "calves", x: 0.015, y: -0.42, z: -0.052, radius: 0.055 }, // Tibialis anterior
  { muscle: "calves", x: 0.015, y: -0.42, z: 0.052, radius: 0.055 },
];

// Color definitions for heatmap
const HEATMAP_COLORS = {
  inactive: new THREE.Color(0x1a2333),
  light: new THREE.Color(0x00e1ff),
  moderate: new THREE.Color(0x00ff9d),
  high: new THREE.Color(0x39ff14),
  peak: new THREE.Color(0xffbb00),
  selected: new THREE.Color(0x00ffff),
};

export default function ThreeMuscleViewer({
  muscleStats,
  timeframe,
  onTimeframeChange,
  className = "",
}: ThreeMuscleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedMuscle, setSelectedMuscle] = useState<AnatomicalMuscle | null>("chest");
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // References to three objects for runtime updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const scannerBeamRef = useRef<THREE.Mesh | null>(null);
  const reticleBeaconRef = useRef<THREE.Group | null>(null);
  const origPositionsRef = useRef<Float32Array | null>(null);

  // Color mapper for intensity
  const getIntensityColor = React.useCallback(
    (muscle: AnatomicalMuscle, isSelected: boolean) => {
      if (isSelected) return HEATMAP_COLORS.selected;
      const stat = muscleStats[muscle];
      if (!stat || stat.volumeKg === 0) return null;
      if (stat.intensityLevel === "peak") return HEATMAP_COLORS.peak;
      if (stat.intensityLevel === "high") return HEATMAP_COLORS.high;
      if (stat.intensityLevel === "moderate") return HEATMAP_COLORS.moderate;
      return HEATMAP_COLORS.light;
    },
    [muscleStats]
  );

  // Recompute vertex colors on the mesh
  const updateHeatmapColors = React.useCallback(() => {
    const mesh = meshRef.current;
    const origPositions = origPositionsRef.current;
    if (!mesh || !origPositions) return;

    const geometry = mesh.geometry;
    const vertexCount = origPositions.length / 3;
    let colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;

    if (!colorAttr || colorAttr.count !== vertexCount) {
      colorAttr = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
      geometry.setAttribute("color", colorAttr);
    }

    const colors = colorAttr.array as Float32Array;
    const baseColor = HEATMAP_COLORS.inactive;

    for (let i = 0; i < vertexCount; i++) {
      const vx = origPositions[i * 3];
      const vy = origPositions[i * 3 + 1];
      const vz = origPositions[i * 3 + 2];

      let r = baseColor.r;
      let g = baseColor.g;
      let b = baseColor.b;
      let maxWeight = 0;

      for (let c = 0; c < MUSCLE_CENTROIDS.length; c++) {
        const centroid = MUSCLE_CENTROIDS[c];
        const isSelected = selectedMuscle === centroid.muscle;
        const targetColor = getIntensityColor(centroid.muscle, isSelected);

        if (!targetColor) continue;

        const dx = vx - centroid.x;
        const dy = vy - centroid.y;
        const dz = vz - centroid.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radSq = centroid.radius * centroid.radius;

        if (distSq < radSq) {
          const weight = Math.pow(1 - Math.sqrt(distSq) / centroid.radius, isSelected ? 1.4 : 1.8);
          if (weight > maxWeight) {
            maxWeight = weight;
            r = THREE.MathUtils.lerp(r, targetColor.r, weight * (isSelected ? 0.98 : 0.88));
            g = THREE.MathUtils.lerp(g, targetColor.g, weight * (isSelected ? 0.98 : 0.88));
            b = THREE.MathUtils.lerp(b, targetColor.b, weight * (isSelected ? 0.98 : 0.88));
          }
        }
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    colorAttr.needsUpdate = true;
    (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
  }, [selectedMuscle, getIntensityColor]);

  // Position reticle beacon on selected muscle
  const updateReticlePosition = React.useCallback(() => {
    if (!reticleBeaconRef.current) return;
    if (!selectedMuscle) {
      reticleBeaconRef.current.visible = false;
      return;
    }

    const centroids = MUSCLE_CENTROIDS.filter((c) => c.muscle === selectedMuscle);
    if (centroids.length === 0) {
      reticleBeaconRef.current.visible = false;
      return;
    }

    // Use front-most centroid or primary
    const target = centroids[0];
    reticleBeaconRef.current.position.set(target.z, target.y, target.x);
    reticleBeaconRef.current.visible = true;
  }, [selectedMuscle]);

  const updateHeatmapColorsRef = useRef(updateHeatmapColors);
  const updateReticlePositionRef = useRef(updateReticlePosition);
  const isScannerActiveRef = useRef(isScannerActive);

  useEffect(() => {
    updateHeatmapColorsRef.current = updateHeatmapColors;
    updateReticlePositionRef.current = updateReticlePosition;
    isScannerActiveRef.current = isScannerActive;
  }, [updateHeatmapColors, updateReticlePosition, isScannerActive]);

  // Three.js Mount & Animation Loop
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let isDisposed = false;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || 340;
    const height = 440;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.02, 1.8);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 1.1;
    controls.maxDistance = 2.8;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00e1ff, 2.2);
    keyLight.position.set(2, 3, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x00d68f, 1.6);
    fillLight.position.set(-2.5, 1.5, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xccff00, 2.4);
    rimLight.position.set(0, 3, -3.5);
    scene.add(rimLight);

    const bottomFloorGlow = new THREE.PointLight(0x00d68f, 1.2, 3);
    bottomFloorGlow.position.set(0, -0.6, 0);
    scene.add(bottomFloorGlow);

    // 6. Holographic Cyber Podium (Floor circles)
    const podiumGroup = new THREE.Group();
    podiumGroup.position.set(0, -0.52, 0);

    const ringGeo1 = new THREE.RingGeometry(0.32, 0.33, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00d68f, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    podiumGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(0.44, 0.445, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00e1ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    podiumGroup.add(ring2);

    scene.add(podiumGroup);

    // 7. Laser Scanner Beam Mesh
    const scannerGeo = new THREE.RingGeometry(0.01, 0.34, 48);
    const scannerMat = new THREE.MeshBasicMaterial({
      color: 0x00e1ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const scannerBeam = new THREE.Mesh(scannerGeo, scannerMat);
    scannerBeam.rotation.x = Math.PI / 2;
    scannerBeam.visible = false;
    scene.add(scannerBeam);
    scannerBeamRef.current = scannerBeam;

    // 8. 3D Reticle Targeting Beacon
    const beaconGroup = new THREE.Group();
    const beaconRingGeo = new THREE.RingGeometry(0.024, 0.028, 32);
    const beaconRingMat = new THREE.MeshBasicMaterial({ color: 0x00d68f, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
    beaconGroup.add(beaconRing);

    const beaconDotGeo = new THREE.SphereGeometry(0.008, 16, 16);
    const beaconDotMat = new THREE.MeshBasicMaterial({ color: 0xccff00 });
    const beaconDot = new THREE.Mesh(beaconDotGeo, beaconDotMat);
    beaconGroup.add(beaconDot);

    beaconGroup.visible = false;
    scene.add(beaconGroup);
    reticleBeaconRef.current = beaconGroup;

    // 9. Load 3D Human Body Model
    const loader = new GLTFLoader();
    loader.load(
      "/models/human_body.glb",
      (gltf) => {
        if (isDisposed) return;

        let foundMesh: THREE.Mesh | null = null;
        gltf.scene.traverse((child) => {
          if (!foundMesh && child instanceof THREE.Mesh) {
            foundMesh = child;
          }
        });

        if (foundMesh) {
          const mesh = foundMesh as THREE.Mesh;
          const posAttr = mesh.geometry.getAttribute("position");
          origPositionsRef.current = new Float32Array(posAttr.array);

          // Standard athletic material with vertex colors
          const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.38,
            metalness: 0.32,
          });
          mesh.material = material;

          // Rotate to face camera (+X becomes front)
          mesh.rotation.y = Math.PI / 2;
          scene.add(mesh);
          meshRef.current = mesh;

          setIsLoading(false);
          updateHeatmapColorsRef.current();
          updateReticlePositionRef.current();
        } else {
          setLoadError("No se encontró la geometría 3D");
          setIsLoading(false);
        }
      },
      undefined,
      (err) => {
        console.error("Error cargando modelo 3D:", err);
        setLoadError("Error cargando el modelo anatómico 3D");
        setIsLoading(false);
      }
    );

    // 10. Click Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (!meshRef.current) return;

      const intersects = raycaster.intersectObject(meshRef.current, false);
      if (intersects.length > 0) {
        const hit = intersects[0];
        // Convert hit point to model local coordinates
        const localPoint = meshRef.current.worldToLocal(hit.point.clone());

        // Find closest muscle centroid
        let closestMuscle: AnatomicalMuscle | null = null;
        let minDistance = Infinity;

        for (const centroid of MUSCLE_CENTROIDS) {
          const dx = localPoint.x - centroid.x;
          const dy = localPoint.y - centroid.y;
          const dz = localPoint.z - centroid.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < centroid.radius * 1.3 && dist < minDistance) {
            minDistance = dist;
            closestMuscle = centroid.muscle;
          }
        }

        if (closestMuscle) {
          haptics.selection();
          setSelectedMuscle(closestMuscle);
        }
      }
    };

    canvas.addEventListener("click", handleCanvasClick);

    // 11. Animation Render Loop
    let animationFrameId: number;
    let scanY = 0.48;
    let scanDir = -1;

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      controls.update();

      // Rotate podium slowly
      podiumGroup.rotation.y += 0.003;

      // Laser scanner animation
      if (scannerBeamRef.current && isScannerActiveRef.current) {
        scannerBeamRef.current.visible = true;
        scanY += scanDir * 0.008;
        if (scanY < -0.48) {
          scanY = -0.48;
          scanDir = 1;
        } else if (scanY > 0.48) {
          scanY = 0.48;
          scanDir = -1;
        }
        scannerBeamRef.current.position.y = scanY;
      } else if (scannerBeamRef.current) {
        scannerBeamRef.current.visible = false;
      }

      // Reticle pulse
      if (reticleBeaconRef.current && reticleBeaconRef.current.visible) {
        reticleBeaconRef.current.lookAt(camera.position);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || isDisposed) return;
      const newWidth = containerRef.current.clientWidth || 340;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("click", handleCanvasClick);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update heatmap when stats or selection change
  useEffect(() => {
    updateHeatmapColors();
    updateReticlePosition();
  }, [updateHeatmapColors, updateReticlePosition]);

  // Update scanner visibility
  useEffect(() => {
    if (scannerBeamRef.current) {
      scannerBeamRef.current.visible = isScannerActive;
    }
  }, [isScannerActive]);

  // Update auto rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
      controlsRef.current.autoRotateSpeed = 2.5;
    }
  }, [isAutoRotate]);

  // Camera presets
  const setCameraPreset = (preset: "front" | "back" | "left" | "right") => {
    haptics.selection();
    if (!cameraRef.current || !controlsRef.current) return;
    const dist = 1.8;

    if (preset === "front") {
      cameraRef.current.position.set(0, 0.02, dist);
    } else if (preset === "back") {
      cameraRef.current.position.set(0, 0.02, -dist);
    } else if (preset === "left") {
      cameraRef.current.position.set(-dist, 0.02, 0);
    } else if (preset === "right") {
      cameraRef.current.position.set(dist, 0.02, 0);
    }

    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  // Biomechanical symmetry metrics
  const biomechanics = useMemo(() => {
    const pushVol =
      (muscleStats.chest?.volumeKg || 0) +
      (muscleStats.deltoids_ant?.volumeKg || 0) +
      (muscleStats.deltoids_lat?.volumeKg || 0) +
      (muscleStats.triceps?.volumeKg || 0);

    const pullVol =
      (muscleStats.lats?.volumeKg || 0) +
      (muscleStats.traps?.volumeKg || 0) +
      (muscleStats.deltoids_post?.volumeKg || 0) +
      (muscleStats.biceps?.volumeKg || 0) +
      (muscleStats.forearms?.volumeKg || 0);

    const totalTorso = pushVol + pullVol;
    const pushRatio = totalTorso > 0 ? Math.round((pushVol / totalTorso) * 100) : 50;
    const pullRatio = totalTorso > 0 ? 100 - pushRatio : 50;

    const upperVol = totalTorso + (muscleStats.abs?.volumeKg || 0) + (muscleStats.obliques?.volumeKg || 0);
    const lowerVol =
      (muscleStats.quads?.volumeKg || 0) +
      (muscleStats.hamstrings?.volumeKg || 0) +
      (muscleStats.glutes?.volumeKg || 0) +
      (muscleStats.calves?.volumeKg || 0);

    const totalBody = upperVol + lowerVol;
    const upperRatio = totalBody > 0 ? Math.round((upperVol / totalBody) * 100) : 50;
    const lowerRatio = totalBody > 0 ? 100 - upperRatio : 50;
    const activeCount = Object.values(muscleStats).filter((s) => s.volumeKg > 0).length;

    return {
      pushRatio,
      pullRatio,
      upperRatio,
      lowerRatio,
      activeCount,
      totalEffective: totalBody,
    };
  }, [muscleStats]);

  const selectedStat = selectedMuscle ? muscleStats[selectedMuscle] : null;

  return (
    <div className={`flex flex-col gap-4 ${className}`} ref={containerRef}>
      {/* View Presets & Tools Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Preset Angle Buttons */}
        <div className="flex items-center bg-[#0d121c] border border-white/10 rounded-2xl p-1 shadow-inner text-xs font-mono font-bold">
          <button
            onClick={() => setCameraPreset("front")}
            className="px-3 py-1.5 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
          >
            Frontal
          </button>
          <button
            onClick={() => setCameraPreset("right")}
            className="px-3 py-1.5 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
          >
            Perfil
          </button>
          <button
            onClick={() => setCameraPreset("back")}
            className="px-3 py-1.5 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
          >
            Dorsal
          </button>
        </div>

        {/* 360 Spin & Scanner Tools */}
        <div className="flex items-center gap-1.5">
          {/* Auto-Rotate 360 */}
          <button
            onClick={() => {
              haptics.tick();
              setIsAutoRotate(!isAutoRotate);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isAutoRotate
                ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(0,214,143,0.35)]"
                : "bg-[#0d121c] border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Giro automático 360°"
          >
            {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>360°</span>
          </button>

          {/* Biometric Laser Scanner */}
          <button
            onClick={() => {
              haptics.tick();
              setIsScannerActive(!isScannerActive);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isScannerActive
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,225,255,0.35)]"
                : "bg-[#0d121c] border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Scan className={`w-3.5 h-3.5 ${isScannerActive ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Escáner</span>
          </button>

          {/* Timeframe Chips */}
          {onTimeframeChange && (
            <div className="flex items-center bg-[#0d121c] border border-white/10 rounded-2xl p-1 text-[11px] font-mono">
              {(["week", "month", "all"] as MuscleTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    haptics.tick();
                    onTimeframeChange(tf);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-bold uppercase transition-all ${
                    timeframe === tf
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tf === "week" ? "Sem" : tf === "month" ? "Mes" : "Total"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="relative flex flex-col items-center justify-center h-[440px] bg-gradient-to-b from-[#080d16] via-[#0c1322] to-[#070b13] rounded-3xl border border-white/10 shadow-2xl overflow-hidden touch-none">
        {/* Ambient Volumetric Neons */}
        <div className="pointer-events-none absolute -top-10 -left-10 w-64 h-64 rounded-full bg-primary/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-cyan-500/15 blur-[100px]" />

        {/* HUD Overlay Top Telemetry */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-20 text-[10px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-zinc-300 font-bold uppercase tracking-wider">
              ROTACIÓN 360° ACTIVA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-black/50 border border-white/10 rounded-full text-zinc-300">
              {biomechanics.activeCount}/16 MÚSCULOS ACTIVOS
            </span>
          </div>
        </div>

        {/* Loading / Error State */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30 bg-[#080d16]/80 backdrop-blur-sm">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-zinc-400">Cargando Escenario 3D...</span>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-30 p-4 text-center">
            <Info className="w-6 h-6 text-red-400" />
            <span className="text-xs font-mono text-red-300">{loadError}</span>
          </div>
        )}

        {/* WebGL Canvas */}
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none" />

        {/* 360 Touch Drag & Tap Instructions */}
        <div className="absolute bottom-11 left-4 right-4 flex items-center justify-between pointer-events-none z-20 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <RotateCw className="w-3 h-3 text-primary animate-spin" />
            Arrastra para dar la vuelta 360° · Toca para inspeccionar
          </span>
        </div>

        {/* Heatmap Spectrum Legend */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-black/40 border-t border-white/5 text-[10px] font-mono z-20 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1a2333] border border-white/20" />
            <span className="text-zinc-500">Inactivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00E1FF]" />
            <span className="text-zinc-400">Leve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_#00D68F]" />
            <span className="text-primary font-bold">Óptimo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] shadow-[0_0_8px_#CCFF00]" />
            <span className="text-[#CCFF00] font-black">Hipertrofia</span>
          </div>
        </div>
      </div>

      {/* Biomechanical Symmetry & Balance Panel */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Push vs Pull Postural Ratio */}
        <div className="bg-[#0f1420] border border-white/10 rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Empuje vs Tracción
            </span>
            <span className="text-[10px] font-mono text-primary font-black">
              {biomechanics.pushRatio}% / {biomechanics.pullRatio}%
            </span>
          </div>
          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-500"
              style={{ width: `${biomechanics.pushRatio}%` }}
              title="Empuje (Pecho/Hombro/Tríceps)"
            />
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
              style={{ width: `${biomechanics.pullRatio}%` }}
              title="Tracción (Espalda/Dorsal/Bíceps)"
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1.5">
            {biomechanics.pushRatio >= 45 && biomechanics.pushRatio <= 55
              ? "Equilibrio postural óptimo"
              : biomechanics.pushRatio > 55
              ? "Mayor volumen en empuje"
              : "Mayor volumen en tracción"}
          </span>
        </div>

        {/* Upper vs Lower Body Ratio */}
        <div className="bg-[#0f1420] border border-white/10 rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Torso vs Piernas
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-black">
              {biomechanics.upperRatio}% / {biomechanics.lowerRatio}%
            </span>
          </div>
          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-500"
              style={{ width: `${biomechanics.upperRatio}%` }}
              title="Tren Superior & Core"
            />
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${biomechanics.lowerRatio}%` }}
              title="Tren Inferior"
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1.5">
            {biomechanics.lowerRatio >= 35
              ? "Desarrollo atlético balanceado"
              : "Recomendado: Foco en piernas"}
          </span>
        </div>
      </div>

      {/* Interactive Muscle Inspection Detail Card */}
      {selectedStat && (
        <div className="bg-gradient-to-br from-[#121826] via-[#151f30] to-[#0f1522] border border-primary/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full">
                  {selectedStat.info.majorGroup}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {selectedStat.info.scientificName}
                </span>
              </div>
              <h4 className="text-lg font-black font-mono text-white tracking-tight">
                {selectedStat.info.name}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {selectedStat.info.description}
              </p>
            </div>

            {/* Intensity Pill */}
            <div className="text-right flex-shrink-0">
              <span
                className={`inline-block px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                  selectedStat.intensityLevel === "peak"
                    ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/40 shadow-[0_0_12px_rgba(204,255,0,0.35)]"
                    : selectedStat.intensityLevel === "high"
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(0,214,143,0.3)]"
                    : selectedStat.intensityLevel === "moderate"
                    ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                    : selectedStat.intensityLevel === "light"
                    ? "bg-blue-400/20 text-blue-300 border border-blue-400/30"
                    : "bg-white/5 text-zinc-400 border border-white/10"
                }`}
              >
                {selectedStat.intensityLevel === "peak"
                  ? "Hipertrofia Máx."
                  : selectedStat.intensityLevel === "high"
                  ? "Alta Carga"
                  : selectedStat.intensityLevel === "moderate"
                  ? "Carga Óptima"
                  : selectedStat.intensityLevel === "light"
                  ? "Activación Leve"
                  : "Listo / Recuperado"}
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/5 text-center relative z-10">
            <div className="bg-black/35 rounded-2xl p-2.5 border border-white/5">
              <span className="text-[9px] font-mono text-zinc-500 uppercase block">Carga Estimada</span>
              <span className="text-base font-black font-mono text-white">
                {Math.round(selectedStat.volumeKg)}{" "}
                <span className="text-[10px] text-zinc-400">kg</span>
              </span>
            </div>
            <div className="bg-black/35 rounded-2xl p-2.5 border border-white/5">
              <span className="text-[9px] font-mono text-zinc-500 uppercase block">Series Totales</span>
              <span className="text-base font-black font-mono text-primary">
                {selectedStat.totalSets}{" "}
                <span className="text-[10px] text-zinc-400">sets</span>
              </span>
            </div>
            <div className="bg-black/35 rounded-2xl p-2.5 border border-white/5">
              <span className="text-[9px] font-mono text-zinc-500 uppercase block">Repeticiones</span>
              <span className="text-base font-black font-mono text-cyan-400">
                {selectedStat.totalReps}{" "}
                <span className="text-[10px] text-zinc-400">reps</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
