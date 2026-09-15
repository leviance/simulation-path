"use client";

import RasterCircleLab from "./raster-circle-lab";
import RasterLineLab from "./raster-line-lab";
import RasterRectangleLab from "./raster-rectangle-lab";
import type { InteractiveLabMode } from "./types";

export default function RasterLab({ mode }: { mode?: InteractiveLabMode }) {
  if (mode === "raster-rectangle") return <RasterRectangleLab />;
  if (mode === "raster-circle") return <RasterCircleLab />;
  return <RasterLineLab mode={mode} />;
}
