"use client";

import { Suspense } from "react";
import { CoinModel } from "./CoinModel";
import { VendingMachineModel } from "./VendingMachineModel";
import { Canvas } from "@react-three/fiber";

/**
 * Background 3D layer: the vending machine rendered front-on with an orthographic camera. Holds NO
 * DOM UI — the interactive overlay lives on top in plain HTML (crisp + typable). Performance-minded:
 * clamped dpr, no shadows, no postprocessing, alpha so the .bazaar gradient shows behind the machine.
 * The camera framing/zoom is driven entirely by <VendingMachineModel> (reads the vending phase).
 */
export function VendingCanvas() {
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      frameloop="always"
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 10], zoom: 50, near: 0.1, far: 100 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={[0xffffff, 0x33264d, 0.6]} />
      <directionalLight position={[4, 6, 8]} intensity={1.4} />
      <directionalLight position={[-6, 2, 4]} intensity={0.5} color={0x836ef9} />
      <Suspense fallback={null}>
        <VendingMachineModel />
      </Suspense>
      <Suspense fallback={null}>
        <CoinModel />
      </Suspense>
    </Canvas>
  );
}
