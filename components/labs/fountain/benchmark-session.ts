import type { BenchmarkCommand, BenchmarkProgress } from "@/lib/labs/fountain/worker-protocol";

type StartCommand = Extract<BenchmarkCommand, { kind: "start" }>;
export interface BenchmarkSession {
  dispose(): void;
  pause(paused: boolean): void;
  cancel(): void;
}

// Own the browser resource outside React. Every exit path clears both timers
// and detaches handlers, including a failure during the first postMessage.
export function createBenchmarkSession(
  worker: Worker,
  command: StartCommand,
  initial: BenchmarkProgress,
  publish: (progress: BenchmarkProgress) => void,
): BenchmarkSession {
  let live = true;
  let latest = initial;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let cancellation: ReturnType<typeof setTimeout> | null = null;
  const dispose = () => {
    if (!live) return;
    live = false;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    if (watchdog !== null) clearTimeout(watchdog);
    if (cancellation !== null) clearTimeout(cancellation);
    watchdog = cancellation = null;
  };
  const finish = (notice: string, timedOut = false) => {
    if (!live) return;
    const progress = { ...latest, active: false, notice, timedOut };
    dispose();
    publish(progress);
  };
  worker.onmessage = (event: MessageEvent<BenchmarkProgress>) => {
    if (!live || event.data.requestId !== command.requestId) return;
    latest = event.data;
    if (!latest.active) dispose();
    publish(latest);
  };
  worker.onerror = () =>
    finish(
      "Worker không thể hoàn thành phép đo. Kết quả dở dang không được coi là đạt; bạn có thể chạy lại.",
    );
  watchdog = setTimeout(
    () =>
      finish(
        "Đã buộc dừng worker sau 35 giây. Chỉ giữ các dòng đã nhận đầy đủ; thí nghiệm chưa hoàn tất.",
        true,
      ),
    35000,
  );
  try {
    worker.postMessage(command);
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    dispose,
    pause(paused) {
      if (!live) return;
      worker.postMessage({
        kind: "pause",
        requestId: command.requestId,
        paused,
      } satisfies BenchmarkCommand);
      latest = { ...latest, paused };
      publish(latest);
    },
    cancel() {
      if (!live) return;
      worker.postMessage({
        kind: "cancel",
        requestId: command.requestId,
      } satisfies BenchmarkCommand);
      if (cancellation !== null) clearTimeout(cancellation);
      cancellation = setTimeout(
        () => finish("Đã hủy worker; chỉ giữ các dòng đã nhận đầy đủ."),
        500,
      );
    },
  };
}
