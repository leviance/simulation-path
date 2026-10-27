import type { GalaxyScene, selectedForce } from "@/lib/labs/galaxy/scene";
import { vectorLength } from "@/lib/labs/galaxy/scene";
import { LabReadout } from "./lab-shared";

export default function GalaxyReadout({
  scene,
  force,
}: {
  scene: GalaxyScene;
  force: ReturnType<typeof selectedForce>;
}) {
  const stage = scene.stage;
  const lastEnergy = scene.history.at(-1);
  return (
    <LabReadout
      items={[
        {
          label: "N / step / thời gian mô phỏng",
          value: scene.bodies.length + " / " + scene.steps + " / " + scene.time.toFixed(5),
        },
        {
          label: "Preset / seed / không gian",
          value: scene.preset + " / 0x31c0ffee / XYZ 3D · G=0,001",
        },
        {
          label: "Vị trí camera dọc hướng nhìn",
          value:
            scene.camera.distance.toFixed(3) + " length unit · có thể đi qua 0 · Home để quay về",
        },
        {
          label: "Trạng thái / physics progress",
          value:
            (scene.paused ? "Tạm dừng" : "Đang chạy") +
            " · " +
            (scene.physics
              ? scene.physics.target + "/" + scene.bodies.length
              : "không có bước dở dang"),
        },
        ...(stage === 2
          ? [
              {
                label: "Pair acceleration từ body 0",
                value:
                  "(" +
                  force.pair.x.toExponential(6) +
                  ", " +
                  force.pair.y.toExponential(6) +
                  ", " +
                  force.pair.z.toExponential(6) +
                  ") · norm=" +
                  vectorLength(force.pair).toExponential(6),
              },
            ]
          : []),
        ...(stage >= 3
          ? [
              {
                label: "Direct acceleration của target " + scene.selected,
                value:
                  "(" +
                  force.exact.acceleration.x.toExponential(3) +
                  ", " +
                  force.exact.acceleration.y.toExponential(3) +
                  ", " +
                  force.exact.acceleration.z.toExponential(3) +
                  ") · " +
                  force.exact.exactInteractions +
                  " sources",
              },
            ]
          : []),
        ...(stage >= 5
          ? [
              {
                label: "Mass Octree / root mass",
                value:
                  scene.tree.nodes.length +
                  " nodes · M=" +
                  scene.tree.nodes[0].totalMass.toFixed(5),
              },
            ]
          : []),
        ...(stage >= 6
          ? [
              {
                label: "BH / sai số lực tại body đang theo dõi",
                value:
                  "(" +
                  force.approximate.acceleration.x.toExponential(3) +
                  ", " +
                  force.approximate.acceleration.y.toExponential(3) +
                  ", " +
                  force.approximate.acceleration.z.toExponential(3) +
                  ") · |aBH|=" +
                  vectorLength(force.approximate.acceleration).toExponential(3) +
                  " · absolute=" +
                  force.absolute.toExponential(3) +
                  " · relative=" +
                  force.relative.toExponential(3),
              },
              {
                label: "Visited / accepted / exact sources",
                value:
                  force.approximate.visitedNodes +
                  " / " +
                  force.approximate.approximatedNodes +
                  " / " +
                  force.approximate.exactInteractions,
              },
            ]
          : []),
        ...(stage >= 10
          ? [
              {
                label: "Năng lượng toàn hệ / momentum",
                value: lastEnergy
                  ? "N=" +
                    lastEnergy.count +
                    " E=" +
                    lastEnergy.energy.toExponential(5) +
                    " |P|=" +
                    vectorLength(lastEnergy.momentum).toExponential(3) +
                    " tại t=" +
                    lastEnergy.time.toFixed(5)
                  : "Chưa đo. Bấm Đo năng lượng toàn hệ trước khi chạy để lấy mốc t=0.",
              },
            ]
          : []),
      ]}
    />
  );
}
