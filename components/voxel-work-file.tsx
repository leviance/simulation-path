"use client";

import { useEffect, useState } from "react";
import { fetchProjectSource } from "@/lib/source-download";
import { voxelWorkEdits } from "@/lib/voxel-work-edits";
import { HighlightedCode } from "./highlighted-code";

type WorkFileProps = { project: string; step: number; file: string };
export function VoxelWorkFile(props: WorkFileProps) {
  return <WorkFile key={props.project + ":" + props.step + ":" + props.file} {...props} />;
}

function WorkFile({ project, step, file }: WorkFileProps) {
  const path = "include/trail/" + file + ".hpp";
  const [open, setOpen] = useState(false);
  const [edits, setEdits] = useState<ReturnType<typeof voxelWorkEdits>>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || edits) return;
    const controller = new AbortController();
    const read = (snapshot: number | "starter") =>
      fetchProjectSource(project, snapshot, path, { signal: controller.signal });
    Promise.all([read(step === 1 ? "starter" : step - 1), read(step)])
      .then(([before, after]) => {
        if (!controller.signal.aborted) setEdits(voxelWorkEdits(before, after));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Không tải được đoạn mã. Đóng rồi mở lại để thử lại.");
      });
    return () => controller.abort();
  }, [open, edits, project, step, path]);

  return (
    <details
      className="source-file voxel-work-file"
      onToggle={(e) => {
        setOpen(e.currentTarget.open);
        setError("");
      }}
    >
      <summary>
        <code>work/{path}</code>
        <span>Vị trí sửa và mã cần viết</span>
      </summary>
      {open && !edits && (
        <p role={error ? "alert" : "status"}>{error || "Đang mở tệp của bước này…"}</p>
      )}
      {open &&
        edits?.map((edit, i) => (
          <section key={i} aria-label={`Lần sửa ${i + 1}`}>
            <p>
              <b>
                {i + 1}.{" "}
                {edit.remove.length
                  ? edit.write.length
                    ? "Thay đoạn cũ"
                    : "Bỏ đoạn cũ"
                  : "Chèn mã"}
              </b>
              {" · "}dòng {edit.line}, tính sau khi đã làm các bước phía trên trong tệp này.
            </p>
            {edit.above.some((line) => line.trim()) && (
              <p>
                Mốc phía trên (giữ nguyên):{" "}
                {edit.above
                  .filter((line) => line.trim())
                  .map((line, n) => (
                    <span key={n}>
                      <br />
                      <code>{line.trim()}</code>
                    </span>
                  ))}
              </p>
            )}
            {edit.below.some((line) => line.trim()) && (
              <p>
                Mốc phía dưới (giữ nguyên):{" "}
                {edit.below
                  .filter((line) => line.trim())
                  .map((line, n) => (
                    <span key={n}>
                      <br />
                      <code>{line.trim()}</code>
                    </span>
                  ))}
              </p>
            )}
            {edit.remove.length > 0 && (
              <details>
                <summary>Đoạn cũ cần bỏ ({edit.remove.length} dòng)</summary>
                <HighlightedCode code={edit.remove.join("\n")} language="cpp" />
              </details>
            )}
            {edit.write.length > 0 && (
              <HighlightedCode code={edit.write.join("\n")} language="cpp" />
            )}
          </section>
        ))}
    </details>
  );
}
