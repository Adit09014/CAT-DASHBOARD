import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Eye,
  Rotate3d,
  Maximize2,
  Crosshair,
  Compass,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../services/theme';

export interface TargetTrajectoryPoint3D {
  second: number;
  x_rel: number;
  y_rel: number;
  z_rel?: number;
  distance_meters: number;
  distance_3d?: number;
  bearing_degrees: number;
  is_conflict: boolean;
}

export interface RadarTarget3D {
  id: string;
  name: string;
  target_type: 'PEDESTRIAN' | 'HAUL_TRUCK' | 'LIGHT_VEHICLE' | 'HEAVY_VEHICLE' | 'GEO_HAZARD' | string;
  distance_meters: number;
  bearing_degrees: number;
  elevation_meters?: number;
  dimensions?: [number, number, number];
  relative_speed_mps: number;
  heading_degrees: number;
  ttc_seconds: number | null;
  closest_approach_meters: number;
  risk_level: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  zone: string;
  trajectory: TargetTrajectoryPoint3D[];
  curr_x: number;
  curr_y: number;
  curr_z?: number;
  curr_dist: number;
  curr_dist_3d?: number;
  curr_bearing: number;
  in_conflict: boolean;
}

interface Radar3DViewProps {
  targets: RadarTarget3D[];
  currentTime: number;
  horizon: number;
  threshold: number;
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  isAlarmTriggered?: boolean;
}

type CameraPreset = 'tactical' | 'cab' | 'top' | 'side' | 'target';

