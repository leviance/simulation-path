"use client";
import {
  sampleElasticSpring,
  springScale,
  springStabilityIndex,
  totalSpringMechanicalEnergy,
  type SpringVec2,
} from "@/lib/labs/spring-chain";
import { SPRING_STEPS, type SpringScene } from "@/lib/labs/spring-scene";
const vector = (v: SpringVec2) => "(" + v.x.toFixed(4) + ", " + v.y.toFixed(4) + ")";
export function SpringReadout({ scene: s }: { scene: SpringScene }) {
  const selected = s.chain.particles[s.selected] ?? s.chain.particles[0],
    m = s.metrics;
  const sample = s.stage === 2 ? sampleElasticSpring(s.chain, s.chain.springs[0]) : null;
  return (
    <div>
      <dl className="lab-readout">
        <div>
          <dt>Topology</dt>
          <dd>
            {s.chain.particles.length} mass / {s.chain.springs.length} spring
          </dd>
        </div>
        <div>
          <dt>Anchor</dt>
          <dd>node 0 · inverseMass = 0 · {vector(s.chain.anchorPosition)} m</dd>
        </div>
        <div>
          <dt>Elapsed / bước physics</dt>
          <dd>
            {s.elapsed.toFixed(3)} s / {s.steps}
          </dd>
        </div>
        <div>
          <dt>Substep / frame guard</dt>
          <dd>
            {s.substeps} / {s.droppedTime.toFixed(4)} s đã bỏ
          </dd>
        </div>
        <div>
          <dt>Khối được chọn</dt>
          <dd>
            node {s.selected} · p = {vector(selected.position)} m · v = {vector(selected.velocity)}{" "}
            m/s
          </dd>
        </div>
        {sample && (
          <>
            <div>
              <dt>Distance / rest length / stretch</dt>
              <dd>
                {sample.distance.toFixed(4)} / 1.0000 / {sample.stretch.toFixed(4)} m
              </dd>
            </div>
            <div>
              <dt>Force pair</dt>
              <dd>
                F_A = {vector(sample.forceOnFirst)} N · F_B ={" "}
                {vector(springScale(sample.forceOnFirst, -1))} N
              </dd>
            </div>
          </>
        )}
        {s.stage >= 3 && (
          <div>
            <dt>Lực đã dùng ở bước gần nhất</dt>
            <dd>
              {vector(selected.force)} N{" "}
              {s.steps === 0 && s.stage !== 3 ? "· chưa chạy bước nào" : ""}
            </dd>
          </div>
        )}
        {s.stage >= 6 && (
          <div>
            <dt>Pointer / release cap</dt>
            <dd>{s.drag?.active ? "đang kéo" : "đã nhả"} · tối đa 6 m/s</dd>
          </div>
        )}
        {s.stage >= 7 && (
          <>
            <div>
              <dt>Stability index q</dt>
              <dd>
                {springStabilityIndex(s.stiffness, s.mass, SPRING_STEPS[s.dtIndex]).toFixed(5)} ·
                chỉ số tham khảo, không phải bảo đảm ổn định
              </dd>
            </div>
            <div>
              <dt>K / Us / Ug</dt>
              <dd>
                {m.kineticEnergy.toFixed(6)} / {m.springEnergy.toFixed(6)} /{" "}
                {m.gravitationalEnergy.toFixed(6)} J
              </dd>
            </div>
            <div>
              <dt>Stretch / speed / anchor error</dt>
              <dd>
                {m.maximumStretch.toFixed(5)} m / {m.maximumSpeed.toFixed(5)} m/s /{" "}
                {m.anchorError.toExponential(2)} m
              </dd>
            </div>
          </>
        )}
        {s.stage >= 8 && (
          <>
            <div>
              <dt>Mechanical energy / drift</dt>
              <dd>
                E = {totalSpringMechanicalEnergy(m).toFixed(6)} J · ΔE ={" "}
                {(totalSpringMechanicalEnergy(m) - s.initialEnergy).toExponential(4)} J
              </dd>
            </div>
            <div>
              <dt>History / fast job</dt>
              <dd>
                {s.history.length} mẫu · còn {s.fastRemaining} bước
              </dd>
            </div>
          </>
        )}
      </dl>
      {s.trace && s.debug && (
        <div className="lab-readout">
          <p>
            Trace node {s.trace.index}: F = {vector(s.trace.force)} N → a ={" "}
            {vector(s.trace.acceleration)} m/s² → v: {vector(s.trace.velocityBefore)} →{" "}
            {vector(s.trace.velocityAfter)} m/s → p: {vector(s.trace.positionBefore)} →{" "}
            {vector(s.trace.positionAfter)} m.
          </p>
          {s.trace.kinematic && (
            <p>
              Khối này đang được chuột giữ nên không được tích phân; trace không phải một bước mass
              tự do.
            </p>
          )}
        </div>
      )}
      <p className="lab-hint">
        Node 0 là điểm neo cố định.
        {s.stage >= 5 && (
          <>
            {" "}
            Damping dọc trục chỉ cản co–giãn lò xo, không phải lực cản không khí; dây có thể còn
            đung đưa lâu.
          </>
        )}
        {s.stage >= 6 && (
          <>
            {" "}
            Kéo/thả bắt đầu đoạn đo mới; trong lúc kéo, chuột đang làm công. Đồ thị độ lệch cắt vùng
            ngoài khoảng trục hiển thị, không clamp trạng thái vật lý.
          </>
        )}
        {s.stage >= 8 && (
          <>
            {" "}
            Ug lấy mốc tại anchor, có thể âm. Energy plot và displacement plot dùng hai hệ trục
            riêng. History lấy định kỳ tối đa 60 Hz, thêm mẫu khi tiến một bước hoặc kết thúc job;
            giữ 1201 mẫu gần nhất, không lấy mẫu theo render frame. Mốc t₀ được ghi khi bắt đầu đo
            và có thể ra khỏi cửa sổ này.
          </>
        )}
      </p>
    </div>
  );
}
