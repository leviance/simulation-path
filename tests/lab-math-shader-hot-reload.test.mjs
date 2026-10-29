import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import * as shader from "../lib/labs/shader-hot-reload.ts";

const candidate = (effect = "gradient", version = 1) => ({
  effect,
  version,
  sources: { vertex: shader.defaultVertexShader, fragment: shader.fragmentTemplates[effect] },
});

test("Canvas templates are the exact final GLSL, not independent approximations of source", async () => {
  const root = new URL(
    "../examples/project-35-shader-hot-reload-lab/final/shaders/",
    import.meta.url,
  );
  assert.equal(shader.defaultVertexShader, await readFile(new URL("lab.vert", root), "utf8"));
  for (const effect of Object.keys(shader.effectNames)) {
    assert.equal(
      shader.fragmentTemplates[effect],
      await readFile(new URL(effect + ".frag", root), "utf8"),
    );
  }
});

test("Canvas explicitly accepts only supported SPEED edits, never arbitrary GLSL", () => {
  const original = shader.fragmentTemplates.gradient;
  assert.equal(shader.inspectCanvasTemplate(original, "gradient").supported, true);
  const changed = original.replace("SPEED = 0.65", "SPEED = 1.3");
  assert.equal(shader.inspectCanvasTemplate(changed, "gradient").speed, 1.3);
  assert.equal(
    shader.inspectCanvasTemplate(original.replace("0.18 * sin", "0.19 * sin"), "gradient")
      .supported,
    false,
  );
  assert.match(
    shader.inspectCanvasTemplate(original + "\n// valid GLSL comment", "gradient").diagnostic,
    /Không thể kết luận GLSL đúng\/sai/,
  );
  for (const speed of ["0", "4.1", "-1", "NaN", "1e309"]) {
    assert.equal(
      shader.inspectCanvasTemplate(original.replace("SPEED = 0.65", "SPEED = " + speed), "gradient")
        .supported,
      false,
    );
  }
});

test("a failed candidate never replaces last-good image state or mutates its input", () => {
  const initial = shader.createGalleryProgram();
  for (const fault of ["compile", "interface"]) {
    const next = shader.tryGalleryCandidate(initial, { ...candidate("noise"), fault });
    assert.equal(next.generation, initial.generation);
    assert.equal(next.attempts, initial.attempts + 1);
    assert.equal(next.activeSources, initial.activeSources);
    assert.equal(next.activeFingerprint, initial.activeFingerprint);
    assert.equal(next.activeEffect, "gradient");
    assert.equal(next.lastReloadSucceeded, false);
    assert.match(next.diagnostic, /mô phỏng/);
  }
  assert.equal(initial.attempts, 0);
});

test("unsupported edits remain last-good, and repairing them commits without reset", () => {
  const initial = shader.createGalleryProgram("circle");
  const broken = candidate("noise");
  broken.sources.fragment += "\nnot within the supported template";
  const rejected = shader.tryGalleryCandidate(initial, broken);
  const repaired = shader.tryGalleryCandidate(rejected, candidate("noise", 2));
  assert.equal(rejected.generation, 1);
  assert.equal(repaired.generation, 2);
  assert.equal(repaired.attempts, 2);
  assert.equal(repaired.activeEffect, "noise");
  assert.notEqual(repaired.activeFingerprint, initial.activeFingerprint);
  assert.equal(repaired.lastReloadSucceeded, true);
});

test("manual retry increments attempts and SPEED updates the active preview parameter", () => {
  const next = candidate();
  next.sources.fragment = next.sources.fragment.replace("SPEED = 0.65", "SPEED = 1.3");
  const result = shader.tryGalleryCandidate(shader.createGalleryProgram(), next);
  assert.equal(result.activeSpeed, 1.3);
  assert.equal(result.generation, 2);
  assert.equal(result.attempts, 1);
  assert.equal(shader.tryGalleryCandidate(result, next).attempts, 2);
});

