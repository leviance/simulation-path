import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

const learningSource = (projectId) =>
  readFile(path.join(workspace, "course", "projects", `p${projectId}`, "learning.ts"), "utf8");

test("Project 01 uses natural Vietnamese prose instead of translated template phrases", async () => {
  const unnaturalPhrases =
    /(?:khóa (?:các |những )?invariant|cổng (?:tạo|ghi) màu|tuyến dữ liệu|phần plumbing|công bố khung hình|đưa .{0,40} vào trạng thái đang chạy|Resize là một invariant|bơm event|cleanup đối xứng|tái tạo nguyên tử)/i;

  for (const file of (await readdir(path.join(workspace, "content", "hello-pixels"))).filter(
    (name) => name.endsWith(".mdx"),
  )) {
    const source = await readFile(path.join(workspace, "content", "hello-pixels", file), "utf8");
    const proseOnly = source.replace(/```[\s\S]*?```/g, "");
    assert.doesNotMatch(
      proseOnly,
      unnaturalPhrases,
      `${file} brings back translated-template phrasing`,
    );
  }

  assert.doesNotMatch(await learningSource("01"), unnaturalPhrases);
});

test("Project 02 uses natural Vietnamese prose instead of translated template phrases", async () => {
  const unnaturalPhrases =
    /(?:nối input vào chuyển động|chuỗi dữ liệu có đơn vị|một frame hoàn chỉnh đi qua bốn tầng|biến checkpoint .{0,20} thành một dụng cụ đo|source checkpoint|khóa hai biên|pipeline update|chính sách về nhịp render|frame budget|artificial delay|vector zero|normalize có guard|thay đúng một mắt xích|test runner nhỏ|test đi qua source thật)/i;

  for (const file of (await readdir(path.join(workspace, "content", "wasd-fps-cap"))).filter(
    (name) => name.endsWith(".mdx"),
  )) {
    const source = await readFile(path.join(workspace, "content", "wasd-fps-cap", file), "utf8");
    const proseOnly = source.replace(/```[\s\S]*?```/g, "");
    assert.doesNotMatch(
      proseOnly,
      unnaturalPhrases,
      `${file} brings back translated-template phrasing`,
    );
  }

  assert.doesNotMatch(await learningSource("02"), unnaturalPhrases);
});

test("Project 03 uses natural Vietnamese prose instead of translated template phrases", async () => {
  const unnaturalPhrases =
    /(?:state machine nhỏ|source starter|canvas CPU|cổng ghi|brush một pixel trước khi xử lý event|vòng đời (?:của )?stroke|bounding square|event flow|lát cắt chẩn đoán|nội suy stroke thành|khóa các input biên|test runner|final vẫn phân tầng|clear là fill|radius có miền hợp lệ|test endpoint|framebuffer integration)/i;

  for (const file of (await readdir(path.join(workspace, "content", "mini-paint"))).filter((name) =>
    name.endsWith(".mdx"),
  )) {
    const source = await readFile(path.join(workspace, "content", "mini-paint", file), "utf8");
    const proseOnly = source.replace(/```[\s\S]*?```/g, "");
    assert.doesNotMatch(
      proseOnly,
      unnaturalPhrases,
      `${file} brings back translated-template phrasing`,
    );
  }

  assert.doesNotMatch(await learningSource("03"), unnaturalPhrases);
});

test("Project 04 uses natural Vietnamese prose instead of translated template phrases", async () => {
  const unnaturalPhrases =
    /(?:cổng ghi pixel|major-axis step count|sample tham số|error term đo|formulation đối xứng|preset thay cho kéo|rectangle: chuẩn hóa góc|outline rectangle|filled rectangle từ|scanline inclusive|decision term nguyên|validation cần các invariant|khóa endpoints|test symmetry|dataset nằm ngoài vùng đo|warm-up và lặp|compiler không xóa việc|allocation vector)/i;

  for (const file of (await readdir(path.join(workspace, "content", "tiny-2d-rasterizer"))).filter(
    (name) => name.endsWith(".mdx"),
  )) {
    const source = await readFile(
      path.join(workspace, "content", "tiny-2d-rasterizer", file),
      "utf8",
    );
    const proseOnly = source.replace(/```[\s\S]*?```/g, "");
    assert.doesNotMatch(
      proseOnly,
      unnaturalPhrases,
      `${file} brings back translated-template phrasing`,
    );
  }

  assert.doesNotMatch(await learningSource("04"), unnaturalPhrases);
});

