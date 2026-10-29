import { createImageJob } from "@/lib/labs/raymarch-room/image";
import { scheduleImage } from "@/lib/labs/raymarch-room/batches";
import type { RoomSession } from "@/lib/labs/raymarch-room/session";
import type { CanvasSize } from "../lab-shared";
import { crosshair, drawDiagram, drawTraceDiagram } from "./diagrams";

// Mỗi task tối đa 96 tia / khoảng 6ms, không giữ luồng UI cho cả ảnh.
export function renderRoom(
  canvas: HTMLCanvasElement,
  size: CanvasSize,
  state: RoomSession,
  complete: () => void,
) {
  const c = canvas.getContext("2d");
  if (!c) return () => {};
  c.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  canvas.dataset.renderState = "rendering";
  canvas.setAttribute("aria-busy", "true");
  const finish = () => {
    canvas.dataset.renderState = "complete";
    canvas.setAttribute("aria-busy", "false");
    complete();
  };
  if (drawDiagram(c, size.width, size.height, size.dpr, state)) {
    finish();
    return () => {};
  }
  const job = createImageJob(state, size.width, size.height);
  const buffer = document.createElement("canvas");
  buffer.width = job.width;
  buffer.height = job.height;
  const b = buffer.getContext("2d");
  if (!b) {
    finish();
    return () => job.dispose();
  }
  const image = b.createImageData(job.width, job.height);
  const draw = () => {
    image.data.set(job.pixels);
    b.putImageData(image, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(buffer, 0, 0, job.width, job.height, 0, 0, size.width, size.height);
  };
  const completed = () => {
    crosshair(c, state.selectedPixel.x * size.width, state.selectedPixel.y * size.height);
    if (state.stage === 10) {
      const w = Math.min(270, size.width * 0.42),
        h = Math.min(230, size.height * 0.7);
      c.save();
      c.translate(size.width - w - 8, size.height - h - 8);
      c.beginPath();
      c.rect(0, 0, w, h);
      c.clip();
      drawTraceDiagram(c, w, h, state, true);
      c.restore();
    }
    finish();
  };
  const cancel = scheduleImage(
    job,
    {
      request: (callback) => window.setTimeout(callback, 0),
      cancel: (ticket) => window.clearTimeout(ticket),
      now: () => performance.now(),
    },
    draw,
    completed,
    () => {
      canvas.dataset.renderState = "stalled";
      canvas.setAttribute("aria-busy", "false");
    },
  );
  return () => {
    cancel();
    canvas.setAttribute("aria-busy", "false");
  };
}
