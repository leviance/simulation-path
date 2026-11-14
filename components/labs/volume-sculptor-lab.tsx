"use client";

import { lazy, Suspense } from "react";
import { volumeMode } from "@/lib/labs/volume-sculptor/view";
import type { InteractiveLabMode } from "./types";

const TetraLab = lazy(() =>
  import("./volume-sculptor/tetra-lab").then((module) => ({ default: module.TetraLab })),
);
const VolumeWorkshop = lazy(() => import("./volume-sculptor/volume-workshop"));

export default function VolumeSculptorLab({ mode }: { mode?: InteractiveLabMode }) {
  const selected = volumeMode(mode);
  return (
    <Suspense fallback={<p className="lab-fallback">Đang tải mô hình cho bài học…</p>}>
      {selected === "tetra" ? <TetraLab /> : <VolumeWorkshop key={selected} mode={selected} />}
    </Suspense>
  );
}
