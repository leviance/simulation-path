import { FountainBenchmarkJob } from "../../../lib/labs/fountain/benchmark";
import type {
  BenchmarkCommand,
  BenchmarkProgress,
} from "../../../lib/labs/fountain/worker-protocol";

let job: FountainBenchmarkJob | null = null;
let requestId = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastReport = -Infinity;

function report() {
  if (!job) return;
  const progress: BenchmarkProgress = {
    requestId,
    active: job.active,
    paused: job.paused,
    timedOut: job.timedOut,
    notice: job.notice,
    rows: job.rows,
    caseIndex: job.caseIndex,
    caseCount: job.sizes.length * job.workloads.length,
    sample: job.sample,
    phase: job.phase,
  };
  self.postMessage(progress);
  lastReport = performance.now();
}

function tick() {
  timer = null;
  if (!job) return;
  try {
    // Each tick yields to messages, so pause/cancel never waits for a whole run.
    job.tick();
  } catch (error) {
    job.active = false;
    job.notice =
      "Phép đo dừng vì kiểm chứng thất bại: " +
      (error instanceof Error ? error.message : "lỗi không xác định");
  }
  if (!job.active || performance.now() - lastReport >= 120) report();
  if (job.active) timer = setTimeout(tick, job.paused ? 100 : 0);
}

self.onmessage = (event: MessageEvent<BenchmarkCommand>) => {
  const command = event.data;
  if (command.kind !== "start") {
    if (!job || command.requestId !== requestId) return;
    if (command.kind === "cancel") job.cancel();
    else job.paused = command.paused;
    report();
    return;
  }
  if (timer !== null) clearTimeout(timer);
  job?.cancel();
  requestId = command.requestId;
  try {
    job = new FountainBenchmarkJob(
      command.config,
      command.sizes,
      command.workloads,
      command.paired,
    );
    report();
    timer = setTimeout(tick, 0);
  } catch (error) {
    job = null;
    self.postMessage({
      requestId,
      active: false,
      paused: false,
      timedOut: false,
      rows: [],
      caseIndex: 0,
      caseCount: 0,
      sample: -1,
      phase: "invalid",
      notice:
        "Không thể bắt đầu: " + (error instanceof Error ? error.message : "tham số không hợp lệ"),
    } satisfies BenchmarkProgress);
  }
};
