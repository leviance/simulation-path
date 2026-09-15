import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { lessonSectionUsages, mdxProse } from "../scripts/mdx-contracts.mjs";
import { workspace, render, authoredLessons } from "./site-support.mjs";

test("every lesson follows the content contract without escaped formatting artifacts", async () => {
  for (const lesson of await authoredLessons()) {
    const source = await readFile(
      path.join(workspace, "content", lesson.project, lesson.file),
      "utf8",
    );
    const sections = lessonSectionUsages(source);
    assert.deepEqual(
      sections.map((section) => section.key),
      lessonSections.map((section) => section.key),
      `${lesson.project}/${lesson.file} must contain each teaching section exactly once, in order`,
    );
    const byRole = Object.fromEntries(sections.map((section) => [section.key, section]));
    assert.match(
      source,
      /```cpp title="[^"]+"\r?\n/,
      `${lesson.file} has no titled C++ checkpoint`,
    );
    assert.ok(
      (source.match(/^### Bước /gm) ?? []).length >= 3,
      `${lesson.file} needs at least three explained code steps`,
    );
    const codeFences = source.match(/^```(?:cpp|cmake|bash) title="[^"]+"$/gm) ?? [];
    assert.ok(
      codeFences.length >= 3,
      `${lesson.file} needs at least three titled instructional code blocks`,
    );
    const proseOnly = mdxProse(source);
    assert.ok(
      !proseOnly.includes("\\n"),
      `${lesson.file} contains a literal \\n outside a code block`,
    );
    assert.ok(
      !source.includes("Checkpoint đang xây"),
      `${lesson.file} keeps the ambiguous checkpoint heading`,
    );
    assert.doesNotMatch(
      source,
      /## (?:Mô hình trực giác|Thí nghiệm có chủ đích|Validation)/,
      `${lesson.file} keeps a translated-template heading`,
    );
    assert.doesNotMatch(
      source,
      /\\\\(?:times|approx|Delta|sqrt|lceil|rceil|le)\b/,
      `${lesson.file} double-escapes KaTeX`,
    );
    assert.doesNotMatch(
      proseOnly,
      /(?:Unit phép kiểm thử|phép phép biến đổi|việc lấy mẫu rate|khung hình-based|circular bút|integer lưới|con trỏ điểm neo|event vòng lặp|main vòng lặp)/i,
      `${lesson.file} contains machine-translated phrasing`,
    );
    assert.doesNotMatch(
      source,
      /\$\$[^$]*(?:vận tốc|bán kính|tỉ lệ)[^$]*\$\$/i,
      `${lesson.file} translates a mathematical identifier`,
    );
    const experiment = source.slice(byRole.experiments.end, byRole.validation.start);
    assert.ok(
      (experiment.match(/^\d+\. /gm) ?? []).length >= 2,
      `${lesson.file} must separate intentional failures into observable experiments`,
    );
    if (source.includes("<InteractiveLab")) {
      assert.ok(
        byRole.model.end < source.indexOf("<InteractiveLab"),
        `${lesson.file} places its lab before the explanation`,
      );
      assert.ok(
        source.indexOf("<InteractiveLab") < byRole.code.start,
        `${lesson.file} does not place its lab beside the formula/model`,
      );
    }
    for (const match of source.matchAll(/```cpp[^\r\n]*\r?\n([\s\S]*?)\r?\n```/g)) {
      const snippet = match[1];
      if (/failed:/i.test(snippet) && /\bbreak;/.test(snippet)) {
        assert.match(
          snippet,
          /failed\s*=\s*true;/,
          `${lesson.file} teaches an SDL failure branch that still exits successfully`,
        );
      }
    }
  }
});

