import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isCourseTextFile } from "../scripts/course-file-types.mjs";
import {
  workspace,
  projectCatalog,
  projectSlugs,
  publishedProjectDirectories,
  projectDirectoryBySlug,
  expectedLessonCount,
  render,
  authoredLessons,
  walkFiles,
  isTokenSubsequence,
} from "./site-support.mjs";

test("instructional C++ snippets stay aligned with the checkpoint they teach", async () => {
  const intentionalExperiments = new Set([
    "src/main.cpp — mốc tạm có thể build: SDL_FRect cố định",
    "src/main.cpp — mốc tạm có thể build: render player đứng yên",
    "src/main.cpp — mốc tạm có thể build: đọc WASD thành bool",
    "src/main.cpp — phép đo tạm trong MOUSE_MOTION",
    "src/main.cpp — chỉ dùng từng dòng cho thí nghiệm rồi xóa",
    "Ví dụ cố ý chưa đúng — đừng giữ lại trong bản cuối",
  ]);

  for (const lesson of await authoredLessons()) {
    const lessonNumber = Number.parseInt(lesson.file.slice(0, 2), 10);
    const projectDirectory = path.join(
      workspace,
      "examples",
      projectDirectoryBySlug.get(lesson.project),
    );
    const checkpointDirectory = path.join(
      projectDirectory,
      "checkpoints",
      String(lessonNumber).padStart(2, "0"),
    );
    const mdx = await readFile(
      path.join(workspace, "content", lesson.project, lesson.file),
      "utf8",
    );

    for (const match of mdx.matchAll(/```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g)) {
      const [, title, snippet] = match;
      if (intentionalExperiments.has(title)) continue;
      const relative = title.split(" — ")[0];
      assert.match(
        relative,
        /^(?:src|include|tests)\/.+\.(?:c|cc|cpp|cxx|h|hh|hpp|hxx|inl)$/,
        `${lesson.file} uses an untraceable C++ block title: ${title}`,
      );
      const sourcePath = relative.startsWith("tests/")
        ? path.join(projectDirectory, relative)
        : path.join(checkpointDirectory, relative);
      const source = await readFile(sourcePath, "utf8");
      assert.ok(
        isTokenSubsequence(snippet, source),
        `${lesson.file} drifts from checkpoint ${lessonNumber}: ${title}`,
      );
    }
  }
});

test("C++ validation remains active in both Debug and Release", async () => {
  for (const directory of publishedProjectDirectories) {
    const testsSource = await readFile(
      path.join(workspace, "examples", directory, "tests", "tests.cpp"),
      "utf8",
    );
    assert.doesNotMatch(
      testsSource,
      /#include\s*<cassert>|\bassert\s*\(/,
      `${directory} disables validation under NDEBUG`,
    );
    assert.match(
      testsSource,
      /void check\(bool condition, std::string_view label\)/,
      `${directory} has no explicit test runner`,
    );
    assert.match(
      testsSource,
      /if \(failures != 0\)[\s\S]*?return EXIT_FAILURE;/,
      `${directory} does not report failure to CTest`,
    );
    assert.match(
      testsSource,
      /return EXIT_SUCCESS;/,
      `${directory} does not report success to CTest`,
    );
  }

  const validationLessons = [
    ["hello-pixels", "06-validation.mdx"],
    ["wasd-fps-cap", "06-validation.mdx"],
    ["mini-paint", "06-validation.mdx"],
    ["tiny-2d-rasterizer", "06-benchmark-validation.mdx"],
    ["coordinate-map", "06-round-trip-test.mdx"],
    ["vector-playground", "06-normalize-lerp-validation.mdx"],
    ["unit-circle", "06-atan2-va-validation.mdx"],
    ["mouse-turret", "06-vung-khoa-va-validation.mdx"],
    ["square-transformer", "06-thu-tu-phep-bien-doi-va-validation.mdx"],
    ["3d-compass", "06-tam-giac-suy-bien-va-validation.mdx"],
    ["perspective-point", "06-diem-bay-va-validation.mdx"],
    ["rotating-triangle", "06-animation-va-validation.mdx"],
    ["wireframe-cube", "05-tuong-tac-va-validation.mdx"],
    ["fps-camera-room", "07-gioi-han-can-phong-va-validation.mdx"],
    ["3d-pipeline-inspector", "07-ghep-mvp-va-validation.mdx"],
    ["triangle-rasterizer", "07-barycentric-va-validation.mdx"],
    ["solid-cube-z-buffer", "07-kiem-chung-doc-lap-draw-order.mdx"],
    ["obj-mesh-viewer", "08-load-file-controls-va-validation.mdx"],
    ["projectile-cannon", "07-do-sai-so-va-nghiem-thu.mdx"],
    ["integrator-race", "07-stress-test-convergence-va-nghiem-thu.mdx"],
    ["collision-tank", "08-stress-test-bao-toan-va-nghiem-thu.mdx"],
    ["spring-chain", "08-do-energy-stress-test-va-nghiem-thu.mdx"],
    ["double-pendulum-chaos", "07-preset-tuong-tac-va-nghiem-thu.mdx"],
    ["brute-force-particle-query", "07-hoan-thien-kinh-lup-va-nghiem-thu.mdx"],
    ["spatial-grid-neighbor-query", "08-hoan-thien-spatial-grid-va-nghiem-thu.mdx"],
    ["visible-quadtree", "08-hoan-thien-visible-quadtree-va-nghiem-thu.mdx"],
    ["point-cloud-octree", "09-hoan-thien-point-cloud-octree.mdx"],
    ["memory-layout-race", "08-hoan-thien-memory-layout-race.mdx"],
    ["cpu-gpu-triangle", "09-hoan-thien-cpu-gpu-triangle.mdx"],
    ["dual-renderer-cube", "09-hoan-thien-dual-renderer-cube.mdx"],
    ["shader-hot-reload-lab", "08-hoan-thien-shader-hot-reload-lab.mdx"],
  ];
  for (const [project, file] of validationLessons) {
    const source = await readFile(path.join(workspace, "content", project, file), "utf8");
    assert.match(source, /ctest[^\r\n]+-C Debug/, `${file} does not teach Debug validation`);
    assert.match(source, /ctest[^\r\n]+-C Release/, `${file} does not teach Release validation`);
  }
});

test("every published project ends with complete runnable source", async () => {
  for (const project of projectSlugs) {
    const files = (await readdir(path.join(workspace, "content", project)))
      .filter((name) => name.endsWith(".mdx"))
      .sort();
    const response = await render(`/projects/${project}/${files.at(-1).slice(0, -4)}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Toàn bộ mã nguồn của dự án/i, `Missing final source: ${project}`);
    assert.match(
      html,
      /href="#ma-hoan-chinh-cua-project"/i,
      `Missing final source table-of-contents link: ${project}`,
    );
    const sourceDirectory = path.join(workspace, "examples", projectDirectoryBySlug.get(project));
    const templateFiles = await walkFiles(path.join(sourceDirectory, "source-template"));
    const sourcePaths = [
      "CMakeLists.txt",
      ...templateFiles.map((file) =>
        path.relative(path.join(sourceDirectory, "source-template"), file).replaceAll("\\", "/"),
      ),
      "tests/tests.cpp",
    ];
    for (const sourcePath of sourcePaths) {
      assert.ok(html.includes(sourcePath), `Final source is missing ${sourcePath}: ${project}`);
    }
    assert.match(
      html.replace(/<[^>]*>/g, ""),
      /ctest --test-dir build/i,
      `Missing final test command: ${project}`,
    );
    assert.match(html, /Tải ZIP Dự án/i, `Missing final ZIP download: ${project}`);
  }
  let guideCount = 0;
  for (const project of projectCatalog) {
    const learning = await readFile(
      path.join(workspace, "course", "projects", `p${project.id}`, "learning.ts"),
      "utf8",
    );
    guideCount += (learning.match(/^\s*"p\d{2}-l\d{2}": \{$/gm) ?? []).length;
  }
  assert.equal(guideCount, expectedLessonCount);

  const sourceGuide = await readFile(
    path.join(workspace, "components", "lesson-source-guide.tsx"),
    "utf8",
  );
  const finalRecipe = sourceGuide.match(/const finalCommands = \[([\s\S]*?)\]\.join/)?.[1] ?? "";
  assert.match(finalRecipe, /cmake --build build --config Release/);
  assert.doesNotMatch(
    finalRecipe,
    /--target/,
    "Final recipe builds the app but forgets the CTest executable",
  );
});

test("all instructional code blocks use One Dark syntax highlighting", async () => {
  const gettingStarted = await (await render("/getting-started")).text();
  assert.match(gettingStarted, /class="shiki one-dark-pro"/i);
  assert.match(gettingStarted, /background-color:#282c34/i);
  assert.match(gettingStarted, /color:#61afef/i);

  for (const lesson of await authoredLessons()) {
    const html = await (await render(lesson.route)).text();
    assert.doesNotMatch(
      html,
      /<pre(?:\s[^>]*)?>\s*<code>[^<]/i,
      `Unhighlighted code block: ${lesson.file}`,
    );
    assert.match(
      html,
      /data-theme="one-dark-pro"/i,
      `MDX code does not use One Dark: ${lesson.file}`,
    );
    assert.match(
      html,
      /class="shiki one-dark-pro"/i,
      `Generated source does not use One Dark: ${lesson.file}`,
    );
    assert.match(html, /background-color:#282c34/i, `Missing One Dark background: ${lesson.file}`);
    assert.match(
      html,
      /color:#(?:61afef|c678dd|98c379|e06c75|d19a66)/i,
      `Missing One Dark token colors: ${lesson.file}`,
    );
  }
});

test("C++ examples keep logical statements on one line and scroll horizontally", async () => {
  const clangFormat = await readFile(path.join(workspace, ".clang-format"), "utf8");
  assert.match(clangFormat, /^ColumnLimit:\s*0$/m);
  assert.match(clangFormat, /^IndentWidth:\s*4$/m);
  assert.match(clangFormat, /^UseTab:\s*Never$/m);

  const cssFiles = await walkFiles(path.join(workspace, "app", "styles"));
  const css = (await Promise.all(cssFiles.map((file) => readFile(file, "utf8")))).join("\n");
  assert.match(
    css,
    /\.prose pre,\s*\.highlighted-code pre\s*\{[^}]*overflow-x:\s*auto[^}]*white-space:\s*pre[^}]*word-break:\s*normal/,
  );
  assert.match(css, /\.prose pre,\s*\.highlighted-code pre\s*\{[^}]*tab-size:\s*4/);
  assert.match(
    css,
    /\.prose pre code,\s*\.highlighted-code pre code\s*\{[^}]*min-width:\s*max-content[^}]*white-space:\s*pre/,
  );
  assert.match(css, /\[data-rehype-pretty-code-title\]\s*\{[^}]*padding:\s*9px 22px/);

  const firstLesson = await readFile(
    path.join(workspace, "content", "hello-pixels", "01-cua-so-va-event-loop.mdx"),
    "utf8",
  );
  assert.match(firstLesson, /SDL_Renderer\* renderer = SDL_CreateRenderer\(window, nullptr\);/);

  for (const file of await walkFiles(path.join(workspace, "examples"))) {
    if (!/\.(?:cpp|hpp)$/.test(file) || file.includes(`${path.sep}build${path.sep}`)) continue;
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /SDL_Renderer\* renderer =\r?\n\s+SDL_CreateRenderer/,
      `${path.relative(workspace, file)} wraps the renderer assignment unnecessarily`,
    );
  }
});

test("teaching source favors explicit control flow over compressed expressions", async () => {
  const templateFiles = (await walkFiles(path.join(workspace, "examples"))).filter(
    (file) =>
      /source-template[\\/].*\.(?:cpp|hpp)$/.test(file) &&
      !file.includes(`${path.sep}_deps${path.sep}`),
  );
  for (const file of templateFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /\?[^\r\n:]+:/,
      `Teaching source uses a compressed ternary: ${file}`,
    );
    assert.doesNotMatch(
      source,
      /\]\s*\{[^\r\n]*;[^\r\n]*;/,
      `Teaching lambda compresses several statements onto one line: ${file}`,
    );
  }

  const projectTwoMain = await readFile(
    path.join(
      workspace,
      "examples",
      "project-02-wasd-fps-cap",
      "source-template",
      "src",
      "main.cpp",
    ),
    "utf8",
  );
  assert.doesNotMatch(projectTwoMain, /return\s+[^;]*(?:&&|\|\|)[^;]*;/);
  assert.doesNotMatch(projectTwoMain, /window\s*\?\s*SDL_CreateRenderer/);

  const miniPaintMain = await readFile(
    path.join(workspace, "examples", "project-03-mini-paint", "source-template", "src", "main.cpp"),
    "utf8",
  );
  assert.doesNotMatch(miniPaintMain, /auto\s+stamp\s*=|\bstamp\(/);

  const formatter = await readFile(
    path.join(workspace, "scripts", "format-course-code.mjs"),
    "utf8",
  );
  assert.doesNotMatch(formatter, /collapseContinuations/);
});

test("C++ lessons use four-space indentation and complete source is documented", async () => {
  const assertFourSpaceIndentation = (source, label) => {
    assert.doesNotMatch(source, /\t/, `${label} uses a tab instead of spaces`);
    for (const [index, line] of source.split(/\r?\n/).entries()) {
      const indentation = line.match(/^ +(?=\S)/)?.[0].length ?? 0;
      assert.equal(
        indentation % 4,
        0,
        `${label}:${index + 1} is indented by ${indentation} spaces`,
      );
    }
  };

  for (const lesson of await authoredLessons()) {
    const mdx = await readFile(
      path.join(workspace, "content", lesson.project, lesson.file),
      "utf8",
    );
    for (const match of mdx.matchAll(/```cpp title="[^"]+"\r?\n([\s\S]*?)\r?\n```/g)) {
      assertFourSpaceIndentation(match[1], lesson.file);
    }
  }

  for (const directory of publishedProjectDirectories) {
    const project = path.join(workspace, "examples", directory);
    const templateRoot = path.join(project, "source-template");
    const teachingFiles = (await walkFiles(templateRoot)).filter((file) =>
      /\.(?:c|cc|cpp|cxx|h|hh|hpp|hxx|inl)$/.test(file),
    );
    const testsSource = await readFile(path.join(project, "tests", "tests.cpp"), "utf8");
    const cmake = await readFile(path.join(project, "CMakeLists.txt"), "utf8");

    for (const file of teachingFiles) {
      const relative = path.relative(templateRoot, file);
      const source = await readFile(path.join(project, "final", relative), "utf8");
      assertFourSpaceIndentation(source, `${directory}/${relative}`);
      assert.match(source, /^\s*\/\/ /m, `${directory}/${relative} needs explanatory comments`);
      assert.ok(
        (source.match(/\r?\n\s*\r?\n/g) ?? []).length >= 2,
        `${directory}/${relative} needs blank lines between logical blocks`,
      );
    }
    for (const [label, source] of [["tests", testsSource]]) {
      assertFourSpaceIndentation(source, `${directory}/${label}`);
      assert.match(source, /^\s*\/\/ /m, `${directory}/${label} needs explanatory comments`);
      assert.ok(
        (source.match(/\r?\n\s*\r?\n/g) ?? []).length >= 2,
        `${directory}/${label} needs blank lines between logical blocks`,
      );
    }
    const finalMain = await readFile(path.join(project, "final", "src", "main.cpp"), "utf8");
    assert.match(
      finalMain,
      /\/\/ (?:Setup|Khởi tạo SDL)/,
      `${directory}/main needs a setup comment`,
    );
    assert.match(
      finalMain,
      /\/\/ (?:Cleanup|Giải phóng|Texture phụ thuộc)/,
      `${directory}/main needs a cleanup comment`,
    );
    assert.match(
      cmake,
      /COURSE_USE_INSTALLED_SDL3/,
      `${directory}/CMakeLists.txt cannot reuse the CI SDL package`,
    );
    assert.match(
      cmake,
      /find_package\(SDL3 3\.4\.8 EXACT CONFIG REQUIRED\)/,
      `${directory}/CMakeLists.txt does not enforce SDL 3.4.8 in CI`,
    );
    assert.match(
      cmake,
      /file\(GLOB_RECURSE lab_sources CONFIGURE_DEPENDS/,
      `${directory}/CMakeLists.txt does not discover every C++ source file`,
    );
    assert.match(
      cmake,
      /add_executable\(\$\{name\} \$\{lab_sources\}\)/,
      `${directory}/CMakeLists.txt does not compile the discovered source files`,
    );
    assert.match(cmake, /^# .+/m, `${directory}/CMakeLists.txt needs explanatory comments`);
    assertFourSpaceIndentation(cmake, `${directory}/CMakeLists.txt`);
  }
});

test("download packages are present and non-empty ZIP files", async () => {
  for (const project of projectCatalog) {
    const file = `${project.sourceDirectory}.zip`;
    const target = path.join(workspace, "public", "downloads", file);
    assert.ok((await stat(target)).size > 500, `${file} is unexpectedly small`);
    const signature = (await readFile(target)).subarray(0, 4);
    assert.deepEqual([...signature], [0x50, 0x4b, 0x03, 0x04], `${file} is not a ZIP archive`);
    const archiveDirectory = (await readFile(target)).toString("latin1");
    for (const member of [
      "starter/src/main.cpp",
      "checkpoints/01/src/main.cpp",
      `checkpoints/${String(project.checkpointCount).padStart(2, "0")}/src/main.cpp`,
      "final/src/main.cpp",
      "tests/tests.cpp",
      "CMakeLists.txt",
      "README.md",
    ]) {
      assert.ok(archiveDirectory.includes(member), `${file} is missing ${member}`);
    }
  }
  for (const project of projectCatalog) {
    const cmake = await readFile(
      path.join(workspace, "examples", project.sourceDirectory, "CMakeLists.txt"),
      "utf8",
    );
    assert.match(cmake, /SDL3-3\.4\.8\.tar\.gz/);
    assert.match(
      cmake,
      /URL_HASH SHA256=e9fff7467fb60f037e6708da18b25560649e4c63edc2a69bb871b960d9cbfbba/i,
    );
    assert.match(cmake, /target_link_libraries\([^\n]+SDL3::SDL3\)/);
    assert.match(cmake, /option\(BUILD_CHECKPOINTS/);
    assert.match(
      cmake,
      new RegExp(`enable_course_warnings\\(project_${Number(project.id)}_tests\\)`),
    );
  }
});

test("generated C++ snapshots are clean and progressive", async () => {
  for (const project of projectCatalog) {
    const directory = path.join(workspace, "examples", project.sourceDirectory);
    const templateRoot = path.join(directory, "source-template");
    const relativeFiles = (await walkFiles(templateRoot)).map((file) =>
      path.relative(templateRoot, file),
    );
    const checkpoints = Array.from(
      { length: project.checkpointCount },
      (_, index) => `checkpoints/${String(index + 1).padStart(2, "0")}`,
    );
    const snapshots = ["starter", "final", ...checkpoints];
    for (const snapshot of snapshots) {
      for (const relative of relativeFiles) {
        const source = await readFile(path.join(directory, snapshot, relative));
        if (!isCourseTextFile(relative)) continue;
        const text = source.toString("utf8");
        assert.doesNotMatch(
          text,
          /LAB_CHECKPOINT|if constexpr/,
          `${project.sourceDirectory}/${snapshot}/${relative} contains hidden lesson branches`,
        );
        assert.doesNotMatch(
          text,
          /[ \t]+$/m,
          `${project.sourceDirectory}/${snapshot}/${relative} contains trailing whitespace`,
        );
        assert.ok(
          text.endsWith("\n"),
          `${project.sourceDirectory}/${snapshot}/${relative} needs a final newline`,
        );
      }
    }
    // Một số project cũ kết thúc bằng lesson validation chỉ chạy lại source của checkpoint trước.
    // Các project có progression contract riêng vẫn kiểm tra cả checkpoint cuối ở bên dưới.
    const progression = ["starter", ...checkpoints.slice(0, -1)];
    let previous;
    for (const snapshot of progression) {
      const files = await Promise.all(
        relativeFiles.map((relative) => readFile(path.join(directory, snapshot, relative))),
      );
      const current = Buffer.concat(files.flatMap((file) => [file, Buffer.from([0])]));
      if (previous)
        assert.notDeepEqual(
          previous,
          current,
          `${project.sourceDirectory}/${snapshot} adds no code for its lesson`,
        );
      previous = current;
    }
    for (const relative of relativeFiles) {
      const lastCheckpoint = await readFile(path.join(directory, checkpoints.at(-1), relative));
      const final = await readFile(path.join(directory, "final", relative));
      assert.deepEqual(
        final,
        lastCheckpoint,
        `${project.sourceDirectory}/${relative} final must match its last lesson snapshot`,
      );
    }
  }
});

test("Project 39 introduces each taught algorithm in its own checkpoint", async () => {
  const projectDirectory = path.join(workspace, "examples", "project-39-gpu-reduction-prefix-sum");
  const introductions = [
    {
      checkpoint: 1,
      file: "include/reduction_math.hpp",
      symbols: [/enum class Operation/, /cpuReduction\(/, /cpuExclusiveScan\(/],
    },
    {
      checkpoint: 2,
      file: "include/reduction_math.hpp",
      symbols: [/ceilDiv\(/, /makeHierarchy\(/, /scanDispatchCount\(/],
    },
    {
      checkpoint: 3,
      file: "shaders/reduce.comp",
      symbols: [/shared float sharedValues\[512\]/, /sharedValues\[lane\] \+=/],
    },
    {
      checkpoint: 4,
      file: "include/reduction_gpu_engine.hpp",
      symbols: [/runReduction\(/, /passTrace_\.push_back/],
    },
    {
      checkpoint: 5,
      file: "shaders/scan_blocks.comp",
      symbols: [/shared float temporary\[512\]/, /temporary\[511\] = 0\.0/],
    },
    {
      checkpoint: 6,
      file: "include/reduction_gpu_engine.hpp",
      symbols: [/runBlockScans\(/, /Every block produced local prefixes/],
    },
    {
      checkpoint: 7,
      file: "shaders/uniform_add.comp",
      symbols: [/blockOffsets\[\]/, /scanOutput\[index\] \+= blockOffsets/],
    },
    {
      checkpoint: 8,
      file: "include/reduction_gpu_engine.hpp",
      symbols: [/barrierName\(/, /BUFFER_UPDATE -> readback consumer/],
    },
    {
      checkpoint: 9,
      file: "include/reduction_gpu_engine.hpp",
      symbols: [/class TimerQueryRing/, /medianGpuMilliseconds\(/],
    },
    {
      checkpoint: 10,
      file: "src/main.cpp",
      symbols: [/drawWorkbench\(/, /benchmarkSubmitted/, /rebuildWorkload/],
    },
  ];

  for (const introduction of introductions) {
    const checkpoint = String(introduction.checkpoint).padStart(2, "0");
    const previousDirectory =
      introduction.checkpoint === 1
        ? "starter"
        : `checkpoints/${String(introduction.checkpoint - 1).padStart(2, "0")}`;
    const currentDirectory = `checkpoints/${checkpoint}`;
    const previous = await readFile(
      path.join(projectDirectory, previousDirectory, introduction.file),
      "utf8",
    );
    const current = await readFile(
      path.join(projectDirectory, currentDirectory, introduction.file),
      "utf8",
    );

    for (const symbol of introduction.symbols) {
      assert.doesNotMatch(
        previous,
        symbol,
        `${introduction.file} teaches ${symbol} before checkpoint ${checkpoint}`,
      );
      assert.match(
        current,
        symbol,
        `${introduction.file} does not add ${symbol} at checkpoint ${checkpoint}`,
      );
    }
  }
});

test("Project 38 introduces each taught particle-system layer in its own checkpoint", async () => {
  const projectDirectory = path.join(
    workspace,
    "examples",
    "project-38-five-million-particle-fountain",
  );
  const introductions = [
    {
      checkpoint: 1,
      file: "include/particle_math.hpp",
      symbols: [/struct alignas\(16\) Particle/, /stepParticleCpu\(/],
    },
    {
      checkpoint: 2,
      file: "include/particle_math.hpp",
      symbols: [/random01\(/, /ageFraction/, /epochSeed/],
    },
    {
      checkpoint: 3,
      file: "include/particle_math.hpp",
      symbols: [/struct DispatchPlan/, /validateCapabilities\(/, /chooseLargestSupportedCount\(/],
    },
    {
      checkpoint: 4,
      file: "shaders/particle_update.comp",
      symbols: [/uniform float uDt/, /particle\.velocityLife\.y \+= uGravity \* uDt/],
    },
    {
      checkpoint: 5,
      file: "shaders/particle.vert",
      symbols: [/gl_VertexID/, /particles\[index\]/],
    },
    {
      checkpoint: 6,
      file: "include/particle_gpu_engine.hpp",
      symbols: [/GL_SHADER_STORAGE_BARRIER_BIT/, /Consumer kế tiếp là vertex shader/],
    },
    {
      checkpoint: 7,
      file: "include/particle_math.hpp",
      symbols: [/selectSimulationDt\(/, /singleStepRequested/],
    },
    {
      checkpoint: 8,
      file: "include/particle_gpu_engine.hpp",
      symbols: [/class TimerQueryRing/, /GL_QUERY_RESULT_AVAILABLE/],
    },
    {
      checkpoint: 9,
      file: "include/particle_gpu_engine.hpp",
      symbols: [/runProbeValidation\(/, /probeCount = 64U/],
    },
    {
      checkpoint: 10,
      file: "src/main.cpp",
      symbols: [/SDL_EVENT_WINDOW_FOCUS_LOST/, /Controls \| 1-4: particle preset/],
    },
  ];

  for (const introduction of introductions) {
    const checkpoint = String(introduction.checkpoint).padStart(2, "0");
    const previousDirectory =
      introduction.checkpoint === 1
        ? "starter"
        : `checkpoints/${String(introduction.checkpoint - 1).padStart(2, "0")}`;
    const currentDirectory = `checkpoints/${checkpoint}`;
    const previous = await readFile(
      path.join(projectDirectory, previousDirectory, introduction.file),
      "utf8",
    );
    const current = await readFile(
      path.join(projectDirectory, currentDirectory, introduction.file),
      "utf8",
    );

    for (const symbol of introduction.symbols) {
      assert.doesNotMatch(
        previous,
        symbol,
        `${introduction.file} teaches ${symbol} before checkpoint ${checkpoint}`,
      );
      assert.match(
        current,
        symbol,
        `${introduction.file} does not add ${symbol} at checkpoint ${checkpoint}`,
      );
    }
  }
});

test("Project 41 introduces potential, force and integration in separate checkpoints", async () => {
  const projectDirectory = path.join(workspace, "examples", "project-41-lennard-jones-pair");
  const introductions = [
    {
      checkpoint: 1,
      file: "include/lennard_jones.hpp",
      symbols: [/struct Atom/, /makeSymmetricPair\(/, /centerOfMass\(/],
    },
    {
      checkpoint: 2,
      file: "include/lennard_jones.hpp",
      symbols: [/struct LennardJonesParameters/, /samplePotential\(/, /equilibriumDistance\(/],
    },
    {
      checkpoint: 3,
      file: "include/lennard_jones.hpp",
      symbols: [/struct PairInteraction/, /evaluatePair\(/, /potentialSlope/],
    },
    {
      checkpoint: 4,
      file: "include/lennard_jones.hpp",
      symbols: [/struct PairForces/, /linearMomentum\(/, /centerOfMassVelocity\(/],
    },
    {
      checkpoint: 5,
      file: "include/lennard_jones.hpp",
      symbols: [/velocityVerletStep\(/, /planFixedSteps\(/, /struct FixedStepPlan/],
    },
    {
      checkpoint: 6,
      file: "include/lennard_jones.hpp",
      symbols: [/struct SystemMetrics/, /measureSystem\(/, /runSimulation\(/],
    },
    {
      checkpoint: 7,
      file: "include/lennard_jones.hpp",
      symbols: [/struct ValidationReport/, /validateModel\(/],
    },
  ];

  for (const introduction of introductions) {
    const checkpoint = String(introduction.checkpoint).padStart(2, "0");
    const previousDirectory =
      introduction.checkpoint === 1
        ? "starter"
        : `checkpoints/${String(introduction.checkpoint - 1).padStart(2, "0")}`;
    const currentDirectory = `checkpoints/${checkpoint}`;
    const previous = await readFile(
      path.join(projectDirectory, previousDirectory, introduction.file),
      "utf8",
    );
    const current = await readFile(
      path.join(projectDirectory, currentDirectory, introduction.file),
      "utf8",
    );
    for (const symbol of introduction.symbols) {
      assert.doesNotMatch(
        previous,
        symbol,
        `${introduction.file} teaches ${symbol} before checkpoint ${checkpoint}`,
      );
      assert.match(
        current,
        symbol,
        `${introduction.file} does not add ${symbol} at checkpoint ${checkpoint}`,
      );
    }
  }
});

test("Project 42 introduces every Molecular Dynamics layer in its own checkpoint", async () => {
  const projectDirectory = path.join(workspace, "examples", "project-42-molecular-dynamics-cpu");
  const introductions = [
    {
      checkpoint: 1,
      file: "include/molecular_dynamics.hpp",
      symbols: [/struct Particle/, /makeBoxForDensity\(/, /createLatticeParticles\(/],
    },
    {
      checkpoint: 2,
      file: "include/molecular_dynamics.hpp",
      symbols: [/kineticTemperature\(/, /assignThermalVelocities\(/, /makeMolecularSystem\(/],
    },
    {
      checkpoint: 3,
      file: "include/molecular_dynamics.hpp",
      symbols: [/struct PairSample/, /rawLennardJones\(/, /sampleForceShiftedPair\(/],
    },
    {
      checkpoint: 4,
      file: "include/molecular_dynamics.hpp",
      symbols: [/struct ForceEvaluation/, /unorderedPairCount\(/, /accumulatePairForces\(/],
    },
    {
      checkpoint: 5,
      file: "include/molecular_dynamics.hpp",
      symbols: [/reflectCoordinate\(/, /velocityVerletStep\(/, /planFixedSteps\(/],
    },
    {
      checkpoint: 6,
      file: "include/molecular_dynamics.hpp",
      symbols: [/struct SystemMetrics/, /measureSystem\(/, /relativeEnergyDrift\(/],
    },
    {
      checkpoint: 7,
      file: "include/molecular_dynamics.hpp",
      symbols: [/struct WorkEstimate/, /estimateAllPairsWork\(/, /runBoundedSimulation\(/],
    },
    {
      checkpoint: 8,
      file: "include/molecular_dynamics.hpp",
      symbols: [/struct ValidationReport/, /sameParticles\(/, /validateMolecularDynamics\(/],
    },
  ];

  for (const introduction of introductions) {
    const checkpoint = String(introduction.checkpoint).padStart(2, "0");
    const previousDirectory =
      introduction.checkpoint === 1
        ? "starter"
        : `checkpoints/${String(introduction.checkpoint - 1).padStart(2, "0")}`;
    const currentDirectory = `checkpoints/${checkpoint}`;
    const previous = await readFile(
      path.join(projectDirectory, previousDirectory, introduction.file),
      "utf8",
    );
    const current = await readFile(
      path.join(projectDirectory, currentDirectory, introduction.file),
      "utf8",
    );
    for (const symbol of introduction.symbols) {
      assert.doesNotMatch(
        previous,
        symbol,
        `${introduction.file} teaches ${symbol} before checkpoint ${checkpoint}`,
      );
      assert.match(
        current,
        symbol,
        `${introduction.file} does not add ${symbol} at checkpoint ${checkpoint}`,
      );
    }
  }
});

test("Project 36-42 source guides list only files changed by the current checkpoint", async () => {
  for (const project of projectCatalog.filter(({ id }) => Number(id) >= 36 && Number(id) <= 42)) {
    const projectDirectory = path.join(workspace, "examples", project.sourceDirectory);
    const templateRoot = path.join(projectDirectory, "source-template");
    const relativeFiles = (await walkFiles(templateRoot)).map((file) =>
      path.relative(templateRoot, file).replaceAll("\\", "/"),
    );
    const registry = await readFile(
      path.join(workspace, "lib", "generated-checkpoint-sources", `p${project.id}`, "registry.ts"),
      "utf8",
    );
    const serializedChanges = registry.match(
      /changedPaths:\s*(\{[\s\S]*?\})\s*,\s*snapshots:/,
    )?.[1];
    assert.ok(serializedChanges, `Project ${project.id} registry has no changedPaths metadata`);
    const changedPaths = JSON.parse(serializedChanges);

    let lastExpected = [];
    for (let checkpoint = 1; checkpoint <= project.checkpointCount; checkpoint += 1) {
      const previousDirectory =
        checkpoint === 1 ? "starter" : `checkpoints/${String(checkpoint - 1).padStart(2, "0")}`;
      const currentDirectory = `checkpoints/${String(checkpoint).padStart(2, "0")}`;
      const expected = [];
      for (const relative of relativeFiles) {
        const [before, after] = await Promise.all([
          readFile(path.join(projectDirectory, previousDirectory, relative)),
          readFile(path.join(projectDirectory, currentDirectory, relative)),
        ]);
        if (!before.equals(after)) expected.push(relative);
      }
      assert.deepEqual(
        [...changedPaths[String(checkpoint)]].sort(),
        [...expected].sort(),
        `Project ${project.id} checkpoint ${checkpoint} changedPaths drifted from source diff`,
      );
      lastExpected = expected;
    }
    assert.deepEqual(
      [...changedPaths.final].sort(),
      [...lastExpected].sort(),
      `Project ${project.id} final lesson must describe the last checkpoint changes`,
    );
  }

  const walkthrough = await readFile(
    path.join(workspace, "components", "lesson-walkthrough.tsx"),
    "utf8",
  );
  const sourceGuide = await readFile(
    path.join(workspace, "components", "lesson-source-guide.tsx"),
    "utf8",
  );
  assert.match(walkthrough, /getProjectChangedPaths\(project\.id, lesson\.order\)/);
  assert.doesNotMatch(walkthrough, /guide\.files\.map/);
  assert.match(sourceGuide, /bundle\.changedPaths/);
});
