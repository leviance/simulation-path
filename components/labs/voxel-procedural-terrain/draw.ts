import { setupCanvas, type CanvasSize } from "../lab-shared";
import { heightAt, terrainSignal, type TerrainConfig } from "@/lib/labs/voxel-procedural-terrain";
import type { World } from "@/lib/labs/voxel-chunk-streaming";
export function mapLayout(size: CanvasSize) {
  return { x: 12, y: 350, side: Math.min(320, size.width - 24) };
}
function sample(x: number, z: number, config: TerrainConfig, localBug: boolean) {
  if (localBug) {
    x -= Math.floor(x / 16) * 16;
    z -= Math.floor(z / 16) * 16;
  }
  return heightAt(x, z, config);
}
export function picked(size: CanvasSize, world: World, x: number, y: number) {
  const map = mapLayout(size);
  if (x < map.x || y < map.y || x >= map.x + map.side || y >= map.y + map.side) return null;
  const originX = Math.floor(world.player.x / 16) * 16 - 16;
  const originZ = Math.floor(world.player.z / 16) * 16 - 16;
  return {
    x: originX + Math.floor(((x - map.x) * 48) / map.side),
    z: originZ + Math.floor(((y - map.y) * 48) / map.side),
  };
}
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  world: World,
  config: TerrainConfig,
  pixels: Uint8ClampedArray,
  selected: { x: number; z: number },
  localBug: boolean,
) {
  setupCanvas(ctx, size);
  ctx.font = "13px system-ui";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Mesh resident — kéo vùng này để xoay camera", 12, 18);
  const image = document.createElement("canvas");
  image.width = 320;
  image.height = 240;
  image
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), 320, 240), 0, 0);
  ctx.imageSmoothingEnabled = false;
  const imageWidth = Math.min(size.width - 24, 400);
  ctx.drawImage(image, 12, 30, imageWidth, imageWidth * 0.75);
  const map = mapLayout(size);
  const originX = Math.floor(world.player.x / 16) * 16 - 16;
  const originZ = Math.floor(world.player.z / 16) * 16 - 16;
  const cell = map.side / 48;
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Height map 48×48 — kéo/chạm để chọn cột", 12, 335);
  for (let z = 0; z < 48; z++)
    for (let x = 0; x < 48; x++) {
      const height = sample(originX + x, originZ + z, config, localBug);
      ctx.fillStyle = `hsl(${135 - height * 4} 35% ${18 + height * 3}%)`;
      ctx.fillRect(map.x + x * cell, map.y + z * cell, cell + 0.5, cell + 0.5);
    }
  ctx.strokeStyle = "#e5c07b";
  for (let i = 0; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(map.x + i * 16 * cell, map.y);
    ctx.lineTo(map.x + i * 16 * cell, map.y + map.side);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(map.x, map.y + i * 16 * cell);
    ctx.lineTo(map.x + map.side, map.y + i * 16 * cell);
    ctx.stroke();
  }
  ctx.strokeStyle = "#ff6b87";
  ctx.strokeRect(
    map.x + (selected.x - originX) * cell,
    map.y + (selected.z - originZ) * cell,
    cell,
    cell,
  );
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(
    `World (${originX},${originZ}) → (${originX + 47},${originZ + 47}); viền vàng: chunk`,
    12,
    692,
  );
  ctx.fillText(
    localBug
      ? "LỖI CỐ Ý ở preview 2D: dùng local (mesh 3D vẫn đúng)"
      : "Preview 2D dùng world, kể cả cột chưa resident",
    12,
    714,
  );
  const startX = originX - 8;
  const left = 12,
    top = 754,
    width = size.width - 24,
    height = 128;
  ctx.strokeStyle = "#39465c";
  ctx.strokeRect(left, top, width, height);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`Mặt cắt z=${selected.z}: xanh là 8+6n, vàng là số block H`, 12, 740);
  for (let curve = 0; curve < 2; curve++) {
    ctx.beginPath();
    for (let i = 0; i <= 256; i++) {
      let x = startX + i / 4;
      let z = selected.z;
      if (localBug) {
        x -= Math.floor(x / 16) * 16;
        z -= Math.floor(z / 16) * 16;
      }
      let value = 8 + 6 * terrainSignal(x, z, config);
      if (config.stage < 2) value = 4;
      if (curve === 1) value = heightAt(Math.floor(x), z, config);
      const px = left + (width * i) / 256,
        py = top + height * (1 - value / 16);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = curve === 0 ? "#61afef" : "#e5c07b";
    ctx.stroke();
  }
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`x từ ${startX} đến ${startX + 64}; y từ 0 đến 16`, 12, 903);
}
