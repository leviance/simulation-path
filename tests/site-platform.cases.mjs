import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isCourseTextFile } from "../scripts/course-file-types.mjs";
import {
  workspace,
  projectCatalog,
  projectSlugs,
  expectedLessonCount,
  fixedRoutes,
  lessonSectionIds,
  render,
  authoredLessons,
  walkFiles,
} from "./site-support.mjs";

test("server-renders the finished home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Simulation Path/i);
  assert.match(html, /Tự viết từng pixel/i);
  assert.match(html, new RegExp(`${projectCatalog.length} dự án đầu tiên`, "i"));
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
  const themeScript = html.indexOf('id="theme-init"');
  const body = html.indexOf("<body");
  assert.ok(
    themeScript > -1 && themeScript < body,
    "Theme must initialize in <head> before the first body paint",
  );
  assert.match(html, /localStorage\.getItem\("simulation-path-theme"\)/);
});

test("roadmap contains exactly 78 ordered projects and correct release states", async () => {
  const response = await render("/roadmap");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /78 dự án/i);
  assert.match(html, /id="project-78"/i);
  assert.match(html, /Sắp ra mắt/i);
  assert.equal((html.match(/id="project-\d{2}"/g) ?? []).length, 78);

  const roadmapSource = await readFile(path.join(workspace, "course", "roadmap.ts"), "utf8");
  const manifestSource = (
    await Promise.all(
      projectCatalog.map((project) =>
        readFile(
          path.join(workspace, "course", "projects", `p${project.id}`, "manifest.ts"),
          "utf8",
        ),
      ),
    )
  ).join("\n");
  const compactManifestSource = manifestSource
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/,\]/g, "]");

  assert.equal((roadmapSource.match(/^\s*id:\s*\d+,?$/gm) ?? []).length, 78);
  assert.equal(
    new Set(compactManifestSource.match(/id: "p\d{2}-l\d{2}"/g) ?? []).size,
    expectedLessonCount,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 01 — window, renderer và event loop"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 01 — framebuffer và putPixel", "Project 02 — keyboard\/input state"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 01 — framebuffer và putPixel", "Project 03 — mouse input và input sampling"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 01 — framebuffer và putPixel", "Project 04 — rasterization trên lưới pixel"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 04 — vẽ line trên framebuffer", "Project 05 — world\/screen transform và mouse drag"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 02 — delta time", "Project 05 — đổi world\/screen space", "Project 06 — vector, độ dài và mouse drag"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 02 — delta time", "Project 05 — đổi world\/screen space", "Project 06 — vector và normalize", "Project 07 — radian, sin\/cos và atan2"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 04 — vẽ line trên framebuffer", "Project 05 — world\/screen space", "Project 06 — vector 2D", "Project 07 — sin, cos và radian"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 04 — vẽ line trên framebuffer", "Project 06 — phép toán vector và normalize", "Project 08 — dot product", "Project 09 — local space và phép biến đổi"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 02 — delta time và keyboard input", "Project 05 — world\/screen space", "Project 07 — radian và tangent", "Project 10 — Vec3 và hệ trục 3D"\]/,
  );
  assert.match(
    compactManifestSource,
    /prerequisites: \["Project 07 — radian, sin và cos", "Project 10 — Vec3, tam giác và winding", "Project 11 — perspective projection và near plane"\]/,
  );
});

