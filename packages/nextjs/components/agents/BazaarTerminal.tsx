"use client";

import { FeedPersistence } from "./FeedPersistence";
import { Leaderboard } from "./Leaderboard";
import { PaymentStream } from "./PaymentStream";
import { StatusBar } from "./StatusBar";
import { Storefront } from "./Storefront";
import { TopBar } from "./TopBar";
import { paneHeaderStyle } from "./paneStyles";

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

          <section style={{ background: "var(--bg-1)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <header style={paneHeaderStyle}>
              live payment stream
              <span style={{ color: "var(--text-lo)", fontWeight: 400 }}>· the hero</span>
            </header>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PaymentStream />
            </div>
          </section>

          <Leaderboard />
        </div>

        <StatusBar />
      </div>
    </div>
  );
}
