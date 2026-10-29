import { referenceShaderColor } from "./effects.ts";
import { makeGalleryUniforms } from "./model.ts";
import type { GalleryProgram, GalleryView } from "./types.ts";

export function drawShaderGallery(
  canvas: HTMLCanvasElement,
  preview: HTMLCanvasElement,
  program: GalleryProgram,
  view: GalleryView,
) {
  const context = canvas.getContext("2d");
  const raster = preview.getContext("2d");
  if (!context || !raster || canvas.width < 1 || canvas.height < 1) return;
  const width =
    program.activeEffect === "noise" || program.activeEffect === "mandelbrot" ? 160 : 240;
  const height = Math.max(1, Math.round((width * canvas.height) / canvas.width));
  if (preview.width !== width) preview.width = width;
  if (preview.height !== height) preview.height = height;
  const image = raster.createImageData(width, height);
  const uniforms = makeGalleryUniforms(view, canvas.width, canvas.height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = referenceShaderColor(
        program.activeEffect,
        ((x + 0.5) * canvas.width) / width,
        canvas.height - ((y + 0.5) * canvas.height) / height,
        uniforms,
        program.activeSpeed,
      );
      const offset = (y * width + x) * 4;
      image.data[offset] = Math.round(color[0] * 255);
      image.data[offset + 1] = Math.round(color[1] * 255);
      image.data[offset + 2] = Math.round(color[2] * 255);
      image.data[offset + 3] = 255;
    }
  }
  raster.putImageData(image, 0, 0);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.imageSmoothingEnabled = true;
  context.drawImage(preview, 0, 0, canvas.width, canvas.height);
}
