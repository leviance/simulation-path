import {
  intersects,
  translatedBox,
  viewportBox,
  worldToMapScreen,
  type MapBox,
} from "@/lib/labs/map-geometry";
import { mapPreviewValid, mapSelectionPreview, type MapScene } from "@/lib/labs/map-scene";
import type { MapObject } from "@/lib/labs/map-data";
import type { CanvasSize } from "./lab-shared";

const colors = { house: "#e6ba73", tree: "#53b887", park: "#315c53" };
function screenBox(box: MapBox, scene: MapScene, size: CanvasSize) {
  const point = worldToMapScreen(box, scene.camera, size);
  return { ...point, width: box.width * scene.camera.zoom, height: box.height * scene.camera.zoom };
}

export function drawMapObject(
  context: CanvasRenderingContext2D,
  object: MapObject,
  scene: MapScene,
  size: CanvasSize,
  selected: boolean,
  offset = { x: 0, y: 0 },
  valid = true,
) {
  const box = screenBox(translatedBox(object.box, offset), scene, size);
  context.fillStyle = colors[object.kind];
  const w = Math.max(1, box.width),
    h = Math.max(1, box.height);
  if (object.kind === "tree" && w >= 6) {
    context.beginPath();
    context.ellipse(box.x + w / 2, box.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#52725a";
    context.fillRect(box.x + w * 0.44, box.y + h * 0.45, w * 0.12, h * 0.5);
  } else {
    context.fillRect(box.x, box.y, w, h);
    if (object.kind === "house" && w >= 6 && h >= 6) {
      context.fillStyle = "#ad7b62";
      context.beginPath();
      context.moveTo(box.x, box.y + h * 0.36);
      context.lineTo(box.x + w / 2, box.y);
      context.lineTo(box.x + w, box.y + h * 0.36);
      context.closePath();
      context.fill();
      context.fillStyle = "#4d5261";
      context.fillRect(box.x + w * 0.25, box.y + h * 0.55, w * 0.2, h * 0.3);
    }
    if (object.kind === "park" && w >= 6) {
      context.strokeStyle = "#82b3a2";
      context.beginPath();
      context.moveTo(box.x, box.y + h / 2);
      context.lineTo(box.x + w, box.y + h / 2);
      context.stroke();
    }
  }
  if (selected) {
    context.strokeStyle = valid ? "#f4ca64" : "#ff7b72";
    context.lineWidth = 2;
    context.strokeRect(box.x, box.y, w, h);
    context.lineWidth = 1;
  }
}

export function drawMapEditor(
  context: CanvasRenderingContext2D,
  scene: MapScene,
  size: CanvasSize,
) {
  context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  context.fillStyle = "#0b1020";
  context.fillRect(0, 0, size.width, size.height);
  context.save();
  context.beginPath();
  context.rect(0, 0, size.width, size.height);
  context.clip();
  const root = screenBox(scene.document.tree.config.root, scene, size);
  context.fillStyle = "#18232b";
  context.fillRect(root.x, root.y, root.width, root.height);
  const view = viewportBox(scene.camera, size);
  // Đường phố là nền trang trí; nhà/cây/công viên mới là đối tượng có ID.
  const spacing = scene.camera.zoom >= 0.1 ? 64 : 512;
  const limits = scene.document.tree.config.root;
  context.strokeStyle = "#34404b";
  for (
    let x = Math.ceil(Math.max(view.x, limits.x) / spacing) * spacing;
    x <= Math.min(view.x + view.width, limits.x + limits.width);
    x += spacing
  ) {
    const point = worldToMapScreen({ x, y: 0 }, scene.camera, size);
    context.beginPath();
    context.moveTo(point.x, Math.max(0, root.y));
    context.lineTo(point.x, Math.min(size.height, root.y + root.height));
    context.stroke();
  }
  for (
    let y = Math.ceil(Math.max(view.y, limits.y) / spacing) * spacing;
    y <= Math.min(view.y + view.height, limits.y + limits.height);
    y += spacing
  ) {
    const point = worldToMapScreen({ x: 0, y }, scene.camera, size);
    context.beginPath();
    context.moveTo(Math.max(0, root.x), point.y);
    context.lineTo(Math.min(size.width, root.x + root.width), point.y);
    context.stroke();
  }
  const moving = scene.gesture?.tool === "move";
  for (const id of scene.visible.ids) {
    if (moving && scene.document.selection.has(id)) continue;
    const object = scene.document.tree.objects.get(id);
    if (object) drawMapObject(context, object, scene, size, scene.document.selection.has(id));
  }
  if (moving && scene.gesture && scene.preview) {
    const valid = mapPreviewValid(scene);
    for (const id of scene.preview.ids) {
      const object = scene.document.tree.objects.get(id);
      if (object) drawMapObject(context, object, scene, size, true, scene.gesture.offset, valid);
    }
  }
  if (scene.debug && scene.stage >= 4) {
    const trace = scene.document.lastQuery ?? scene.visible;
    const visited = new Set(trace.visited);
    const pruned = new Set(trace.pruned);
    let drawn = 0;
    for (const [index, node] of scene.document.tree.nodes.entries()) {
      if (drawn >= 4096) break;
      if (!intersects(node.box, view)) continue;
      const box = screenBox(node.box, scene, size);
      context.strokeStyle = pruned.has(index)
        ? "#ff7b7260"
        : visited.has(index)
          ? "#6be89b90"
          : "#82b8ff40";
      context.strokeRect(box.x, box.y, box.width, box.height);
      drawn++;
    }
  }
  const selection = mapSelectionPreview(scene);
  if (selection) {
    const box = screenBox(selection, scene, size);
    context.fillStyle = "#82b8ff18";
    context.fillRect(box.x, box.y, box.width, box.height);
    context.strokeStyle = "#82b8ff";
    context.strokeRect(box.x, box.y, box.width, box.height);
  }
  context.restore();
}
