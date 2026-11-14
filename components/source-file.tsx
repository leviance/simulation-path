"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { HighlightedCode } from "@/components/highlighted-code";
import { fetchProjectSource } from "@/lib/source-download";
import type { HighlightLanguage } from "@/lib/syntax-highlighter";
import { useClientReady } from "./use-client-ready";

export function SourceFile({
  file,
  projectId,
  checkpoint,
  lineCount,
  initialSource,
  open: initiallyOpen,
}: {
  file: { path: string; language: HighlightLanguage };
  projectId: string;
  checkpoint: "starter" | number | "final";
  lineCount: number;
  initialSource?: string;
  open: boolean;
}) {
  const ready = useClientReady();
  const [open, setOpen] = useState(initiallyOpen);
  const [source, setSource] = useState(initialSource);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);
    if (!nextOpen || source !== undefined || loading) return;

    setLoading(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    void fetchProjectSource(projectId, checkpoint, file.path, { signal: controller.signal })
      .then((value) => {
        if (request.current === controller) setSource(value);
      })
      .catch((reason: unknown) => {
        if (request.current === controller)
          setError(reason instanceof Error ? reason.message : "Không thể tải mã nguồn.");
      })
      .finally(() => {
        if (request.current === controller) {
          request.current = null;
          setLoading(false);
        }
      });
  };

  return (
    <details className="source-file" data-ready={ready} open={open} onToggle={onToggle}>
      <summary
        aria-disabled={!ready}
        tabIndex={ready ? 0 : -1}
        style={ready ? undefined : { pointerEvents: "none", opacity: 0.65 }}
      >
        <code>{file.path}</code>
        <span>
          {lineCount} dòng · {file.language}
          {!ready && " · đang khởi tạo bộ đọc mã"}
        </span>
      </summary>
      {open && source !== undefined && <HighlightedCode code={source} language={file.language} />}
      {open && loading && <p role="status">Đang tải mã nguồn…</p>}
      {open && error && <p role="alert">{error}</p>}
    </details>
  );
}
