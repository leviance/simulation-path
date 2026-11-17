"use client";
import WaterWorkshop from "./sph-water-gpu/workshop3d";
export default function SphWaterGpuLab({ mode }: { mode?: string }) {
  const requested = Number(mode?.match(/^sph3-(\d{1,2})$/)?.[1] ?? 13);
  const stage = Math.max(1, Math.min(13, requested));
  return <WaterWorkshop key={stage} stage={stage} />;
}
