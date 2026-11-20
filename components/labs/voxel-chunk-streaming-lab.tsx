"use client";
import FieldLab from "./voxel-expedition/field-lab";

export default function Voxel62Lab({ mode }: { mode?: string }) {
  const result = /^voxel62-([1-4])$/.exec(mode ?? "");
  const stage = result ? Number(result[1]) : 4;
  return <FieldLab key={stage} id={62} stage={stage} />;
}
