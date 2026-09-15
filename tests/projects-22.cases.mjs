import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 22 publishes a seven-checkpoint projectile cannon", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "22");
  assert.equal(project.slug, "projectile-cannon");
  assert.equal(project.sourceDirectory, "project-22-projectile-cannon");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "projectile");
});

test("Project 22 teaches one traceable input-to-error physics experiment", async () => {
  const contentDirectory = path.join(workspace, "content", "projectile-cannon");
  const sourceDirectory = path.join(workspace, "examples", "project-22-projectile-cannon");

  const aim = await readFile(
    path.join(contentDirectory, "01-dung-bai-ban-va-vector-ngam.mdx"),
    "utf8",
  );
  assert.match(aim, /physics position dùng mét.*screen position dùng pixel/is);
  assert.match(aim, /aimFromScreenDrag/);

  const components = await readFile(
    path.join(contentDirectory, "02-tach-van-toc-dau-theo-hai-truc.mdx"),
    "utf8",
  );
  assert.match(components, /v_x=s\\cos.*v_y=s\\sin/s);
  assert.match(components, /velocityFromPolar.*angleFromVelocity/is);

  const analytic = await readFile(
    path.join(contentDirectory, "03-ve-quy-dao-giai-tich.mdx"),
    "utf8",
  );
  assert.match(analytic, /p\(t\)=p_0\+v_0t\+\\frac\{1\}\{2\}at\^2/);
  assert.match(analytic, /time horizon.*bài 6/is);

  const euler = await readFile(
    path.join(contentDirectory, "04-cho-vien-dan-chay-bang-explicit-euler.mdx"),
    "utf8",
  );
  assert.match(euler, /position dùng \*\*velocity cũ\*\*/i);
  assert.match(euler, /Explicit Euler.*semi-implicit Euler/is);

  const timestep = await readFile(
    path.join(contentDirectory, "05-fixed-timestep-va-accumulator.mdx"),
    "utf8",
  );
  assert.match(timestep, /accumulator.*fixed dt.*spiral of death/is);
  assert.match(timestep, /planFixedSteps/);

  const impact = await readFile(
    path.join(contentDirectory, "06-tim-thoi-diem-cham-dat.mdx"),
    "utf8",
  );
  assert.match(impact, /quadratic.*root.*nội suy/is);
  assert.match(impact, /alpha\*dt/);

  const validation = await readFile(
    path.join(contentDirectory, "07-do-sai-so-va-nghiem-thu.mdx"),
    "utf8",
  );
  assert.match(validation, /fixed dt nhỏ đi.*sai số.*cùng thời điểm.*giảm/is);
  assert.match(validation, /Starter, bảy checkpoint và final/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const main = await readFile(
    path.join(sourceDirectory, "source-template", "src", "main.cpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "projectile-lab.tsx"),
    "utf8",
  );
  assert.match(header, /aimFromScreenDrag/);
  assert.match(header, /analyticPosition/);
  assert.match(header, /explicitEulerStep/);
  assert.match(header, /planFixedSteps/);
  assert.match(header, /solveGroundImpactTime/);
  assert.match(header, /explicitEulerStepToGround/);
  assert.match(header, /compareProjectile/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /position error decreases when fixed dt becomes smaller/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
});
