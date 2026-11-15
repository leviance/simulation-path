import { encodeRgba } from "@/lib/labs/heat-plate/pixels";
import type { HeatSession } from "@/lib/labs/heat-plate/session";
import { viewport } from "@/lib/labs/heat-plate/view";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export class HeatPainter {
  private buffer = document.createElement("canvas");
  private image: ImageData | null = null;
  private revision = -1;
  private experiment = false;
  private showPins = true;

  draw(canvas: HTMLCanvasElement, size: CanvasSize, session: HeatSession) {
    const context = canvas.getContext("2d");
    const backing = this.buffer.getContext("2d");
    if (!context || !backing) return false;
    const { field } = session;
    if (!this.image || this.image.width !== field.width || this.image.height !== field.height) {
      this.buffer.width = field.width;
      this.buffer.height = field.height;
      this.image = backing.createImageData(field.width, field.height);
      this.revision = -1;
    }
    if (
      this.revision !== session.gridRevision ||
      this.experiment !== session.settings.experiment ||
      this.showPins !== session.showPins
    ) {
      encodeRgba(field, this.image.data, session.settings.experiment, session.showPins);
      backing.putImageData(this.image, 0, 0);
      this.revision = session.gridRevision;
      this.experiment = session.settings.experiment;
      this.showPins = session.showPins;
    }
    setupCanvas(context, size);
    const view = viewport(size.width, size.height, field);
    if (view.scale <= 0) return false;
    context.imageSmoothingEnabled = false;
    context.drawImage(this.buffer, view.x, view.y, view.width, view.height);
    context.strokeStyle = "#516481";
    context.strokeRect(view.x, view.y, view.width, view.height);
    if (!session.clean && session.stage >= 2) {
      context.save();
      context.beginPath();
      context.rect(view.x, view.y, view.width, view.height);
      context.clip();
      context.strokeStyle = "#fff3ca";
      const radius = session.radius;
      context.strokeRect(
        view.x + (session.cursor.x - radius) * view.scale,
        view.y + (session.cursor.y - radius) * view.scale,
        (radius * 2 + 1) * view.scale,
        (radius * 2 + 1) * view.scale,
      );
      if (session.stage >= 8) {
        const x = view.x + (session.probe.x + 0.5) * view.scale;
        const y = view.y + (session.probe.y + 0.5) * view.scale;
        context.strokeStyle = "#70e0cf";
        context.beginPath();
        context.moveTo(x - 7, y);
        context.lineTo(x + 7, y);
        context.moveTo(x, y - 7);
        context.lineTo(x, y + 7);
        context.stroke();
      }
      context.restore();
    }
    return true;
  }
  dispose() {
    this.image = null;
    this.buffer.width = 1;
    this.buffer.height = 1;
  }
}
