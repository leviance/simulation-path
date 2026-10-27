"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FountainConfig, MemoryWorkload } from "@/lib/labs/fountain/state";
import type { BenchmarkProgress } from "@/lib/labs/fountain/worker-protocol";
import { createBenchmarkSession, type BenchmarkSession } from "./benchmark-session";
import benchmarkWorkerUrl from "../workers/memory-layout-benchmark-worker.ts?worker&url";

export function useFountainBenchmark() {
  const [result, setResult] = useState<BenchmarkProgress | null>(null);
  const session = useRef<BenchmarkSession | null>(null);
  const epoch = useRef(0);
  const dispose = useCallback(() => {
    session.current?.dispose();
    session.current = null;
  }, []);
  const clear = useCallback(() => {
    epoch.current++;
    dispose();
    setResult(null);
  }, [dispose]);
  const start = useCallback(
    (config: FountainConfig, sizes: number[], workloads: MemoryWorkload[], paired: boolean) => {
      dispose();
      const requestId = ++epoch.current;
      const initial: BenchmarkProgress = {
        requestId,
        active: true,
        paused: false,
        timedOut: false,
        rows: [],
        caseIndex: 0,
        caseCount: sizes.length * workloads.length,
        sample: -1,
        phase: "loading",
        notice: "Đang tải worker; vật lý tạm dừng, camera vẫn sử dụng được.",
      };
      setResult(initial);
      try {
        // A browser asset URL avoids the file: base introduced by RSC transforms.
        const runtime = new Worker(benchmarkWorkerUrl, { type: "module" });
        session.current = createBenchmarkSession(
          runtime,
          {
            kind: "start",
            requestId,
            config: { ...config },
            sizes,
            workloads,
            paired,
          },
          initial,
          (progress) => {
            if (progress.requestId === epoch.current) setResult(progress);
          },
        );
      } catch {
        setResult({
          ...initial,
          active: false,
          notice: "Không tạo được worker. Hãy dùng nút đặt lại hoặc chạy benchmark trong bản C++.",
        });
      }
    },
    [dispose],
  );
  const pause = useCallback((paused: boolean) => session.current?.pause(paused), []);
  const cancel = useCallback(() => session.current?.cancel(), []);
  useEffect(
    () => () => {
      epoch.current++;
      dispose();
    },
    [dispose],
  );
  return { result, start, pause, cancel, clear };
}
