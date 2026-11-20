"use client";
import FieldLab from "./voxel-expedition/field-lab";

export default function Voxel64Lab({ mode }: { mode?: string }) {
  const result = /^voxel64-([1-5])$/.exec(mode ?? "");
  const stage = result ? Number(result[1]) : 5;
  return <FieldLab key={stage} id={64} stage={stage} />;
}
