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
  assert.match(second, /drawScreenLine\(image, start, end, color\)/);

  const fifth = await readFile(path.join(directory, "06-scalar-va-distance.mdx"), "utf8");
  assert.match(fifth, /mode="vector-scalar-distance"/);
  assert.match(fifth, /return length\(end - start\)/);
  assert.match(fifth, /drawScreenLine\(image, endpointA, endpointB/);

  const unit = await readFile(path.join(directory, "07-vector-don-vi.mdx"), "utf8");
  assert.match(unit, /normalize\(0\)=0/);
  const final = await readFile(path.join(directory, "08-lerp-va-validation.mdx"), "utf8");
  assert.match(final, /Hàm này không tự clamp t/);
  assert.match(final, /có đủ CMake, main, header và tests/);
  assert.match(final, /subnormal\/gần DBL_MAX/);
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
  assert.match(first, /drawCircle/);

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
  assert.match(fourth, /lineBetween\(image, kCenter, cosinePoint, kCosine\)/);

  const fifth = await readFile(path.join(directory, "05-do-thi-sin-cos.mdx"), "utf8");
  assert.match(fifth, /appendWaveSample/);
  assert.match(fifth, /mapSampleTimeToX/);
  assert.match(fifth, /kVisibleHistorySeconds\s*=\s*6\.0/);
  assert.match(fifth, /nextSampleIndex/);

  const final = await readFile(path.join(directory, "07-hoan-thien-va-kiem-chung.mdx"), "utf8");
  assert.match(
    await readFile(path.join(directory, "06-keo-kim-voi-atan2.mdx"), "utf8"),
    /atan2\(y,x\)/i,
  );
  assert.match(final, /angleFromDirection\(lab::unitDirection\(original\)\)/);
  assert.match(final, /Project 08/);

  const model = await readFile(path.join(workspace, "lib/labs/unit-circle.ts"), "utf8");
  assert.match(model, /Math\.hypot\(screen\.x - endpoint\.x, screen\.y - endpoint\.y\) > 18/);
  assert.match(model, /nextSampleIndex \* sampleInterval/);
  assert.match(model, /samples: samples\.slice\(-maximumSamples\)/);
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
  assert.match(first, /tháp pháo ở giữa vùng vẽ/i);
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

  const final = await readFile(path.join(directory, "07-hoan-thien-va-kiem-chung.mdx"), "utf8");
  assert.match(
    await readFile(path.join(directory, "06-vung-nhin-va-bien.mdx"), "utf8"),
    /isWithinViewCone/,
  );
  assert.match(final, /projection plus rejection reconstructs vector/);
  assert.match(final, /Project 8 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "turret-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(labSource, /advanceTurret\(sceneRef\.current, deltaTime\)/);
  const model = await readFile(path.join(workspace, "lib/labs/turret-scene.ts"), "utf8");
  assert.match(model, /cosineBetween\(forward, target\)/);
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
  assert.match(shear, /scale→shear→rotate/i);
  assert.match(shear, /struct Mat2/);

  const matrix = await readFile(path.join(directory, "05-ma-tran-affine-3x3.mdx"), "utf8");
  assert.match(matrix, /struct Mat3/);
  assert.match(matrix, /inline Mat3 multiply/);
  assert.match(matrix, /transformPoint/);

  const final = await readFile(path.join(directory, "08-hoan-thien-va-kiem-chung.mdx"), "utf8");
  assert.match(final, /compose\/multiply/);
  assert.match(final, /signedArea/);
  assert.match(final, /CTest/);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "transform-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  const model = await readFile(path.join(workspace, "lib/labs/transform-scene.ts"), "utf8");
  assert.match(model, /composeTransform\(scene\.parameters,\s*scene\.order\)/);
  assert.match(model, /determinantLinearPart\(matrix\)/);
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
  assert.match(first, /projectPerspective/);
  assert.match(first, /worldToCamera/);
  assert.match(first, /drawAxes/);
  assert.match(first, /SDL_UpdateTexture/);

  const edges = await readFile(path.join(directory, "02-tam-giac-va-hai-vector-canh.mdx"), "utf8");
  assert.match(edges, /triangleEdges/);
  assert.match(edges, /A=P_1-P_0/);
  assert.match(edges, /B=P_2-P_0/);

  const cross = await readFile(path.join(directory, "03-cross-product-va-raw-normal.mdx"), "utf8");
  assert.match(cross, /inline Vec3 cross/);
  assert.match(cross, /dot\(N,A\).*dot\(N,B\)/is);

  const unit = await readFile(path.join(directory, "04-unit-normal-va-dien-tich.mdx"), "utf8");
  assert.match(unit, /triangleUnitNormal/);
  assert.match(unit, /triangleArea/);
  assert.match(unit, /normalHasDirection/);

  const winding = await readFile(
    path.join(directory, "05-winding-va-quy-tac-ban-tay-phai.mdx"),
    "utf8",
  );
  assert.match(winding, /reverseWinding/);
  assert.match(winding, /facingAmount/);

  const final = await readFile(path.join(directory, "07-suy-bien-va-kiem-chung.mdx"), "utf8");
  assert.match(final, /normalHasDirection/);
  assert.match(final, /orthogonalityError/);
  assert.match(final, /CTest/);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "normal-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  const model = await readFile(path.join(workspace, "lib/labs/normal-scene.ts"), "utf8");
  assert.match(model, /triangleRawNormal\(triangle\)/);
  assert.match(model, /isDegenerateTriangle\(triangle/);
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
  assert.match(visibility, /trước[^\n]*cameraToNdc/i);
  const projectionSource = await readFile(
    path.join(
      workspace,
      "examples",
      "project-11-perspective-point",
      "checkpoints",
      "05",
      "include",
      "lab.hpp",
    ),
    "utf8",
  );
  const functionStart = projectionSource.indexOf("inline ProjectionResult projectPerspective(");
  const divideAt = projectionSource.indexOf("const Vec2 ndc = cameraToNdc", functionStart);
  assert.ok(
    functionStart >= 0 && divideAt > functionStart,
    "Project 11 must perform its real perspective divide",
  );
  for (const guard of [
    "cameraPoint.z <= 0.0",
    "cameraPoint.z < lens.nearPlane",
    "cameraPoint.z > lens.farPlane",
  ]) {
    const guardAt = projectionSource.indexOf(guard, functionStart);
    assert.ok(
      guardAt > functionStart && guardAt < divideAt,
      "Project 11 must reject unsafe depth before perspective division: " + guard,
    );
    assert.match(
      projectionSource.slice(guardAt, projectionSource.indexOf("}", guardAt)),
      /return result;/,
    );
  }
  assert.match(visibility, /ProjectionStatus/);
  assert.match(visibility, /isInsideNdc/);

  const final = await readFile(path.join(directory, "08-hoan-thien-va-kiem-chung.mdx"), "utf8");
  assert.match(final, /screenToCameraAtDepth/);
  assert.match(final, /quỹ đạo/i);
  assert.match(final, /Project 11 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "projection-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(labSource, /pointDisplay\(/);
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

  const mouse = await readFile(path.join(directory, "06-keo-chuot-va-roll.mdx"), "utf8");
  assert.match(mouse, /applyMouseDrag/);
  assert.match(mouse, /SDL_CaptureMouse\(true\)/);
  assert.match(mouse, /SDL_CaptureMouse\(false\)/);

  const final = await readFile(path.join(directory, "08-hoan-thien-va-kiem-chung.mdx"), "utf8");
  assert.match(final, /inverseRotateEuler/);
  assert.match(final, /maximumEdgeLengthError/);
  assert.match(final, /Project 12 đã hoàn chỉnh/i);

  const labSource = await readFile(
    path.join(workspace, "components", "labs", "rotation3d-lab.tsx"),
    "utf8",
  );
  assert.match(labSource, /setPointerCapture\(event\.pointerId\)/);
  const scene = await readFile(path.join(workspace, "lib/labs/rotation3d-scene.ts"), "utf8");
  assert.match(scene, /position.z = 0\.7/);
  assert.match(labSource, /pointer capture/);
  assert.match(scene, /rotateTriangle3\(/);
  assert.match(scene, /maximumEdgeLengthError3\(/);
});

test("Project 02 checkpoints preserve drawing, movement and measured FPS progression", async () => {
  const root = path.join(workspace, "examples/project-02-wasd-fps-cap");
  const read = (file) => readFile(path.join(root, file), "utf8");
  const first = await read("checkpoints/01/src/main.cpp");
  const math1 = await read("checkpoints/01/include/lab.hpp");
  assert.match(first, /lab::fillRectangle/);
  assert.match(first, /SDL_GetKeyboardState/);
  assert.doesNotMatch(math1, /normalize|moveFrameBased|inline void update/);
  const second = await read("checkpoints/02/include/lab.hpp");
  assert.match(second, /return normalize\(direction\)/);
  assert.match(second, /position.x \+= velocity.x \/ 60.0/);
  for (const checkpoint of ["03", "04"]) {
    const main = await read("checkpoints/" + checkpoint + "/src/main.cpp");
    assert.match(main, /experimentDelayMs/);
    assert.match(main, /SDL_Delay\(static_cast<Uint32>\(experimentDelayMs\)\)/);
    assert.match(main, /lab::advanceMeasurement\(measurement, rawDt\)/);
    assert.match(main, /SDLK_B/);
  }
  const third = await read("checkpoints/03/include/measurement.hpp");
  assert.match(third, /moveFrameBased\(displacement/);
  const fourth = await read("checkpoints/04/include/measurement.hpp");
  assert.match(fourth, /update\(displacement/);
  assert.match(fourth, /measurement.discarded/);
  const fifth = await read("checkpoints/05/src/main.cpp");
  assert.doesNotMatch(fifth, /experimentDelayMs|moveFrameBased/);
  assert.match(fifth, /lab::remainingFrameNs/);
  assert.match(fifth, /SDLK_F1/);
  const validation = await read("tests/tests.cpp");
  assert.doesNotMatch(validation, /#include\s*<cassert>|\bassert\s*\(/);
  assert.match(validation, /negative dt is clamped to zero/);
  assert.match(validation, /directionFromKeys/);
  assert.match(validation, /return EXIT_FAILURE/);
});
