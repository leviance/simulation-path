import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createMapScene, mapModes } from "../lib/labs/map-scene.ts";
import { componentCallback } from "./lab-handler-support.mjs";
import { mapEditorHelp } from "../components/labs/map-editor-help.ts";

// Render the real readout, not a duplicated formatter. Build/query timings are
// different on server and browser even when the seeded map is identical.
test("Map readout hydrates deterministically and reveals real timings only after mount", async () => {
  const source = await readFile(
    new URL("../components/labs/map-editor-readout.tsx", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const fixtureModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    createRequire(import.meta.url),
    fixtureModule,
    fixtureModule.exports,
  );
  const Readout = fixtureModule.exports.MapEditorReadout;
  const server = createMapScene(11, 32);
  const browser = createMapScene(11, 32);
  server.document.tree.buildMilliseconds = 12345.67;
  browser.document.tree.buildMilliseconds = 23456.78;
  server.visible.milliseconds = 34567.89;
  browser.visible.milliseconds = 45678.9;
  const html = (scene, measurementsReady) =>
    renderToStaticMarkup(Readout({ scene, measurementsReady }));
  assert.equal(html(server, false), html(browser, false));
  assert.doesNotMatch(html(server, false), /12345\.67|34567\.89/);
  assert.match(html(browser, true), /23456\.78/);
  assert.match(html(browser, true), /45678\.90/);
});

test("Map help IDs do not depend on the server/client React tree prefix", async () => {
  const ids = [];
  for (const mode of [undefined, ...mapModes]) {
    const id = await componentCallback("quadtree-map-editor-lab.tsx", "helpId", { mode });
    assert.equal(typeof id, "string");
    assert.match(id, /^quadtree-map-editor-help-[a-z0-9-]+$/);
    ids.push(id);
  }
  assert.equal(new Set(ids).size, mapModes.length + 1);
  const source = await readFile(
    new URL("../components/labs/quadtree-map-editor-lab.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /aria-describedby=\{helpId\}/);
  assert.match(source, /id=\{helpId\}/);
});

test("Map help teaches only the input available in the current lesson", () => {
  assert.match(mapEditorHelp(1), /chỉ sinh và vẽ/);
  assert.doesNotMatch(mapEditorHelp(1), /Shift|Delete|Chọn công cụ/);
  assert.doesNotMatch(mapEditorHelp(2), /Shift|Delete|Công cụ Chọn/);
  assert.match(mapEditorHelp(3), /Công cụ Chọn/);
  assert.doesNotMatch(mapEditorHelp(3), /Delete|Công cụ Thêm|Di chuyển nhóm/);
  assert.match(mapEditorHelp(7), /Delete/);
  assert.doesNotMatch(mapEditorHelp(7), /Di chuyển nhóm/);
  assert.match(mapEditorHelp(8), /Di chuyển nhóm/);
});
