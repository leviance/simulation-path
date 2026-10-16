import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Chạy chính handler hiện tại bằng setter giả; không cần mount React hay bật server.
for (const [file, end, mode] of [
  ["voxel-chunk-lab.tsx", "  const currentIndex", false],
  ["voxel-hidden-faces-lab.tsx", "  const inspection", true],
]) {
  test(`${file} ignores repeated commands but retains arrow navigation`, async () => {
    const source = await readFile(new URL(`../components/labs/${file}`, import.meta.url), "utf8");
    const begin = source.indexOf("  const key = "),
      finish = source.indexOf(end, begin);
    assert.ok(begin >= 0 && finish > begin, "find the real keyboard handler");
    const js = ts.transpileModule(source.slice(begin, finish), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText;
    const calls = { toggle: 0, reset: 0, camera: 0, mode: 0 };
    const key = new Function(
      "stage",
      "setCamera",
      "orbit",
      "zoom",
      "release",
      "setPaused",
      "reduced",
      "reset",
      "stop",
      "setCulled",
      "setSlice",
      `${js};return key;`,
    )(
      7,
      () => calls.camera++,
      () => {},
      () => {},
      () => {},
      () => calls.toggle++,
      false,
      () => calls.reset++,
      () => {},
      () => calls.mode++,
      () => {},
    );
    const event = (key, repeat) => ({ key, repeat, preventDefault() {} });
    key(event(" ", true));
    key(event("r", true));
    if (mode) key(event("m", true));
    assert.equal(calls.toggle, 0);
    assert.equal(calls.reset, 0);
    assert.equal(calls.mode, 0);
    key(event(" ", false));
    assert.equal(calls.toggle, 1);
    key(event("ArrowRight", true));
    assert.equal(calls.camera, 1);
  });
}

test("ray editor prevents scrolling for repeated commands without repeating an edit", async () => {
  const source = await readFile(
    new URL("../components/labs/voxel-ray-editor-lab.tsx", import.meta.url),
    "utf8",
  );
  const begin = source.indexOf("  const key = "),
    end = source.indexOf("  const visit =", begin);
  assert.ok(begin >= 0 && end > begin);
  const js = ts.transpileModule(source.slice(begin, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  let commands = 0;
  const key = new Function(
    "stage",
    "reduced",
    "reset",
    "apply",
    "changeCamera",
    "orbit",
    "setAim",
    "zoom",
    "edit",
    `${js};return key;`,
  )(
    9,
    false,
    () => commands++,
    () => commands++,
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
  );
  for (const value of [" ", "ArrowDown", "Delete"]) {
    let prevented = false;
    key({
      key: value,
      repeat: true,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true, value);
  }
  assert.equal(commands, 0);
  key({ key: "Delete", repeat: false, preventDefault() {} });
  assert.equal(commands, 1);
  let unknownPrevented = false;
  key({
    key: "Tab",
    repeat: true,
    preventDefault() {
      unknownPrevented = true;
    },
  });
  assert.equal(unknownPrevented, false);
});

for (const file of [
  "voxel-chunk-lab.tsx",
  "voxel-hidden-faces-lab.tsx",
  "voxel-ray-editor-lab.tsx",
]) {
  test(`${file} moves focus to Pause without stopping and restarting the lab`, async () => {
    const source = await readFile(new URL(`../components/labs/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /onBlur=\{stop\}/);
    const blur = source.match(/onBlur=\{\(event\) => \{([\s\S]*?)\}\}/)?.[1];
    assert.ok(blur, "scoped lab blur handler");
    const state = { paused: false };
    const stop = () => {
      state.paused = true;
    };
    const onBlur = new Function("stop", `return (event)=>{${blur}}`)(stop);
    const click = [...source.matchAll(/onClick=\{\(\) => \{([\s\S]*?)\n\s*\}\}/g)]
      .map((m) => m[1])
      .find(
        (body) =>
          body.includes("setPaused((v) => !v)") || body.includes("state.paused = !state.paused"),
      );
    assert.ok(click, "real pause button handler");
    const onClick = new Function("setPaused", "release", "state", "bump", `return ()=>{${click}}`)(
      (update) => {
        state.paused = update(state.paused);
      },
      () => {},
      state,
      () => {},
    );
    const button = {},
      external = {};
    const currentTarget = { contains: (target) => target === button };
    onBlur({ currentTarget, relatedTarget: button });
    assert.equal(state.paused, false, "focus remains inside the lab");
    onClick();
    assert.equal(state.paused, true, "one click pauses a running lab");
    onClick();
    assert.equal(state.paused, false, "resume still works");
    onBlur({ currentTarget, relatedTarget: external });
    assert.equal(state.paused, true, "leaving the lab pauses");
    state.paused = false;
    onBlur({ currentTarget, relatedTarget: null });
    assert.equal(state.paused, true, "lost window focus pauses");
  });
}