export function Radar3DView({
  targets,
  currentTime,
  horizon,
  threshold,
  selectedTargetId,
  onSelectTarget,
  isAlarmTriggered = false,
}: Radar3DViewProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activePreset, setActivePreset] = useState<CameraPreset>('tactical');
  const [showSweep, setShowSweep] = useState<boolean>(true);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);
  const [showBlindSpot, setShowBlindSpot] = useState<boolean>(true);

  // References to mutable Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const groundDiskMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const targetMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const trajectoryLinesRef = useRef<THREE.Group>(new THREE.Group());
  const sweepGroupRef = useRef<THREE.Group | null>(null);
  const cabBeaconRef = useRef<THREE.PointLight | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Orbit control state (custom lightweight smooth orbit without external deps)
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef(0);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const orbitStateRef = useRef({
    theta: Math.PI / 4, // azimuth angle
    phi: Math.PI / 3.2, // elevation angle
    radius: 46, // distance from machine
    target: new THREE.Vector3(0, 1.5, 0),
  });

  // Camera transition animation state
  const cameraAnimRef = useRef<{
    active: boolean;
    startTheta: number;
    startPhi: number;
    startRadius: number;
    startTarget: THREE.Vector3;
    endTheta: number;
    endPhi: number;
    endRadius: number;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null>(null);

  // Switch camera view presets smoothly
  const setCameraPreset = useCallback((preset: CameraPreset) => {
    setActivePreset(preset);
    const now = performance.now();
    const curr = orbitStateRef.current;

    let targetTheta = curr.theta;
    let targetPhi = curr.phi;
    let targetRadius = curr.radius;
    let targetLook = new THREE.Vector3(0, 1.5, 0);

    if (preset === 'tactical') {
      targetTheta = Math.PI / 3.8;
      targetPhi = Math.PI / 3.4;
      targetRadius = 48;
      targetLook = new THREE.Vector3(0, 1.5, 0);
    } else if (preset === 'cab') {
      // In-cab operator POV: placed at excavator cab looking forward/right
      targetTheta = -0.15; // slightly looking toward right blind spot
      targetPhi = 1.48; // level eye height
      targetRadius = 6.5;
      targetLook = new THREE.Vector3(2.5, 2.2, -8.0);
    } else if (preset === 'top') {
      targetTheta = 0;
      targetPhi = 0.05; // almost perpendicular overhead
      targetRadius = 55;
      targetLook = new THREE.Vector3(0, 0, 0);
    } else if (preset === 'side') {
      targetTheta = Math.PI / 2;
      targetPhi = Math.PI / 2.05;
      targetRadius = 45;
      targetLook = new THREE.Vector3(0, 1.0, 0);
    } else if (preset === 'target') {
      const selected = targets.find((t) => t.id === selectedTargetId) || targets[0];
      if (selected) {
        targetTheta = (selected.curr_bearing * Math.PI) / 180 + Math.PI;
        targetPhi = Math.PI / 3.6;
        targetRadius = Math.max(16, selected.curr_dist * 0.85);
        targetLook = new THREE.Vector3(selected.curr_x * 0.5, 1.0, -selected.curr_y * 0.5);
      }
    }

    cameraAnimRef.current = {
      active: true,
      startTheta: curr.theta,
      startPhi: curr.phi,
      startRadius: curr.radius,
      startTarget: curr.target.clone(),
      endTheta: targetTheta,
      endPhi: targetPhi,
      endRadius: targetRadius,
      endTarget: targetLook,
      startTime: now,
      duration: 750,
    };
  }, [targets, selectedTargetId]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 450;

    const isL = theme === 'light';
    const bgCol = isL ? 0xeef3f8 : 0x151f30;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(bgCol);
    scene.fog = new THREE.FogExp2(bgCol, isL ? 0.004 : 0.005);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    cameraRef.current = camera;
    camera.position.set(28, 26, 32);
    camera.lookAt(0, 1.5, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Lighting System (Significantly boosted brightness & clarity)
    const ambientLight = new THREE.AmbientLight(isL ? 0xffffff : 0x607d9e, isL ? 2.4 : 2.2);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0xfffaee, isL ? 2.8 : 2.6);
    dirLight.position.set(30, 45, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -35;
    dirLight.shadow.camera.right = 35;
    dirLight.shadow.camera.top = 35;
    dirLight.shadow.camera.bottom = -35;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Vibrant fill light from opposing angle
    const fillLight = new THREE.DirectionalLight(isL ? 0x9ec7f0 : 0x68b9ec, isL ? 1.0 : 1.2);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Cab beacon point light (amber/red pulse)
    const cabBeacon = new THREE.PointLight(0xffcd11, 2.5, 25);
    cabBeacon.position.set(-1.1, 3.2, 0.4);
    scene.add(cabBeacon);
    cabBeaconRef.current = cabBeacon;

    // 5. High-Tech Circular Radar Ground Pad
    const groundDiskGeom = new THREE.CircleGeometry(52, 64);
    groundDiskGeom.rotateX(-Math.PI / 2);
    const groundDiskMat = new THREE.MeshStandardMaterial({
      color: isL ? 0xe2eaf2 : 0x1c293d,
      roughness: 0.85,
      metalness: 0.1,
    });
    const groundDisk = new THREE.Mesh(groundDiskGeom, groundDiskMat);
    groundDisk.position.y = -0.04;
    groundDisk.receiveShadow = true;
    scene.add(groundDisk);
    groundDiskMatRef.current = groundDiskMat;

    // Perimeter edge ring for ground pad
    const padEdgeGeom = new THREE.RingGeometry(51.8, 52.2, 128);
    padEdgeGeom.rotateX(-Math.PI / 2);
    const padEdgeMat = new THREE.MeshBasicMaterial({
      color: isL ? 0x94a3b8 : 0x38527a,
      side: THREE.DoubleSide,
    });
    const padEdge = new THREE.Mesh(padEdgeGeom, padEdgeMat);
    padEdge.position.y = -0.035;
    scene.add(padEdge);

    // 6. Radar Ground Grid & Concentric Range Rings
    const gridHelper = new THREE.GridHelper(100, 50, isL ? 0x94a3b8 : 0x42587a, isL ? 0xcad5e2 : 0x2a384e);
    gridHelper.position.y = -0.02;
    scene.add(gridHelper);

    // Concentric Range Rings (10m safety threshold, 25m, 40m, 50m max)
    const rangeRingsGroup = new THREE.Group();
    const ringRadii = [10, 25, 40, 50];
    ringRadii.forEach((radius) => {
      const segments = 128;
      const ringGeom = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0.02, Math.sin(theta) * radius));
      }
      ringGeom.setFromPoints(points);

      const isThreshold = radius === 10;
      const ringMat = new THREE.LineBasicMaterial({
        color: isThreshold ? 0xef4444 : (isL ? 0x475569 : 0x6f89b0),
        linewidth: isThreshold ? 2 : 1,
        transparent: true,
        opacity: isThreshold ? 0.95 : 0.75,
      });
      const ringLine = new THREE.Line(ringGeom, ringMat);
      rangeRingsGroup.add(ringLine);
    });

    // Azimuth Crosshairs (Front, Rear, Left, Right axes)
    const axisMat = new THREE.LineBasicMaterial({ color: isL ? 0x94a3b8 : 0x51698a, transparent: true, opacity: 0.5 });
    const axisGeomX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-50, 0.02, 0),
      new THREE.Vector3(50, 0.02, 0),
    ]);
    const axisGeomZ = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.02, -50),
      new THREE.Vector3(0, 0.02, 50),
    ]);
    rangeRingsGroup.add(new THREE.Line(axisGeomX, axisMat));
    rangeRingsGroup.add(new THREE.Line(axisGeomZ, axisMat));

    // North / Machine Heading Line (Pointing to -Z = Machine Forward)
    const headingGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.03, 0),
      new THREE.Vector3(0, 0.03, -50),
    ]);
    const headingMat = new THREE.LineBasicMaterial({ color: isL ? 0xca8a04 : 0xffcd11, transparent: true, opacity: 0.95 });
    rangeRingsGroup.add(new THREE.Line(headingGeom, headingMat));

    scene.add(rangeRingsGroup);

    // 6. Blind Spot Hazard Sector (Right Rear: 90° to 150°)
    const blindSpotGeom = new THREE.RingGeometry(0.5, 45, 32, 1, Math.PI * 0.0, Math.PI * 0.38);
    blindSpotGeom.rotateX(-Math.PI / 2);
    blindSpotGeom.rotateY(-Math.PI * 0.05);
    const blindSpotMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const blindSpotMesh = new THREE.Mesh(blindSpotGeom, blindSpotMat);
    blindSpotMesh.position.y = 0.01;
    blindSpotMesh.name = 'blindSpotMesh';
    scene.add(blindSpotMesh);

    // 7. Rotating Volumetric LiDAR Sweep Wedge
    const sweepGroup = new THREE.Group();
    const sweepWedgeGeom = new THREE.RingGeometry(0.5, 50, 24, 1, 0, Math.PI * 0.22);
    sweepWedgeGeom.rotateX(-Math.PI / 2);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const sweepMesh = new THREE.Mesh(sweepWedgeGeom, sweepMat);
    sweepMesh.position.y = 0.03;
    sweepGroup.add(sweepMesh);

    // Leading sweep line
    const sweepLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.04, 0),
      new THREE.Vector3(Math.cos(Math.PI * 0.22) * 50, 0.04, Math.sin(Math.PI * 0.22) * 50),
    ]);
    const sweepLineMat = new THREE.LineBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.8 });
    sweepGroup.add(new THREE.Line(sweepLineGeom, sweepLineMat));

    scene.add(sweepGroup);
    sweepGroupRef.current = sweepGroup;

    // 8. Caterpillar Excavator 3D Procedural Model
    const excavator = createCaterpillarExcavator();
    scene.add(excavator);

    // 9. Trajectory Lines Group
    scene.add(trajectoryLinesRef.current);

    // 10. Animation Loop
    let lastTime = performance.now();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Rotate LiDAR sweep
      if (sweepGroupRef.current) {
        sweepGroupRef.current.rotation.y -= delta * 1.6;
      }

      // Pulse cab beacon if alarm is active or normal idle strobe
      if (cabBeaconRef.current) {
        if (isAlarmTriggered) {
          cabBeaconRef.current.color.setHex(0xef4444);
          cabBeaconRef.current.intensity = 2.0 + Math.sin(now * 0.015) * 2.0;
        } else {
          cabBeaconRef.current.color.setHex(0xffcd11);
          cabBeaconRef.current.intensity = 1.0 + Math.sin(now * 0.005) * 0.8;
        }
      }

      // Camera preset smooth tweening
      if (cameraAnimRef.current && cameraAnimRef.current.active) {
        const anim = cameraAnimRef.current;
        const elapsed = now - anim.startTime;
        const progress = Math.min(1.0, elapsed / anim.duration);
        const t = 1 - Math.pow(1 - progress, 3);

        const curr = orbitStateRef.current;
        curr.theta = THREE.MathUtils.lerp(anim.startTheta, anim.endTheta, t);
        curr.phi = THREE.MathUtils.lerp(anim.startPhi, anim.endPhi, t);
        curr.radius = THREE.MathUtils.lerp(anim.startRadius, anim.endRadius, t);
        curr.target.lerpVectors(anim.startTarget, anim.endTarget, t);

        if (progress >= 1.0) {
          anim.active = false;
        }
      }

      // Update Camera Orbit Position
      const orbit = orbitStateRef.current;
      const camX = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
      const camY = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
      const camZ = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(orbit.target);

      // Render Scene
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Synchronize 3D scene lighting, background, and ground pad with active Theme
  useEffect(() => {
    if (!sceneRef.current) return;
    const isL = theme === 'light';
    const bgCol = isL ? 0xeef3f8 : 0x151f30;
    sceneRef.current.background = new THREE.Color(bgCol);
    if (sceneRef.current.fog) {
      sceneRef.current.fog.color.setHex(bgCol);
      sceneRef.current.fog.density = isL ? 0.004 : 0.005;
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHex(isL ? 0xffffff : 0x607d9e);
      ambientLightRef.current.intensity = isL ? 2.4 : 2.2;
    }
    if (dirLightRef.current) {
      dirLightRef.current.color.setHex(0xfffaee);
      dirLightRef.current.intensity = isL ? 2.8 : 2.6;
    }
    if (fillLightRef.current) {
      fillLightRef.current.color.setHex(isL ? 0x9ec7f0 : 0x68b9ec);
      fillLightRef.current.intensity = isL ? 1.0 : 1.2;
    }
    if (groundDiskMatRef.current) {
      groundDiskMatRef.current.color.setHex(isL ? 0xe2eaf2 : 0x1c293d);
    }
  }, [theme]);

  // Update Blind Spot visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    const mesh = sceneRef.current.getObjectByName('blindSpotMesh');
    if (mesh) mesh.visible = showBlindSpot;
  }, [showBlindSpot]);

  // Update LiDAR Sweep visibility
  useEffect(() => {
    if (sweepGroupRef.current) {
      sweepGroupRef.current.visible = showSweep;
    }
  }, [showSweep]);

  // Update Trajectory lines & 3D Target Meshes whenever targets or currentTime changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // 1. Update Trajectory Ribbons
    trajectoryLinesRef.current.clear();
    if (showTrajectories) {
      targets.forEach((target) => {
        if (!target.trajectory || target.trajectory.length < 2) return;

        const points: THREE.Vector3[] = [];
        target.trajectory.forEach((pt) => {
          const z_elev = pt.z_rel ?? target.elevation_meters ?? 0;
          points.push(new THREE.Vector3(pt.x_rel, z_elev + 0.15, -pt.y_rel));
        });

        const trajGeom = new THREE.BufferGeometry().setFromPoints(points);
        const isConflict = target.in_conflict || target.risk_level === 'CRITICAL';
        const color = isConflict
          ? 0xef4444
          : target.risk_level === 'WARNING'
          ? 0xf59e0b
          : target.risk_level === 'CAUTION'
          ? 0x38bdf8
          : 0x22c55e;

        const trajMat = new THREE.LineDashedMaterial({
          color,
          dashSize: 0.8,
          gapSize: 0.4,
          linewidth: 2,
          transparent: true,
          opacity: 0.75,
        });
        const trajLine = new THREE.Line(trajGeom, trajMat);
        trajLine.computeLineDistances();
        trajectoryLinesRef.current.add(trajLine);
      });
    }

    // 2. Synchronize Target 3D Meshes
    const existingMap = targetMeshesRef.current;
    const currentIds = new Set(targets.map((t) => t.id));

    // Remove old meshes
    existingMap.forEach((group, id) => {
      if (!currentIds.has(id)) {
        scene.remove(group);
        existingMap.delete(id);
      }
    });

    // Create or update meshes
    targets.forEach((target) => {
      let group = existingMap.get(target.id);
      const isSelected = target.id === selectedTargetId;
      const isConflict = target.in_conflict;

      const targetElevation = target.elevation_meters ?? 0;
      const posX = target.curr_x;
      const posY = targetElevation;
      const posZ = -target.curr_y;

      if (!group) {
        group = create3DTargetMesh(target);
        group.name = `target_${target.id}`;
        scene.add(group);
        existingMap.set(target.id, group);
      }

      // Update position
      group.position.set(posX, posY, posZ);

      // Rotate towards movement heading
      const headingRad = (target.heading_degrees * Math.PI) / 180;
      group.rotation.y = -headingRad;

      // Update Stalk Line (Ground to elevated position)
      const stalk = group.getObjectByName('stalk') as THREE.Line | undefined;
      if (stalk) {
        stalk.geometry.dispose();
        const stalkGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -posY, 0),
          new THREE.Vector3(0, 0, 0),
        ]);
        stalk.geometry = stalkGeom;
      }

      // Update selection indicator halo
      const halo = group.getObjectByName('selectionHalo') as THREE.Mesh | undefined;
      if (halo) {
        halo.visible = isSelected;
        if (isSelected) {
          halo.scale.set(1.1 + Math.sin(Date.now() * 0.008) * 0.15, 1.1 + Math.sin(Date.now() * 0.008) * 0.15, 1);
        }
      }

      // Update beacon color
      const beacon = group.getObjectByName('beaconLight') as THREE.PointLight | undefined;
      if (beacon) {
        beacon.color.setHex(isConflict ? 0xef4444 : 0xffcd11);
        beacon.intensity = isConflict ? 2.5 : 1.2;
      }
    });
  }, [targets, currentTime, selectedTargetId, showTrajectories]);

  // Pointer Interaction Handlers for 3D Orbiting & Zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragButtonRef.current = e.button;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    if (cameraAnimRef.current) cameraAnimRef.current.active = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    const orbit = orbitStateRef.current;
    if (dragButtonRef.current === 0) {
      // Left Click: Rotate Orbit (Azimuth & Elevation)
      orbit.theta -= deltaX * 0.008;
      orbit.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, orbit.phi - deltaY * 0.008));
    } else if (dragButtonRef.current === 2) {
      // Right Click: Pan Target
      const panSpeed = orbit.radius * 0.0015;
      const right = new THREE.Vector3(Math.cos(orbit.theta), 0, -Math.sin(orbit.theta));
      const forward = new THREE.Vector3(-Math.sin(orbit.theta), 0, -Math.cos(orbit.theta));
      orbit.target.addScaledVector(right, -deltaX * panSpeed);
      orbit.target.addScaledVector(forward, deltaY * panSpeed);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    const orbit = orbitStateRef.current;
    orbit.radius = Math.max(6, Math.min(110, orbit.radius * zoomFactor));
    if (cameraAnimRef.current) cameraAnimRef.current.active = false;
  };

  // Click on Canvas to Raycast & Select Target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && curr.parent && curr.parent !== sceneRef.current) {
        if (curr.name && curr.name.startsWith('target_')) {
          const targetId = curr.name.replace('target_', '');
          onSelectTarget(targetId);
          return;
        }
        curr = curr.parent;
      }
    }
  };

  return (
    <div className={`relative w-full h-[460px] rounded-lg overflow-hidden border select-none flex flex-col transition-colors ${
      isLight ? 'border-slate-300 bg-[#eef3f8]' : 'border-[#2a3c57] bg-[#151f30]'
    }`}>
      {/* 3D Viewport Header HUD */}
      <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className={`flex items-center gap-2 pointer-events-auto backdrop-blur-md px-2.5 py-1 rounded border shadow-sm ${
          isLight ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-[#182335]/90 border-[#2a3c57] text-slate-100'
        }`}>
          <Rotate3d size={14} className={isLight ? 'text-[#ca8a04]' : 'text-[#ffcd11]'} />
          <span className="text-[11px] font-bold tracking-wider">
            3D VOLUMETRIC RADAR
          </span>
          <span className={`text-[10px] mono border-l pl-2 ${
            isLight ? 'text-slate-500 border-slate-300' : 'text-slate-300 border-slate-700'
          }`}>
            T = {currentTime}s / {horizon}s
          </span>
        </div>

        {/* Camera Preset Selector Buttons */}
        <div className={`flex items-center gap-1 pointer-events-auto backdrop-blur-md p-1 rounded border shadow-sm ${
          isLight ? 'bg-white/95 border-slate-300' : 'bg-[#182335]/90 border-[#2a3c57]'
        }`}>
          {(['tactical', 'cab', 'top', 'side', 'target'] as const).map((preset) => {
            const labels: Record<string, string> = {
              tactical: 'Tactical 3D',
              cab: 'Cab POV',
              top: 'Top Down',
              side: 'Elevation',
              target: 'Focus Target',
            };
            const isActive = activePreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setCameraPreset(preset)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  isActive
                    ? 'bg-[#ffcd11] text-black shadow'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing flex-1"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} onClick={handleCanvasClick} className="w-full h-full block" />
      </div>

      {/* Floating Bottom HUD Controls */}
      <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Toggle Overlays */}
        <div className={`flex items-center gap-1 pointer-events-auto backdrop-blur-md px-2 py-1 rounded border text-[10px] shadow-sm ${
          isLight ? 'bg-white/95 border-slate-300 text-slate-700' : 'bg-[#182335]/90 border-[#2a3c57] text-slate-200'
        }`}>
          <span className={isLight ? 'text-slate-500 mr-1' : 'text-slate-400 mr-1'}>LAYERS:</span>
          <button
            type="button"
            onClick={() => setShowSweep(!showSweep)}
            className={`px-1.5 py-0.5 rounded font-medium ${
              showSweep
                ? isLight
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                : isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            LiDAR Sweep
          </button>
          <button
            type="button"
            onClick={() => setShowBlindSpot(!showBlindSpot)}
            className={`px-1.5 py-0.5 rounded font-medium ${
              showBlindSpot
                ? isLight
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                : isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Blind Spot
          </button>
          <button
            type="button"
            onClick={() => setShowTrajectories(!showTrajectories)}
            className={`px-1.5 py-0.5 rounded font-medium ${
              showTrajectories
                ? isLight
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                : isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Trajectory Ribbons
          </button>
        </div>

        {/* Orbit Hint & Quick Reset */}
        <div className={`flex items-center gap-2 pointer-events-auto backdrop-blur-md px-2.5 py-1 rounded border text-[10px] shadow-sm ${
          isLight ? 'bg-white/95 border-slate-300 text-slate-600' : 'bg-[#182335]/90 border-[#2a3c57] text-slate-300'
        }`}>
          <span>Drag: Orbit • Right-drag: Pan • Scroll: Zoom</span>
          <button
            type="button"
            onClick={() => setCameraPreset('tactical')}
            className={`p-1 transition-colors ${isLight ? 'hover:text-[#ca8a04]' : 'hover:text-[#ffcd11]'}`}
            title="Reset Camera View"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3D Procedural Caterpillar Excavator Model
// ==========================================
function createCaterpillarExcavator(): THREE.Group {
  const machine = new THREE.Group();
  machine.name = 'cat_excavator';

  // Materials with Caterpillar brand aesthetics
  const catYellow = new THREE.MeshStandardMaterial({
    color: 0xffcd11,
    metalness: 0.25,
    roughness: 0.35,
  });

  const catCharcoal = new THREE.MeshStandardMaterial({
    color: 0x1f2329,
    metalness: 0.45,
    roughness: 0.55,
  });

  const chromePiston = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.9,
    roughness: 0.15,
  });

  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0f2030,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
  });

  // 1. Crawler Tracks (Left & Right)
  const trackWidth = 0.9;
  const trackHeight = 1.1;
  const trackLength = 5.2;

  const trackGeom = new THREE.BoxGeometry(trackWidth, trackHeight, trackLength);
  const leftTrack = new THREE.Mesh(trackGeom, catCharcoal);
  leftTrack.position.set(-1.8, trackHeight / 2, 0);
  leftTrack.castShadow = true;
  leftTrack.receiveShadow = true;
  machine.add(leftTrack);

  const rightTrack = new THREE.Mesh(trackGeom, catCharcoal);
  rightTrack.position.set(1.8, trackHeight / 2, 0);
  rightTrack.castShadow = true;
  rightTrack.receiveShadow = true;
  machine.add(rightTrack);

  // Undercarriage Center Cross-Beam
  const undercarriageGeom = new THREE.BoxGeometry(2.7, 0.6, 2.2);
  const undercarriage = new THREE.Mesh(undercarriageGeom, catCharcoal);
  undercarriage.position.set(0, trackHeight / 2, 0);
  machine.add(undercarriage);

  // 2. Revolving Upperstructure (House)
  const houseGeom = new THREE.BoxGeometry(3.3, 1.4, 4.2);
  const house = new THREE.Mesh(houseGeom, catYellow);
  house.position.set(0, trackHeight + 0.7, -0.2);
  house.castShadow = true;
  machine.add(house);

  // Heavy Counterweight at Rear
  const counterweightGeom = new THREE.BoxGeometry(3.4, 1.3, 1.2);
  const counterweight = new THREE.Mesh(counterweightGeom, catCharcoal);
  counterweight.position.set(0, trackHeight + 0.75, 2.0);
  counterweight.castShadow = true;
  machine.add(counterweight);

  // Caterpillar Yellow Accent Stripe on Counterweight
  const stripeGeom = new THREE.BoxGeometry(3.42, 0.25, 0.1);
  const stripe = new THREE.Mesh(stripeGeom, catYellow);
  stripe.position.set(0, trackHeight + 0.75, 2.61);
  machine.add(stripe);

  // 3. Operator Cabin (Front Left)
  const cabGeom = new THREE.BoxGeometry(1.2, 1.5, 1.7);
  const cab = new THREE.Mesh(cabGeom, cabGlass);
  cab.position.set(-1.0, trackHeight + 1.6, -1.1);
  machine.add(cab);

  // Cab ROPS Roof frame
  const roofGeom = new THREE.BoxGeometry(1.3, 0.12, 1.8);
  const roof = new THREE.Mesh(roofGeom, catYellow);
  roof.position.set(-1.0, trackHeight + 2.4, -1.1);
  machine.add(roof);

  // Amber Strobe Beacon on Cab Roof
  const beaconGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffcd11,
    emissive: 0xffaa00,
    emissiveIntensity: 0.8,
  });
  const beacon = new THREE.Mesh(beaconGeom, beaconMat);
  beacon.position.set(-1.0, trackHeight + 2.52, -0.6);
  machine.add(beacon);

  // 4. Articulated Digging Arm (Boom + Stick + Bucket)
  const boomBase = new THREE.Group();
  boomBase.position.set(0.6, trackHeight + 0.9, -1.6);

  // Main Boom Arm
  const boomGeom = new THREE.BoxGeometry(0.55, 0.7, 5.2);
  const boom = new THREE.Mesh(boomGeom, catYellow);
  boom.position.set(0, 1.8, -2.0);
  boom.rotation.x = -Math.PI / 5.2; // angled upwards
  boom.castShadow = true;
  boomBase.add(boom);

  // Boom Hydraulic Cylinder (Main Lift)
  const cylGeom = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 12);
  const cylinder = new THREE.Mesh(cylGeom, catCharcoal);
  cylinder.position.set(0, 0.9, -1.2);
  cylinder.rotation.x = -Math.PI / 4.2;
  boomBase.add(cylinder);

  const pistonGeom = new THREE.CylinderGeometry(0.07, 0.07, 1.8, 12);
  const piston = new THREE.Mesh(pistonGeom, chromePiston);
  piston.position.set(0, 1.5, -1.8);
  piston.rotation.x = -Math.PI / 4.2;
  boomBase.add(piston);

  // Stick Arm (Arm hanging down towards bucket)
  const stickGeom = new THREE.BoxGeometry(0.45, 0.5, 3.4);
  const stick = new THREE.Mesh(stickGeom, catYellow);
  stick.position.set(0, 2.7, -4.6);
  stick.rotation.x = Math.PI / 3.8; // angled downwards
  stick.castShadow = true;
  boomBase.add(stick);

  // Heavy Duty Bucket
  const bucketGeom = new THREE.BoxGeometry(0.9, 0.8, 0.9);
  const bucket = new THREE.Mesh(bucketGeom, catCharcoal);
  bucket.position.set(0, 1.4, -5.6);
  bucket.rotation.x = -Math.PI / 6;
  bucket.castShadow = true;
  boomBase.add(bucket);

  machine.add(boomBase);

  return machine;
}

// ==========================================
// 3D Target Procedural Bounding Meshes
// ==========================================
function create3DTargetMesh(target: RadarTarget3D): THREE.Group {
  const group = new THREE.Group();

  const isConflict = target.in_conflict;
  const targetColor = isConflict
    ? 0xef4444
    : target.risk_level === 'CRITICAL'
    ? 0xef4444
    : target.risk_level === 'WARNING'
    ? 0xf59e0b
    : target.risk_level === 'CAUTION'
    ? 0x38bdf8
    : 0x22c55e;

  const mat = new THREE.MeshStandardMaterial({
    color: targetColor,
    metalness: 0.3,
    roughness: 0.4,
  });

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: targetColor,
    wireframe: true,
  });

  // Vertical Elevation Drop Stalk (dashed/solid line connecting target to ground)
  const stalkGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -(target.elevation_meters ?? 0), 0),
    new THREE.Vector3(0, 0, 0),
  ]);
  const stalkMat = new THREE.LineBasicMaterial({
    color: targetColor,
    transparent: true,
    opacity: 0.7,
  });
  const stalk = new THREE.Line(stalkGeom, stalkMat);
  stalk.name = 'stalk';
  group.add(stalk);

  // Ground Footprint Ring
  const footRingGeom = new THREE.RingGeometry(0.8, 1.1, 24);
  footRingGeom.rotateX(-Math.PI / 2);
  const footRingMat = new THREE.MeshBasicMaterial({
    color: targetColor,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const footRing = new THREE.Mesh(footRingGeom, footRingMat);
  footRing.position.y = -(target.elevation_meters ?? 0) + 0.02;
  group.add(footRing);

  // Target Body geometry by type
  if (target.target_type === 'PEDESTRIAN') {
    // Pedestrian figure: Torso, Head with Hardhat, Strobe vest
    const torsoGeom = new THREE.CylinderGeometry(0.25, 0.22, 0.85, 12);
    const torso = new THREE.Mesh(torsoGeom, mat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    group.add(torso);

    // Hardhat Head
    const headGeom = new THREE.SphereGeometry(0.18, 12, 12);
    const hardhatMat = new THREE.MeshStandardMaterial({ color: 0xffcd11, roughness: 0.3 });
    const head = new THREE.Mesh(headGeom, hardhatMat);
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);

    // Legs
    const legGeom = new THREE.BoxGeometry(0.35, 0.8, 0.2);
    const legs = new THREE.Mesh(legGeom, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    legs.position.y = 0.4;
    group.add(legs);
  } else if (target.target_type === 'HAUL_TRUCK') {
    // Large 797F Style Haul Truck: Wheels, Dump Body, Cab
    const dumpBodyGeom = new THREE.BoxGeometry(4.2, 2.2, 6.5);
    const dumpBody = new THREE.Mesh(dumpBodyGeom, mat);
    dumpBody.position.y = 2.4;
    dumpBody.castShadow = true;
    group.add(dumpBody);

    const truckCabGeom = new THREE.BoxGeometry(1.6, 1.8, 1.8);
    const truckCab = new THREE.Mesh(truckCabGeom, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    truckCab.position.set(-1.1, 2.2, -3.1);
    group.add(truckCab);

    // Giant Haul Tires (4 corners)
    const tireGeom = new THREE.CylinderGeometry(0.95, 0.95, 0.7, 16);
    tireGeom.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    [[-2.0, 1.0, -2.0], [2.0, 1.0, -2.0], [-2.0, 1.0, 2.2], [2.0, 1.0, 2.2]].forEach(([x, y, z]) => {
      const tire = new THREE.Mesh(tireGeom, tireMat);
      tire.position.set(x, y, z);
      tire.castShadow = true;
      group.add(tire);
    });
  } else if (target.target_type === 'LIGHT_VEHICLE') {
    // Pickup Truck (Site ute)
    const chassisGeom = new THREE.BoxGeometry(1.9, 0.9, 4.4);
    const chassis = new THREE.Mesh(chassisGeom, mat);
    chassis.position.y = 0.8;
    chassis.castShadow = true;
    group.add(chassis);

    const cabGeom = new THREE.BoxGeometry(1.7, 0.8, 2.0);
    const cab = new THREE.Mesh(cabGeom, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    cab.position.set(0, 1.5, -0.4);
    group.add(cab);

    // Roof warning amber strobe
    const strobeGeom = new THREE.BoxGeometry(0.8, 0.1, 0.2);
    const strobe = new THREE.Mesh(strobeGeom, new THREE.MeshBasicMaterial({ color: 0xffcd11 }));
    strobe.position.set(0, 1.95, -0.4);
    group.add(strobe);
  } else if (target.target_type === 'GEO_HAZARD') {
    // Volumetric wireframe trench drop or embankment zone
    const hazardGeom = new THREE.BoxGeometry(3.5, 2.0, 7.0);
    const hazard = new THREE.Mesh(hazardGeom, wireframeMat);
    hazard.position.y = 1.0;
    group.add(hazard);

    // Hazard barrier posts
    [-2.5, 0, 2.5].forEach((z) => {
      const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0xffcd11 });
      const post = new THREE.Mesh(postGeom, postMat);
      post.position.set(-1.6, 0.7, z);
      group.add(post);
    });
  } else {
    // Heavy Vehicle / General
    const boxGeom = new THREE.BoxGeometry(2.8, 2.2, 4.8);
    const box = new THREE.Mesh(boxGeom, mat);
    box.position.y = 1.2;
    box.castShadow = true;
    group.add(box);
  }

  // Selection Indicator Halo (Ring that pulses when selected)
  const haloGeom = new THREE.RingGeometry(2.0, 2.3, 32);
  haloGeom.rotateX(-Math.PI / 2);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffcd11,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeom, haloMat);
  halo.position.y = 0.05;
  halo.name = 'selectionHalo';
  halo.visible = false;
  group.add(halo);

  // Target Warning Point Light Beacon
  const beaconLight = new THREE.PointLight(targetColor, 1.5, 12);
  beaconLight.position.set(0, 2.2, 0);
  beaconLight.name = 'beaconLight';
  group.add(beaconLight);

  return group;
}
