"use client";
import FieldLab from "./voxel-expedition/field-lab";

export default function Voxel61Lab({ mode }: { mode?: string }) {
  const result = /^voxel61-([1-4])$/.exec(mode ?? "");
  const stage = result ? Number(result[1]) : 4;
  return <FieldLab key={stage} id={61} stage={stage} />;
}
