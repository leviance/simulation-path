"use client";
import { useEffect, useState } from "react";
import type { Camera, Settings } from "@/lib/labs/volume-ray-marching/model";
import type { Volume } from "@/lib/labs/volume-ray-marching/volume";
import type { Preview } from "@/lib/labs/volume-ray-marching/jobs";
export function usePreview(
  camera: Camera,
  volume: Volume | null,
  datasetKey: string,
  settings: Settings,
  stage: number,
  aspect: number,
  interactive: boolean,
  enabled = true,
) {
  const key = JSON.stringify([camera, datasetKey, settings, stage, aspect, interactive]);
  const [image, setImage] = useState<{ key: string; image: Preview; complete: boolean } | null>(
    null,
  );
  const [progress, setProgress] = useState({ key: "", value: 0 });
  const [failure, setFailure] = useState({ key: "", message: "" });
  useEffect(() => {
    if (!enabled || (stage >= 4 && !volume)) return;
    const controller = new AbortController();
    const dimensions = (longest: number) => {
      if (aspect >= 1) return { width: longest, height: Math.max(1, Math.round(longest / aspect)) };
      return { height: longest, width: Math.max(1, Math.round(longest * aspect)) };
    };
    void import("@/lib/labs/volume-ray-marching/jobs")
      .then(async ({ renderPreview }) => {
        controller.signal.throwIfAborted();
        const coarse = dimensions(48);
        const first = await renderPreview(
          camera,
          volume,
          settings,
          stage,
          coarse.width,
          coarse.height,
          controller.signal,
          undefined,
          aspect,
        );
        if (!controller.signal.aborted) setImage({ key, image: first, complete: interactive });
        if (interactive) return;
        const fine = dimensions(160);
        const final = await renderPreview(
          camera,
          volume,
          settings,
          stage,
          fine.width,
          fine.height,
          controller.signal,
          (value) => setProgress({ key, value }),
          aspect,
        );
        if (!controller.signal.aborted) setImage({ key, image: final, complete: true });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setFailure({ key, message: String(error) });
      });
    return () => controller.abort();
  }, [camera, volume, settings, stage, aspect, interactive, key, enabled]);
  return {
    image: image?.image ?? null,
    ready: enabled && image?.key === key && image.complete,
    key,
    progress: progress.key === key ? progress.value : 0,
    error: failure.key === key ? failure.message : "",
  };
}
