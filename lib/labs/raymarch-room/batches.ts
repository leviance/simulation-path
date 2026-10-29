import type { createImageJob } from "./image.ts";
export interface BatchClock {
  request: (callback: () => void) => number;
  cancel: (ticket: number) => void;
  now: () => number;
}
// Thời gian chỉ là budget mềm; hard cap 96 tia vẫn chặn loop nếu clock đứng.
export function scheduleImage(
  job: ReturnType<typeof createImageJob>,
  clock: BatchClock,
  progress: () => void,
  complete: () => void,
  stalled: () => void,
) {
  let ticket: number | null = null,
    disposed = false;
  const batch = () => {
    ticket = null;
    if (disposed) return;
    const start = clock.now();
    let count = 0;
    while (!job.done && count < 96) {
      if (job.step(1) === 0) {
        stalled();
        return;
      }
      count++;
      if (clock.now() - start >= 6) break;
    }
    progress();
    if (disposed) return;
    if (job.done) complete();
    else ticket = clock.request(batch);
  };
  ticket = clock.request(batch);
  return () => {
    disposed = true;
    job.dispose();
    if (ticket !== null) clock.cancel(ticket);
  };
}
