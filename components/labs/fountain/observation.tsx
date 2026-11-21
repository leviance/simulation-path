"use client";

import { activeFountainView, fountainViews } from "@/lib/labs/fountain/camera";
import { dropPhase, maxInspectedDrops } from "@/lib/labs/fountain/inspection";
import { particleAt, type FountainScene } from "@/lib/labs/fountain/scene";
import type { BenchmarkProgress } from "@/lib/labs/fountain/worker-protocol";
import type { FountainAction } from "./controls";
import styles from "./observation.module.css";

const viewNames = { oblique: "Góc nghiêng", plan: "Nhìn từ trên", profile: "Nhìn ngang" };

export function FountainObservation({
  scene,
  inspect,
  action,
  result,
  reduced,
}: {
  scene: FountainScene;
  inspect: boolean;
  action: (kind: FountainAction, value?: number) => void;
  result: BenchmarkProgress | null;
  reduced: boolean;
}) {
  const activeView = activeFountainView(scene.camera);
  const running = result?.active
    ? !result.paused
    : scene.pending?.kind === "conversion"
      ? !scene.jobPaused
      : !scene.paused;
  const canResume = !reduced || Boolean(result?.active) || scene.pending?.kind === "conversion";
  const particle = scene.selected < scene.active ? particleAt(scene, scene.selected) : null;
  return (
    <section className={styles.panel} aria-label="Bàn quan sát đài phun">
      <div className={styles.toolbar}>
        <div className={styles.group} role="group" aria-label="Thời gian mô phỏng">
          <button
            type="button"
            className={styles.play}
            disabled={scene.stage < 2 || !canResume}
            onClick={() => action("run")}
          >
            {running ? "Tạm dừng" : "Tiếp tục"}
          </button>
          <button
            type="button"
            disabled={
              scene.stage < 2 || Boolean(result?.active) || scene.pending?.kind === "conversion"
            }
            onClick={() => action("step")}
          >
            Tiến một bước
          </button>
          <button type="button" onClick={() => action("reset")}>
            Đặt lại
          </button>
        </div>
        <div className={styles.group} role="group" aria-label="Góc nhìn cùng một trạng thái">
          {fountainViews.map((view, index) => (
            <button
              type="button"
              key={view}
              aria-pressed={view === activeView}
              onClick={() => action("camera", index)}
            >
              {viewNames[view]}
            </button>
          ))}
        </div>
        {scene.stage >= 2 && (
          <label>
            Độ xòe
            <input
              type="range"
              aria-label="Độ xòe"
              min={0}
              max={5}
              step={0.5}
              value={scene.config.spread}
              onChange={(event) => action("spread", event.target.valueAsNumber)}
            />
            <span>{scene.config.spread.toLocaleString("vi-VN")} m/s</span>
          </label>
        )}
        <button type="button" aria-pressed={inspect} onClick={() => action("inspect")}>
          Theo một giọt
        </button>
      </div>
      <p className={styles.caption}>
        {scene.stage === 1
          ? "Bài đầu chỉ dựng trạng thái ban đầu, chưa cho thời gian chạy. "
          : scene.steps === 0 && scene.paused
            ? "Cảnh đang dừng. Nhấn Tiến một bước để đi thêm 1/120 giây. "
            : ""}
        Vòi phun hơi nghiêng. Nhìn ngang để thấy dòng nước vươn lên rồi đổ xuống phía trước.
        {scene.stage >= 2 &&
          " Thử đưa độ xòe về 0 rồi nhấn Đặt lại: nhìn từ trên, các giọt tụ thành một dải hẹp; nhìn ngang, tia nước vẫn vẽ một cung."}
      </p>
      {inspect && (
        <div className={styles.inspector} role="group" aria-label="Giọt đang theo dõi">
          <div className={styles.toolbar}>
            <label>
              Slot cần xem
              <input
                type="number"
                min={0}
                max={scene.count - 1}
                value={scene.selected}
                onChange={(event) => action("selected", event.target.valueAsNumber)}
              />
            </label>
            {scene.stage >= 2 && (
              <button type="button" disabled={scene.active === 0} onClick={() => action("expiry")}>
                Tìm giọt sắp tái sinh
              </button>
            )}
          </div>
          {particle ? (
            <dl className={styles.readings}>
              <div>
                <dt>Giọt đang chọn</dt>
                <dd>
                  ID {particle.id} · generation {particle.generation}
                </dd>
              </div>
              <div>
                <dt>Tuổi / lifetime</dt>
                <dd>
                  {particle.age.toFixed(4)} / {particle.lifetime.toFixed(4)} s
                </dd>
              </div>
              <div>
                <dt>Chuyển động</dt>
                <dd>{dropPhase(particle)}</dd>
              </div>
              <div>
                <dt>Vận tốc ngang X / Z</dt>
                <dd>
                  {particle.velocityX.toFixed(3)} / {particle.velocityZ.toFixed(3)} m/s
                </dd>
              </div>
              <div>
                <dt>Độ cao / vận tốc đứng</dt>
                <dd>
                  {particle.positionY.toFixed(2)} m / {particle.velocityY.toFixed(2)} m/s
                </dd>
              </div>
            </dl>
          ) : (
            <p className={styles.caption}>Slot này đã được cấp phát nhưng chưa phát giọt nào.</p>
          )}
          <p className={styles.caption}>
            Vòng màu hổ phách đánh dấu giọt nếu nó ở trong khung hình và không bị mặt lưới che.
            {scene.stage >= 2 && (
              <>
                {" "}
                Nút tìm chỉ đọc tối đa {maxInspectedDrops.toLocaleString("vi-VN")} slot đầu. Tiến
                từng bước qua lúc giọt hết tuổi thọ: ID giữ nguyên, còn generation tăng và tuổi về
                gần 0.
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
