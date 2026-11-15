"use client";
import dynamic from "next/dynamic";
const Workshop = dynamic(() => import("./sph-water/workshop"));
export default function SphWaterLab({ mode }: { mode?: string }) {
  const stage = Number(mode?.match(/^sph-(\d+)$/)?.[1] ?? 12);
  return <Workshop key={stage} stage={stage} autoplay={!mode} />;
}
