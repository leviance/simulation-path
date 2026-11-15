"use client";

import { lazy, Suspense } from "react";
import { sandStage } from "@/lib/labs/falling-sand/view";
import type { InteractiveLabMode } from "./types";

const SandWorkshop = lazy(() => import("./falling-sand/workshop"));

export default function FallingSandLab({ mode }: { mode?: InteractiveLabMode }) {
  const stage = sandStage(mode);
  return (
    <Suspense
      fallback={<p className="lab-fallback">Đang tải lưới vật liệu; mô phỏng chưa chạy.</p>}
    >
      <SandWorkshop key={stage} stage={stage} />
    </Suspense>
  );
}
