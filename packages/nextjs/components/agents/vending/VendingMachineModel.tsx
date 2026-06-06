"use client";

import { useEffect, useMemo } from "react";
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

/** Two camera framings the machine eases between, keyed off the vending phase. */
const BROWSE = { panX: 0, panY: 0.15, zoomMul: 1 }; // whole machine, black screen panel emphasized
const KEYPAD = { panX: 1.46, panY: 1.23, zoomMul: 9 }; // dive in close on the keypad-column display screen

const DAMP = 6; // higher = snappier camera tween

useGLTF.preload(MODEL_URL);

export function VendingMachineModel() {
  const { scene } = useGLTF(MODEL_URL);
  const setLoaded = useVendingStore(s => s.setLoaded);

  // Normalize: center the model at the origin and scale it to NORM_H tall, regardless of native units.
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = NORM_H / (size.y || 1);
    const off = center.multiplyScalar(-s);
    return { scale: s, offset: [off.x, off.y, off.z] as [number, number, number] };
  }, [scene]);

  useEffect(() => {
    setLoaded(true);
    return () => setLoaded(false);
  }, [setLoaded]);

  // Ease the orthographic camera toward the framing for the current phase. Zoom is derived from the
  // live canvas height so the model keeps the SAME fraction of the box at every viewport size — which
  // is what lets the percentage-positioned HTML overlay stay aligned without per-frame projection.
  useFrame((state, dt) => {
    const cam = state.camera as THREE.OrthographicCamera;
    const target = useVendingStore.getState().phase === "browse" ? BROWSE : KEYPAD;
    const baseZoom = (FIT * state.size.height) / NORM_H;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, target.panX, DAMP, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, target.panY, DAMP, dt);
    cam.zoom = THREE.MathUtils.damp(cam.zoom, baseZoom * target.zoomMul, DAMP, dt);
    cam.updateProjectionMatrix();
  });

  return (
    <group scale={scale} position={offset}>
      <group rotation={[0, MODEL_ROTATION_Y, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
