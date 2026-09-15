"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "@/components/app-link";

const KEY = "simulation-path-progress-v2";
const LEGACY_KEY = "simulation-path-progress-v1";
const CHANGE_EVENT = "simulation-path-progress";
let progressCache: string | null | undefined;

export interface ProgressState {
  version: 2;
  completedLessonIds: string[];
  lastLessonId?: string;
  lastLesson?: { id: string; title: string; href: string };
}

const EMPTY_STATE: ProgressState = { version: 2, completedLessonIds: [] };

function parseProgress(raw: string | null): ProgressState {
  if (!raw) return EMPTY_STATE;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return EMPTY_STATE;
    const record = value as Record<string, unknown>;
    if ((record.version !== 1 && record.version !== 2) || !Array.isArray(record.completedLessonIds))
      return EMPTY_STATE;
    const completedLessonIds = [
      ...new Set(record.completedLessonIds.filter((id): id is string => typeof id === "string")),
    ];
    const lastLessonId = typeof record.lastLessonId === "string" ? record.lastLessonId : undefined;
    const lesson = record.lastLesson;
    const lastLesson =
      lesson &&
      typeof lesson === "object" &&
      typeof (lesson as Record<string, unknown>).id === "string" &&
      typeof (lesson as Record<string, unknown>).title === "string" &&
      typeof (lesson as Record<string, unknown>).href === "string"
        ? (lesson as ProgressState["lastLesson"])
        : undefined;
    return { version: 2, completedLessonIds, lastLessonId, lastLesson };
  } catch {
    return EMPTY_STATE;
  }
}

function readRaw(): string | null {
  if (progressCache !== undefined) return progressCache;
  try {
    return localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

function writeProgress(state: ProgressState) {
  const raw = JSON.stringify(state);
  progressCache = raw;
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // Storage can be unavailable in strict privacy modes; the page remains usable.
  }
  dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      progressCache = event.newValue;
      callback();
    }
  };
  addEventListener(CHANGE_EVENT, callback);
  addEventListener("storage", onStorage);
  return () => {
    removeEventListener(CHANGE_EVENT, callback);
    removeEventListener("storage", onStorage);
  };
}

function useProgressState() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseProgress(raw), [raw]);
}

export function LessonProgress({
  lesson,
}: {
  lesson: { id: string; title: string; href: string };
}) {
  const state = useProgressState();
  const done = state.completedLessonIds.includes(lesson.id);

  useEffect(() => {
    const current = parseProgress(readRaw());
    if (current.lastLessonId !== lesson.id || current.lastLesson?.href !== lesson.href) {
      writeProgress({ ...current, lastLessonId: lesson.id, lastLesson: lesson });
    }
  }, [lesson]);

  const toggle = () => {
    const current = parseProgress(readRaw());
    const completedLessonIds = current.completedLessonIds.includes(lesson.id)
      ? current.completedLessonIds.filter((id) => id !== lesson.id)
      : [...current.completedLessonIds, lesson.id];
    writeProgress({ version: 2, completedLessonIds, lastLessonId: lesson.id, lastLesson: lesson });
  };

  return (
    <button
      className={`complete-button ${done ? "is-complete" : ""}`}
      onClick={toggle}
      aria-pressed={done}
    >
      <span aria-hidden="true">{done ? "✓" : "○"}</span>
      {done ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
    </button>
  );
}

export function ProjectProgress({ lessonIds }: { lessonIds: string[] }) {
  const state = useProgressState();
  const count = state.completedLessonIds.filter((id) => lessonIds.includes(id)).length;
  const percent = lessonIds.length ? Math.round((count / lessonIds.length) * 100) : 0;

  return (
    <div className="project-progress">
      <div>
        <b>{percent}%</b>
        <span>
          {count}/{lessonIds.length} bài hoàn thành
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Tiến độ dự án"
        aria-valuemin={0}
        aria-valuemax={lessonIds.length}
        aria-valuenow={count}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ContinueLearning() {
  const state = useProgressState();
  const lesson = state.lastLesson;

  useEffect(() => {
    if (lesson || !state.lastLessonId) return;
    let active = true;
    void import("@/course/generated/progress/loaders")
      .then(({ loadStoredLesson }) => loadStoredLesson(state.lastLessonId!))
      .then((storedLesson) => {
        if (active && storedLesson) writeProgress({ ...state, lastLesson: storedLesson });
      })
      .catch(() => {
        // A failed migration must not make the home page unusable.
      });
    return () => {
      active = false;
    };
  }, [lesson, state]);

  return lesson ? (
    <Link className="continue-learning" href={lesson.href}>
      Tiếp tục: <b>{lesson.title}</b> <span aria-hidden="true">→</span>
    </Link>
  ) : null;
}
