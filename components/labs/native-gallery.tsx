"use client";

import { useId, useState } from "react";
import type { NativeTake } from "@/course/labs/types";
import { useClientReady } from "@/components/use-client-ready";
import styles from "./native-gallery.module.css";
import { LabHeading } from "./lab-heading";

// Only the selected recording enters the DOM. Changing views stops playback.
export function NativeGallery({
  title,
  takes,
  directory,
  overview,
}: {
  title: string;
  takes: NativeTake[];
  directory: string;
  overview: boolean;
}) {
  const [index, setIndex] = useState(0);
  const ready = useClientReady();
  const [failed, setFailed] = useState<string | null>(null);
  const descriptionId = useId();
  const take = takes[index];
  const poster = directory + "/" + take.poster;
  const video = take.video && directory + "/" + take.video;
  return (
    <section
      className={styles.gallery}
      aria-label={title}
      data-lab-ui=""
      data-native-media=""
      data-ready={ready}
    >
      <LabHeading
        label="TỪ CHƯƠNG TRÌNH C++/SDL3"
        title={title}
        titleId={overview ? "project-demo-title" : undefined}
        description="Đây là hình từ bản C++ của bài học. Muốn tự đi lại hoặc đổi tham số, hãy chạy mã nguồn đi kèm."
      />
      {takes.length > 1 && (
        <div className="lab-controls" role="group" aria-label="Chọn cảnh">
          {takes.map((item, i) => (
            <button
              key={item.poster}
              type="button"
              disabled={!ready}
              aria-pressed={index === i}
              onClick={() => {
                setIndex(i);
                setFailed(null);
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
      <figure>
        {video && failed !== video ? (
          <video
            key={video}
            controls={ready}
            playsInline
            muted
            preload="none"
            poster={poster}
            width="800"
            height="450"
            aria-label={take.title}
            aria-describedby={descriptionId}
            src={ready ? video : undefined}
            onError={() => setFailed(video)}
          />
        ) : (
          <img src={poster} width="800" height="450" loading="lazy" alt={take.alt} />
        )}
        <figcaption id={descriptionId} aria-live="polite" aria-atomic="true">
          <span>
            {take.source} · {video && failed !== video ? "Video không lời · 4 giây" : "Ảnh chụp"}
          </span>
          <strong>{take.title}</strong>
          <p>{take.caption}</p>
          {video && failed !== video && <p className={styles.srOnly}>{take.alt}</p>}
          {video && failed === video && (
            <p role="status">Không phát được video. Đây là khung hình đầu tiên của đoạn ghi.</p>
          )}
          <a href={poster} target="_blank" rel="noreferrer">
            Mở ảnh gốc<span className={styles.srOnly}> (tab mới)</span> ↗
          </a>
          {video && (
            <noscript>
              <p>
                <a href={video}>Mở video gốc</a>
              </p>
            </noscript>
          )}
        </figcaption>
      </figure>
    </section>
  );
}
