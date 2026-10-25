import assert from "node:assert/strict";
import test from "node:test";
import { migrateProgressContent } from "../lib/progress-content.ts";

test("semantic project rebuild clears only its old completions and stale continue link", () => {
  const old = {
    completedLessonIds: ["p01-l01", "p27-l01", "p27-l07", "p28-l01"],
    lastLessonId: "p27-l07",
    lastLesson: { id: "p27-l07", title: "old", href: "/projects/retired/old" },
  };
  const result = migrateProgressContent(old, { p27: 1 });
  assert.deepEqual(result.completedLessonIds, ["p01-l01", "p28-l01"]);
  assert.equal(result.lastLesson, undefined);
  assert.equal(result.lastLessonId, undefined);
  assert.deepEqual(result.projectContentVersions, { p27: 1 });
  assert.equal(old.completedLessonIds.length, 4);
});

test("new Boids completions persist and unrelated continue link is retained", () => {
  const state = {
    completedLessonIds: ["p27-l01"],
    projectContentVersions: { p27: 1 },
    lastLessonId: "p28-l01",
    lastLesson: { id: "p28-l01", title: "other", href: "/projects/other/lesson" },
  };
  assert.deepEqual(migrateProgressContent(state, { p27: 1 }), state);
});

test("progress revision migration never downgrades newer data", () => {
  const state = { completedLessonIds: ["p27-l01"], projectContentVersions: { p27: 2 } };
  const result = migrateProgressContent(state, { p27: 1 });
  assert.deepEqual(result.completedLessonIds, ["p27-l01"]);
  assert.equal(result.projectContentVersions.p27, 2);
});

test("malformed revision metadata cannot suppress semantic migration", () => {
  for (const projectContentVersions of [null, [], { p27: "1" }, { p27: NaN }, { p27: -1 }]) {
    const result = migrateProgressContent(
      { completedLessonIds: ["p27-l01", "p01-l01"], projectContentVersions },
      { p27: 1 },
    );
    assert.deepEqual(result.completedLessonIds, ["p01-l01"]);
  }
});
