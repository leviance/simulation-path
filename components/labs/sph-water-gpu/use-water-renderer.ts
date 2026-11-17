"use client";
import { useEffect, useState } from "react";

type Renderer = typeof import("./render-scene").renderWaterScene;

// Keep the depth/optics implementation out of the lab's input and simulation entry chunk.
export function useWaterRenderer() {
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    import("./render-scene").then(
      (module) => {
        if (!disposed) setRenderer(() => module.renderWaterScene);
      },
      () => {
        if (!disposed) setError("Không tải được bộ vẽ Canvas. Hãy tải lại trang để thử lại.");
      },
    );
    return () => {
      disposed = true;
    };
  }, []);
  return { renderer, error };
}
