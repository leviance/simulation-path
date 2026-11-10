import { dot3, type Vec3 } from "@/lib/labs/normal";
import {
  inspectCell,
  inspectSeam,
  inspectVertex,
  objFaceRecord,
  readObjFaceRecord,
} from "@/lib/labs/geometry-workshop/inspection";
import type { MeshSession } from "@/lib/labs/geometry-workshop/session";
import { shapeNames } from "@/lib/labs/geometry-workshop/settings";
import { frameAtProbe, type GeometryMode, type View } from "@/lib/labs/geometry-workshop/view";
import { LabReadout } from "../lab-shared";

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });

function vec(value: Vec3) {
  return [value.x, value.y, value.z].map((component) => numberFormat.format(component)).join("; ");
}

export function GeometryReadout({
  mode,
  view,
  state,
  paused,
}: {
  mode: GeometryMode;
  view: View;
  state: ReturnType<MeshSession["read"]>;
  paused: boolean;
}) {
  const mesh = state.displayed;
  const { kind, uSegments, vSegments } = mesh.settings;
  const format = (value: number) => numberFormat.format(value);
  const displayType = state.isPreview ? "preview" : "lưới đầy đủ";
  const items = [
    { label: "Đang vẽ", value: shapeNames[kind] + " · " + displayType },
    { label: "Lưới đang vẽ", value: uSegments + " × " + vSegments + " ô" },
    { label: "Đỉnh", value: format(mesh.vertices.length) },
    { label: "Tam giác", value: format(mesh.indices.length / 3) },
  ];

  if (mode === "patch") {
    const { id, vertex } = inspectVertex(mesh, view.probeU, view.probeV);
    items.push(
      { label: "ID / u, v", value: id + " · " + vertex.uv.map(format).join("; ") },
      { label: "P(x, y, z)", value: vec(vertex.position) },
      { label: "Normal", value: vec(vertex.normal) },
      {
        label: "N · u / N · v",
        value:
          format(dot3(vertex.normal, vertex.tangentU)) +
          " / " +
          format(dot3(vertex.normal, vertex.tangentV)),
      },
    );
  }

  if (mode === "topology" || mode === "export") {
    const cell = inspectCell(mesh, view.probeU, view.probeV);
    const { a, b, c, d } = cell.corners;
    items.push({ label: "a / b / c / d", value: [a, b, c, d].join(" / ") });
    if (mode === "topology") {
      const indices = mesh.indices.slice(cell.face * 3, cell.face * 3 + 6);
      items.push(
        {
          label: "Hai tam giác",
          value: indices.slice(0, 3).join(", ") + " / " + indices.slice(3).join(", "),
        },
        { label: "Bỏ mặt quay lưng", value: view.cullBack ? "Bật" : "Tắt" },
      );
    } else {
      const face = cell.face + view.faceHalf;
      const record = objFaceRecord(mesh, face, view.oneBased);
      const actual = readObjFaceRecord(record, mesh.vertices.length);
      let status = "Chỉ số không hợp lệ";
      if (actual) {
        status = actual.every((id, index) => id === mesh.indices[face * 3 + index])
          ? "Khớp ba ID của mesh"
          : "Đọc được nhưng trỏ sai đỉnh";
      }
      items.push({ label: "Dòng OBJ", value: record }, { label: "Đọc lại", value: status });
    }
  }

  if (
    mode === "torus" ||
    mode === "mobius" ||
    mode === "knot" ||
    (mode === "showcase" && view.seams)
  ) {
    if (kind !== "shell" && kind !== "patch") {
      const seam = inspectSeam(mesh, view.probeV);
      items.push(
        { label: "Cột đầu → cuối", value: seam.startColumn + " → " + seam.endColumn },
        {
          label: "UV hai phía",
          value:
            "(" +
            seam.start.uv.map(format).join("; ") +
            ") → (" +
            seam.end.uv.map(format).join("; ") +
            ")",
        },
        { label: "Khoảng cách ở mép", value: format(seam.gap) },
        { label: "Normal đầu · cuối", value: format(seam.normalDot) },
      );
    }
  }

  if (mode === "shell" || mode === "knot" || (mode === "showcase" && view.section)) {
    const { frame, row } = frameAtProbe(mesh, view.probeU);
    if (frame && mesh.sweep) {
      items.push(
        { label: "Lát cắt", value: row + "/" + uSegments + " · s = " + format(row / uSegments) },
        { label: "Bán kính tiết diện", value: format(frame.sectionRadius) },
      );
      if (kind === "knot") {
        items.push({
          label: "Góc bù cả vòng",
          value: format((mesh.sweep.correction * 180) / Math.PI) + "°",
        });
      }
    }
  }

  if (mode === "preview" || mode === "showcase") {
    let progress = "Không có yêu cầu";
    if (state.requested) {
      const name = shapeNames[state.requested.kind];
      const rows = state.completedRows + "/" + state.totalRows + " hàng";
      progress = name + " · " + rows;
      if (state.waitingForRelease) progress += " · chờ buông";
      else if (paused) progress += " · tạm dừng làm mịn";
    }
    items.push(
      { label: "Yêu cầu đang chờ", value: progress },
      {
        label: "Last-good",
        value:
          shapeNames[state.lastGood.settings.kind] +
          " · " +
          format(state.lastGood.vertices.length) +
          " đỉnh",
      },
      { label: "Số lần dựng / nhận", value: state.builds + " / " + state.publications },
    );
  }
  if (state.message) items.push({ label: "Trạng thái", value: state.message });
  return <LabReadout items={items} />;
}
