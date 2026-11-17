import type { Rect } from "@/lib/labs/volume-slicer";

export function sceneRect(width: number, height: number): Rect {
  return {
    x: 8,
    y: 40,
    width: width < 680 ? width - 16 : width * 0.66 - 14,
    height: width < 680 ? Math.min(414, height * 0.6) : Math.min(610, height - 70),
  };
}
export function slicePanelRect(view: number, width: number, height: number): Rect {
  if (width < 680) {
    const scene = sceneRect(width, height),
      y = scene.y + scene.height + 50;
    return {
      x: (view * width) / 3 + 6,
      y,
      width: width / 3 - 12,
      height: Math.max(105, height - y - 40),
    };
  }
  return {
    x: width * 0.7,
    y: 54 + (view * (height - 74)) / 3,
    width: width * 0.28,
    height: (height - 74) / 3 - 50,
  };
}
