import type { CSSProperties } from "react";

export const paneHeaderStyle: CSSProperties = {
  height: 40,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 18px",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.01em",
  color: "var(--text-mid)",
  borderBottom: "1px solid var(--line)",
};

export const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 11px",
  borderRadius: 999,
  fontSize: 11,
  color: "var(--text-mid)",
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  letterSpacing: "0.01em",
};
