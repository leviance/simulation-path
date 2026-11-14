"use client";

import { lazy, Suspense } from "react";
import { atomicMode } from "@/lib/labs/atomic-playground/view";
import type { InteractiveLabMode } from "./types";

const AtomicWorkshop = lazy(() => import("./atomic-playground/workshop"));

export default function AtomicPlaygroundLab({ mode }: { mode?: InteractiveLabMode }) {
  const selected = atomicMode(mode);
  return (
    <Suspense
      fallback={
        <>
          <p className="lab-fallback">Đang tải mô hình lấy mẫu orbital…</p>
          <dl className="lab-readout">
            <div>
              <dt>Phạm vi Canvas</dt>
              <dd>Reference CPU nhỏ; không thay một triệu mẫu GPU của bản C++.</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>Chưa công bố cloud; không có mẫu nào được tính là đã sinh.</dd>
            </div>
          </dl>
        </>
      }
    >
      <AtomicWorkshop key={selected} mode={selected} />
    </Suspense>
  );
}
