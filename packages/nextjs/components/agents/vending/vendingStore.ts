import { create } from "zustand";

/**
 * Vending-machine UI state machine. Pure presentation/flow state — holds NO three.js and NO payment
 * logic. The real x402 payment lifecycle still lives in useFireCall/feedStore; this store only drives
 * which overlay panel is shown and which camera framing the machine eases toward.
 *
 *   browse   → agent grid on the screen panel (camera framed on the whole machine)
 *   selected → keypad panel: type a prompt + PAY (camera dropped to the keypad/coin-slot)
 *   paying   → PAY pressed, fire() in flight (keypad camera, busy state)
 *   vended   → result dropped into the dispenser tray
 *   error    → payment/run failed, shown in the tray with a retry
 */
export type VendPhase = "browse" | "selected" | "paying" | "vended" | "error";

export interface VendResult {
  output: string;
  taskHash?: `0x${string}`;
  /** What the buyer actually settled, in USDC micro-units (exact price for our agents). */
  settledMicroUsdc?: number;
}

interface VendingState {
  phase: VendPhase;
  selectedAgentId: string | null;
  prompt: string;
  result: VendResult | null;
  error: string | null;
  /** true once the GLB has loaded + painted, so the overlay can enable interaction. */
  loaded: boolean;

  select: (id: string) => void;
  setPrompt: (prompt: string) => void;
  /** PAY pressed — enter the busy state while fire() runs. */
  startPaying: () => void;
  vend: (result: VendResult) => void;
  fail: (error: string) => void;
  /** Tray → start over: clear everything, back to the agent grid. */
  reset: () => void;
  /** Keypad → back to the agent grid (keep nothing). */
  back: () => void;
  /** Error tray → back to the keypad keeping the same agent + prompt, ready to pay again. */
  retry: () => void;
  setLoaded: (loaded: boolean) => void;
}

export const useVendingStore = create<VendingState>(set => ({
  phase: "browse",
  selectedAgentId: null,
  prompt: "",
  result: null,
  error: null,
  loaded: false,

  select: id => set({ phase: "selected", selectedAgentId: id, prompt: "", result: null, error: null }),
  setPrompt: prompt => set({ prompt }),
  startPaying: () => set({ phase: "paying", error: null }),
  vend: result => set({ phase: "vended", result, error: null }),
  fail: error => set({ phase: "error", error }),
  reset: () => set({ phase: "browse", selectedAgentId: null, prompt: "", result: null, error: null }),
  back: () => set({ phase: "browse", prompt: "", result: null, error: null }),
  retry: () => set({ phase: "selected", error: null }),
  setLoaded: loaded => set({ loaded }),
}));
