import {
  compareDepth,
  lightPlaneOffset,
  probePoint,
  room,
  sunlightBands,
  type CutPoint,
  type DepthStrip,
  type Probe,
  type Section,
} from "@/lib/labs/shutter-preview";

export type ShutterLayer = "room" | "depth" | "compare" | "lambert";
export function cutLayout(width: number, height: number, strip: boolean) {
  const bottom = strip ? 89 : 36;
  const scale = Math.max(1, Math.min((width - 26) / 9.0, (height - bottom - 24) / 4.94));
  const x = (width - 9.0 * scale) / 2 + 0.82 * scale,
    y = 15 + (height - bottom - 16 - 4.94 * scale) / 2 + 4.68 * scale;
  return {
    x,
    y,
    scale,
    toWorld: (px: number, py: number) => ({ z: (px - x) / scale, y: (y - py) / scale }),
  };
}
type XY = { z: number; y: number };
function path(c: CanvasRenderingContext2D, points: XY[], close = false) {
  c.beginPath();
  c.moveTo(points[0].z, points[0].y);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i].z, points[i].y);
  if (close) c.closePath();
}
const pt = (z: number, y: number): XY => ({ z, y });
type DrawOptions = {
  layer: ShutterLayer;
  probe: Probe;
  bias: number;
  filtered: boolean;
  rays: boolean;
};

