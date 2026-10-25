import type { MapKind, MapLayout } from "@/lib/labs/map-data";
import type { MapScene, MapTool } from "@/lib/labs/map-scene";

export interface MapCommands {
  tool: (tool: MapTool) => void;
  reset: (count?: number, seed?: number, layout?: MapLayout) => void;
  cancel: () => void;
  home: () => void;
  zoom: (factor: number) => void;
  remove: () => void;
  add: () => void;
  selectView: () => void;
  kind: (kind: MapKind) => void;
  debug: () => void;
  method: () => void;
  rebuild: (capacity: number) => void;
}
export function MapEditorControls({ scene, commands }: { scene: MapScene; commands: MapCommands }) {
  return (
    <div className="lab-controls">
      {scene.stage >= 2 && (
        <label>
          Công cụ
          <select
            aria-label="Công cụ bản đồ"
            value={scene.tool}
            onChange={(event) => commands.tool(event.target.value as MapTool)}
          >
            <option value="pan">Pan bản đồ</option>
            {scene.stage >= 3 && <option value="select">Chọn đối tượng</option>}
            {scene.stage >= 8 && <option value="move">Di chuyển nhóm</option>}
            {scene.stage >= 7 && <option value="add">Thêm đối tượng</option>}
          </select>
        </label>
      )}
      <button type="button" onClick={() => commands.reset()}>
        Đặt lại dataset
      </button>
      <button type="button" onClick={commands.cancel}>
        Hủy thao tác
      </button>
      {scene.stage >= 2 && (
        <>
          <button type="button" onClick={commands.home}>
            Về camera ban đầu
          </button>
          <button type="button" aria-label="Phóng to bản đồ" onClick={() => commands.zoom(1.25)}>
            Zoom +
          </button>
          <button type="button" aria-label="Thu nhỏ bản đồ" onClick={() => commands.zoom(0.8)}>
            Zoom −
          </button>
        </>
      )}
      <label>
        Quy mô ban đầu
        <select
          aria-label="Quy mô bản đồ"
          value={scene.count}
          onChange={(event) => commands.reset(Number(event.target.value))}
        >
          <option value="10000">10.000</option>
          <option value="100000">100.000</option>
        </select>
      </label>
      <label>
        Seed
        <select
          aria-label="Seed bản đồ"
          value={scene.seed}
          onChange={(event) => commands.reset(scene.count, Number(event.target.value))}
        >
          {[1, 7, 42].map((seed) => (
            <option key={seed} value={seed}>
              {seed}
            </option>
          ))}
        </select>
      </label>
      <label>
        Phân bố
        <select
          aria-label="Phân bố bản đồ"
          value={scene.layout}
          onChange={(event) =>
            commands.reset(scene.count, scene.seed, event.target.value as MapLayout)
          }
        >
          <option value="districts">Đều theo khu phố</option>
          <option value="clustered">Các khu dày đặc</option>
          <option value="large">Đối tượng lớn cắt split</option>
        </select>
      </label>
      {scene.stage >= 3 && (
        <button type="button" onClick={commands.selectView}>
          Chọn trong viewport
        </button>
      )}
      {scene.stage >= 6 && (
        <button type="button" onClick={commands.method}>
          Đang dùng {scene.document.useTree ? "Quadtree" : "brute force"}
        </button>
      )}
      {scene.stage >= 4 && (
        <>
          <button type="button" onClick={commands.debug}>
            {scene.debug ? "Ẩn node debug" : "Hiện node debug"}
          </button>
          <label>
            Leaf capacity
            <select
              aria-label="Leaf capacity"
              value={scene.document.tree.config.capacity}
              onChange={(event) => commands.rebuild(Number(event.target.value))}
            >
              {[4, 8, 16, 32, 64].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {scene.stage >= 7 && (
        <>
          <label>
            Loại mới
            <select
              aria-label="Loại đối tượng mới"
              value={scene.kind}
              onChange={(event) => commands.kind(event.target.value as MapKind)}
            >
              <option value="house">Nhà</option>
              <option value="tree">Cây</option>
              <option value="park">Công viên</option>
            </select>
          </label>
          <button type="button" onClick={commands.add}>
            Thêm tại tâm camera
          </button>
          <button
            type="button"
            onClick={commands.remove}
            disabled={scene.document.selection.size === 0}
          >
            Xóa selection
          </button>
        </>
      )}
    </div>
  );
}
