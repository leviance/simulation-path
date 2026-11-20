"use client";
import { useEffect, useState } from "react";
import type { Preset } from "@/lib/labs/volume-ray-marching/model";
import type { Dataset } from "@/lib/labs/volume-ray-marching/jobs";
export function useDataset(preset: Preset, side: number, stage: number, retry: number) {
  const key = preset + ":" + side + ":" + retry;
  const [stored, setStored] = useState<{ key: string; data: Dataset } | null>(null);
  const [progress, setProgress] = useState({ key: "", value: 0 });
  const [failure, setFailure] = useState({ key: "", message: "" });
  useEffect(() => {
    if (stage < 4) return;
    const controller = new AbortController();
    void import("@/lib/labs/volume-ray-marching/jobs")
      .then(async ({ buildDataset }) => {
        controller.signal.throwIfAborted();
        return buildDataset(preset, side, controller.signal, (value) =>
          setProgress({ key, value }),
        );
      })
      .then((data) => {
        if (!controller.signal.aborted) setStored({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setFailure({ key, message: String(error) });
      });
    return () => controller.abort();
  }, [preset, side, stage, retry, key]);
  return {
    data: stored?.data ?? null,
    key: stored?.key ?? "none",
    ready: stage < 4 || stored?.key === key,
    progress: progress.key === key ? progress.value : 0,
    error: failure.key === key ? failure.message : "",
  };
}