test("Project 05 uses natural Vietnamese prose instead of translated template phrases", async () => {
  const unnaturalPhrases =
    /(?:cổng ghi cạnh framebuffer|dữ liệu dùng cho cả hai space|scale bằng zero làm inverse transform|screen thủ công để kiểm chứng|forward transform gồm|camera-relative|hoàn tác center viewport|inverse phải hoàn tác|world bounds|sinh vertical grid line|theo dõi delta giữa hai motion sample|measure, change, compensate|đo drift|giữ anchor|khóa chặt hai chiều transform|test interaction như invariant|cursor anchor|hard-code quá nhiều pixel|independent resolution|physical pixel)/i;

  for (const file of (await readdir(path.join(workspace, "content", "coordinate-map"))).filter(
    (name) => name.endsWith(".mdx"),
  )) {
    const source = await readFile(path.join(workspace, "content", "coordinate-map", file), "utf8");
    const proseOnly = source.replace(/```[\s\S]*?```/g, "");
    assert.doesNotMatch(
      proseOnly,
      unnaturalPhrases,
      `${file} brings back translated-template phrasing`,
    );
  }

  assert.doesNotMatch(await learningSource("05"), unnaturalPhrases);
});

test("Project 06 teaches vector math through a concrete runnable progression", async () => {
  const unnaturalPhrases =
    /(?:vector data flow|magnitude pipeline|normalize guard|arrow head geometry layer|interaction state machine|parallelogram invariant lock|scalar control surface|lerp validation gate|screen-space hit testing bridge|bảng vector|thay điểm đánh dấu bằng hai đại lượng|phần đọc độ dài vẫn hữu hạn|giữ rõ ba trạng thái|đường đi của dữ liệu giờ rất rõ)/i;
  const directory = path.join(workspace, "content", "vector-playground");

  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    const proseOnly = source.replace(/```[\s\S]*?```/g, "");
    assert.doesNotMatch(proseOnly, unnaturalPhrases, `${file} uses translated-template phrasing`);
  }

  const first = await readFile(path.join(directory, "01-vec2-va-do-doi.mdx"), "utf8");
  assert.match(first, /Bộ khung đã có sẵn/i);
  assert.match(first, /drawBoard/);
  assert.match(first, /drawLine/);
  assert.match(first, /void drawScreenLine\(/);
  assert.match(first, /một mô phỏng mới: hai vector A và B cùng xuất phát từ gốc tọa độ/i);

  const manifest = await readFile(
    path.join(workspace, "course", "projects", "p06", "manifest.ts"),
    "utf8",
  );
  assert.match(
    manifest,
    /Tự xây dựng một mô phỏng 2D trong đó hai vector A và B có cùng gốc tọa độ/,
  );
  assert.doesNotMatch(manifest, /bảng vector/i);

  const second = await readFile(path.join(directory, "02-magnitude-va-arrow-head.mdx"), "utf8");
  assert.match(second, /void drawArrow\(/);
  assert.match(second, /drawScreenLine\(pixels, width, height, start, end, color\)/);

  const fifth = await readFile(path.join(directory, "05-scalar-va-distance.mdx"), "utf8");
  assert.match(fifth, /mode="vector-scalar-distance"/);
  assert.match(fifth, /const double distanceAB = lab::distance\(vectorA, vectorB\)/);
  assert.match(fifth, /drawScreenLine\(pixels, width, height, endpointA, endpointB/);

  const final = await readFile(path.join(directory, "06-normalize-lerp-validation.mdx"), "utf8");
  assert.match(final, /normalize\(0\)=0/);
  assert.match(final, /lerp\(A,B,t\)/);
  assert.match(final, /enum class ViewMode/);
  assert.match(final, /numeric_limits<double>::quiet_NaN/);
  assert.match(final, /Project 07/);
});

test("Project 07 connects radian, sin-cos, motion, graphs and atan2 in one progression", async () => {
  const directory = path.join(workspace, "content", "unit-circle");
  const unnaturalPhrases =
    /(?:angle pipeline|trigonometry data flow|projection layer|history buffer strategy|atan2 bridge|unit-circle mapping stage|phase control surface)/i;
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.doesNotMatch(
      source.replace(/```[\s\S]*?```/g, ""),
      unnaturalPhrases,
      `${file} uses translated-template phrasing`,
    );
  }

  const first = await readFile(path.join(directory, "01-radian-va-vong-tron-don-vi.mdx"), "utf8");
  assert.match(first, /Một radian là góc chắn một cung có độ dài đúng bằng bán kính/i);
  assert.match(first, /normalizeAngle/);
  assert.match(first, /drawCircleOutline/);

  const second = await readFile(path.join(directory, "02-sin-cos-thanh-toa-do.mdx"), "utf8");
  assert.match(second, /unitDirection/);
  assert.match(second, /pointOnCircle/);
  assert.match(second, /cos\^2|cos²/);

  const third = await readFile(path.join(directory, "03-van-toc-goc-va-delta-time.mdx"), "utf8");
  assert.match(third, /angularSpeed.*deltaTime/i);
  assert.match(third, /periodFromAngularSpeed/);

  const fourth = await readFile(path.join(directory, "04-hinh-chieu-len-hai-truc.mdx"), "utf8");
  assert.match(fourth, /projectOntoXAxis/);
  assert.match(fourth, /vector thành phần.*đường dóng/is);
  assert.match(fourth, /centerX, centerY, cosineX, centerY/);

  const fifth = await readFile(path.join(directory, "05-do-thi-sin-cos.mdx"), "utf8");
  assert.match(fifth, /appendWaveSample/);
  assert.match(fifth, /mapSampleTimeToX/);
  assert.match(fifth, /kVisibleHistorySeconds = 6\.0/);
  assert.match(fifth, /sampleAccumulator/);

  const final = await readFile(path.join(directory, "06-atan2-va-validation.mdx"), "utf8");
  assert.match(final, /atan2\(y,x\)/i);
  assert.match(final, /angleFromDirection\(lab::unitDirection\(original\)\)/);
  assert.match(final, /Project 08/);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "angle-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /Math\.hypot\(point\.x - endpoint\.x, point\.y - endpoint\.y\) > 18/);
  assert.match(labSource, /mapSampleTimeToX\(sample\.time, newestTime, visibleHistorySeconds/);
  assert.doesNotMatch(labSource, /const sampleAngle = TAU \* index/);
});

test("Project 08 builds a visible turret before teaching dot, projection and rotation", async () => {
  const directory = path.join(workspace, "content", "mouse-turret");
  const unnaturalPhrases =
    /(?:dot product pipeline|projection layer|rotation gate|view cone control surface|alignment data flow|turret state machine bridge)/i;
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.doesNotMatch(
      source.replace(/```[\s\S]*?```/g, ""),
      unnaturalPhrases,
      `${file} uses translated-template phrasing`,
    );
  }

  const first = await readFile(
    path.join(directory, "01-bo-khung-thap-phao-va-muc-tieu.mdx"),
    "utf8",
  );
  assert.match(first, /tháp pháo ở giữa cửa sổ/i);
  assert.match(first, /SDL_EVENT_MOUSE_MOTION/);
  assert.match(first, /drawTarget/);

  const second = await readFile(
    path.join(directory, "02-dot-product-do-muc-do-cung-huong.mdx"),
    "utf8",
  );
  assert.match(second, /raw dot.*normalized dot/is);
  assert.match(second, /inline double dot/);

  const third = await readFile(path.join(directory, "03-tu-dot-product-den-goc.mdx"), "utf8");
  assert.match(third, /clampCosine/);
  assert.match(third, /std::acos/);

  const fourth = await readFile(path.join(directory, "04-projection-va-do-lech.mdx"), "utf8");
  assert.match(fourth, /vectorProjection/);
  assert.match(fourth, /projection \+ rejection/);

  const fifth = await readFile(path.join(directory, "05-quay-ve-phia-muc-tieu.mdx"), "utf8");
  assert.match(fifth, /crossZ/);
  assert.match(fifth, /turnSpeed \* deltaTime/);
  assert.match(fifth, /rotateTowards/);

  const final = await readFile(path.join(directory, "06-vung-khoa-va-validation.mdx"), "utf8");
  assert.match(final, /isWithinViewCone/);
  assert.match(final, /projection plus rejection reconstructs vector/);
  assert.match(final, /Project 8 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "turret-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(
    labSource,
    /rotateTowards\(turretAngleRef\.current, target, turnSpeed \* deltaTime\)/,
  );
  assert.match(labSource, /cosineBetween\(forward, target\)/);
});

test("Project 09 teaches direct transforms before matrix composition and order", async () => {
  const directory = path.join(workspace, "content", "square-transformer");
  const unnaturalPhrases =
    /(?:transform pipeline|matrix layer|composition gate|shear control surface|local-space data flow|determinant validation bridge)/i;
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.doesNotMatch(
      source.replace(/```[\s\S]*?```/g, ""),
      unnaturalPhrases,
      `${file} uses translated-template phrasing`,
    );
  }

  const first = await readFile(path.join(directory, "01-hinh-vuong-trong-local-space.mdx"), "utf8");
  assert.match(first, /local space/i);
  assert.match(first, /makeSquare/);
  assert.match(first, /drawSquare/);
  assert.match(first, /SDL_UpdateTexture/);

  const scale = await readFile(path.join(directory, "02-scale-theo-hai-truc.mdx"), "utf8");
  assert.match(scale, /scalePoint/);
  assert.match(scale, /scale âm.*phản chiếu/is);

  const rotation = await readFile(path.join(directory, "03-xoay-bang-sin-cos.mdx"), "utf8");
  assert.match(rotation, /rotatePoint/);
  assert.match(rotation, /cosine \* point\.x - sine \* point\.y/);

  const shear = await readFile(path.join(directory, "04-shear-va-he-truc-bi-xien.mdx"), "utf8");
  assert.match(shear, /shearPoint/);
  assert.match(shear, /Scale → Shear → Rotate/);

  const matrix = await readFile(path.join(directory, "05-ma-tran-affine-3x3.mdx"), "utf8");
  assert.match(matrix, /struct Mat3/);
  assert.match(matrix, /inline Mat3 multiply/);
  assert.match(matrix, /transformPoint/);

  const final = await readFile(
    path.join(directory, "06-thu-tu-phep-bien-doi-va-validation.mdx"),
    "utf8",
  );
  assert.match(final, /composeTransform/);
  assert.match(final, /absolute determinant matches area ratio/);
  assert.match(final, /Project 09 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "transform-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(labSource, /composeTransform\(parameters/);
  assert.match(labSource, /determinantLinearPart\(matrix\)/);
});

test("Project 10 builds a visible 3D compass before triangle normals", async () => {
  const directory = path.join(workspace, "content", "3d-compass");
  const unnaturalPhrases =
    /(?:normal pipeline|cross product layer|winding gate|degenerate control surface|Vec3 data flow|orthogonality validation bridge|raw normal stage)/i;
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.doesNotMatch(
      source.replace(/```[\s\S]*?```/g, ""),
      unnaturalPhrases,
      `${file} uses translated-template phrasing`,
    );
  }

  const first = await readFile(path.join(directory, "01-vec3-va-la-ban-ba-truc.mdx"), "utf8");
  assert.match(first, /Bộ khung.*framebuffer.*drawLine/is);
  assert.match(first, /struct Vec3/);
  assert.match(first, /projectIsometric/);
  assert.match(first, /drawAxes/);
  assert.match(first, /SDL_UpdateTexture/);

  const edges = await readFile(path.join(directory, "02-tam-giac-va-hai-vector-canh.mdx"), "utf8");
  assert.match(edges, /triangleEdges/);
  assert.match(edges, /B−A/);
  assert.match(edges, /C−A/);

  const cross = await readFile(path.join(directory, "03-cross-product-va-raw-normal.mdx"), "utf8");
  assert.match(cross, /inline Vec3 cross/);
  assert.match(cross, /N.*AB.*N.*AC/is);

  const unit = await readFile(path.join(directory, "04-unit-normal-va-dien-tich.mdx"), "utf8");
  assert.match(unit, /triangleUnitNormal/);
  assert.match(unit, /triangleArea/);
  assert.match(unit, /length <= epsilon/);

  const winding = await readFile(
    path.join(directory, "05-winding-va-quy-tac-ban-tay-phai.mdx"),
    "utf8",
  );
  assert.match(winding, /reverseWinding/);
  assert.match(winding, /facingAmount/);

  const final = await readFile(
    path.join(directory, "06-tam-giac-suy-bien-va-validation.mdx"),
    "utf8",
  );
  assert.match(final, /isDegenerate/);
  assert.match(final, /orthogonalityError/);
  assert.match(final, /Project 10 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "normal-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(labSource, /triangleRawNormal\(triangle\)/);
  assert.match(labSource, /isDegenerateTriangle\(triangle/);
});

test("Project 11 derives perspective from a visible point before adding visibility guards", async () => {
  const directory = path.join(workspace, "content", "perspective-point");
  const unnaturalPhrases =
    /(?:projection layer|perspective gate|visibility control surface|camera-space data flow|frustum validation bridge)/i;
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.doesNotMatch(
      source.replace(/```[\s\S]*?```/g, ""),
      unnaturalPhrases,
      `${file} uses translated-template phrasing`,
    );
  }

  const first = await readFile(
    path.join(directory, "01-diem-3d-va-marker-tren-framebuffer.mdx"),
    "utf8",
  );
  assert.match(first, /Starter.*framebuffer/is);
  assert.match(first, /struct Vec3/);
  assert.match(first, /drawPointMarker/);
  assert.match(first, /SDL_UpdateTexture/);
  assert.match(first, /không phải perspective projection/i);

  const camera = await readFile(
    path.join(directory, "02-tu-world-space-sang-camera-space.mdx"),
    "utf8",
  );
  assert.match(camera, /worldToCamera/);
  assert.match(camera, /worldPoint.*camera\.position/is);

  const divide = await readFile(path.join(directory, "03-perspective-divide.mdx"), "utf8");
  assert.match(divide, /tam giác đồng dạng/i);
  assert.match(divide, /perspectiveDivide/);
  assert.match(divide, /cameraPoint\.x \/ cameraPoint\.z/);

  const fov = await readFile(path.join(directory, "04-fov-aspect-ndc-va-pixel.mdx"), "utf8");
  assert.match(fov, /verticalFocalScale/);
  assert.match(fov, /cameraToNdc/);
  assert.match(fov, /ndcToScreen/);

  const visibility = await readFile(
    path.join(directory, "05-near-plane-va-view-frustum.mdx"),
    "utf8",
  );
  assert.ok(
    visibility.indexOf("cameraPoint.z <= 0.0") < visibility.indexOf("cameraToNdc"),
    "Project 11 must reject unsafe depth before perspective division",
  );
  assert.match(visibility, /ProjectionStatus/);
  assert.match(visibility, /isInsideNdc/);

  const final = await readFile(path.join(directory, "06-diem-bay-va-validation.mdx"), "utf8");
  assert.match(final, /screenToCameraAtDepth/);
  assert.match(final, /advanceFlightTime/);
  assert.match(final, /Project 11 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "projection-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(labSource, /projectPerspective\(/);
  assert.match(labSource, /screenToCameraAtDepth\(/);
});

test("Project 12 draws a projected triangle before deriving rotation and mouse control", async () => {
  const directory = path.join(workspace, "content", "rotating-triangle");
  const unnaturalPhrases =
    /(?:rotation layer|Euler gate|pivot control surface|mouse-orientation data flow|edge validation bridge)/i;
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.doesNotMatch(
      source.replace(/```[\s\S]*?```/g, ""),
      unnaturalPhrases,
      `${file} uses translated-template phrasing`,
    );
  }

  const first = await readFile(
    path.join(directory, "01-noi-ba-diem-thanh-tam-giac-3d.mdx"),
    "utf8",
  );
  assert.match(first, /Starter.*framebuffer.*putPixel.*drawLine/is);
  assert.match(first, /struct Triangle3/);
  assert.match(first, /projectTriangle/);
  assert.match(first, /drawProjectedTriangle/);
  assert.match(first, /SDL_UpdateTexture/);

  const pivot = await readFile(path.join(directory, "02-pivot-va-local-space.mdx"), "utf8");
  assert.match(pivot, /triangleCentroid/);
  assert.match(pivot, /toLocalTriangle/);
  assert.match(pivot, /translateTriangle/);

  const rotateX = await readFile(path.join(directory, "03-rotation-quanh-truc-x.mdx"), "utf8");
  assert.match(rotateX, /inline Vec3 rotateX/);
  assert.match(rotateX, /cosine \* point\.y - sine \* point\.z/);
  assert.match(rotateX, /localTriangle.*rotateTriangleX.*translate/is);

  const euler = await readFile(path.join(directory, "04-pitch-yaw-roll-va-thu-tu.mdx"), "utf8");
  assert.match(euler, /struct EulerAngles/);
  assert.match(euler, /RotationOrder/);
  assert.match(euler, /rotateEuler/);

  const mouse = await readFile(path.join(directory, "05-keo-chuot-de-xoay.mdx"), "utf8");
  assert.match(mouse, /applyMouseDrag/);
  assert.match(mouse, /SDL_CaptureMouse\(true\)/);
  assert.match(mouse, /SDL_CaptureMouse\(false\)/);

  const final = await readFile(path.join(directory, "06-animation-va-validation.mdx"), "utf8");
  assert.match(final, /inverseRotateEuler/);
  assert.match(final, /maximumEdgeLengthError/);
  assert.match(final, /Project 12 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "rotation3d-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(labSource, /z: 0\.7/);
  assert.match(labSource, /formatProjection\(vertex\)/);
  assert.match(labSource, /pointer capture/);
  assert.match(labSource, /rotateTriangle3\(/);
  assert.match(labSource, /maximumEdgeLengthError3\(/);
});

test("Project 02 checkpoints and validation preserve the lesson experiment", async () => {
  const project = path.join(workspace, "examples", "project-02-wasd-fps-cap");
  const templateHeader = await readFile(
    path.join(project, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const validation = await readFile(path.join(project, "tests", "tests.cpp"), "utf8");
  const checkpointThree = await readFile(
    path.join(project, "checkpoints", "03", "src", "main.cpp"),
    "utf8",
  );
  const checkpointFour = await readFile(
    path.join(project, "checkpoints", "04", "src", "main.cpp"),
    "utf8",
  );
  const checkpointFive = await readFile(
    path.join(project, "checkpoints", "05", "src", "main.cpp"),
    "utf8",
  );
  const firstLesson = await readFile(
    path.join(workspace, "content", "wasd-fps-cap", "01-keyboard-state.mdx"),
    "utf8",
  );

  assert.match(
    templateHeader,
    /for \(double dt : timeSteps\) \{\s*update\(position, velocity, dt\);/,
  );
  assert.doesNotMatch(validation, /#include\s*<cassert>|\bassert\s*\(/);
  assert.match(validation, /return EXIT_FAILURE;/);
  assert.match(validation, /negative dt is clamped to zero/);

  for (const [name, source] of [
    ["checkpoint 03", checkpointThree],
    ["checkpoint 04", checkpointFour],
  ]) {
    assert.match(source, /experimentDelayMs/, `${name} lost its repeatable delay preset`);
    assert.match(source, /experimentDistance/, `${name} lost its one-second distance measurement`);
    assert.match(
      source,
      /SDL_Delay\(Uint32\(experimentDelayMs\)\)/,
      `${name} no longer changes the observed frame rate`,
    );
  }
  assert.match(checkpointThree, /position \+= velocity \* \(1\.0 \/ 60\.0\)/);
  assert.match(checkpointFour, /lab::update\(position, velocity, dt\)/);
  assert.doesNotMatch(checkpointFive, /experimentDelayMs|experimentRunning/);
  assert.match(checkpointFive, /targetFrameDurationNs|SDL_DelayNS/);

  assert.match(firstLesson, /#include "lab\.hpp"/);
  assert.match(firstLesson, /mốc tạm có thể build/);
});
