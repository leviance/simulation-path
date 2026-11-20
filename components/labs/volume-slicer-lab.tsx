"use client";
import { lazy, Suspense } from "react";
const Workbench = lazy(() => import("./volume-slicer/workbench"));
export default function VolumeSlicerLab({ mode = "slice53-9" }: { mode?: string }) {
  return (
    <Suspense fallback={<p role="status">Đang mở Scalar / Slice Workbench…</p>}>
      <Workbench mode={mode} />
    </Suspense>
  );
}