test("glossary explains course terms with stable anchors", async () => {
  const response = await render("/glossary");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const id of [
    "checkpoint",
    "angular-velocity",
    "atan2",
    "delta-time",
    "event-loop",
    "framebuffer",
    "input-sampling",
    "octant",
    "pointer-capture",
    "round-trip-test",
    "radian",
    "screen-space",
    "streaming-texture",
    "vector-2d",
    "unit-circle",
    "magnitude",
    "linear-interpolation",
    "zero-vector",
    "dot-product",
    "angle-between",
    "vector-projection",
    "cross-product-2d",
    "view-cone",
    "world-space",
    "local-space",
    "affine-transform",
    "transformation-matrix",
    "shear",
    "determinant",
    "vector-3d",
    "axonometric-projection",
    "cross-product",
    "normal-vector",
    "winding-order",
    "degenerate-triangle",
    "camera-space",
    "perspective-projection",
    "perspective-divide",
    "similar-triangles",
    "field-of-view",
    "aspect-ratio",
    "normalized-device-coordinates",
    "near-plane",
    "view-frustum",
    "wireframe",
    "pivot",
    "rotation-3d",
    "euler-angles",
    "rotation-order",
    "non-commutative",
    "mouse-delta",
    "vertex-index",
    "edge-list",
    "mesh-topology",
    "depth-cue",
    "fps-camera",
    "view-transform",
    "camera-basis",
    "relative-mouse-mode",
    "room-bounds",
    "pipeline-trace",
    "homogeneous-coordinates",
    "column-vector",
    "model-matrix",
    "view-matrix",
    "clip-space",
    "viewport-transform",
    "mvp-matrix",
    "bounding-box",
    "edge-function",
    "half-plane",
    "pixel-center",
    "coverage-test",
    "top-left-rule",
    "barycentric-coordinates",
    "wavefront-obj",
    "input-stream",
    "point-cloud",
    "obj-face-index",
    "obj-face-token",
    "polygon",
    "mesh-normalization",
    "uniform-scale",
    "diagnostic",
    "projectile-motion",
    "initial-velocity",
    "gravity-acceleration",
    "analytic-solution",
    "numerical-integration",
    "explicit-euler",
    "physics-accumulator",
    "time-of-flight",
    "integration-error",
    "impact-interpolation",
    "harmonic-oscillator",
    "angular-frequency",
    "phase-space",
    "velocity-verlet",
    "runge-kutta-4",
    "energy-drift",
    "force-evaluation",
    "convergence-order",
    "collision-detection",
    "deterministic-simulation",
    "contact-normal",
    "penetration-depth",
    "coefficient-of-restitution",
    "collision-impulse",
    "inverse-mass",
    "positional-correction",
    "pairwise-brute-force",
    "linear-momentum",
    "kinetic-energy",
    "mass-spring-system",
    "hookes-law",
    "spring-rest-length",
    "force-accumulation",
    "semi-implicit-euler",
    "axial-spring-damping",
    "kinematic-drag",
    "spring-stability-index",
    "mechanical-energy",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `Missing glossary anchor #${id}`);
  }
  assert.match(html, /không chứa sẵn code của những bài phía sau/i);
  assert.match(html, /Gặp từ lạ trong bài/i);
});

test("shared learning pages explain how to start instead of only listing resources", async () => {
  const home = await (await render("/")).text();
  assert.match(home, /Đọc đề bài và thử tìm một hướng giải/i);
  assert.match(home, /Mỗi dự án có một thử thách để bạn tự làm trước/i);

  const gettingStarted = await (await render("/getting-started")).text();
  assert.match(gettingStarted, /starter\/.*nơi bạn bắt đầu và tiếp tục viết code/i);
  assert.match(gettingStarted, /Starter của Project 01 chỉ thoát ngay/i);
  assert.match(gettingStarted, /Dùng checkpoint để đối chiếu, không phải để chép bài/i);

  const downloads = await (await render("/downloads")).text();
  assert.match(downloads, /Viết trong starter/i);
  assert.match(downloads, /Đối chiếu checkpoint/i);
  assert.match(downloads, /Kiểm tra bằng final và tests/i);

  const roadmap = await (await render("/roadmap")).text();
  assert.match(roadmap, new RegExp(`${projectCatalog.length} project đã có đủ bài học`, "i"));
  const firstUnpublishedProject = Number(projectCatalog.at(-1)?.id ?? 0) + 1;
  assert.match(roadmap, new RegExp(`bắt đầu từ Project ${firstUnpublishedProject}`, "i"));
  assert.match(roadmap, /Dựng vòng lặp ứng dụng/i);
  assert.match(roadmap, /Chưa có bài học, Canvas hoặc gói mã nguồn hoàn chỉnh/i);
});