test("fingerprint has a stage separator, stable UTF-8 bytes and 64-bit width", () => {
  const a = shader.shaderFingerprint({ vertex: "ab", fragment: "c" });
  assert.notEqual(a, shader.shaderFingerprint({ vertex: "a", fragment: "bc" }));
  assert.equal(a, shader.shaderFingerprint({ vertex: "ab", fragment: "c" }));
  assert.match(shader.shaderFingerprint({ vertex: "tọa độ", fragment: "màu" }), /^[a-f0-9]{16}$/);
});

test("uniform coordinates use physical pixels and bottom-left origin after DPR scaling", () => {
  const view = { ...shader.initialGalleryView(), mouseX: 0.25, mouseY: 0.25 };
  assert.deepEqual(shader.makeGalleryUniforms(view, 1280, 960), {
    time: 0,
    width: 1280,
    height: 960,
    mouseX: 320,
    mouseY: 720,
    zoom: 1,
  });
  assert.equal(shader.makeGalleryUniforms({ ...view, mouseX: -1, mouseY: 4 }, 800, 600).mouseY, 0);
  for (const invalid of [0, -2, NaN, Infinity])
    assert.throws(() => shader.makeGalleryUniforms(view, invalid, 600));
});

test("pause, bounded delta time and zoom never reset unrelated state", () => {
  const initial = shader.initialGalleryView();
  assert.equal(shader.advanceGalleryView(initial, 1), initial);
  const playing = { ...initial, time: 2, paused: false };
  assert.equal(shader.advanceGalleryView(playing, 1).time, 2.05);
  assert.equal(shader.advanceGalleryView(playing, NaN), playing);
  const zoomed = shader.zoomGalleryView(playing, 1e300);
  assert.equal(zoomed.zoom, 8);
  assert.equal(zoomed.time, playing.time);
  assert.equal(shader.zoomGalleryView(playing, -1e300).zoom, 0.25);
});

test("Mandelbrot uses known interior and escape points with bounded iterations", () => {
  assert.equal(shader.mandelbrotOrbit(0, 0).escaped, 0);
  assert.equal(shader.mandelbrotOrbit(-1, 0).escaped, 0);
  assert.equal(shader.mandelbrotOrbit(2, 0).escaped, 2);
  assert.equal(shader.mandelbrotOrbit(3, 0).escaped, 1);
});

test("value noise agrees at cell corners and is continuous across negative cell boundaries", () => {
  assert.equal(shader.hashCell(0, 0), 0);
  for (const [x, y] of [
    [1, 2],
    [-4, 7],
    [8, -3],
  ]) {
    assert.equal(shader.valueNoise(x, y), shader.hashCell(x, y));
    assert.ok(
      Math.abs(shader.valueNoise(x - 1e-7, y + 0.3) - shader.valueNoise(x + 1e-7, y + 0.3)) < 1e-5,
    );
    assert.ok(shader.fbm(x + 0.3, y + 0.4) <= 0.96875);
  }
});

test("all four reference effects are finite, bounded and respond to time, mouse and zoom", () => {
  const base = { time: 1.25, width: 800, height: 520, mouseX: 400, mouseY: 260, zoom: 1 };
  for (const effect of Object.keys(shader.effectNames)) {
    const samples = (uniforms) =>
      Array.from({ length: 48 }, (_, i) =>
        shader.referenceShaderColor(
          effect,
          ((i % 8) + 0.37) * 100,
          (Math.floor(i / 8) + 0.21) * 80,
          uniforms,
        ),
      );
    const original = samples(base);
    for (const rgb of original)
      for (const channel of rgb)
        assert.ok(Number.isFinite(channel) && channel >= 0 && channel <= 1);
    for (const change of [{ time: 2.75 }, { mouseX: 230, mouseY: 170 }, { zoom: 1.7 }]) {
      assert.notDeepEqual(
        samples({ ...base, ...change }),
        original,
        effect + " must react to " + JSON.stringify(change),
      );
    }
  }
});
