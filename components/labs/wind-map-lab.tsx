"use client";
import { lazy, Suspense } from "react";
const WindWorkshop = lazy(() => import("./wind-map/workshop"));
export default function WindMapLab({ mode }: { mode?: string }) {
  const stage = Math.max(1, Math.min(9, Number(mode?.match(/^wind-(\d)$/)?.[1] ?? 9)));
  return (
    <Suspense fallback={<p className="lab-fallback">Đang tải bản đồ gió; tracer chưa chạy.</p>}>
      <WindWorkshop key={stage} stage={stage} />
    </Suspense>
  );
}
