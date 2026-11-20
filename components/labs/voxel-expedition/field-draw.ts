import type { Rect } from "@/lib/labs/voxel-expedition/field";
import {
  cloudAt,
  flowPhase,
  key,
  noise,
  oceanAt,
  sunAt,
  swayOffset,
  windAt,
  type StreamState,
} from "@/lib/labs/voxel-expedition/field";
import type { View } from "@/lib/labs/voxel-expedition/bank";
import { bankImage } from "@/lib/labs/voxel-expedition/preview";

export type FieldFrame = {
  id: number;
  stage: number;
  rects: Rect[];
  time: number;
  wind: number;
  angle: number;
  hour: number;
  mark: number;
  clouds: boolean;
  snow: boolean;
  wire: boolean;
  probe: boolean;
  view: View;
  stream: StreamState;
};
type C = CanvasRenderingContext2D;
type Pair = [number, number];
function polygon(c: C, points: Pair[], color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  c.closePath();
  c.fill();
}
function line(c: C, a: Pair, b: Pair, color: string, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(...a);
  c.lineTo(...b);
  c.stroke();
}
function label(c: C, x: number, y: number, s: string) {
  c.fillStyle = "#132d33df";
  c.fillRect(x, y - 16, c.measureText(s).width + 16, 21);
  c.fillStyle = "#f1f7df";
  c.fillText(s, x + 8, y - 1);
}
function color(a: number[], b: number[], t: number) {
  return "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")";
}
export function bankSurface(cells: Uint8Array, v: View) {
  const canvas = document.createElement("canvas");
  canvas.width = 288;
  canvas.height = 144;
  const c = canvas.getContext("2d");
  if (c) {
    const img = c.createImageData(288, 144);
    img.data.set(bankImage(cells, v, 288, 144));
    c.putImageData(img, 0, 0);
  }
  return canvas;
}
function sky(c: C, f: FieldFrame) {
  const sun = sunAt(f.hour),
    grad = c.createLinearGradient(0, 0, 0, 228);
  grad.addColorStop(0, color([19, 31, 52], [86, 158, 194], sun.day));
  grad.addColorStop(1, color([66, 66, 86], [216, 230, 218], sun.day));
  c.fillStyle = grad;
  c.fillRect(0, 0, 720, 360);
  if (f.id >= 64 && sun.y > -0.2) {
    c.fillStyle = "#ffe5ab";
    c.beginPath();
    c.arc(360 + sun.x * 265, 175 - sun.y * 145, 13, 0, Math.PI * 2);
    c.fill();
  }
  if (!f.clouds || f.id < 62 || (f.id === 62 && f.stage < 3)) return;
  for (let z = 0; z < 13; z++)
    for (let x = 0; x < 90; x++) {
      const cover = cloudAt(
        x * 1.8 + f.stream.x * 3 + f.view.yaw * 6,
        18 + z * 2.1 + f.stream.z * 3,
        f.time,
        f.angle,
      );
      if (cover > 0.08) {
        c.fillStyle = "rgba(238,243,238," + cover * (0.15 + 0.68 * sun.day) + ")";
        c.fillRect(x * 8, 9 + z * 6, 8, 6);
      }
    }
}
function forest(c: C, f: FieldFrame, snowy: boolean) {
  const shift = Math.sin(f.view.yaw) * 20;
  for (let k = 0; k < 2; k++) {
    const pts: Pair[] = [[0, 360]];
    for (let x = 0; x <= 732; x += 12)
      pts.push([
        x,
        120 +
          k * 30 -
          16 * Math.sin(x * 0.011 + k * 2 + shift * 0.008) -
          24 * noise(x / 73, k + 0.2, 73),
      ]);
    pts.push([732, 360]);
    polygon(c, pts, k === 0 ? "#769898" : snowy ? "#a1b9bf" : "#709383");
  }
  for (let j = 0; j < 20; j++) {
    const x = ((j * 37 + 11 + shift) % 765) - 22,
      y = 159 + 21 * Math.sin(j * 0.6),
      h = 21 + 18 * noise(j, 9, 73);
    polygon(
      c,
      [
        [x - h * 0.34, y],
        [x, y - h],
        [x + h * 0.34, y],
      ],
      snowy ? "#426a6a" : "#466f62",
    );
  }
  polygon(
    c,
    [
      [0, 213],
      [142, 197],
      [288, 213],
      [449, 190],
      [720, 207],
      [720, 360],
      [0, 360],
    ],
    snowy ? "#d4e3df" : "#83a76b",
  );
  for (const [x0, y, h] of [
    [89, 234, 70],
    [211, 216, 54],
    [443, 219, 76],
    [610, 242, 100],
  ]) {
    const x = x0 + shift;
    const g = windAt(x / 9, 4, f.time, f.angle, f.wind) * Math.cos(f.angle);
    c.fillStyle = "#705443";
    c.fillRect(x - 4, y - h * 0.56, 8, h * 0.56);
    if (snowy)
      for (let j = 0; j < 3; j++) {
        const top = y - h * (1 - j * 0.2),
          w = h * (0.17 + 0.037 * j),
          dx = swayOffset(1 - j * 0.23, 8, g);
        polygon(
          c,
          [
            [x - w, y - h * (0.59 - j * 0.23)],
            [x + dx, top],
            [x + w, y - h * (0.59 - j * 0.23)],
          ],
          "#315c51",
        );
        polygon(
          c,
          [
            [x - w * 0.55, top + h * 0.18],
            [x + dx, top],
            [x + w * 0.55, top + h * 0.18],
          ],
          "#dae7e3",
        );
      }
    else
      for (let j = 0; j < 3; j++) {
        const dx = swayOffset(0.75 + j * 0.1, 8, g);
        c.fillStyle = ["#527349", "#63864e", "#7c9e57"][j];
        c.fillRect(x - 24 + dx + j * 4, y - h * 0.72 - j * 8, 48 - j * 7, 24 - j * 3);
      }
  }
  for (let j = 0; j < 90; j++) {
    const x = (j * 59 + 9) % 720,
      y = 238 + ((j * 39) % 119),
      h = 7 + 10 * noise(j, 2, 73),
      g = windAt(x / 12, y / 18, f.time, f.angle, f.wind) * Math.cos(f.angle);
    for (let k = -1; k <= 1; k++)
      polygon(
        c,
        [
          [x + k * 1.5 - 1.2, y],
          [x + k * 1.5 + 1.2, y],
          [x + k * 5 + swayOffset(1, h * 0.5, g), y - h],
        ],
        snowy ? "#839c8b" : "#456c43",
      );
  }
  if (snowy && f.snow && f.id >= 64) {
    for (let j = 0; j < 120; j++) {
      const t = f.time,
        l = 0.32 + (j % 13) / 20,
        x = ((j * 67 + t * (3.1 * f.wind * Math.cos(f.angle)) + 8000) % 748) - 14,
        y = (j * 37 + t * (19 * l)) % 352;
      c.fillStyle = "#edf7f3";
      c.fillRect(x, y, 1 + l * 2, 1 + l * 3);
    }
  }
}
function shore(c: C, f: FieldFrame, sea: boolean) {
  polygon(
    c,
    [
      [0, 174],
      [54, 155],
      [125, 166],
      [181, 141],
      [247, 156],
      [296, 183],
      [395, 184],
      [429, 174],
      [497, 183],
      [594, 165],
      [681, 171],
      [720, 162],
      [720, 360],
      [0, 360],
    ],
    sea ? "#c7bf93" : "#779168",
  );
  polygon(
    c,
    [
      [0, 245],
      [86, 209],
      [169, 222],
      [236, 196],
      [389, 214],
      [482, 191],
      [618, 214],
      [720, 201],
      [720, 360],
      [0, 360],
    ],
    sea ? "#e4cf9b" : "#8da679",
  );
  const surface = (x: number) =>
    sea ? 246 - 20 * oceanAt(x * 0.073, -6, f.time).height : 248 + 3 * Math.sin(x * 0.012);
  const top: Pair[] = [];
  for (let x = 0; x <= 720; x += 3) top.push([x, surface(x)]);
  polygon(c, [...top, [720, 360], [0, 360]], "#4395a1");
  for (let x = 0; x < 720; x += 3) {
    const y = surface(x);
    line(c, [x, y], [x + 3, surface(x + 3)], "#d5f1e4", 2);
  }
  for (let j = 0; j < 5; j++)
    for (let x = 0; x < 720; x += 5) {
      const y = surface(x) + 13 + j * 15;
      if (sea) {
        const n = oceanAt(x * 0.073, -6 + j, f.time).normal;
        if (n[0] * 0.5 + n[2] * 0.6 > 0.03) line(c, [x, y], [x + 5, y - 1], "#79bac0", 2);
      } else if (flowPhase(x / 25 + j * 0.21, f.time) < 0.12)
        line(c, [x, y], [x + 7, y - 1], "#c1e6d2", 2);
    }
  polygon(
    c,
    [
      [182, 253],
      [192, 217],
      [211, 211],
      [226, 217],
      [235, 252],
    ],
    "#657574",
  );
  label(c, 16, 336, sea ? "Mặt cắt biển · mỏm đá đứng yên" : "Mặt cắt sông · chiều hạ lưu →");
}
function streamMap(c: C, f: FieldFrame) {
  const s = f.stream,
    dx = 62,
    dy = 23;
  for (let j = -3; j <= 3; j++)
    for (let i = -3; i <= 3; i++) {
      const x = 352 + ((i - j) * dx) / 2,
        y = 212 + ((i + j) * dy) / 2,
        k = key(s.x + i, s.z + j);
      let fill = "#506567";
      if (s.wanted.includes(k)) fill = "#bd9161";
      if (s.resident.has(k)) fill = "#789b75";
      if (!i && !j) fill = "#e6d395";
      polygon(
        c,
        [
          [x, y - dy / 2 + 1],
          [x + dx / 2 - 1, y],
          [x, y + dy / 2 - 1],
          [x - dx / 2 + 1, y],
        ],
        fill,
      );
    }
  label(c, 18, 337, "Vàng: vị trí mắt · xanh: đã nạp · nâu: đang chờ");
}
export function drawField(c: C, f: FieldFrame, bank: HTMLCanvasElement | null) {
  const w = c.canvas.width,
    h = c.canvas.height;
  c.setTransform(w / 720, 0, 0, h / 360, 0, 0);
  c.font = "14px sans-serif";
  c.imageSmoothingEnabled = false;
  if (f.id <= 60 && bank) {
    c.drawImage(bank, 0, 0, 720, 360);
    if (f.id === 60 && f.probe) {
      line(c, [350, 180], [370, 180], "#fff0a9", 2);
      line(c, [360, 170], [360, 190], "#fff0a9", 2);
    }
    if (f.id === 59 && f.wire) {
      label(c, 14, 335, "Đếm quad từ dữ liệu block · bề mặt nhìn thấy không đổi");
    }
    return;
  }
  sky(c, f);
  if (f.id === 62) {
    streamMap(c, f);
    return;
  }
  if (f.id === 61 && f.stage === 1) {
    c.fillStyle = "#e0dbc5";
    c.fillRect(0, 176, 720, 184);
    const x0 = 204,
      y0 = 30,
      w = 312;
    c.fillStyle = "#485e64";
    c.fillRect(x0, y0, w, w);
    const palette = [
      "",
      "#7eac68",
      "#986e4a",
      "#a1a4a6",
      "#e5ce96",
      "#a98053",
      "#64985d",
      "#65a8b4",
    ];
    const unit = w / 16;
    for (const rect of f.rects) {
      c.fillStyle = palette[rect.block];
      c.fillRect(x0 + rect.u * unit, y0 + rect.v * unit, rect.w * unit, rect.h * unit);
      const sw = f.wire ? rect.w : 1,
        sh = f.wire ? rect.h : 1;
      for (let dy = 0; dy < rect.h; dy += sh)
        for (let dx = 0; dx < rect.w; dx += sw) {
          const x = x0 + (rect.u + dx) * unit,
            y = y0 + (rect.v + dy) * unit;
          c.strokeStyle = "#43595a";
          c.strokeRect(x, y, sw * unit, sh * unit);
          line(c, [x, y], [x + sw * unit, y + sh * unit], "#5d746b");
        }
    }
    label(c, 16, 335, "Mặt cắt ngang · mỗi màu là một vật liệu · đường chéo chia tam giác");
    return;
  }
  if (f.id === 61) {
    forest(c, f, false);
    label(c, 14, 336, "Cùng một trường gió · gốc cỏ và thân cây giữ nguyên");
    return;
  }
  if (f.mark < 2) {
    const active = f.id === 64 || f.stage >= (f.mark === 0 ? 4 : 3);
    shore(c, active ? f : { ...f, time: 0 }, f.mark === 0);
    return;
  }
  const snowy = f.mark === 3 || f.mark === 4;
  forest(c, f, snowy);
  if (f.mark === 2) {
    polygon(
      c,
      [
        [0, 208],
        [153, 167],
        [211, 173],
        [240, 224],
        [272, 255],
        [305, 325],
        [0, 360],
      ],
      "#837d6c",
    );
    polygon(
      c,
      [
        [720, 179],
        [626, 146],
        [576, 159],
        [536, 217],
        [508, 241],
        [461, 324],
        [720, 360],
      ],
      "#696f66",
    );
  }
  if (f.mark === 4 && f.id === 64 && f.stage >= 4) {
    const x = 367,
      y = 278;
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 6;
      c.fillStyle = "#5d605a";
      c.fillRect(x + 24 * Math.cos(a) - 5, y + 6 * Math.sin(a) - 2, 10, 4);
    }
    for (let j = 0; j < 24; j++) {
      const t = (f.time * (0.8 + 0.035 * (j % 5)) + j * 0.618) % 1;
      c.fillStyle = t > 0.64 ? "#ec7f3b" : "#ffd36e";
      c.fillRect(
        x + (1 - t) * 12 * Math.cos(j * 2.4 + t),
        y - t * 31,
        4 * (1 - t) + 1,
        6 * (1 - t) + 1,
      );
    }
  }
  if (f.id === 64 && sunAt(f.hour).day < 1) {
    c.fillStyle = "rgba(17,29,52," + 0.5 * (1 - sunAt(f.hour).day) + ")";
    c.fillRect(0, 0, 720, 360);
  }
}
