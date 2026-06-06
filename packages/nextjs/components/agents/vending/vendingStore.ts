import { create } from "zustand";

/**
 * Vending-machine UI state machine. Pure presentation/flow state — holds NO three.js and NO payment
 * logic. The real x402 payment lifecycle still lives in useFireCall/feedStore; this store only drives
 * which overlay panel is shown and which camera framing the machine eases toward.
 *
 *   browse    → agent grid on the screen panel (camera framed on the whole machine)
 *   selected  → keypad panel: type a prompt + PAY (camera dropped to the keypad/coin-slot)
 *   paying    → PAY pressed, fire() in flight (keypad camera, busy state)
 *   inserting → buyer confirmed in the wallet → a coin drops into the coin slot (camera on the slot)
 *   vended    → result dropped into the dispenser tray
 *   error     → payment/run failed, shown in the tray with a retry
 */
export type VendPhase = "browse" | "selected" | "paying" | "inserting" | "vended" | "error";

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
  /** Output held while the coin animation is still playing (vend waits for both). */
  pendingResult: VendResult | null;
  /** true once the coin-insert animation has finished. */
  coinDone: boolean;
  /** true once the GLB has loaded + painted, so the overlay can enable interaction. */
  loaded: boolean;
  /** true once the camera tween has reached its target — the overlay only shows when settled. */
  cameraSettled: boolean;
  /** World z of the machine's front face — the coin crosses it to slip inside (set by the model). */
  machineFrontZ: number;

  select: (id: string) => void;
  setPrompt: (prompt: string) => void;
  /** PAY pressed — enter the busy state while fire() runs. */
  startPaying: () => void;
  /** Wallet confirmed (x402 "signed") — drop the coin into the slot. */
  insertCoin: () => void;
  /** fire() resolved with output — show the tray once the coin animation has also finished. */
  settleResult: (result: VendResult) => void;
  /** The coin-insert animation finished — show the tray once the output has also arrived. */
  coinAnimationDone: () => void;
  /** Direct vend (used by tests / non-coin paths). */
  vend: (result: VendResult) => void;
  fail: (error: string) => void;
  /** Tray → start over: clear everything, back to the agent grid. */
  reset: () => void;
  /** Keypad → back to the agent grid (keep nothing). */
  back: () => void;
  /** Error tray → back to the keypad keeping the same agent + prompt, ready to pay again. */
  retry: () => void;
  setLoaded: (loaded: boolean) => void;
  setCameraSettled: (settled: boolean) => void;
  setMachineFrontZ: (z: number) => void;
}

export const useVendingStore = create<VendingState>(set => ({
  phase: "browse",
  selectedAgentId: null,
  prompt: "",
  result: null,
  error: null,
  pendingResult: null,
  coinDone: false,
  loaded: false,
  cameraSettled: false,
  machineFrontZ: 1.5,

  select: id =>
    set({ phase: "selected", selectedAgentId: id, prompt: "", result: null, error: null, pendingResult: null }),
  setPrompt: prompt => set({ prompt }),
  startPaying: () => set({ phase: "paying", error: null }),
  insertCoin: () => set({ phase: "inserting", coinDone: false, pendingResult: null, result: null, error: null }),
  settleResult: result =>
    set(s => (s.coinDone ? { phase: "vended", result, pendingResult: null } : { pendingResult: result })),
  coinAnimationDone: () =>
    set(s =>
      s.pendingResult
        ? { phase: "vended", result: s.pendingResult, coinDone: true, pendingResult: null }
        : { coinDone: true },
    ),
  vend: result => set({ phase: "vended", result, error: null }),
  fail: error => set({ phase: "error", error, coinDone: false, pendingResult: null }),
  reset: () =>
    set({
      phase: "browse",
      selectedAgentId: null,
      prompt: "",
      result: null,
      error: null,
      pendingResult: null,
      coinDone: false,
    }),
  back: () => set({ phase: "browse", prompt: "", result: null, error: null, pendingResult: null, coinDone: false }),
  retry: () => set({ phase: "selected", error: null, pendingResult: null, coinDone: false }),
  setLoaded: loaded => set({ loaded }),
  setCameraSettled: cameraSettled => set({ cameraSettled }),
  setMachineFrontZ: machineFrontZ => set({ machineFrontZ }),
}));
