"use client";

import { useState, type SyntheticEvent } from "react";
import { HighlightedCode } from "@/components/highlighted-code";

// Only the plain unified diff crosses the RSC boundary. Highlighting is deferred
// until the reader expands it, instead of shipping a second colored code tree.
export function SourceDiff({ path, diff }: { path: string; diff: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="source-diff"
      open={open}
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <code>{path}</code>
      </summary>
      {open && <HighlightedCode code={diff} language="diff" />}
    </details>
  );
}
