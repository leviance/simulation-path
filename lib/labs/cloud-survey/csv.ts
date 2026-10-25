import { maximumPoints } from "./data.ts";
import type { CloudPoint } from "./geometry.ts";
export const maximumCsvBytes = 16 * 1024 * 1024;
const decimal = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
export function readCsv(text: string): CloudPoint[] {
  if (new TextEncoder().encode(text).byteLength > maximumCsvBytes) throw Error("CSV vượt 16 MiB");
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.shift()?.replace(/\r$/, "") !== "id,x,y,z") throw Error("Header phải là id,x,y,z");
  if (lines.length > maximumPoints) throw Error("CSV vượt 200.000 điểm");
  const ids = new Set<number>();
  return lines.map((raw, index) => {
    const line = raw.replace(/\r$/, "");
    const fields = line.split(",");
    if (line.length > 511 || fields.length !== 4 || !/^\d+$/.test(fields[0]))
      throw Error(`CSV dòng ${index + 2}: sai schema`);
    const id = Number(fields[0]);
    if (!Number.isSafeInteger(id) || id > 0xffffffff || ids.has(id))
      throw Error(`CSV dòng ${index + 2}: ID sai hoặc trùng`);
    const values = fields.slice(1).map((token) => {
      if (!decimal.test(token)) throw Error(`CSV dòng ${index + 2}: số không hợp lệ`);
      return Number(token);
    });
    if (values.some((v) => !Number.isFinite(v) || Math.abs(v) > 10000))
      throw Error(`CSV dòng ${index + 2}: tọa độ phải hữu hạn, trong ±10000 m`);
    ids.add(id);
    return { id, position: { x: values[0], y: values[1], z: values[2] } };
  });
}
export function writeCsv(points: readonly CloudPoint[]): string {
  return (
    "id,x,y,z\n" +
    points.map((p) => `${p.id},${p.position.x},${p.position.y},${p.position.z}\n`).join("")
  );
}