test("interactive labs expose only the controls needed by each lesson", async () => {
  const expectedModes = new Map([
    ["hello-pixels/02-framebuffer-la-gi.mdx", "pixel-memory"],
    ["hello-pixels/03-putpixel-va-rgba.mdx", "pixel-rgba"],
    ["hello-pixels/04-pattern-dau-tien.mdx", "pixel-patterns"],
    ["mini-paint/03-net-ve-bi-dut.mdx", "stroke-sampling"],
    ["mini-paint/04-stroke-interpolation.mdx", "stroke-interpolation"],
    ["tiny-2d-rasterizer/01-dda.mdx", "raster-dda"],
    ["tiny-2d-rasterizer/02-bresenham.mdx", "raster-bresenham"],
    ["tiny-2d-rasterizer/03-tam-octant.mdx", "raster-octants"],
    ["tiny-2d-rasterizer/04-rectangle.mdx", "raster-rectangle"],
    ["tiny-2d-rasterizer/05-midpoint-circle.mdx", "raster-circle"],
    ["coordinate-map/01-hai-he-toa-do.mdx", "coordinate-spaces"],
    ["coordinate-map/03-screen-to-world.mdx", "coordinate-inverse"],
    ["coordinate-map/05-zoom-quanh-cursor.mdx", "coordinate-zoom"],
    ["vector-playground/02-magnitude-va-arrow-head.mdx", "vector-magnitude"],
    ["vector-playground/03-keo-endpoint.mdx", "vector-drag"],
    ["vector-playground/04-cong-tru-vector.mdx", "vector-addition"],
    ["vector-playground/05-scalar-va-distance.mdx", "vector-scalar-distance"],
    ["vector-playground/06-normalize-lerp-validation.mdx", "vector-normalize"],
    ["unit-circle/01-radian-va-vong-tron-don-vi.mdx", "angle-radians"],
    ["unit-circle/02-sin-cos-thanh-toa-do.mdx", "angle-sincos"],
    ["unit-circle/03-van-toc-goc-va-delta-time.mdx", "angle-motion"],
    ["unit-circle/04-hinh-chieu-len-hai-truc.mdx", "angle-projections"],
    ["unit-circle/05-do-thi-sin-cos.mdx", "angle-graphs"],
    ["unit-circle/06-atan2-va-validation.mdx", "angle-atan2"],
    ["mouse-turret/01-bo-khung-thap-phao-va-muc-tieu.mdx", "turret-scene"],
    ["mouse-turret/02-dot-product-do-muc-do-cung-huong.mdx", "turret-dot"],
    ["mouse-turret/03-tu-dot-product-den-goc.mdx", "turret-angle"],
    ["mouse-turret/04-projection-va-do-lech.mdx", "turret-projection"],
    ["mouse-turret/05-quay-ve-phia-muc-tieu.mdx", "turret-rotation"],
    ["mouse-turret/06-vung-khoa-va-validation.mdx", "turret-view-cone"],
    ["square-transformer/01-hinh-vuong-trong-local-space.mdx", "transform-local"],
    ["square-transformer/02-scale-theo-hai-truc.mdx", "transform-scale"],
    ["square-transformer/03-xoay-bang-sin-cos.mdx", "transform-rotation"],
    ["square-transformer/04-shear-va-he-truc-bi-xien.mdx", "transform-shear"],
    ["square-transformer/05-ma-tran-affine-3x3.mdx", "transform-matrix"],
    ["square-transformer/06-thu-tu-phep-bien-doi-va-validation.mdx", "transform-order"],
    ["3d-compass/01-vec3-va-la-ban-ba-truc.mdx", "normal-axes"],
    ["3d-compass/02-tam-giac-va-hai-vector-canh.mdx", "normal-edges"],
    ["3d-compass/03-cross-product-va-raw-normal.mdx", "normal-cross"],
    ["3d-compass/04-unit-normal-va-dien-tich.mdx", "normal-unit-area"],
    ["3d-compass/05-winding-va-quy-tac-ban-tay-phai.mdx", "normal-winding"],
    ["3d-compass/06-tam-giac-suy-bien-va-validation.mdx", "normal-degenerate"],
    ["perspective-point/01-diem-3d-va-marker-tren-framebuffer.mdx", "projection-point"],
    ["perspective-point/02-tu-world-space-sang-camera-space.mdx", "projection-camera"],
    ["perspective-point/03-perspective-divide.mdx", "projection-divide"],
    ["perspective-point/04-fov-aspect-ndc-va-pixel.mdx", "projection-fov"],
    ["perspective-point/05-near-plane-va-view-frustum.mdx", "projection-visibility"],
    ["perspective-point/06-diem-bay-va-validation.mdx", "projection-motion"],
    ["rotating-triangle/01-noi-ba-diem-thanh-tam-giac-3d.mdx", "rotation-triangle"],
    ["rotating-triangle/02-pivot-va-local-space.mdx", "rotation-pivot"],
    ["rotating-triangle/03-rotation-quanh-truc-x.mdx", "rotation-x"],
    ["rotating-triangle/04-pitch-yaw-roll-va-thu-tu.mdx", "rotation-euler"],
    ["rotating-triangle/05-keo-chuot-de-xoay.mdx", "rotation-mouse"],
    ["rotating-triangle/06-animation-va-validation.mdx", "rotation-validation"],
    ["wireframe-cube/01-tam-dinh-va-quy-uoc-index.mdx", "cube-vertices"],
    ["wireframe-cube/02-muoi-hai-canh-tu-edge-list.mdx", "cube-edges"],
    ["wireframe-cube/03-xoay-ca-khoi-lap-phuong.mdx", "cube-transform"],
    ["wireframe-cube/04-depth-order-va-depth-cue.mdx", "cube-depth"],
    ["wireframe-cube/05-tuong-tac-va-validation.mdx", "cube-validation"],
    ["fps-camera-room/01-dung-can-phong-wireframe.mdx", "camera-room"],
    ["fps-camera-room/02-camera-position-va-view-translation.mdx", "camera-translation"],
    ["fps-camera-room/03-inverse-yaw-va-pitch.mdx", "camera-orientation"],
    ["fps-camera-room/04-forward-right-up-cua-camera.mdx", "camera-basis"],
    ["fps-camera-room/05-wasd-theo-huong-nhin-va-delta-time.mdx", "camera-movement"],
    ["fps-camera-room/06-relative-mouse-mode-va-pitch-clamp.mdx", "camera-mouse-look"],
    ["fps-camera-room/07-gioi-han-can-phong-va-validation.mdx", "camera-validation"],
    ["3d-pipeline-inspector/01-dung-may-soi-vertex.mdx", "pipeline-local"],
    ["3d-pipeline-inspector/02-vec4-va-mat4.mdx", "pipeline-homogeneous"],
    ["3d-pipeline-inspector/03-model-matrix-local-to-world.mdx", "pipeline-model"],
    ["3d-pipeline-inspector/04-view-matrix-world-to-camera.mdx", "pipeline-view"],
    ["3d-pipeline-inspector/05-projection-matrix-va-clip-space.mdx", "pipeline-projection"],
    ["3d-pipeline-inspector/06-perspective-divide-ndc-va-viewport.mdx", "pipeline-viewport"],
    ["3d-pipeline-inspector/07-ghep-mvp-va-validation.mdx", "pipeline-validation"],
    ["triangle-rasterizer/01-dung-khung-tam-giac-screen-space.mdx", "triangle-frame"],
    ["triangle-rasterizer/02-khoanh-vung-bounding-box.mdx", "triangle-bounds"],
    ["triangle-rasterizer/03-edge-function-va-winding.mdx", "triangle-edge"],
    ["triangle-rasterizer/04-pixel-center-va-coverage.mdx", "triangle-center"],
    ["triangle-rasterizer/05-vong-lap-raster.mdx", "triangle-fill"],
    ["triangle-rasterizer/06-top-left-rule.mdx", "triangle-top-left"],
    ["triangle-rasterizer/07-barycentric-va-validation.mdx", "triangle-barycentric"],
    ["solid-cube-z-buffer/01-dung-khoi-lap-phuong-dac.mdx", "depth-cube"],
    ["solid-cube-z-buffer/02-loi-thu-tu-ve.mdx", "depth-order"],
    ["solid-cube-z-buffer/03-tao-va-clear-depth-buffer.mdx", "depth-storage"],
    ["solid-cube-z-buffer/04-noi-suy-ndc-depth.mdx", "depth-interpolate"],
    ["solid-cube-z-buffer/05-depth-test-va-depth-write.mdx", "depth-test"],
    ["solid-cube-z-buffer/06-rasterize-toan-bo-cube.mdx", "depth-mesh"],
    ["solid-cube-z-buffer/07-kiem-chung-doc-lap-draw-order.mdx", "depth-validate"],
    ["obj-mesh-viewer/01-doc-vertex-va-ve-point-cloud.mdx", "obj-vertices"],
    ["obj-mesh-viewer/02-doc-face-va-index-mot-based.mdx", "obj-faces"],
    ["obj-mesh-viewer/03-giai-ma-face-token-obj.mdx", "obj-indices"],
    ["obj-mesh-viewer/04-triangulate-polygon-bang-fan.mdx", "obj-triangulation"],
    ["obj-mesh-viewer/05-center-va-scale-mesh.mdx", "obj-normalize"],
    ["obj-mesh-viewer/06-face-normal-va-lambert.mdx", "obj-shading"],
    ["obj-mesh-viewer/07-clip-z-buffer-va-rasterize-mesh.mdx", "obj-render"],
    ["obj-mesh-viewer/08-load-file-controls-va-validation.mdx", "obj-validation"],
    ["projectile-cannon/01-dung-bai-ban-va-vector-ngam.mdx", "projectile-aim"],
    ["projectile-cannon/02-tach-van-toc-dau-theo-hai-truc.mdx", "projectile-components"],
    ["projectile-cannon/03-ve-quy-dao-giai-tich.mdx", "projectile-analytic"],
    ["projectile-cannon/04-cho-vien-dan-chay-bang-explicit-euler.mdx", "projectile-euler"],
    ["projectile-cannon/05-fixed-timestep-va-accumulator.mdx", "projectile-timestep"],
    ["projectile-cannon/06-tim-thoi-diem-cham-dat.mdx", "projectile-impact"],
    ["projectile-cannon/07-do-sai-so-va-nghiem-thu.mdx", "projectile-validation"],
    ["integrator-race/01-dung-duong-dua-harmonic-oscillator.mdx", "integrator-system"],
    ["integrator-race/02-explicit-euler-thi-sinh-dau-tien.mdx", "integrator-euler"],
    ["integrator-race/03-velocity-verlet-va-hai-lan-tinh-luc.mdx", "integrator-verlet"],
    ["integrator-race/04-rk4-va-bon-lan-tham-slope.mdx", "integrator-rk4"],
    ["integrator-race/05-cho-ba-integrator-chay-lockstep.mdx", "integrator-lockstep"],
    ["integrator-race/06-do-phase-error-va-energy-drift.mdx", "integrator-energy"],
    ["integrator-race/07-stress-test-convergence-va-nghiem-thu.mdx", "integrator-validation"],
    ["collision-tank/01-dung-be-va-dan-bong-deterministic.mdx", "collision-scene"],
    ["collision-tank/02-cho-bong-chuyen-dong-fixed-timestep.mdx", "collision-motion"],
    ["collision-tank/03-xu-ly-va-cham-voi-tuong.mdx", "collision-walls"],
    ["collision-tank/04-phat-hien-hai-hinh-tron-cham-nhau.mdx", "collision-detection"],
    ["collision-tank/05-doi-van-toc-bang-collision-impulse.mdx", "collision-impulse"],
    ["collision-tank/06-day-hai-bong-ra-khoi-penetration.mdx", "collision-correction"],
    ["collision-tank/07-duyet-moi-cap-va-giai-toan-bo-be.mdx", "collision-bruteforce"],
    ["collision-tank/08-stress-test-bao-toan-va-nghiem-thu.mdx", "collision-validation"],
    ["spring-chain/01-dung-chuoi-khoi-luong-va-lo-xo.mdx", "spring-scene"],
    ["spring-chain/02-tinh-luc-hooke-tren-mot-lo-xo.mdx", "spring-hooke"],
    ["spring-chain/03-cong-luc-gravity-va-neo-co-dinh.mdx", "spring-forces"],
    ["spring-chain/04-cho-chuoi-chuyen-dong-semi-implicit-euler.mdx", "spring-integration"],
    ["spring-chain/05-them-damping-doc-truc-lo-xo.mdx", "spring-damping"],
    ["spring-chain/06-keo-tha-mot-khoi-va-truyen-dao-dong.mdx", "spring-drag"],
    ["spring-chain/07-thi-nghiem-stiffness-mass-va-delta-time.mdx", "spring-stability"],
    ["spring-chain/08-do-energy-stress-test-va-nghiem-thu.mdx", "spring-validation"],
    ["double-pendulum-chaos/01-bieu-dien-double-pendulum-bang-goc.mdx", "chaos-geometry"],
    ["double-pendulum-chaos/02-tinh-angular-acceleration-coupled.mdx", "chaos-derivative"],
    ["double-pendulum-chaos/03-tich-phan-rk4-va-theo-doi-energy.mdx", "chaos-rk4"],
    ["double-pendulum-chaos/04-chay-hai-con-lac-cung-timestep.mdx", "chaos-twins"],
    ["double-pendulum-chaos/05-do-separation-trong-phase-space.mdx", "chaos-separation"],
    ["double-pendulum-chaos/06-phan-biet-chaos-voi-sai-so-so-hoc.mdx", "chaos-shadow"],
    ["double-pendulum-chaos/07-preset-tuong-tac-va-nghiem-thu.mdx", "chaos-validation"],
    ["brute-force-particle-query/01-tao-cloud-100000-particles.mdx", "brute-scene"],
    ["brute-force-particle-query/02-bien-con-tro-thanh-query-circle.mdx", "brute-circle"],
    ["brute-force-particle-query/03-quet-toan-bo-particles-bang-brute-force.mdx", "brute-scan"],
    ["brute-force-particle-query/04-bo-sqrt-va-tai-su-dung-bo-dem.mdx", "brute-squared"],
    ["brute-force-particle-query/05-do-thoi-gian-khong-tu-danh-lua-minh.mdx", "brute-benchmark"],
    ["brute-force-particle-query/06-doc-duong-tang-chi-phi-theo-n.mdx", "brute-scaling"],
    ["brute-force-particle-query/07-hoan-thien-kinh-lup-va-nghiem-thu.mdx", "brute-validation"],
    ["spatial-grid-neighbor-query/01-tu-world-position-den-dia-chi-cell.mdx", "grid-layout"],
    ["spatial-grid-neighbor-query/02-xay-buckets-cho-100000-particles.mdx", "grid-insert"],
    ["spatial-grid-neighbor-query/03-chon-candidate-cells-quanh-circle.mdx", "grid-candidates"],
    ["spatial-grid-neighbor-query/04-loc-candidates-thanh-neighbors-chinh-xac.mdx", "grid-filter"],
    ["spatial-grid-neighbor-query/05-doi-chieu-voi-brute-force-oracle.mdx", "grid-compare"],
    ["spatial-grid-neighbor-query/06-benchmark-grid-va-baseline-cong-bang.mdx", "grid-benchmark"],
    ["spatial-grid-neighbor-query/07-chon-cell-size-bang-du-lieu.mdx", "grid-cell-size"],
    ["spatial-grid-neighbor-query/08-hoan-thien-spatial-grid-va-nghiem-thu.mdx", "grid-validation"],
    ["visible-quadtree/01-vung-chon-va-quy-uoc-aabb.mdx", "quadtree-selection"],
    ["visible-quadtree/02-root-node-va-leaf-capacity.mdx", "quadtree-root"],
    ["visible-quadtree/03-split-node-va-redistribute.mdx", "quadtree-split"],
    ["visible-quadtree/04-kiem-tra-topology-cua-tree.mdx", "quadtree-topology"],
    ["visible-quadtree/05-truy-van-vung-chon-bang-pruning.mdx", "quadtree-query"],
    ["visible-quadtree/06-doi-chieu-voi-brute-force-oracle.mdx", "quadtree-compare"],
    ["visible-quadtree/07-benchmark-va-chon-leaf-capacity.mdx", "quadtree-capacity"],
    ["visible-quadtree/08-hoan-thien-visible-quadtree-va-nghiem-thu.mdx", "quadtree-validation"],
    ["point-cloud-octree/01-point-cloud-va-tam-octant.mdx", "octree-octants"],
    ["point-cloud-octree/02-root-node-va-index-storage.mdx", "octree-root"],
    ["point-cloud-octree/03-split-tam-child-va-redistribute.mdx", "octree-split"],
    ["point-cloud-octree/04-inspector-kiem-tra-topology-3d.mdx", "octree-topology"],
    ["point-cloud-octree/05-truy-van-aabb-bang-pruning.mdx", "octree-query"],
    ["point-cloud-octree/06-doi-chieu-brute-force-oracle.mdx", "octree-oracle"],
    ["point-cloud-octree/07-benchmark-cong-bang.mdx", "octree-benchmark"],
    ["point-cloud-octree/08-capacity-study.mdx", "octree-capacity"],
    ["point-cloud-octree/09-hoan-thien-point-cloud-octree.mdx", "octree-validation"],
    ["memory-layout-race/01-khoa-workload-mot-trieu-particles.mdx", "layout-scene"],
    ["memory-layout-race/02-cap-nhat-particles-trong-aos.mdx", "aos-layout"],
    ["memory-layout-race/03-do-baseline-aos.mdx", "aos-baseline"],
    ["memory-layout-race/04-chuyen-state-sang-soa.mdx", "soa-layout"],
    ["memory-layout-race/05-doi-chieu-hai-kernel.mdx", "layout-agreement"],
    ["memory-layout-race/06-cache-line-stride-va-useful-bytes.mdx", "cache-lines"],
    ["memory-layout-race/07-benchmark-va-scaling-release.mdx", "layout-benchmark"],
    ["memory-layout-race/08-hoan-thien-memory-layout-race.mdx", "layout-validation"],
    ["cpu-gpu-triangle/01-tao-opengl-context-tu-sdl3.mdx", "gl-context"],
    ["cpu-gpu-triangle/02-bien-dich-shader-dau-tien.mdx", "shader-program"],
    ["cpu-gpu-triangle/03-dua-triangle-vao-vbo-va-vao.mdx", "vertex-contract"],
    ["cpu-gpu-triangle/04-ve-cung-triangle-bang-cpu.mdx", "cpu-reference"],
    ["cpu-gpu-triangle/05-doi-chieu-transform-voi-vertex-shader.mdx", "vertex-transform"],
    ["cpu-gpu-triangle/06-ndc-viewport-va-hai-he-truc-y.mdx", "viewport-conventions"],
    ["cpu-gpu-triangle/07-noi-suy-mau-trong-fragment-shader.mdx", "fragment-interpolation"],
    ["cpu-gpu-triangle/08-doc-lai-gpu-va-do-sai-khac.mdx", "gpu-readback"],
    ["cpu-gpu-triangle/09-hoan-thien-cpu-gpu-triangle.mdx", "pipeline-validation"],
    ["dual-renderer-cube/01-khoa-mot-cube-scene-dung-chung.mdx", "shared-scene"],
    ["dual-renderer-cube/02-xay-indexed-cube-mesh.mdx", "indexed-mesh"],
    ["dual-renderer-cube/03-ket-noi-cpu-renderer-voi-scene.mdx", "cpu-path"],
    ["dual-renderer-cube/04-ve-cube-gpu-bang-element-buffer.mdx", "gpu-indexed-draw"],
    ["dual-renderer-cube/05-dong-bo-model-view-projection.mdx", "mvp-contract"],
    ["dual-renderer-cube/06-doi-chieu-depth-buffer-va-depth-test.mdx", "depth-contract"],
    ["dual-renderer-cube/07-dong-bo-winding-va-face-culling.mdx", "culling-contract"],
    ["dual-renderer-cube/08-chuyen-renderer-bang-f1-f2.mdx", "renderer-switch"],
    ["dual-renderer-cube/09-hoan-thien-dual-renderer-cube.mdx", "cube-validation"],
    ["shader-hot-reload-lab/01-dua-glsl-ra-file-rieng.mdx", "shader-files"],
    ["shader-hot-reload-lab/02-compile-shader-va-doc-info-log.mdx", "compile-diagnostics"],
    ["shader-hot-reload-lab/03-link-candidate-va-khoa-interface.mdx", "program-interface"],
    ["shader-hot-reload-lab/04-reload-theo-giao-dich-giu-last-good.mdx", "transactional-reload"],
    ["shader-hot-reload-lab/05-theo-doi-file-va-debounce.mdx", "file-watcher"],
    ["shader-hot-reload-lab/06-truyen-time-resolution-va-mouse.mdx", "live-uniforms"],
    ["shader-hot-reload-lab/07-viet-fragment-shader-procedural.mdx", "procedural-shader"],
    ["shader-hot-reload-lab/08-hoan-thien-shader-hot-reload-lab.mdx", "shader-validation"],
  ]);

  for (const [lessonPath, mode] of expectedModes) {
    const source = await readFile(path.join(workspace, "content", lessonPath), "utf8");
    assert.match(source, new RegExp(`mode="${mode}"`), `${lessonPath} is missing ${mode}`);
  }

  const dda = await render("/projects/tiny-2d-rasterizer/01-dda");
  assert.match(await dda.text(), /Stepper được khóa ở DDA/i);
  const spaces = await render("/projects/coordinate-map/01-hai-he-toa-do");
  assert.match(await spaces.text(), /Camera được giữ cố định/i);
  const vectors = await render("/projects/vector-playground/04-cong-tru-vector");
  assert.match(await vectors.text(), /A\+B nằm ở góc đối diện của hình bình hành/i);
  const drag = await render("/projects/vector-playground/03-keo-endpoint");
  assert.match(await drag.text(), /bán kính hit-test/i);
  const distance = await render("/projects/vector-playground/05-scalar-va-distance");
  assert.match(await distance.text(), /distance\(A,B\).*đo đoạn nào/i);
});

