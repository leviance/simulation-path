"use client";
import { useEffect } from "react";
import { startJob, tickJob, type CloudJob } from "@/lib/labs/cloud-survey/jobs";
import type { CloudScene } from "@/lib/labs/cloud-survey/scene";

interface Props {
  stage: number;
  paused: boolean;
  job: CloudJob | null;
  getScene: () => CloudScene;
  getJob: () => CloudJob | null;
  onJob: (job: CloudJob | null) => void;
  stop: () => void;
}
export default function CloudSurveyDiagnostics({
  stage,
  paused,
  job,
  getScene,
  getJob,
  onJob,
  stop,
}: Props) {
  useEffect(() => {
    if (!job?.active || paused) return;
    const frame = requestAnimationFrame(() => {
      const current = getJob();
      if (!current) return;
      tickJob(current, getScene());
      onJob(current);
    });
    return () => cancelAnimationFrame(frame);
  }, [job, paused, getScene, getJob, onJob]);
  const begin = (benchmark = false) => {
    stop();
    onJob(startJob(getScene(), benchmark));
  };
  return (
    <>
      <div className="lab-controls" aria-label="Kiểm chứng và đo hiệu năng">
        <button type="button" onClick={() => begin()}>
          Kiểm reference và topology
        </button>
        {stage >= 10 && (
          <button type="button" onClick={() => begin(true)}>
            Đo Tree / Brute
          </button>
        )}
        {job?.active && (
          <button type="button" onClick={stop}>
            Hủy tác vụ
          </button>
        )}
      </div>
      {job && (
        <p role="status">
          {job.active
            ? `Đang kiểm query ${job.queryIndex}/${job.regions.length}; vòng ${job.iteration}/7${paused ? " · tạm dừng" : ""}`
            : job.report}
        </p>
      )}
    </>
  );
}
