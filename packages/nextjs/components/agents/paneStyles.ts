import type { CSSProperties } from "react";

export const paneHeaderStyle: CSSProperties = {
  height: 36,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 16px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-mid)",
  borderBottom: "1px solid var(--line)",
};

export const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: 6,
  fontSize: 11,
  color: "var(--text-mid)",
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  letterSpacing: "0.04em",
};
