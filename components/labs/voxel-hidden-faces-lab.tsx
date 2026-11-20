"use client";
import FieldLab from "./voxel-expedition/field-lab";

export default function Voxel59Lab({ mode }: { mode?: string }) {
  const result = /^voxel59-([1-3])$/.exec(mode ?? "");
  const stage = result ? Number(result[1]) : 3;
  return <FieldLab key={stage} id={59} stage={stage} />;
}
