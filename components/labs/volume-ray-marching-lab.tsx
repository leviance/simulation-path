"use client";
import { lazy, Suspense } from "react";
const Workbench = lazy(() => import("./volume-ray-marching/workbench"));
export default function VolumeRayMarchingLab({ mode }: { mode?: string }) {
  let stage = Number(mode?.split("-").at(-1) ?? 10);
  if (!Number.isInteger(stage) || stage < 1 || stage > 10) stage = 10;
  return (
    <Suspense fallback={<p>Đang mở Volume Lightbox…</p>}>
      <Workbench stage={stage} />
    </Suspense>
  );
}
