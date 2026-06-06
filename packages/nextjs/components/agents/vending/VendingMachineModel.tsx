"use client";

import { useEffect, useMemo, useRef } from "react";
import { useVendingStore } from "./vendingStore";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MODEL_URL = "/3d/vending_machine.glb";

/* ════════════════════════════════════════════════════════════════════════════════════════
   CALIBRATION KNOBS — tune these by eye once the machine first renders (see plan §calibration).
   The model is normalized to NORM_H world-units tall and centered at the origin, so these values
   are independent of the GLB's native scale. The ortho camera looks straight down -Z (no rotation),
   so panning camera.position.(x,y) pans the view and zoom scales it — predictable 2D-style framing.
   ════════════════════════════════════════════════════════════════════════════════════════ */
const NORM_H = 6; // normalized model height in world units
const FIT = 0.86; // fraction of canvas height the model fills in the BROWSE framing
const MODEL_ROTATION_Y = 0; // radians — rotate if the machine's front doesn't face the camera

/** Camera framings the machine eases between, keyed off the vending phase. */
const BROWSE = { panX: 0, panY: 0.15, zoomMul: 1 }; // whole machine, black screen panel emphasized
const KEYPAD = { panX: 1.435, panY: 1.225, zoomMul: 9 }; // dive in close on the keypad-column display screen
const INSERT = { panX: 1.38, panY: 1.0, zoomMul: 6.5 }; // pull back a touch + down so the coin slot is in view
const TRAY = { panX: -0.38, panY: -1.42, zoomMul: 2.4 }; // drop down + in close on the dispenser / collection tray

const DAMP = 6; // higher = snappier camera tween

useGLTF.preload(MODEL_URL);

export function VendingMachineModel() {
  const { scene } = useGLTF(MODEL_URL);
  const setLoaded = useVendingStore(s => s.setLoaded);
  const setMachineFrontZ = useVendingStore(s => s.setMachineFrontZ);
  const settledRef = useRef(false);

  // Normalize: center the model at the origin and scale it to NORM_H tall, regardless of native units.
  const { scale, offset, frontZ } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = NORM_H / (size.y || 1);
    const off = center.multiplyScalar(-s);
    // World z of the frontmost point after centering+scaling — the coin crosses this to slip inside.
    return { scale: s, offset: [off.x, off.y, off.z] as [number, number, number], frontZ: (size.z * s) / 2 };
  }, [scene]);

  useEffect(() => {
    setLoaded(true);
    setMachineFrontZ(frontZ);
    return () => setLoaded(false);
  }, [setLoaded, setMachineFrontZ, frontZ]);

  // Ease the orthographic camera toward the framing for the current phase. Zoom is derived from the
  // live canvas height so the model keeps the SAME fraction of the box at every viewport size — which
  // is what lets the percentage-positioned HTML overlay stay aligned without per-frame projection.
  useFrame((state, dt) => {
    const cam = state.camera as THREE.OrthographicCamera;
    const phase = useVendingStore.getState().phase;
    const target =
      phase === "browse"
        ? BROWSE
        : phase === "inserting"
          ? INSERT
          : phase === "vended" || phase === "error"
            ? TRAY
            : KEYPAD;
    const baseZoom = (FIT * state.size.height) / NORM_H;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, target.panX, DAMP, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, target.panY, DAMP, dt);
    cam.zoom = THREE.MathUtils.damp(cam.zoom, baseZoom * target.zoomMul, DAMP, dt);
    cam.updateProjectionMatrix();

    // Mark the camera "settled" once it's essentially at the target, so the overlay only shows after
    // the move finishes (no UI sliding around mid-tween). Push to the store only on change.
    const targetZoom = baseZoom * target.zoomMul;
    const settled =
      Math.abs(cam.position.x - target.panX) < 0.02 &&
      Math.abs(cam.position.y - target.panY) < 0.02 &&
      Math.abs(cam.zoom - targetZoom) < targetZoom * 0.012;
    if (settled !== settledRef.current) {
      settledRef.current = settled;
      useVendingStore.getState().setCameraSettled(settled);
    }
  });

  return (
    <group scale={scale} position={offset}>
      <group rotation={[0, MODEL_ROTATION_Y, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
