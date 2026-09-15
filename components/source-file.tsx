"use client";

import { useState, type SyntheticEvent } from "react";
import { HighlightedCode } from "@/components/highlighted-code";
import { generatedCheckpointSourceLoaders } from "@/lib/generated-checkpoint-sources";
import type { HighlightLanguage } from "@/lib/syntax-highlighter";

type ProjectId = keyof typeof generatedCheckpointSourceLoaders;

interface LazySourceModule {
  files: ReadonlyArray<{ path: string; source: string }>;
}

interface LazySourceRegistry {
  generatedProjectSource: {
    loadCommon(): Promise<LazySourceModule>;
    snapshots: Record<string, () => Promise<LazySourceModule>>;
  };
}

async function loadSource(
  projectId: string,
  checkpoint: "starter" | number | "final",
  path: string,
) {
  const loadRegistry = generatedCheckpointSourceLoaders[projectId as ProjectId];
  if (!loadRegistry) throw new Error(`Không tìm thấy source registry của Project ${projectId}.`);

  const registry = (await loadRegistry()) as unknown as LazySourceRegistry;
  const project = registry.generatedProjectSource;
  const loadSnapshot = project.snapshots[String(checkpoint)];
  if (!loadSnapshot) throw new Error(`Không tìm thấy checkpoint ${String(checkpoint)}.`);

  const [common, snapshot] = await Promise.all([project.loadCommon(), loadSnapshot()]);
  const file = [...common.files, ...snapshot.files].find((candidate) => candidate.path === path);
  if (!file) throw new Error(`Không tìm thấy tệp ${path}.`);
  return file.source;
}

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
  const [open, setOpen] = useState(initiallyOpen);
  const [source, setSource] = useState(initialSource);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);
    if (!nextOpen || source !== undefined || loading) return;

    setLoading(true);
    setError("");
    void loadSource(projectId, checkpoint, file.path)
      .then(setSource)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Không thể tải mã nguồn.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <details className="source-file" open={open} onToggle={onToggle}>
      <summary>
        <code>{file.path}</code>
        <span>
          {lineCount} dòng · {file.language}
        </span>
      </summary>
      {open && source !== undefined && <HighlightedCode code={source} language={file.language} />}
      {open && loading && <p role="status">Đang tải mã nguồn…</p>}
      {open && error && <p role="alert">{error}</p>}
    </details>
  );
}
