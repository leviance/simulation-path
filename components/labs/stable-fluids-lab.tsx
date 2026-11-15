"use client";
import dynamic from "next/dynamic";

const Workshop = dynamic(() => import("./stable-fluids/workshop"));
export default function StableFluidsLab({ mode }: { mode?: string }) {
  const stage = Math.max(1, Math.min(15, Number(mode?.match(/^fluid-(\d{1,2})$/)?.[1] ?? 15)));
  return (
    <Workshop key={`${stage}-${mode ? "lesson" : "overview"}`} stage={stage} autoplay={!mode} />
  );
}
