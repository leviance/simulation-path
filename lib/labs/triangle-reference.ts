// Cảnh mở đầu dùng chung cho Project 16 và 33; mỗi lab tự vẽ theo cách riêng.
export const triangleReferenceWorld = [
  { x: -1.4, y: 1.2, z: 4 },
  { x: 1.6, y: -1, z: 5.5 },
  { x: -1.4, y: -1, z: 6.5 },
] as const;
export const triangleReferenceRgb = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
] as const;
export const triangleVerticalFov = Math.PI / 3;
