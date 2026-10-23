import {
  checkerTextureColor,
  nearestTextureTexel,
  projectTextureVertex,
} from "@/lib/labs/perspective-texture";
import type { TextureScene, TextureFrame } from "@/lib/labs/texture-scene";
import { setupCanvas, type CanvasSize } from "./lab-shared";

export interface TexturePanel {
  x: number;
  y: number;
  width: number;
  height: number;
  corrected: boolean;
  label: string;
}
export function texturePanels(
  width: number,
  height: number,
  view: TextureScene["view"],
): TexturePanel[] {
  const area = { x: 12, y: 32, width: width - 24, height: height - 44 };
  if (view !== "compare")
    return [
      {
        ...area,
        corrected: view === "perspective",
        label: view === "affine" ? "AFFINE" : "PERSPECTIVE-CORRECT",
      },
    ];
  if (width < 620) {
    const h = (area.height - 28) / 2;
    return [
      { ...area, height: h, corrected: false, label: "AFFINE" },
      { ...area, y: area.y + h + 28, height: h, corrected: true, label: "PERSPECTIVE-CORRECT" },
    ];
  }
  const w = (area.width - 12) / 2;
  return [
    { ...area, width: w, corrected: false, label: "AFFINE" },
    { ...area, x: area.x + w + 12, width: w, corrected: true, label: "PERSPECTIVE-CORRECT" },
  ];
}
export function drawTexture(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: TextureScene,
  stage: number,
  panels: TexturePanel[],
  frames: TextureFrame[],
  scratch: HTMLCanvasElement,
) {
  setupCanvas(ctx, size);
  ctx.imageSmoothingEnabled = false;
  for (const [index, panel] of panels.entries()) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.width, panel.height);
    ctx.clip();
    ctx.translate(panel.x, panel.y);
    if (stage === 2) {
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const color = checkerTextureColor({ x: x / 64, y: y / 64 }, "clamp");
          ctx.fillStyle = `rgb(${color.join(",")})`;
          ctx.fillRect(
            (x * panel.width) / 64,
            (y * panel.height) / 64,
            panel.width / 64 + 1,
            panel.height / 64 + 1,
          );
        }
      const texel = nearestTextureTexel(scene.sampleUv, 64, 64, scene.address);
      ctx.strokeStyle = "#ff735d";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        (texel.x * panel.width) / 64,
        (texel.y * panel.height) / 64,
        panel.width / 64,
        panel.height / 64,
      );
    } else {
      // Fixed world grid gives depth cues even with all debug overlays disabled.
      ctx.strokeStyle = "#25344e";
      ctx.lineWidth = 1;
      const line = (
        a: { x: number; y: number; z: number },
        b: { x: number; y: number; z: number },
      ) => {
        const p = projectTextureVertex(
          { position: a, uv: { x: 0, y: 0 } },
          panel.width,
          panel.height,
        );
        const q = projectTextureVertex(
          { position: b, uv: { x: 0, y: 0 } },
          panel.width,
          panel.height,
        );
        if (p && q) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      };
      for (let x = -6; x <= 6; x++) line({ x, y: -1.5, z: 2 }, { x, y: -1.5, z: 14 });
      for (let z = 2; z <= 14; z += 2) line({ x: -6, y: -1.5, z }, { x: 6, y: -1.5, z });
      const frame = frames[index];
      scratch.width = frame.width;
      scratch.height = frame.height;
      const offscreen = scratch.getContext("2d");
      if (offscreen) {
        const image = offscreen.createImageData(frame.width, frame.height);
        image.data.set(frame.pixels);
        offscreen.putImageData(image, 0, 0);
        ctx.drawImage(scratch, 0, 0, panel.width, panel.height);
      }
      if (scene.debug || stage === 1) {
        ctx.strokeStyle = "#49e7b1";
        ctx.lineWidth = 1;
        for (const triangle of frame.triangles) {
          ctx.beginPath();
          triangle.forEach((p, i) => {
            const x = (p.x / frame.width) * panel.width,
              y = (p.y / frame.height) * panel.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.stroke();
        }
        if (stage === 1)
          frame.corners.forEach((p, i) => {
            if (p) {
              ctx.fillStyle = "#e6f3fa";
              ctx.font = "11px ui-monospace";
              ctx.fillText(
                `${i}: UV ${["0,1", "1,1", "1,0", "0,0"][i]}`,
                (p.x / frame.width) * panel.width + 4,
                (p.y / frame.height) * panel.height - 8,
              );
            }
          });
        if (frame.inspection) {
          const p = frame.inspection.pixel,
            x = (p.x / frame.width) * panel.width,
            y = (p.y / frame.height) * panel.height;
          ctx.strokeStyle = "#ff735d";
          ctx.beginPath();
          ctx.moveTo(x - 6, y);
          ctx.lineTo(x + 6, y);
          ctx.moveTo(x, y - 6);
          ctx.lineTo(x, y + 6);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    ctx.fillStyle = "#e6f3fa";
    ctx.font = "600 11px ui-monospace";
    ctx.fillText(
      stage === 1 ? "QUAD + UV" : stage === 2 ? "CHECKER SOURCE · 64 × 64" : panel.label,
      panel.x,
      panel.y - 10,
    );
  }
}
