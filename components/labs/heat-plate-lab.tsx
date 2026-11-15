"use client";
import { lazy, Suspense } from "react";
import { heatStage } from "@/lib/labs/heat-plate/view";
const HeatWorkshop = lazy(() => import("./heat-plate/workshop"));

export default function HeatPlateLab({ mode }: { mode?: string }) {
  const stage = heatStage(mode);
  return (
    <Suspense fallback={<p className="lab-fallback">Đang tải trường nhiệt; mô phỏng chưa chạy.</p>}>
      <HeatWorkshop key={stage} stage={stage} />
    </Suspense>
  );
}