test("site search includes shared pages and glossary terms", async () => {
  const searchFiles = await walkFiles(path.join(workspace, "course", "generated", "search"));
  const searchSource = (await Promise.all(searchFiles.map((file) => readFile(file, "utf8")))).join(
    "\n",
  );
  assert.match(searchSource, /Generated page-search shard/);
  assert.match(searchSource, /Generated glossary-search shard/);
  for (const href of ["/getting-started", "/roadmap", "/downloads", "/glossary"]) {
    assert.ok(searchSource.includes(`"href": "${href}"`), `Shared search page is missing: ${href}`);
  }
  for (const id of [
    "cmake-target",
    "configure",
    "dda",
    "bresenham",
    "normalization",
    "row-major-order",
    "zoom-anchor",
  ]) {
    assert.ok(searchSource.includes(`"href": "/glossary#${id}"`), `Missing search term: ${id}`);
  }

  const html = await (await render("/glossary")).text();
  const renderedIds = [...html.matchAll(/<article id="([^"]+)"/g)].map((match) => match[1]);
  const indexedIds = [...searchSource.matchAll(/"href": "\/glossary#([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(renderedIds.length > 0, "Glossary page must contain terms");
  assert.equal(new Set(renderedIds).size, renderedIds.length, "Duplicate glossary anchor");
  assert.equal(new Set(indexedIds).size, indexedIds.length, "Duplicate glossary search result");
  assert.deepEqual(indexedIds.sort(), renderedIds.sort());
});

test("all published project and lesson routes render", async () => {
  for (const project of projectSlugs) {
    const response = await render(`/projects/${project}`);
    assert.equal(response.status, 200, `Project route failed: ${project}`);
    const html = await response.text();
    assert.match(html, /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i, `Missing challenge heading: ${project}`);
    assert.match(
      html,
      /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/i,
      `Missing challenge prompt: ${project}`,
    );
    assert.match(
      html,
      /Chương trình cần làm được gì/i,
      `Missing functional requirements: ${project}`,
    );
    assert.match(html, /Giới hạn kỹ thuật/i, `Missing technical constraints: ${project}`);
    assert.match(html, /Tự chấm bài/i, `Missing challenge acceptance criteria: ${project}`);
    assert.match(html, /CẦN BIẾT TRƯỚC/i, `Missing project prerequisites: ${project}`);
    assert.match(html, /SẢN PHẨM CUỐI/i, `Missing final product description: ${project}`);
    assert.match(html, /KIẾN THỨC SẼ DÙNG/i, `Missing project objectives: ${project}`);
    assert.match(html, /MÔ HÌNH TƯƠNG TÁC/i, `Missing project-level interactive model: ${project}`);
    assert.match(html, /class="interactive-lab"/i, `Missing project Canvas lab: ${project}`);
    assert.match(html, /class="lab-readout"/i, `Missing textual Canvas state: ${project}`);
    assert.match(html, /href="#lessons"/i, `Missing reveal-tutorial link: ${project}`);
    assert.ok(
      html.indexOf("project-challenge") < html.indexOf("project-progress"),
      `Challenge must precede tutorial progress: ${project}`,
    );
  }
  const lessons = await authoredLessons();
  assert.equal(lessons.length, expectedLessonCount);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200, `Lesson route failed: ${lesson.route}`);
    const html = await response.text();
    assert.match(html, /Tự kiểm tra kết quả/i, `Missing validation section: ${lesson.file}`);
    assert.match(html, /Mã chạy được ở cuối bài/i, `Missing runnable source guide: ${lesson.file}`);
    assert.match(
      html,
      /“Checkpoint” ở đây có nghĩa là gì/i,
      `Missing checkpoint definition: ${lesson.file}`,
    );
    assert.match(
      html,
      /CODE ĐÃ THAY ĐỔI Ở ĐÂU/i,
      `Missing generated checkpoint diff: ${lesson.file}`,
    );
    assert.ok(
      /data-language="diff"/i.test(html) || /không thuộc riêng một checkpoint/i.test(html),
      `Checkpoint change is neither highlighted nor explained: ${lesson.file}`,
    );
    const project = projectCatalog.find((item) => item.slug === lesson.project);
    const order = Number.parseInt(lesson.file, 10);
    const isFinal = order === project.checkpointCount;
    const root = path.join(workspace, "examples", project.sourceDirectory);
    const snapshot = isFinal ? "final" : `checkpoints/${String(order).padStart(2, "0")}`;
    const previous = order === 1 ? "starter" : `checkpoints/${String(order - 1).padStart(2, "0")}`;
    const snapshotRoot = path.join(root, snapshot);
    const expectedFiles = [];
    for (const file of await walkFiles(snapshotRoot)) {
      const relative = path.relative(snapshotRoot, file);
      const changed =
        isFinal ||
        !(await readFile(file)).equals(await readFile(path.join(root, previous, relative)));
      if (changed) expectedFiles.push(relative.split(path.sep).join("/"));
    }
    if (isFinal) {
      expectedFiles.push("CMakeLists.txt");
      for (const file of await walkFiles(path.join(root, "tests"))) {
        if (isCourseTextFile(file))
          expectedFiles.push(path.relative(root, file).split(path.sep).join("/"));
      }
    }
    const checkpointSource = html.match(
      /<section class="checkpoint-source"[^>]*>[\s\S]*?<\/section>/,
    )?.[0];
    assert.ok(checkpointSource, `Missing checkpoint source section: ${lesson.route}`);
    const displayedFiles = [
      ...checkpointSource.matchAll(
        /<details\b[^>]*class="source-file"[^>]*>\s*<summary>\s*<code>([^<]+)<\/code>/g,
      ),
    ].map((match) => match[1]);
    assert.ok(expectedFiles.length > 0, `No source to compare: ${lesson.route}`);
    assert.deepEqual(
      displayedFiles.sort(),
      expectedFiles.sort(),
      `Source list differs from ${snapshot}: ${lesson.route}`,
    );
    assert.match(
      html,
      isFinal ? /04 \/ TOÀN BỘ MÃ NGUỒN/ : /04 \/ SOURCE CỦA BÀI/,
      `Wrong source guide scope: ${lesson.route}`,
    );
    assert.match(
      html,
      /API và thuật ngữ của bài/i,
      `Missing lesson-specific references: ${lesson.file}`,
    );
    assert.match(
      html,
      /dự đoán điều sẽ xảy ra/i,
      `Missing experiment prediction protocol: ${lesson.file}`,
    );
    assert.match(html, /hoàn tác thay đổi/i, `Missing experiment restore step: ${lesson.file}`);
    assert.match(
      html.replace(/<[^>]*>/g, ""),
      /cmake --build build/i,
      `Missing build command: ${lesson.file}`,
    );
    for (const id of lessonSectionIds) {
      assert.ok(
        html.includes(`id="${id}"`),
        `Broken table-of-contents anchor #${id}: ${lesson.file}`,
      );
      assert.ok(
        html.includes(`href="#${id}"`),
        `Missing table-of-contents link #${id}: ${lesson.file}`,
      );
    }
  }
});

