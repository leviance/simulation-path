"use client";

import { Suspense } from "react";
import type { DemoId } from "@/lib/course";
import { labComponents } from "@/course/generated/lab-loaders";
import type { ProjectLabMeta } from "@/course/labs/types";
import type { InteractiveLabMode } from "./types";
import { LabHeading } from "./lab-heading";

export function InteractiveLabClient({
  demo,
  metadata,
  mode,
}: {
  demo: DemoId;
  metadata: ProjectLabMeta;
  mode?: InteractiveLabMode;
}) {
  const modeInfo = mode ? metadata.modes[mode] : undefined;
  const info = { ...metadata.base, ...modeInfo };
  if (!(demo in labComponents))
    throw new Error(`Missing presentation for ${demo}/${mode ?? "overview"}`);
  const Lab = labComponents[demo as keyof typeof labComponents];

  return (
    <section className="interactive-lab" data-lab-ui="">
      <LabHeading
        label={info.label}
        title={info.title}
        description={info.description}
        badge="CANVAS 2D · LIVE"
      />
      <Suspense
        fallback={
          <div className="lab-loading" role="status">
            Đang tải mô phỏng…
          </div>
        }
      >
        <Lab mode={mode} />
      </Suspense>
      <p className="lab-fallback">
        Trạng thái hiện tại được ghi lại ngay dưới Canvas. Mọi nút điều khiển dùng được bằng bàn
        phím; chuyển động tôn trọng tùy chọn giảm chuyển động của hệ điều hành.
      </p>
    </section>
  );
}
