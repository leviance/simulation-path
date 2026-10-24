import { tankMomentumResidual, type TankScene } from "@/lib/labs/collision-scene";
import {
  applyTankSphereImpulse,
  findTankSphereContact,
  type TankSphere,
} from "@/lib/labs/collision-spheres";
import { LabReadout } from "./lab-shared";
export function CollisionReadout({
  scene: s,
  capturing,
}: {
  scene: TankScene;
  capturing: boolean;
}) {
  const n = s.spatial ? s.spheres.length : s.balls.length,
    stats = s.spatial ? s.sphereStats : s.stats;
  const items = [
    { label: "Không gian / số vật thể", value: (s.spatial ? "3D" : "2D") + " / " + n },
    { label: "Elapsed / substep", value: s.elapsed.toFixed(3) + " s / " + s.substeps },
    { label: "Bước physics đã chạy", value: String(s.steps) },
    {
      label: "Frame guard / pointer capture",
      value: s.droppedTime.toFixed(4) + " s bỏ · " + (capturing ? "đang kéo" : "đã nhả"),
    },
  ];
  if (s.stage >= 7)
    items.push(
      {
        label: "Pair checks",
        value:
          stats.pairChecks +
          (s.steps === 0 ? " (chưa chạy bước nào); mỗi bước: " : " = ") +
          s.iterations +
          " × " +
          (n * (n - 1)) / 2 +
          " (lượt solver gần nhất)",
      },
      {
        label: "Contact visits / impulses",
        value: stats.contacts + " / " + stats.impulses + " · visits có thể lặp qua iterations",
      },
    );
  if (s.trace)
    items.push(
      {
        label: "Contact đầu bước",
        value:
          "n=(" +
          s.trace.contact.normal.x.toFixed(3) +
          ", " +
          s.trace.contact.normal.y.toFixed(3) +
          ") · penetration=" +
          s.trace.contact.penetration.toFixed(5) +
          " m",
      },
      {
        label: "Relative normal speed / impulse",
        value: s.trace.normalSpeed.toFixed(5) + " m/s / " + s.trace.impulse.toFixed(5) + " Ns",
      },
      {
        label: "Correction magnitude",
        value: s.trace.correction.toFixed(5) + " (hệ số chia theo inverse mass)",
      },
    );
  if (s.stage >= 8) {
    const k = s.spatial ? s.sphereMetrics.energy : s.metrics.kineticEnergy,
      pen = s.spatial ? s.sphereMetrics.penetration : s.metrics.maximumPenetration;
    items.push(
      {
        label: "Kinetic energy / drift",
        value:
          k.toFixed(5) +
          " J / " +
          (s.initialEnergy > 0
            ? ((k - s.initialEnergy) / s.initialEnergy).toExponential(3)
            : "không xác định (K₀=0)"),
      },
      {
        label: "Maximum remaining penetration",
        value: pen.toFixed(6) + " m (sau solver, không phải độ xuyên ban đầu)",
      },
      {
        label: "Momentum balance residual",
        value: tankMomentumResidual(s).toExponential(3) + " kg·m/s = |P−P₀−ΣJwall|",
      },
      {
        label: "History / fast job",
        value: s.history.length + " mẫu · còn " + s.fastRemaining + " bước tua nhanh",
      },
    );
  }
  if (s.stage === 9) {
    const a: TankSphere = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 1, y: 2, z: 3 },
      radius: 0.5,
      inverseMass: 1,
      color: "#ff0000",
      restitution: 1,
    };
    const b: TankSphere = {
      position: { x: 0.3, y: 0.6, z: 0.6 },
      velocity: { x: -1, y: 1, z: -2 },
      radius: 0.5,
      inverseMass: 0.5,
      color: "#00ff00",
      restitution: 1,
    };
    const c = findTankSphereContact(a, b),
      j = applyTankSphereImpulse(a, b, c, s.restitution);
    items.push({
      label: "Ví dụ công thức 3D (độc lập bể 2D)",
      value:
        "n=(1/3,2/3,2/3) · j=" +
        j.toFixed(5) +
        " Ns · vA=(" +
        a.velocity.x.toFixed(4) +
        ", " +
        a.velocity.y.toFixed(4) +
        ", " +
        a.velocity.z.toFixed(4) +
        ")",
    });
  }
  return <LabReadout items={items} />;
}
