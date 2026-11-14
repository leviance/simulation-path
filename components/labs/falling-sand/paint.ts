import type { SandSession } from "@/lib/labs/falling-sand/session";
import { encodeRgba, overlayMoved } from "@/lib/labs/falling-sand/pixels";
import { gridViewport } from "@/lib/labs/falling-sand/view";
import { setupCanvas, type CanvasSize } from "../lab-shared";

/** One pixel per cell, then one drawImage. No per-cell DOM or React snapshot. */
export class SandPainter {
  private buffer = document.createElement("canvas");
  private image: ImageData | null = null;
  private encodedRevision = -1;
  private encodedPlain = false;
  private encodedMoved = false;

  draw(canvas: HTMLCanvasElement, size: CanvasSize, session: SandSession) {
    const context = canvas.getContext("2d");
    const backing = this.buffer.getContext("2d");
    if (!context || !backing) return false;
    const { grid } = session;
    if (!this.image || this.image.width !== grid.width || this.image.height !== grid.height) {
      this.buffer.width = grid.width;
      this.buffer.height = grid.height;
      this.image = backing.createImageData(grid.width, grid.height);
      this.encodedRevision = -1;
    }
    const plain = session.plain || session.stage < 7;
    const showMoved = session.showMoved && session.stage >= 3 && !session.clean;
    if (
      this.encodedRevision !== session.gridRevision ||
      this.encodedPlain !== plain ||
      this.encodedMoved !== showMoved
    ) {
      encodeRgba(grid, this.image.data, plain);
      if (showMoved) overlayMoved(grid, this.image.data);
      backing.putImageData(this.image, 0, 0);
      this.encodedRevision = session.gridRevision;
      this.encodedPlain = plain;
      this.encodedMoved = showMoved;
    }
    setupCanvas(context, size);
    const view = gridViewport(size.width, size.height, grid.width, grid.height);
    if (view.scale <= 0) return false;
    context.imageSmoothingEnabled = false;
    context.drawImage(this.buffer, view.x, view.y, view.width, view.height);
    context.save();
    context.beginPath();
    context.rect(view.x, view.y, view.width, view.height);
    context.clip();
    let radius = session.radius;
    if (session.stage < 2) radius = 0;
    context.strokeStyle = "#f3e2b5";
    context.lineWidth = 1;
    if (!session.clean)
      context.strokeRect(
        view.x + (session.cursor.x - radius) * view.scale,
        view.y + (session.cursor.y - radius) * view.scale,
        (radius * 2 + 1) * view.scale,
        (radius * 2 + 1) * view.scale,
      );
    context.restore();
    context.strokeStyle = "#455571";
    context.strokeRect(view.x, view.y, view.width, view.height);
    return true;
  }

  dispose() {
    this.image = null;
    this.buffer.width = 1;
    this.buffer.height = 1;
  }
}
