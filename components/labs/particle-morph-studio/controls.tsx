import type { Dispatch, SetStateAction } from "react";
import type { Settings } from "@/lib/labs/particle-morph-studio/session";
import type { View } from "@/lib/labs/particle-morph-studio/view";
import type { Probe } from "./paint";

interface Props {
  id: string;
  staged: Settings;
  setStaged: Dispatch<SetStateAction<Settings>>;
  view: View;
  setView: Dispatch<SetStateAction<View>>;
  apply: () => void;
  cancel: () => void;
  busy: boolean;
  playing: boolean;
  reducedMotion: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  time: number;
  scrub: (value: number) => void;
  reset: () => void;
  reverse: boolean;
  setReverse: Dispatch<SetStateAction<boolean>>;
  loop: boolean;
  setLoop: Dispatch<SetStateAction<boolean>>;
  probe: Probe;
  setProbe: Dispatch<SetStateAction<Probe>>;
  area: boolean;
  hold: boolean;
  setHold: Dispatch<SetStateAction<boolean>>;
  step: () => void;
  generation: boolean;
}
export function MorphControls(props: Props) {
  const { id, staged, setStaged, view, setView } = props;
  return (
    <div className="lab-controls">
      <label htmlFor={id + "-source"}>
        Hình nguồn
        <select
          id={id + "-source"}
          value={staged.source}
          onChange={(event) =>
            setStaged((current) => ({
              ...current,
              source: event.target.value as Settings["source"],
            }))
          }
        >
          <option value="sphere">Cầu</option>
          <option value="torus">Xuyến</option>
          <option value="knot">Nút thắt</option>
        </select>
      </label>
      <label htmlFor={id + "-target"}>
        Hình đích
        <select
          id={id + "-target"}
          value={staged.target}
          onChange={(event) =>
            setStaged((current) => ({
              ...current,
              target: event.target.value as Settings["target"],
            }))
          }
        >
          <option value="sphere">Cầu</option>
          <option value="torus">Xuyến</option>
          <option value="knot">Nút thắt</option>
        </select>
      </label>
      <label htmlFor={id + "-count"}>
        Số mẫu Canvas (1–4.096)
        <input
          id={id + "-count"}
          type="number"
          min={1}
          max={4096}
          value={staged.count}
          onChange={(event) =>
            setStaged((current) => ({ ...current, count: Number(event.target.value) }))
          }
        />
      </label>
      <label htmlFor={id + "-seed"}>
        Seed uint32
        <input
          id={id + "-seed"}
          type="number"
          min={0}
          max={4294967295}
          value={staged.seed}
          onChange={(event) =>
            setStaged((current) => ({ ...current, seed: Number(event.target.value) }))
          }
        />
      </label>
      <label htmlFor={id + "-sampling"}>
        Cách lấy mẫu
        <select
          id={id + "-sampling"}
          value={staged.sampling}
          onChange={(event) =>
            setStaged((current) => ({
              ...current,
              sampling: event.target.value as Settings["sampling"],
            }))
          }
        >
          <option value="area">Theo diện tích — đúng</option>
          <option value="triangle">Mỗi tam giác như nhau — cố ý sai</option>
        </select>
      </label>
      <button type="button" onClick={props.apply}>
        Áp dụng yêu cầu
      </button>
      <button type="button" onClick={props.cancel} disabled={!props.busy}>
        Hủy chuẩn bị
      </button>
      <label htmlFor={id + "-matching"}>
        Ghép điểm A/B (không rải lại)
        <select
          id={id + "-matching"}
          value={view.matching}
          onChange={(event) =>
            setView((current) => ({ ...current, matching: event.target.value as View["matching"] }))
          }
        >
          <option value="random">Random permutation</option>
          <option value="spatial">Spatial order</option>
        </select>
      </label>
      <label htmlFor={id + "-easing"}>
        Nhịp thời gian
        <select
          id={id + "-easing"}
          value={view.easing}
          onChange={(event) =>
            setView((current) => ({ ...current, easing: event.target.value as View["easing"] }))
          }
        >
          <option value="linear">Linear</option>
          <option value="smooth">Smoothstep</option>
        </select>
      </label>
      <label htmlFor={id + "-path"}>
        Đường đi
        <select
          id={id + "-path"}
          aria-label="Đường đi"
          value={view.path}
          onChange={(event) =>
            setView((current) => ({ ...current, path: event.target.value as View["path"] }))
          }
        >
          <option value="straight">Thẳng</option>
          <option value="arc">Vòng cung có độ lệch liên tục</option>
          <option value="flow">Flow — tản và tụ từng hạt</option>
        </select>
      </label>
      <label htmlFor={id + "-time"}>
        Timeline t = {props.time.toFixed(3)}
        <input
          id={id + "-time"}
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={props.time}
          onChange={(event) => props.scrub(Number(event.target.value))}
        />
      </label>
      <button
        type="button"
        aria-pressed={props.playing}
        disabled={props.reducedMotion}
        onClick={() => props.setPlaying((value) => !value)}
      >
        {props.playing ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={props.reset}>
        Reset thời gian
      </button>
      <label>
        <input
          type="checkbox"
          checked={props.reverse}
          onChange={(event) => props.setReverse(event.target.checked)}
        />
        Đảo chiều
      </label>
      <label>
        <input
          type="checkbox"
          checked={props.loop}
          onChange={(event) => props.setLoop(event.target.checked)}
        />
        Lặp
      </label>
      <label>
        <input
          type="checkbox"
          checked={view.heat}
          onChange={(event) => setView((current) => ({ ...current, heat: event.target.checked }))}
        />
        Mật độ so với diện tích
      </label>
      <label>
        <input
          type="checkbox"
          checked={view.paths}
          onChange={(event) => setView((current) => ({ ...current, paths: event.target.checked }))}
        />
        24 đường đi mẫu
      </label>
      {props.area && (
        <>
          <label>
            u ngẫu nhiên = {props.probe.u.toFixed(2)}
            <input
              aria-label="u barycentric"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.probe.u}
              onChange={(event) =>
                props.setProbe((current) => ({ ...current, u: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            v ngẫu nhiên = {props.probe.v.toFixed(2)}
            <input
              aria-label="v barycentric"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.probe.v}
              onChange={(event) =>
                props.setProbe((current) => ({ ...current, v: Number(event.target.value) }))
              }
            />
          </label>
        </>
      )}
      {props.generation && (
        <>
          <label>
            <input
              type="checkbox"
              checked={props.hold}
              onChange={(event) => props.setHold(event.target.checked)}
            />
            Tạm dừng chuẩn bị để đọc từng batch
          </label>
          <button type="button" onClick={props.step} disabled={!props.busy}>
            Tiến một batch
          </button>
        </>
      )}
    </div>
  );
}
