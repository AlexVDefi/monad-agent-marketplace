"use client";

import { useEffect, useRef } from "react";
import { type FeedRow, MAX_ROWS, useFeedStore } from "./feedStore";
import { useAccount } from "wagmi";

/**
 * Per-wallet feed persistence. Stores the live feed (rows + outputs + counters) in localStorage
 * keyed by the connected wallet, so a refresh restores everything that wallet has done — including
 * the LLM outputs, which never go on-chain (only their taskHash does). All client-only (useEffect),
 * so it's SSR-safe. Renders nothing.
 *
 * Scope note: this is browser-local. The leaderboard's reputation/counts come from chain
 * (useAgentStats) and persist cross-device; the personal call history lives here.
 */
const key = (addr: string) => `bazaar:feed:v1:${addr.toLowerCase()}`;

interface Snapshot {
  rows: FeedRow[];
  totalMicroUsdc: number;
  settledCount: number;
}

export function FeedPersistence() {
  const { address } = useAccount();
  const loadedFor = useRef<string | null>(null);

  // Load this wallet's history on connect / wallet switch (replace whatever's shown).
  useEffect(() => {
    if (!address || typeof window === "undefined") return;
    if (loadedFor.current === address) return;
    loadedFor.current = address;
    try {
      const raw = window.localStorage.getItem(key(address));
      if (raw) {
        const snap = JSON.parse(raw) as Partial<Snapshot>;
        useFeedStore.setState({
          rows: Array.isArray(snap.rows) ? snap.rows.slice(0, MAX_ROWS) : [],
          totalMicroUsdc: Number(snap.totalMicroUsdc ?? 0),
          settledCount: Number(snap.settledCount ?? 0),
        });
      } else {
        // fresh wallet → start clean rather than inheriting the previous wallet's feed
        useFeedStore.setState({ rows: [], totalMicroUsdc: 0, settledCount: 0 });
      }
    } catch {
      /* ignore corrupt/unavailable storage */
    }
  }, [address]);

  // Debounced save on every store change.
  useEffect(() => {
    if (!address || typeof window === "undefined") return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const unsub = useFeedStore.subscribe(state => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          window.localStorage.setItem(
            key(address),
            JSON.stringify({
              rows: state.rows,
              totalMicroUsdc: state.totalMicroUsdc,
              settledCount: state.settledCount,
            }),
          );
        } catch {
          /* quota / unavailable — non-fatal */
        }
      }, 400);
    });
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [address]);

  return null;
}