test("every project teaches its visible starting point before new abstractions", async () => {
  const entryLessons = [
    ["hello-pixels", "01-cua-so-va-event-loop.mdx", ["SDL_CreateWindow", "SDL_RenderPresent"]],
    [
      "wasd-fps-cap",
      "01-keyboard-state.mdx",
      ["SDL_FRect", "SDL_RenderFillRect", "SDL_GetKeyboardState"],
    ],
    ["mini-paint", "01-mouse-input.mdx", ["SDL_UpdateTexture", "putPixel", "stampPoint"]],
    ["tiny-2d-rasterizer", "01-dda.mdx", ["putPixel", "SDL_UpdateTexture", "lab::dda"]],
    ["coordinate-map", "01-hai-he-toa-do.mdx", ["putPixel", "markerScreen", "SDL_UpdateTexture"]],
    ["vector-playground", "01-vec2-va-do-doi.mdx", ["drawBoard", "drawLine", "worldToScreen"]],
    [
      "unit-circle",
      "01-radian-va-vong-tron-don-vi.mdx",
      ["SDL3", "drawCircleOutline", "normalizeAngle"],
    ],
    [
      "mouse-turret",
      "01-bo-khung-thap-phao-va-muc-tieu.mdx",
      ["targetOffset", "directionFromAngle", "drawTarget"],
    ],
    [
      "square-transformer",
      "01-hinh-vuong-trong-local-space.mdx",
      ["makeSquare", "drawSquare", "SDL_UpdateTexture"],
    ],
    [
      "3d-compass",
      "01-vec3-va-la-ban-ba-truc.mdx",
      ["Vec3", "drawAxes", "projectIsometric", "SDL_UpdateTexture"],
    ],
    [
      "perspective-point",
      "01-diem-3d-va-marker-tren-framebuffer.mdx",
      ["Vec3", "drawPointMarker", "previewPoint", "SDL_UpdateTexture"],
    ],
    [
      "rotating-triangle",
      "01-noi-ba-diem-thanh-tam-giac-3d.mdx",
      ["Triangle3", "projectTriangle", "drawProjectedTriangle", "SDL_UpdateTexture"],
    ],
    [
      "wireframe-cube",
      "01-tam-dinh-va-quy-uoc-index.mdx",
      ["CubeVertices", "projectCube", "drawVertexMarkers", "SDL_UpdateTexture"],
    ],
    [
      "fps-camera-room",
      "01-dung-can-phong-wireframe.mdx",
      ["RoomBounds", "RoomGeometry", "drawRoom", "SDL_UpdateTexture"],
    ],
    [
      "3d-pipeline-inspector",
      "01-dung-may-soi-vertex.mdx",
      ["Vec3", "drawPipelineRail", "drawPreviewMarker", "SDL_UpdateTexture"],
    ],
    [
      "triangle-rasterizer",
      "01-dung-khung-tam-giac-screen-space.mdx",
      ["Triangle2", "makeDefaultTriangle", "drawLine", "SDL_UpdateTexture"],
    ],
    [
      "solid-cube-z-buffer",
      "01-dung-khoi-lap-phuong-dac.mdx",
      ["CubeMesh", "projectCube", "rasterizeTriangle", "SDL_UpdateTexture"],
    ],
    [
      "obj-mesh-viewer",
      "01-doc-vertex-va-ve-point-cloud.mdx",
      ["parseObj", "renderPointCloud", "SDL_UpdateTexture"],
    ],
    [
      "projectile-cannon",
      "01-dung-bai-ban-va-vector-ngam.mdx",
      ["worldToScreen", "aimFromScreenDrag", "SDL_CaptureMouse"],
    ],
    [
      "integrator-race",
      "01-dung-duong-dua-harmonic-oscillator.mdx",
      ["OscillatorState", "oscillatorAcceleration", "SDL3"],
    ],
    [
      "collision-tank",
      "01-dung-be-va-dan-bong-deterministic.mdx",
      ["Ball", "makeBallLattice", "SDL_UpdateTexture"],
    ],
    [
      "spring-chain",
      "01-dung-chuoi-khoi-luong-va-lo-xo.mdx",
      ["Particle", "makeVerticalChain", "SDL_UpdateTexture"],
    ],
    [
      "double-pendulum-chaos",
      "01-bieu-dien-double-pendulum-bang-goc.mdx",
      ["DoublePendulumState", "pendulumGeometry", "SDL_UpdateTexture"],
    ],
    [
      "brute-force-particle-query",
      "01-tao-cloud-100000-particles.mdx",
      ["Particle", "makeParticleCloud", "SDL_UpdateTexture"],
    ],
    [
      "spatial-grid-neighbor-query",
      "01-tu-world-position-den-dia-chi-cell.mdx",
      ["queryNeighborsBruteForce", "SpatialGridConfig", "SDL_UpdateTexture"],
    ],
    [
      "visible-quadtree",
      "01-vung-chon-va-quy-uoc-aabb.mdx",
      ["Particle", "querySelectionBruteForce", "SDL_UpdateTexture"],
    ],
    [
      "point-cloud-octree",
      "01-point-cloud-va-tam-octant.mdx",
      ["projectPointWithOrbit", "pointInsideVolume", "octreeOctant"],
    ],
    [
      "memory-layout-race",
      "01-khoa-workload-mot-trieu-particles.mdx",
      ["ParticleAoS", "makeParticlesAoS", "SDL_UpdateTexture"],
    ],
    [
      "cpu-gpu-triangle",
      "01-tao-opengl-context-tu-sdl3.mdx",
      ["SDL_CreateWindow", "SDL_GL_CreateContext", "SDL_GL_GetProcAddress"],
    ],
    [
      "dual-renderer-cube",
      "01-khoa-mot-cube-scene-dung-chung.mdx",
      ["RendererKind", "CubeScene", "rendererLabel"],
    ],
    [
      "shader-hot-reload-lab",
      "01-dua-glsl-ra-file-rieng.mdx",
      ["ShaderSources", "readTextFile", "shader directory"],
    ],
  ];

  for (const [project, file, requiredSymbols] of entryLessons) {
    const source = await readFile(path.join(workspace, "content", project, file), "utf8");
    for (const symbol of requiredSymbols) {
      assert.ok(source.includes(symbol), `${file} does not teach ${symbol}`);
    }

    const response = await render(`/projects/${project}/${file.slice(0, -4)}`);
    const html = await response.text();
    const startingSource = html.indexOf('id="starting-source-title"');
    const lessonProblem = html.indexOf('id="vấn-đề-cần-giải-quyết"');
    assert.ok(startingSource > -1, `${file} does not expose the runnable input source`);
    assert.ok(
      startingSource < lessonProblem,
      `${file} does not provide its compact starting-point map`,
    );
    const startingSourceSection = html.slice(
      html.lastIndexOf('<section class="starting-source"', startingSource),
      lessonProblem,
    );
    assert.doesNotMatch(
      startingSourceSection,
      /<details[^>]*\sopen(?:="")?/,
      `${file} expands its full starting source before the lesson`,
    );
  }

  const projectTwoCheckpoint = await readFile(
    path.join(
      workspace,
      "examples",
      "project-02-wasd-fps-cap",
      "checkpoints",
      "01",
      "src",
      "main.cpp",
    ),
    "utf8",
  );
  assert.match(projectTwoCheckpoint, /SDL_RenderFillRect\(renderer, &player\)/);
  assert.doesNotMatch(
    projectTwoCheckpoint,
    /SDL_CreateTexture|SDL_UpdateTexture|std::vector<std::uint32_t>/,
  );
  assert.ok(
    projectTwoCheckpoint.indexOf("if (keyboard[SDL_SCANCODE_A])") <
      projectTwoCheckpoint.indexOf("return lab::normalize(direction)"),
    "Project 02 must teach explicit key branches before normalization",
  );
});
