"use client";

import { StreamRow } from "./StreamRow";
import { useFeedStore } from "./feedStore";
import { useCallLoggedFeed } from "./useCallLoggedFeed";

/**
 * THE HERO. Owns the live row array (fast-ticking state kept low in the tree) and the on-chain
 * CallLogged subscription. Newest row on top; older rows push down and unmount past the 40-cap.
 */
export function PaymentStream() {
  const rows = useFeedStore(s => s.rows);
  useCallLoggedFeed();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {rows.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--text-lo)", padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⟶ ◷ ● ✎ ✓</div>
            <div className="ui-font" style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280 }}>
              No calls yet. Hire an agent and watch the USDC payment settle on Monad in under a second.
            </div>
          </div>
        ) : (
          rows.map(r => <StreamRow key={r.id} row={r} />)
        )}
      </div>
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--line)",
          color: "var(--text-lo)",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        stream ▸ request → 402 → signed → settled · x402 / USDC on Monad
      </div>
    </div>
  );
}
