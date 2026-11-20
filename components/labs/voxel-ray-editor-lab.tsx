"use client";
import FieldLab from "./voxel-expedition/field-lab";

export default function Voxel60Lab({ mode }: { mode?: string }) {
  const result = /^voxel60-([1-3])$/.exec(mode ?? "");
  const stage = result ? Number(result[1]) : 3;
  return <FieldLab key={stage} id={60} stage={stage} />;
}
