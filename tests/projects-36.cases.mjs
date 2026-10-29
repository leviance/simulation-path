import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const dir = "examples/project-36-ray-marched-shape-room/";

test('P36: complete teaching C++ uses four-space indentation, comments and logical blocks', async()=>{
  for(const folder of ['include','src']){
    for(const file of await readdir(new URL(dir+'final/'+folder+'/',root))){
      if(!/\.(cpp|hpp)$/.test(file))continue;
      const label=folder+'/'+file,source=await read(dir+'final/'+label);
      assert.doesNotMatch(source,/\t|LAB_CHECKPOINT/,label);
      source.split(/\r?\n/).forEach((line,index)=>assert.equal((line.match(/^ +(?=\S)/)?.[0].length??0)%4,0,label+':'+(index+1)));
      assert.match(source,/^\s*\/\/ /m,label);
      assert.ok((source.match(/\r?\n\s*\r?\n/g)??[]).length>=2,label+' needs logical blocks');
    }
  }
});
test("P36: eleven lessons match manifest and catalog", async () => {
  const manifest = (await import("../course/projects/p36/manifest.ts")).default;
  const catalog = JSON.parse(await read("course/projects.json")).find((p) => p.id === "36");
  assert.equal(catalog.checkpointCount, 11);
  assert.equal(catalog.shaderRuntimePerTarget, true);
  assert.equal(catalog.contentRevision, 2);
  assert.equal(manifest.lessons.length, 11);
  const files = (await readdir(new URL("content/ray-marched-shape-room/", root)))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    manifest.lessons.map((l) => l.slug + ".mdx"),
  );
});
test("P36: all actual MDX lessons compile with KaTeX and One Dark", async () => {
  const manifest = (await import("../course/projects/p36/manifest.ts")).default;
  for (const lesson of manifest.lessons) {
    const source = await read("content/ray-marched-shape-room/" + lesson.slug + ".mdx");
    const output = String(await compile(source, courseMdxOptions));
    assert.match(output, /one-dark-pro/, lesson.slug);
    assert.match(output, /InteractiveLab/, lesson.slug);
  }
});
test("P36: every C++ and GLSL block matches the exact checkpoint contiguously", async () => {
  const manifest = (await import("../course/projects/p36/manifest.ts")).default;
  let checked = 0;
  for (const lesson of manifest.lessons) {
    const text = await read("content/ray-marched-shape-room/" + lesson.slug + ".mdx");
    const blocks = [
      ...text.matchAll(/\x60\x60\x60(cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g),
    ];
    assert.ok(blocks.length, lesson.slug);
    for (const [, , title, snippet] of blocks) {
      const file = title.split(" — ")[0];
      const source = await read(
        dir + `checkpoints/${String(lesson.order).padStart(2, "0")}/` + file,
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), lesson.slug + ": " + file);
      checked++;
    }
  }
  console.log("Matched literal excerpts:", checked);
  assert.ok(checked >= 20);
});
test("P36: snapshots add each new feature only at its teaching checkpoint", async () => {
  for (const [stage, file, symbol] of [
    [3, "include/sdf.hpp", /inline double sdSphere/],
    [4, "include/tracing.hpp", /inline RayMarchResult marchRay/],
    [5, "include/tracing.hpp", /inline Vec3 estimateNormal/],
    [6, "include/sdf.hpp", /inline double sdTorus/],
    [8, "include/tracing.hpp", /inline ShadowResult traceShadow/],
    [9, "include/room_controls.hpp", /event\.motion\.xrel/],
    [10, "include/raymarch_oracle.hpp", /inline SphereIntersection intersectSphere/],
    [11, "include/room_verify.hpp", /uProbeOrigin/],
  ]) {
    assert.doesNotMatch(
      await read(dir + `checkpoints/${String(stage - 1).padStart(2, "0")}/` + file),
      symbol,
    );
    assert.match(await read(dir + `checkpoints/${String(stage).padStart(2, "0")}/` + file), symbol);
  }
  for (let stage = 0; stage <= 11; stage++) {
    const snapshot = stage === 0 ? "starter" : `checkpoints/${String(stage).padStart(2, "0")}`;
    const files = await readdir(new URL(dir + snapshot + "/include/", root));
    for (const file of files)
      assert.doesNotMatch(
        await read(dir + snapshot + "/include/" + file),
        /\bLAB_CHECKPOINT\b/,
        snapshot + "/" + file,
      );
  }
});
