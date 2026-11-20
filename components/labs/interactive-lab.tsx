import type { DemoId } from "@/lib/course";
import { labMetadataLoaders } from "@/course/generated/project-loaders";
import { InteractiveLabClient } from "./interactive-lab-client";
import type { InteractiveLabMode } from "./types";
import { NativeGallery } from "./native-gallery";

export async function InteractiveLab({
  demo,
  mode,
  overview = false,
}: {
  demo: DemoId;
  mode?: InteractiveLabMode;
  overview?: boolean;
}) {
  const load = labMetadataLoaders[demo];
  if (!load) throw new Error(`Unknown lab: ${demo}`);
  const { default: metadata } = await load();
  const { native, ...canvasInfo } = metadata;
  const selection = mode ? native?.lessons[mode] : native?.overview;
  if (native && selection) {
    const info = mode ? metadata.modes[mode] : metadata.base;
    return (
      <>
        <NativeGallery
          key={mode ?? demo}
          title={info.title}
          overview={overview}
          directory={native.directory}
          takes={selection.map((key) => native.takes[key])}
        />
        {native.withDemo && <InteractiveLabClient demo={demo} metadata={canvasInfo} mode={mode} />}
      </>
    );
  }
  return (
    <>
      {overview && (
        <header>
          <span className="section-index">MÔ HÌNH TƯƠNG TÁC</span>
          <h2 id="project-demo-title">Thử ý tưởng chính trước khi tự viết</h2>
          <p>
            Canvas không chạy mã C++, nhưng dùng cùng biến và công thức với project. Hãy thay tham
            số, dự đoán kết quả rồi quan sát xem suy luận của bạn đúng đến đâu.
          </p>
        </header>
      )}
      <InteractiveLabClient demo={demo} metadata={canvasInfo} mode={mode} />
    </>
  );
}

export type { InteractiveLabMode } from "./types";
