import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const url = new URL("../components/labs/voxel-sandbox-lab.tsx", import.meta.url);
test("sandbox keyboard executes the actual handler with repeated destructive commands suppressed", async () => {
  const source = await readFile(url, "utf8"),
    start = source.indexOf("  function keyDown("),
    end = source.indexOf("  function audit(", start);
  assert.ok(start >= 0 && end > start);
  const code = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const calls = { action: 0, reset: 0, history: 0, camera: 0, toggle: 0, prevented: 0 };
  const key = new Function(
    "env",
    `const {stage,state,reduced,release,setPaused,stop,tickOnce,reset,move,action,setMaterial,undo,setCamera,orbit,zoom}=env;${code};return keyDown;`,
  )({
    stage: 10,
    state: { world: { pending: [1] } },
    reduced: false,
    release() {},
    stop() {},
    tickOnce() {},
    move() {},
    setMaterial() {},
    action() {
      calls.action++;
    },
    reset() {
      calls.reset++;
    },
    undo() {
      calls.history++;
    },
    setCamera() {
      calls.camera++;
    },
    setPaused() {
      calls.toggle++;
    },
    orbit() {},
    zoom() {},
  });
  const event = (key, repeat = false) => ({
    key,
    repeat,
    preventDefault() {
      calls.prevented++;
    },
  });
  for (const command of ["f", "g", "r", "z", "y", " "]) key(event(command, true));
  assert.equal(calls.prevented, 6);
  assert.equal(calls.action + calls.reset + calls.history + calls.toggle, 0);
  key(event("f"));
  key(event("g"));
  key(event(" "));
  key(event("ArrowRight", true));
  assert.equal(calls.action, 2);
  assert.equal(calls.toggle, 1);
  assert.equal(calls.camera, 1);
});
test("sandbox mouse motion never edits and repeated hover pixels retain the query cache", async () => {
  const source = await readFile(url, "utf8"),
    start = source.indexOf("onPointerMove="),
    end = source.indexOf("onPointerUp=", start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(source.slice(start, end), /action\(|editRay\(/);
  assert.match(source.slice(start, end), /current.x === at.x && current.y === at.y/);
  assert.match(
    source,
    /onPointerCancel=\{\(e\) => \{\s*if \(pointer.current\?\.id === e.pointerId\) release\(\);/,
  );
});
