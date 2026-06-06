"use client";

import { useMemo, useRef } from "react";
import { useVendingStore } from "./vendingStore";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COIN_URL = "/3d/monad_coin.glb";
useGLTF.preload(COIN_URL);

/* ════════════════════════════════════════════════════════════════════════════════════════
   CALIBRATION KNOBS — tune by eye against the machine's coin slot at the INSERT framing.
   SLOT.{x,y} is the slit on the machine front. The coin's z is taken from the machine's front-face
   z (from the store): it rests FRONT_GAP in front, then on insert travels back to INSIDE_DEPTH
   behind the face — so the machine geometry actually occludes it and it slips INSIDE for real.
   COIN_ROT orients the model so its face points at the camera.
   ════════════════════════════════════════════════════════════════════════════════════════ */
const SLOT = { x: 1.535, y: 0.75 }; // the rectangular coin slit (right of the round slot)
const COIN_DIAMETER = 0.15; // world units (close to the slit width so it reads as fitting in)
const COIN_ROT: [number, number, number] = [0, 0, 0]; // base: face toward the camera
const DROP_FROM = 0.8; // coin starts this far above the slit
const HOVER = 0.12; // hover this far above the slit before laying down
const FRONT_GAP = 0.1; // coin rests this far IN FRONT of the machine face while dropping/laying
const INSIDE_DEPTH = 2.2; // how far BEHIND the face it travels (machine occludes it → goes inside)
const TRAVEL_MS = 750; // descend (face-on, spinning)
const LAY_MS = 480; // rotate to lay flat so it can enter the horizontal slit
const INSERT_MS = 660; // travel back through the slot, into the machine
const TOTAL_MS = TRAVEL_MS + LAY_MS + INSERT_MS;
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * The Monad coin. Hidden until the buyer confirms in their wallet (vending phase "inserting"), then
 * it drops + spins into the coin slot and slips away. When the animation finishes it tells the store
 * (coinAnimationDone) so the tray reveal waits for BOTH the coin and the output.
 */
export function CoinModel() {
  const { scene } = useGLTF(COIN_URL);
  const coin = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const wasInsertingRef = useRef(false);
  const doneRef = useRef(false);

  // Normalize: center at origin + scale to COIN_DIAMETER, regardless of the model's native units.
  const norm = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = COIN_DIAMETER / (Math.max(size.x, size.y, size.z) || 1);
    return { scale: s, offset: [-center.x * s, -center.y * s, -center.z * s] as [number, number, number] };
  }, [scene]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const phase = useVendingStore.getState().phase;

    if (phase !== "inserting") {
      g.visible = false;
      wasInsertingRef.current = false;
      return;
    }

    // entering the inserting phase → restart the animation clock
    if (!wasInsertingRef.current) {
      elapsedRef.current = 0;
      doneRef.current = false;
      wasInsertingRef.current = true;
    }

    g.visible = true;
    g.scale.setScalar(1);
    elapsedRef.current += dt * 1000;
    const t = elapsedRef.current;
    const frontZ = useVendingStore.getState().machineFrontZ;
    const restZ = frontZ + FRONT_GAP; // just in front of the machine face
    const insideZ = frontZ - INSIDE_DEPTH; // behind the face → occluded by the machine

    if (t <= TRAVEL_MS) {
      // descend from above to a hover point, face-on + spinning so the Monad logo reads
      const k = t / TRAVEL_MS;
      g.position.set(SLOT.x, SLOT.y + HOVER + DROP_FROM * (1 - easeOutCubic(k)), restZ);
      g.rotation.x = 0;
      g.rotation.y += dt * 6;
    } else if (t <= TRAVEL_MS + LAY_MS) {
      // lay flat (edge-on to the camera) so the disc aligns with the horizontal slit; unwind the
      // descent spin so it lays down cleanly rather than tilted
      const k = (t - TRAVEL_MS) / LAY_MS;
      g.position.set(SLOT.x, SLOT.y + HOVER, restZ);
      g.rotation.x = -(Math.PI / 2) * easeInOut(k);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, 0, 10, dt);
    } else if (t <= TOTAL_MS) {
      // push it down to the slit AND back through the face — the machine geometry swallows it
      const k = (t - TRAVEL_MS - LAY_MS) / INSERT_MS;
      const e = easeInOut(k);
      g.position.set(SLOT.x, SLOT.y + HOVER * (1 - e), restZ + (insideZ - restZ) * e);
      g.rotation.x = -Math.PI / 2;
      g.rotation.y = 0;
    } else {
      g.visible = false;
      if (!doneRef.current) {
        doneRef.current = true;
        useVendingStore.getState().coinAnimationDone();
      }
    }
  });

  return (
    <group ref={groupRef} visible={false} rotation={COIN_ROT}>
      <group scale={norm.scale} position={norm.offset}>
        <primitive object={coin} />
      </group>
    </group>
  );
}
