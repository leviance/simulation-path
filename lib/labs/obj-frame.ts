import { createZFrame, renderZTriangles, type ZTriangle } from "./z-buffer.ts";

// Kiểm chi phí trước rasterization: input chồng hàng nghìn mặt toàn màn hình
// phải báo giới hạn, không tạo hàng triệu object coverage rồi làm treo trang.
export function renderObjFrame(
  triangles: ZTriangle[],
  width: number,
  height: number,
  options: { reverseOrder?: boolean; depthEnabled?: boolean } = {},
) {
  let candidates = 0;
  for (const triangle of triangles) {
    const points = [triangle.a, triangle.b, triangle.c];
    if (!points.every((p) => [p.x, p.y, p.ndcDepth].every(Number.isFinite))) continue;
    const minX = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))));
    const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map((p) => p.x))) - 1);
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map((p) => p.y))) - 1);
    candidates += Math.max(0, maxX - minX + 1) * Math.max(0, maxY - minY + 1);
    if (candidates > 1500000)
      return {
        frame: createZFrame(width, height),
        message:
          "Mesh vượt ngân sách rasterization của Canvas (1,5 triệu pixel candidate/frame). Dùng viewer C++ hoặc giảm các mặt chồng nhau.",
        candidates,
      };
  }
  return { frame: renderZTriangles(triangles, width, height, options), message: "", candidates };
}
