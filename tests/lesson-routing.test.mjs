import assert from "node:assert/strict";
import test from "node:test";
import { canonicalLessonSlug } from "../lib/lesson-routing.ts";
import { validateLessonAliases } from "../scripts/lesson-aliases.mjs";

const lessons = [{ slug: "01-first" }, { slug: "09-final" }];
test("project-owned lesson aliases preserve canonical, unknown and inherited-key routes", () => {
  const project = { lessons, lessonAliases: { "07-old-final": "09-final" } };
  validateLessonAliases(project.lessonAliases, lessons, "fixture");
  assert.equal(canonicalLessonSlug(project, "07-old-final"), "09-final");
  assert.equal(canonicalLessonSlug(project, "01-first"), "01-first");
  assert.equal(canonicalLessonSlug(project, "missing"), "missing");
  assert.equal(canonicalLessonSlug(project, "__proto__"), "__proto__");
  assert.equal(canonicalLessonSlug({ lessons }, "missing"), "missing");
  assert.equal(canonicalLessonSlug({ lessons, lessonAliases: { old: "missing" } }, "old"), "old");
});

test("lesson alias validation rejects shadowing, broken targets, chains and unsafe paths", () => {
  for (const aliases of [
    null,
    [],
    { "01-first": "09-final" },
    { old: "missing" },
    { old: "other", other: "09-final" },
    { "../old": "09-final" },
    { old: 9 },
  ]) {
    assert.throws(() => validateLessonAliases(aliases, lessons, "fixture"));
  }
  validateLessonAliases(undefined, lessons, "fixture");
});
