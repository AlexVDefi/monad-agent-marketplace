"use client";

import { CenterPane } from "./CenterPane";
import { FeedPersistence } from "./FeedPersistence";
import { Leaderboard } from "./Leaderboard";
import { StatusBar } from "./StatusBar";
import { Storefront } from "./Storefront";
import { TopBar } from "./TopBar";

/**
 * The 3-column terminal shell. Holds NO fast-ticking state — the payment tick lives inside
 * <PaymentStream>, the block tick inside <StatusBar>, the counter inside <SettledCounter>. So a
 * settlement only re-renders the stream, never the whole tree.
 */
export function BazaarTerminal() {
  return (
    <div className="bazaar">
      <FeedPersistence />
      <div style={{ display: "grid", gridTemplateRows: "56px 1fr 40px", height: "100%", minHeight: 0 }}>
        <TopBar />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px minmax(540px, 1fr) 320px",
            gap: 1,
            background: "var(--line)",
            minHeight: 0,
          }}
        >
          <Storefront />

          <CenterPane />

          <Leaderboard />
        </div>

        <StatusBar />
      </div>
    </div>
  );
}
