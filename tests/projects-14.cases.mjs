import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 14 builds an FPS camera through seven content-driven checkpoints", async () => {
  const contentDirectory = path.join(workspace, "content", "fps-camera-room");
  const sourceDirectory = path.join(workspace, "examples", "project-14-fps-camera-room");
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "14");

  assert.equal(project.checkpointCount, 7);

  const room = await readFile(
    path.join(contentDirectory, "01-dung-can-phong-wireframe.mdx"),
    "utf8",
  );
  assert.match(room, /RoomBounds/);
  assert.match(room, /RoomGeometry/);
  assert.match(room, /floor grid/i);

  const translation = await readFile(
    path.join(contentDirectory, "02-camera-position-va-view-translation.mdx"),
    "utf8",
  );
  assert.match(translation, /worldToCameraTranslation/);
  assert.match(translation, /p_\{camera\}=p_\{world\}-camera\.position/);

  const orientation = await readFile(
    path.join(contentDirectory, "03-inverse-yaw-va-pitch.mdx"),
    "utf8",
  );
  assert.match(orientation, /rotateY\(relative, -camera\.yaw\)/);
  assert.match(orientation, /rotateX\(yawNeutral, camera\.pitch\)/);

  const basis = await readFile(
    path.join(contentDirectory, "04-forward-right-up-cua-camera.mdx"),
    "utf8",
  );
  assert.match(basis, /CameraBasis/);
  assert.match(basis, /groundForward/);
  assert.match(basis, /dot product từng đôi/i);

  const movement = await readFile(
    path.join(contentDirectory, "05-wasd-theo-huong-nhin-va-delta-time.mdx"),
    "utf8",
  );
  assert.match(movement, /normalizeMoveInput/);
  assert.match(movement, /SDL_GetKeyboardState/);
  assert.match(movement, /speed.*delta time/i);

  const mouse = await readFile(
    path.join(contentDirectory, "06-relative-mouse-mode-va-pitch-clamp.mdx"),
    "utf8",
  );
  assert.match(mouse, /SDL_SetWindowRelativeMouseMode/);
  assert.match(mouse, /SDL_EVENT_WINDOW_FOCUS_LOST/);
  assert.match(mouse, /xrel\/yrel/);

  const finalLesson = await readFile(
    path.join(contentDirectory, "07-gioi-han-can-phong-va-validation.mdx"),
    "utf8",
  );
  assert.match(finalLesson, /clampCameraToRoom/);
  assert.match(finalLesson, /cameraToWorld/);
  assert.match(finalLesson, /Project 14 đã hoàn chỉnh/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const main = await readFile(
    path.join(sourceDirectory, "source-template", "src", "main.cpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const lab = await readFile(
    path.join(workspace, "components", "labs", "fps-camera-lab.tsx"),
    "utf8",
  );

  assert.match(header, /worldToCamera\(Vec3 worldPoint/);
  assert.match(header, /advanceCameraInRoom/);
  assert.match(header, /viewRoundTripError/);
  assert.match(main, /SDL_SetWindowRelativeMouseMode/);
  assert.match(main, /SDL_GetKeyboardState/);
  assert.match(tests, /movement distance is stable across 30 and 144 FPS/);
  assert.match(tests, /world-camera-world round trip restores the point/);
  assert.match(lab, /setPointerCapture\(event\.pointerId\)/);
  assert.match(lab, /fpsBasisError/);
});
