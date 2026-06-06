import { appendFile } from "fs/promises";
import path from "path";

/**
 * SERVER-ONLY observability sink. Appends one JSON line per completed agent call (prompt + output +
 * receipt) to a JSONL file, so an external watcher (the terminal agent) can read/tail and act on
 * outputs. Best-effort and fire-and-forget — never blocks or fails the paid response.
 *
 * Path: AGENT_CALL_LOG (absolute) or <cwd>/.agent-calls.jsonl. Lives outside the git repo by default.
 */
export const CALL_LOG_PATH = process.env.AGENT_CALL_LOG || path.join(process.cwd(), ".agent-calls.jsonl");

export interface CallLogRecord {
  agent: string;
  agentId: number;
  agentName: string;
  prompt: string;
  output: string;
  scheme: "exact" | "upto";
  /** Actual USD cost incurred (LLM tokens; 0 for deterministic). */
  costUsd: number;
  /** USD actually charged the buyer (metered for upto, fixed for exact). */
  settledUsd: number;
  taskHash: string;
}

export async function appendCallLog(rec: CallLogRecord): Promise<void> {
  try {
    const marginUsd = Number((rec.settledUsd - rec.costUsd).toFixed(6));
    const line = JSON.stringify({ ts: new Date().toISOString(), ...rec, marginUsd }) + "\n";
    await appendFile(CALL_LOG_PATH, line, "utf8");
  } catch (e) {
    console.error("[callLog] append failed:", e instanceof Error ? e.message : e);
  }
}