test("all authored internal links resolve and unpublished project pages stay unavailable", async () => {
  const lessons = await authoredLessons();
  const routes = [
    ...fixedRoutes,
    ...projectSlugs.map((slug) => `/projects/${slug}`),
    ...lessons.map((lesson) => lesson.route),
  ];
  const links = new Set();
  for (const route of routes) {
    const response = await render(route);
    assert.equal(response.status, 200, `Route failed while crawling: ${route}`);
    const html = await response.text();
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      if (match[1].startsWith("/")) links.add(match[1]);
    }
  }
  for (const href of links) {
    const [pathname, fragment] = href.split("#");
    if (pathname.startsWith("/downloads/")) {
      await stat(path.join(workspace, "public", pathname));
      continue;
    }
    const response = await render(pathname || "/");
    assert.equal(response.status, 200, `Broken internal link: ${href}`);
    if (fragment)
      assert.ok((await response.text()).includes(`id="${fragment}"`), `Broken fragment: ${href}`);
  }
  assert.equal((await render("/projects/project-09")).status, 404);
  assert.equal((await render("/projects/hello-pixels/not-a-lesson")).status, 404);
});

test("navigation and route data stay lazy instead of reloading the document", async () => {
  const navigation = await readFile(
    path.join(workspace, "components", "client-navigation.tsx"),
    "utf8",
  );
  assert.match(navigation, /router\.push\(destination\.href/);
  assert.match(navigation, /router\.prefetch\(destination\.href\)/);
  assert.match(navigation, /document\.addEventListener\("click"/);
  assert.match(navigation, /useRouter\(\)/);
  assert.doesNotMatch(navigation, /window\.next/);

  const progress = await readFile(path.join(workspace, "components", "progress.tsx"), "utf8");
  assert.match(progress, /simulation-path-progress-v2/);
  assert.match(progress, /simulation-path-progress-v1/);
  assert.match(progress, /generated\/progress\/loaders/);

  const progressLoaders = await readFile(
    path.join(workspace, "course", "generated", "progress", "loaders.ts"),
    "utf8",
  );
  assert.equal(
    (progressLoaders.match(/:\s*\(\) => import\(/g) ?? []).length,
    projectCatalog.length,
  );

  const search = await readFile(path.join(workspace, "components", "site-search.tsx"), "utf8");
  assert.match(search, /loadSearchOverviewItems/);
  assert.match(search, /loadSearchDetailItems/);
  assert.match(search, /Không tải được đầy đủ chỉ mục/);

  const registry = await readFile(path.join(workspace, "content", "registry.ts"), "utf8");
  assert.equal(
    (registry.match(/:\s*\(\) => import\("\.\/generated\/p\d{2}"\)/g) ?? []).length,
    projectCatalog.length,
  );
  assert.doesNotMatch(
    registry,
    /@\/content\//,
    "The root registry must not import every MDX lesson",
  );
  assert.doesNotMatch(registry, /^import Lesson\d+/m);
  for (const project of projectCatalog) {
    const projectRegistry = await readFile(
      path.join(workspace, "content", "generated", `p${project.id}.ts`),
      "utf8",
    );
    assert.equal(
      (projectRegistry.match(/:\s*\(\) => import\("@\/content\//g) ?? []).length,
      project.checkpointCount,
      `Project ${project.id} lesson registry is incomplete`,
    );
  }

  const sourceRegistry = await readFile(
    path.join(workspace, "lib", "generated-checkpoint-sources.ts"),
    "utf8",
  );
  assert.equal((sourceRegistry.match(/:\s*\(\) => import\(/g) ?? []).length, projectCatalog.length);
  assert.doesNotMatch(sourceRegistry, /\?raw/);

  const layout = await readFile(path.join(workspace, "app", "layout.tsx"), "utf8");
  assert.doesNotMatch(layout, /next\/headers|\bheaders\(\)/);
  assert.doesNotMatch(layout, /katex\/dist\/katex\.min\.css/);

  const lessonLayout = await readFile(
    path.join(workspace, "app", "projects", "[slug]", "[lesson]", "layout.tsx"),
    "utf8",
  );
  assert.match(lessonLayout, /katex\/dist\/katex\.min\.css/);

  const home = await (await render("/")).text();
  assert.match(home, /client-navigation-[^"']+\.js/);
  assert.doesNotMatch(
    home,
    /site-search-[^"']+\.js|interactive-lab-[^"']+\.js|source-file-[^"']+\.js/,
  );
});

test("each Canvas lab ships as an independent lazy client chunk", async () => {
  const registry = await readFile(
    path.join(workspace, "course", "generated", "lab-loaders.ts"),
    "utf8",
  );
  const labNames = projectCatalog.map((project) => project.demoId);
  for (const labName of labNames) {
    assert.ok(
      registry.includes(`lazy(() => import("@/components/labs/${labName}-lab"))`),
      `${labName} lab is not registered as a lazy import`,
    );
    await stat(path.join(workspace, "components", "labs", `${labName}-lab.tsx`));
  }
  assert.equal((registry.match(/lazy\(\(\) => import\(/g) ?? []).length, projectCatalog.length);

  const clientChunks = await readdir(
    path.join(workspace, "dist", "client", "_next", "static", "chunks"),
    { withFileTypes: true },
  );
  for (const labName of labNames) {
    const chunk = clientChunks.find(
      (entry) => entry.isFile() && entry.name.startsWith(`${labName}-lab-`),
    );
    assert.ok(chunk, `Production build has no separate ${labName} lab chunk`);
    const size = (
      await stat(path.join(workspace, "dist", "client", "_next", "static", "chunks", chunk.name))
    ).size;
    assert.ok(size < 24 * 1024, `${chunk.name} is unexpectedly large at ${size} bytes`);
  }
});

test("production search stays a small shell with bounded data shards", async () => {
  const chunkDirectory = path.join(workspace, "dist", "client", "_next", "static", "chunks");
  const chunks = await readdir(chunkDirectory, { withFileTypes: true });
  const searchShell = chunks.find(
    (entry) => entry.isFile() && entry.name.startsWith("site-search-"),
  );
  assert.ok(searchShell, "Production build has no lazy site-search chunk");
  assert.ok(
    (await stat(path.join(chunkDirectory, searchShell.name))).size < 8 * 1024,
    "The search UI pulled course metadata back into its shell chunk",
  );

  const dataShards = chunks.filter(
    (entry) => entry.isFile() && /^(?:glossary|lessons-|pages-|projects-)/.test(entry.name),
  );
  assert.ok(dataShards.some((entry) => entry.name.startsWith("lessons-")));
  assert.ok(dataShards.some((entry) => entry.name.startsWith("projects-")));
  for (const shard of dataShards) {
    const size = (await stat(path.join(chunkDirectory, shard.name))).size;
    assert.ok(size < 20 * 1024, `${shard.name} exceeded the search-shard budget at ${size} bytes`);
  }
});

test("production lesson responses remain compact and avoid a monolithic server chunk", async () => {
  let largestLesson = { route: "", bytes: 0 };
  for (const lesson of await authoredLessons()) {
    const html = await (await render(lesson.route)).text();
    const bytes = Buffer.byteLength(html);
    if (bytes > largestLesson.bytes) largestLesson = { route: lesson.route, bytes };
  }
  assert.ok(
    largestLesson.bytes < 300 * 1024,
    `${largestLesson.route} is the heaviest lesson response at ${largestLesson.bytes} bytes`,
  );

  const serverChunks = (
    await walkFiles(path.join(workspace, "dist", "server", "_next", "static"))
  ).filter((file) => file.endsWith(".js"));
  const sizes = await Promise.all(
    serverChunks.map(async (file) => ({ file, size: (await stat(file)).size })),
  );
  const largest = sizes.sort((left, right) => right.size - left.size)[0];
  assert.ok(
    largest.size < 200 * 1024,
    `${path.basename(largest.file)} is a monolithic ${largest.size}-byte server chunk`,
  );
});

test("production client no longer ships the incompatible next/link chunk", async () => {
  const files = await walkFiles(path.join(workspace, "dist"));
  assert.equal(files.filter((file) => /^link-.*\.js$/i.test(path.basename(file))).length, 0);
});
