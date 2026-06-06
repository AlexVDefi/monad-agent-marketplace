"use client";

import { AgentSwarm } from "./AgentSwarm";
import { CenterPane } from "./CenterPane";
import { DemoStorm } from "./DemoStorm";
import { FeedPersistence } from "./FeedPersistence";
import { Leaderboard } from "./Leaderboard";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";
import { VendingHero } from "./vending/VendingHero";

/**
 * The 3-column terminal shell. The vending machine is now the center HERO (it's the agent picker +
 * pay surface, replacing the old Storefront). The live stream + history (CenterPane) move to the
 * left flank — with the demo-traffic buttons (AgentSwarm / DemoStorm) relocated to its footer — and
 * the Leaderboard stays on the right. Holds NO fast-ticking state — the payment tick lives inside
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
            gridTemplateColumns: "minmax(320px, 380px) minmax(560px, 1fr) minmax(300px, 340px)",
            gap: 1,
            background: "var(--line)",
            minHeight: 0,
          }}
        >
          {/* left flank: the live stream + history, with the demo-traffic buttons in the footer */}
          <div style={{ display: "grid", gridTemplateRows: "1fr auto", minHeight: 0, background: "var(--bg-1)" }}>
            <CenterPane />
            <div
              style={{
                padding: 12,
                borderTop: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <AgentSwarm />
              <DemoStorm />
            </div>
          </div>

          {/* center hero: the 3D vending machine (desktop) / storefront fallback (low-end) */}
          <VendingHero />

          {/* right flank: reputation leaderboard */}
          <Leaderboard />
        </div>

        <StatusBar />
      </div>
    </div>
  );
}
