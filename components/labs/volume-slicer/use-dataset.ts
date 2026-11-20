import { useEffect, useState } from "react";
import { createDataset, type Dataset } from "@/lib/labs/volume-slicer/dataset";
import type { Preset } from "@/lib/labs/volume-slicer/field";

export function useDataset(client: boolean, stage: number, preset: Preset, side: number) {
  const [data, setData] = useState<Dataset>();
  const [loading, setLoading] = useState(stage >= 2);
  const [status, setStatus] = useState("Chưa có mảng volume");
  const [error, setError] = useState("");
  const context = stage >= 6;
  useEffect(() => {
    if (!client || stage < 2) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError("");
      try {
        const result = await createDataset(preset, side, context, controller.signal, setStatus);
        if (controller.signal.aborted) return;
        setData(result);
        setStatus("Dữ liệu sẵn sàng");
        setLoading(false);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error ? failure.message : String(failure));
        setStatus("Không thay dataset đang xem");
        setLoading(false);
      }
    });
    return () => controller.abort();
  }, [client, stage, context, preset, side]);
  return { data, loading, status, error };
}
