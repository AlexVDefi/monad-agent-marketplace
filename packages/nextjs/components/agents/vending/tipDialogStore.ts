import { create } from "zustand";
import type { AgentMeta } from "~~/services/agents/registry";

/**
 * Drives the shared tip dialog. Any surface (the dispenser tray, the leaderboard, …) calls open(agent)
 * to raise the SAME tip modal, so there's one tip flow + one code path everywhere — not a per-surface
 * reimplementation. Pure UI state; the transfer/lifecycle lives in useTipAgent.
 */
interface TipDialogState {
  agent: AgentMeta | null;
  open: (agent: AgentMeta) => void;
  close: () => void;
}

export const useTipDialog = create<TipDialogState>(set => ({
  agent: null,
  open: agent => set({ agent }),
  close: () => set({ agent: null }),
}));
