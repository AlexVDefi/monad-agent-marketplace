"use client";

import { useFeedStore } from "./feedStore";
import { useBlockNumber } from "wagmi";

export function StatusBar() {
  const { data: block } = useBlockNumber({ watch: true, chainId: 10143 });
  const settledCount = useFeedStore(s => s.settledCount);

  return (
    <footer
      style={{
        height: 40,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 16px",
        borderTop: "1px solid var(--line)",
        background: "var(--bg-1)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-lo)",
      }}
    >
      <span className="tnum">block {block ? block.toString() : "…"}</span>
      <span>·</span>
      <span className="tnum">{settledCount} settled this session</span>
      <span>·</span>
      <span>off-chain AI · on-chain payment + identity + reputation</span>
      <div style={{ flex: 1 }} />
      <span style={{ color: "var(--text-mid)" }}>x402 · USDC · ERC-8004</span>
    </footer>
  );
}
