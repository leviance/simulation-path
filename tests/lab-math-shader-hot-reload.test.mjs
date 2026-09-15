import assert from "node:assert/strict";
import test from "node:test";
import * as shader from "../lib/labs/shader-hot-reload.ts";

const validSources = {
  vertex: shader.defaultVertexShader,
  fragment: shader.defaultFragmentShader,
};

test("valid GLSL stages expose a compatible interface", () => {
  assert.deepEqual(shader.validateShaderStage("vertex", validSources.vertex), []);
  assert.deepEqual(shader.validateShaderStage("fragment", validSources.fragment), []);
  assert.deepEqual(
    shader.validateProgramInterface(validSources, ["uMvp", "uTime", "uResolution", "uMouse"]),
    [],
  );
});

test("stage diagnostics retain the source line", () => {
  const broken = validSources.fragment.replace("fragColor =", "BROKEN_TOKEN fragColor =");
  const diagnostics = shader.validateShaderStage("fragment", broken);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].stage, "fragment");
  assert.equal(
    diagnostics[0].line,
    broken.slice(0, broken.indexOf("BROKEN_TOKEN")).split("\n").length,
  );
});

test("stage diagnostics catch a missing semicolon and unmatched parenthesis", () => {
  const missingSemicolon = validSources.fragment.replace(
    "fragColor = vec4(color, 1.0);",
    "fragColor = vec4(color, 1.0)",
  );
  assert.match(shader.validateShaderStage("fragment", missingSemicolon)[0].message, /thiếu dấu ;/);

  const missingParenthesis = validSources.fragment.replace("length(p)", "length(p");
  assert.match(
    shader.validateShaderStage("fragment", missingParenthesis)[0].message,
    /chưa đóng đủ dấu \)/,
  );
});

test("link validation catches a mismatched varying", () => {
  const candidate = {
    ...validSources,
    fragment: validSources.fragment.replaceAll("vColor", "vMissingColor"),
  };
  assert.match(shader.validateProgramInterface(candidate)[0].message, /vMissingColor/);
});

test("link validation catches the same varying name with a different type", () => {
  const candidate = {
    ...validSources,
    fragment: validSources.fragment.replace("in vec3 vColor;", "in vec2 vColor;"),
  };
  assert.match(shader.validateProgramInterface(candidate)[0].message, /khác kiểu/);
});

test("program contract rejects a required uniform that the driver could optimize away", () => {
  const candidate = {
    ...validSources,
    fragment: validSources.fragment.replace("uMouse / safeResolution", "vec2(0.5)"),
  };
  assert.match(
    shader.validateProgramInterface(candidate, ["uMvp", "uTime", "uResolution", "uMouse"])[0]
      .message,
    /uMouse.*chưa được dùng/,
  );
});

test("failed reload preserves the last-good program", () => {
  const initial = shader.createShaderProgramState(validSources);
  const broken = {
    ...validSources,
    fragment: validSources.fragment.replace("}", "BROKEN_TOKEN\n}"),
  };
  const next = shader.transactionalShaderReload(initial, broken);
  assert.equal(next.lastReloadSucceeded, false);
  assert.equal(next.generation, initial.generation);
  assert.equal(next.activeFingerprint, initial.activeFingerprint);
  assert.deepEqual(next.activeSources, initial.activeSources);
  assert.notEqual(next.candidateFingerprint, initial.activeFingerprint);
});

test("successful reload advances generation and active fingerprint", () => {
  const initial = shader.createShaderProgramState(validSources);
  const candidate = {
    ...validSources,
    fragment: validSources.fragment.replace("18.0", "24.0"),
  };
  const next = shader.transactionalShaderReload(initial, candidate);
  assert.equal(next.lastReloadSucceeded, true);
  assert.equal(next.generation, initial.generation + 1);
  assert.equal(next.activeFingerprint, shader.shaderFingerprint(candidate));
});

test("file watcher waits for a stable debounce window", () => {
  let watch = shader.createShaderWatchState();
  let result = shader.observeShaderFiles(watch, { vertex: 10, fragment: 20 }, 0, 120);
  assert.equal(result.shouldReload, false);
  watch = result.state;

  result = shader.observeShaderFiles(watch, { vertex: 10, fragment: 21 }, 40, 120);
  assert.equal(result.shouldReload, false);
  assert.equal(result.state.pending, true);
  watch = result.state;

  result = shader.observeShaderFiles(watch, { vertex: 10, fragment: 21 }, 159, 120);
  assert.equal(result.shouldReload, false);
  result = shader.observeShaderFiles(result.state, { vertex: 10, fragment: 21 }, 160, 120);
  assert.equal(result.shouldReload, true);
  assert.equal(result.state.pending, false);
});

test("procedural presets stay finite and within RGB range", () => {
  const uniforms = {
    timeSeconds: 1.25,
    resolution: { x: 960, y: 640 },
    mouse: { x: 480, y: 320 },
  };
  for (const preset of ["solid", "coordinates", "pulse", "rings"]) {
    const color = shader.evaluateShaderPreset(preset, 0.37, 0.62, uniforms);
    for (const channel of [color.red, color.green, color.blue]) {
      assert.ok(Number.isFinite(channel));
      assert.ok(channel >= 0 && channel <= 1);
    }
  }
});

test("editing numeric GLSL constants changes the preview result", () => {
  const uniforms = {
    timeSeconds: 0.4,
    resolution: { x: 960, y: 640 },
    mouse: { x: 480, y: 320 },
  };
  const original = shader.evaluateShaderPreset(
    "rings",
    0.32,
    0.71,
    uniforms,
    validSources.fragment,
  );
  const editedSource = validSources.fragment
    .replace("18.0", "31.0")
    .replace("vec3 hot = vec3(1.0, 0.42, 0.18);", "vec3 hot = vec3(0.20, 0.90, 0.35);");
  const edited = shader.evaluateShaderPreset("rings", 0.32, 0.71, uniforms, editedSource);
  assert.notDeepEqual(edited, original);
});

test("mouse glow uses both framebuffer coordinates", () => {
  const source = shader.defaultFragmentShader.replace("* 5.0", "* 12.0");
  const near = shader.evaluateShaderPreset(
    "rings",
    0.5,
    0.25,
    { timeSeconds: 0, resolution: { x: 800, y: 600 }, mouse: { x: 400, y: 150 } },
    source,
  );
  const far = shader.evaluateShaderPreset(
    "rings",
    0.5,
    0.25,
    { timeSeconds: 0, resolution: { x: 800, y: 600 }, mouse: { x: 400, y: 540 } },
    source,
  );
  assert.ok(near.red > far.red || near.green > far.green || near.blue > far.blue);
});