export function drawSection(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: Section,
  strip: DepthStrip,
  options: DrawOptions,
) {
  const diagnostics = options.layer === "depth" || options.layer === "compare",
    layout = cutLayout(width, height, diagnostics);
  const { x, y, scale } = layout,
    probe = probePoint(section, options.probe);
  const reading = compareDepth(section, strip, probe, options.bias);
  const bands = sunlightBands(section);
  const physical = options.layer === "room" || options.layer === "depth";
  const px = (p: XY) => ({ x: x + p.z * scale, y: y - p.y * scale });
  const pixelLine = (a: XY, b: XY, color: string, size = 1) => {
    path(c, [a, b]);
    c.strokeStyle = color;
    c.lineWidth = size / scale;
    c.stroke();
  };
  const backdrop = c.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, "#17272e");
  backdrop.addColorStop(0.58, "#182735");
  backdrop.addColorStop(1, "#0a1624");
  c.fillStyle = backdrop;
  c.fillRect(0, 0, width, height);
  c.save();
  c.translate(x, y);
  c.scale(scale, -scale);
  const put = (polygon: XY[], ink: string | CanvasGradient) => {
    path(c, polygon, true);
    c.fillStyle = ink;
    c.fill();
  };
  for (let z = 0; z <= room.depth; z++) pixelLine(pt(z, 0), pt(z, room.height), "#ffffff0b");
  for (let h = 1; h < room.height; h++) pixelLine(pt(0, h), pt(room.depth, h), "#ffffff09");

  // Dải trong hình biểu diễn các tia đi chung một khe, không phải bụi hoặc tán xạ.
  if (options.rays && options.layer !== "lambert") {
    const shafts = c.createLinearGradient(0, room.lintel, 3.5, 0);
    shafts.addColorStop(0, "rgba(255,211,128,.29)");
    shafts.addColorStop(0.6, "rgba(255,211,128,.16)");
    shafts.addColorStop(1, "rgba(255,214,141,.075)");
    for (const band of bands) put(band.polygon, shafts);
  }
  // Gạch chéo đánh dấu mặt cắt của hai mảng tường quanh ô cửa.
  const masonry = (lo: number, hi: number) => {
    const thick = 0.13;
    c.fillStyle = "#b8a38b";
    c.fillRect(-thick, lo, thick, hi - lo);
    c.save();
    c.beginPath();
    c.rect(-thick, lo, thick, hi - lo);
    c.clip();
    for (let yy = lo - 0.2; yy < hi; yy += 0.13)
      pixelLine(pt(-thick, yy), pt(0, yy + 0.13), "#796750");
    c.restore();
    pixelLine(pt(0, lo), pt(0, hi), "#e0c7a3", 1.5);
  };
  if (section.windowInSlice) {
    masonry(0, room.sill);
    masonry(room.lintel, room.height);
  } else masonry(0, room.height);
  const boards = c.createLinearGradient(0, 0.02, 0, -0.16);
  boards.addColorStop(0, "#9b8070");
  boards.addColorStop(0.22, "#725951");
  boards.addColorStop(1, "#4a3e40");
  c.fillStyle = boards;
  c.fillRect(0, -0.15, room.depth, 0.15);
  pixelLine(pt(0, 0), pt(room.depth, 0), "#b49b85", 2);
  for (let z = 0; z < room.depth; z += 0.66)
    pixelLine(pt(z, -0.13), pt(z + 0.1, -0.035), "#b89d794d");
  const crate = section.crate;
  if (crate) {
    const face = c.createLinearGradient(crate.near, 1, crate.far, 0);
    face.addColorStop(0, "#99795b");
    face.addColorStop(0.5, "#775e4c");
    face.addColorStop(1, "#584d48");
    c.fillStyle = face;
    c.fillRect(crate.near, 0, crate.far - crate.near, 1);
    for (let yy = 0.12; yy < 1; yy += 0.18)
      pixelLine(pt(crate.near, yy), pt(crate.far, yy - 0.035), "#d9bb903b");
    pixelLine(pt(crate.near, 0), pt(crate.near, 1), "#ac937c", 2);
    pixelLine(pt(crate.near, 1), pt(crate.far, 1), "#bfa78e", 2);
    pixelLine(pt(crate.far, 1), pt(crate.far, 0), "#3f4246", 2);
  }
  if (physical)
    for (const band of bands) {
      if (band.receiver !== "end")
        pixelLine(band.from, band.to, "#ffde99", Math.max(3, scale * 0.055));
    }
  if (options.layer === "lambert") {
    if (crate) {
      pixelLine(pt(0, 0), pt(crate.near, 0), "#ffe0a1", 4);
      pixelLine(pt(crate.far, 0), pt(8, 0), "#ffe0a1", 4);
      pixelLine(pt(crate.near, 0), pt(crate.near, 1), "#e1ba87", 4);
      pixelLine(pt(crate.near, 1), pt(crate.far, 1), "#ffe0a1", 4);
    } else pixelLine(pt(0, 0), pt(8, 0), "#ffe0a1", 4);
  }
  if (options.layer === "compare") {
    const shadeEdge = (a: CutPoint, b: CutPoint) => {
      const count = Math.max(2, Math.ceil((Math.hypot(b.z - a.z, b.y - a.y) * scale) / 2.4));
      for (let i = 0; i < count; i++) {
        const f = (i + 0.5) / count;
        const p = pt(a.z + f * (b.z - a.z), a.y + f * (b.y - a.y));
        const read = compareDepth(section, strip, p, options.bias);
        const fraction = options.filtered ? read.filtered : Number(read.mapLit);
        const color =
          "rgb(" +
          Math.round(66 + 83 * fraction) +
          "," +
          Math.round(72 + 164 * fraction) +
          "," +
          Math.round(94 + 100 * fraction) +
          ")";
        const dz = (b.z - a.z) / count / 2,
          dy = (b.y - a.y) / count / 2;
        pixelLine(pt(p.z - dz, p.y - dy), pt(p.z + dz, p.y + dy), color, Math.max(4, scale * 0.07));
      }
    };
    if (crate) {
      shadeEdge(pt(0, 0), pt(crate.near, 0));
      shadeEdge(pt(crate.far, 0), pt(room.depth, 0));
      shadeEdge(pt(crate.near, 0), pt(crate.near, 1));
      shadeEdge(pt(crate.near, 1), pt(crate.far, 1));
      shadeEdge(pt(crate.far, 1), pt(crate.far, 0));
    } else shadeEdge(pt(0, 0), pt(room.depth, 0));
  }
  for (const corners of section.slats) {
    put(corners, "#ac7c4d");
    pixelLine(corners[0], corners[1], "#ffcf8d", 2);
    const mid = pt((corners[0].z + corners[2].z) / 2, (corners[0].y + corners[2].y) / 2);
    c.fillStyle = "#e2cc9b";
    c.beginPath();
    c.arc(mid.z, mid.y, 0.019, 0, 2 * Math.PI);
    c.fill();
  }
  // Tia từ điểm đo dừng ở vật đầu tiên; dấu × chỉ đúng giao điểm.
  if (options.rays) {
    c.setLineDash([5 / scale, 4 / scale]);
    pixelLine(probe, reading.end, reading.lit ? "#fff2a5" : "#ff9383", 1.8);
    c.setLineDash([]);
    if (reading.hit) {
      const p = reading.hit.p,
        r = 4 / scale;
      pixelLine(pt(p.z - r, p.y - r), pt(p.z + r, p.y + r), "#ff9888", 2);
      pixelLine(pt(p.z - r, p.y + r), pt(p.z + r, p.y - r), "#ff9888", 2);
    }
  }
  c.restore();
  const pin = px(probe);
  c.beginPath();
  c.arc(pin.x, pin.y, 6.5, 0, 2 * Math.PI);
  c.fillStyle = "#17222c";
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = reading.lit ? "#ffdc80" : "#ff9c90";
  c.stroke();
  c.beginPath();
  c.arc(pin.x, pin.y, 2, 0, 2 * Math.PI);
  c.fillStyle = c.strokeStyle;
  c.fill();
  c.textBaseline = "alphabetic";
  c.font = "600 11px system-ui, sans-serif";
  c.fillStyle = "#d6dce4";
  c.fillText("CỬA", Math.max(5, x - 17), Math.max(13, y - room.height * scale - 4));
  c.font = "11px system-ui, sans-serif";
  c.fillStyle = "#aab9c8";
  for (let z = 0; z <= 8; z += width > 550 ? 1 : 2)
    c.fillText(z + " m", x + z * scale - 5, y + 0.15 * scale + 15);
  if (width > 480 && crate) {
    const label = px(pt((crate.near + crate.far) / 2, 0.5));
    if ((crate.far - crate.near) * scale > 44) {
      c.textAlign = "center";
      c.fillStyle = "#f0dfc9";
      c.font = "600 10px system-ui, sans-serif";
      c.fillText("THÙNG", label.x, label.y + 3);
      c.textAlign = "left";
    }
  }
  if (diagnostics) {
    const left = Math.max(14, x - 0.65 * scale),
      right = Math.min(width - 14, x + 8 * scale),
      top = height - 44,
      sw = right - left;
    c.fillStyle = "#c6d0dd";
    c.font = "600 11px system-ui, sans-serif";
    c.fillText("ĐỘ SÂU TỪ PHÍA NGUỒN SÁNG · " + strip.bins + " MẪU", left, top - 6);
    for (let i = 0; i < strip.bins; i++) {
      const q = strip.values[i];
      if (q === null) c.fillStyle = "#203c50";
      else {
        const tone = Math.max(14, Math.min(235, Math.round(130 + (q - lightPlaneOffset) * 18)));
        c.fillStyle = "rgb(" + tone + "," + tone + "," + tone + ")";
      }
      c.fillRect(left + (i * sw) / strip.bins, top, Math.ceil(sw / strip.bins), 15);
    }
    if (reading.bin < 0) return;
    const bx = left + ((reading.bin + 0.5) * sw) / strip.bins;
    c.strokeStyle = "#f6bb66";
    c.lineWidth = 2;
    c.strokeRect(left + (reading.bin * sw) / strip.bins, top - 1, Math.max(2, sw / strip.bins), 17);
    c.fillStyle = "#f6bb66";
    c.beginPath();
    c.moveTo(bx - 4, top + 23);
    c.lineTo(bx + 4, top + 23);
    c.lineTo(bx, top + 18);
    c.fill();
  }
}
