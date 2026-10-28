import assert from "node:assert/strict";
import test from "node:test";
import { courseCmake } from "../scripts/course-cmake.mjs";

test("shader fallback layout is isolated per target when opted in", () => {
  const isolated = courseCmake({id:"35",checkpointCount:10,shaderRuntimePerTarget:true},{hasSnapshotShaders:true});
  assert.ok(isolated.includes('COURSE_SHADER_FALLBACK_SUBDIRECTORY="shaders/${name}"'));
  assert.ok(isolated.includes('"$<TARGET_FILE_DIR:${name}>/shaders/${name}"'));
  const legacy = courseCmake({id:"36",checkpointCount:9},{hasSnapshotShaders:true});
  assert.ok(legacy.includes('"$<TARGET_FILE_DIR:${name}>/shaders"'));
  assert.ok(!legacy.includes('"$<TARGET_FILE_DIR:${name}>/shaders/${name}"'));
});
