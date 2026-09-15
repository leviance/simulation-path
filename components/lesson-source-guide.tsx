import type { LessonMeta, ProjectMeta } from "@/lib/course";
import type { LessonCodeGuide } from "@/course/learning/types";
import { getProjectSourceBundle, type ProjectSourceFile } from "@/lib/project-sources";
import { HighlightedCode } from "@/components/highlighted-code";
import { SourceFile } from "@/components/source-file";

type DiffLine = {
  kind: "same" | "add" | "remove";
  text: string;
  oldLine: number;
  newLine: number;
};

function diffLines(before: string, after: string): DiffLine[] {
  const splitLines = (source: string) => {
    const normalized = source.trimEnd();
    return normalized ? normalized.split("\n") : [];
  };
  const left = splitLines(before);
  const right = splitLines(after);
  type Operation = Pick<DiffLine, "kind" | "text">;
  const frontier = new Map<number, number>([[1, 0]]);
  const trace: Array<Map<number, number>> = [];
  let finalDistance = -1;
  const maximumDistance = Math.min(left.length + right.length, 2048);

  search: for (let distance = 0; distance <= maximumDistance; distance += 1) {
    trace.push(new Map(frontier));
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const moveDown =
        diagonal === -distance ||
        (diagonal !== distance &&
          (frontier.get(diagonal - 1) ?? -1) < (frontier.get(diagonal + 1) ?? -1));
      let x = moveDown ? (frontier.get(diagonal + 1) ?? 0) : (frontier.get(diagonal - 1) ?? 0) + 1;
      let y = x - diagonal;
      while (x < left.length && y < right.length && left[x] === right[y]) {
        x += 1;
        y += 1;
      }
      frontier.set(diagonal, x);
      if (x >= left.length && y >= right.length) {
        finalDistance = distance;
        break search;
      }
    }
  }

  let operations: Operation[] = [];
  if (finalDistance === -1) {
    operations = [
      ...left.map((text) => ({ kind: "remove" as const, text })),
      ...right.map((text) => ({ kind: "add" as const, text })),
    ];
  } else {
    let x = left.length;
    let y = right.length;
    for (let distance = finalDistance; distance >= 0; distance -= 1) {
      const previousFrontier = trace[distance];
      const diagonal = x - y;
      const moveDown =
        diagonal === -distance ||
        (diagonal !== distance &&
          (previousFrontier.get(diagonal - 1) ?? -1) < (previousFrontier.get(diagonal + 1) ?? -1));
      const previousDiagonal = moveDown ? diagonal + 1 : diagonal - 1;
      const previousX = previousFrontier.get(previousDiagonal) ?? 0;
      const previousY = previousX - previousDiagonal;

      while (x > previousX && y > previousY) {
        operations.push({ kind: "same", text: left[x - 1] });
        x -= 1;
        y -= 1;
      }
      if (distance === 0) break;
      if (x === previousX) {
        y -= 1;
        operations.push({ kind: "add", text: right[y] });
      } else {
        x -= 1;
        operations.push({ kind: "remove", text: left[x] });
      }
    }
    operations.reverse();
  }

  let oldLine = 1;
  let newLine = 1;
  return operations.map((operation) => {
    const line = { ...operation, oldLine, newLine };
    if (operation.kind !== "add") oldLine += 1;
    if (operation.kind !== "remove") newLine += 1;
    return line;
  });
}

function formatDiff(path: string, before: string, after: string) {
  const lines = diffLines(before, after);
  const changed = lines
    .map((line, index) => (line.kind === "same" ? -1 : index))
    .filter((index) => index >= 0);
  if (!changed.length) return "";

  const ranges: Array<[number, number]> = [];
  for (const index of changed) {
    const start = Math.max(0, index - 3);
    const end = Math.min(lines.length - 1, index + 3);
    const previous = ranges.at(-1);
    if (previous && start <= previous[1] + 1) {
      previous[1] = Math.max(previous[1], end);
    } else {
      ranges.push([start, end]);
    }
  }

  const chunks = ranges.map(([start, end]) => {
    const chunk = lines.slice(start, end + 1);
    const oldStart = chunk[0].oldLine;
    const newStart = chunk[0].newLine;
    const oldCount = chunk.filter((line) => line.kind !== "add").length;
    const newCount = chunk.filter((line) => line.kind !== "remove").length;
    return [
      `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
      ...chunk.map(
        (line) => `${line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " "}${line.text}`,
      ),
    ].join("\n");
  });

  return [`--- a/${path}`, `+++ b/${path}`, ...chunks].join("\n");
}

export async function LessonSourceGuide({
  project,
  lesson,
  guide,
}: {
  project: ProjectMeta;
  lesson: LessonMeta;
  guide: LessonCodeGuide;
}) {
  const isFinalLesson = lesson.order === project.lessons.length;
  const [bundle, previousBundle] = await Promise.all([
    getProjectSourceBundle(project.id, isFinalLesson ? "final" : lesson.order),
    getProjectSourceBundle(project.id, lesson.order === 1 ? "starter" : lesson.order - 1),
  ]);
  if (!bundle) return null;

  const checkpointTarget = `${bundle.targetPrefix}_checkpoint_${lesson.order}`;
  const finalTarget = `${bundle.targetPrefix}_final`;
  const files = isFinalLesson
    ? bundle.files
    : bundle.changedPaths
        .map((path) => bundle.files.find((file) => file.path === path))
        .filter((file): file is ProjectSourceFile => Boolean(file));
  const lessonDiffs = files.flatMap((file) => {
    const previousFile = previousBundle?.files.find((item) => item.path === file.path);
    const before = previousFile?.source ?? "";
    const diff = formatDiff(file.path, before, file.source);
    return diff ? [{ path: file.path, diff }] : [];
  });
  const commonFilesIntroducedHere =
    isFinalLesson && guide.files.some((path) => path.startsWith("tests/"));

  const checkpointCommands = [
    `cmake -S . -B build -DBUILD_CHECKPOINTS=ON`,
    `cmake --build build --config Debug --target ${checkpointTarget}`,
    `# Windows / Visual Studio`,
    `.\\build\\Debug\\${checkpointTarget}.exe`,
    `# macOS, Linux hoặc Ninja`,
    `./build/${checkpointTarget}`,
  ].join("\n");

  const finalCommands = [
    `cmake -S . -B build`,
    `cmake --build build --config Release`,
    `ctest --test-dir build -C Release --output-on-failure`,
    `# Windows / Visual Studio`,
    `.\\build\\Release\\${finalTarget}.exe`,
    `# macOS, Linux hoặc Ninja`,
    `./build/${finalTarget}`,
  ].join("\n");

  return (
    <section className="lesson-source-guide" aria-labelledby="ma-chay-duoc-sau-bai">
      <header>
        <span className="section-index">MÃ NGUỒN · BÀI {lesson.order}</span>
        <h2 id="ma-chay-duoc-sau-bai">Mã chạy được ở cuối bài {lesson.order}</h2>
        <p>
          Phần dưới đây được lấy từ đúng chương trình dùng để build checkpoint của bài. Hãy chạy
          code của bạn trước, sau đó mới đối chiếu phần thay đổi và những tệp vừa sửa. Hai bản không
          cần giống từng dòng nếu cùng cho kết quả đúng.
        </p>
      </header>

      <aside className="checkpoint-definition">
        <b>“Checkpoint” ở đây có nghĩa là gì?</b>
        <p>
          <code>{checkpointTarget}</code> là tên target của chương trình ở cuối bài {lesson.order}.
          Nó lấy source từ <code>checkpoints/{String(lesson.order).padStart(2, "0")}</code>, có thể
          build độc lập và không chứa code của các bài phía sau.
        </p>
      </aside>

      <div className="run-recipe">
        <div>
          <span>01 / CHẠY TRÊN MÁY CỦA BẠN</span>
          <h3>Build phiên bản của bài này</h3>
          <p>
            Mở terminal tại thư mục <code>{bundle.directory}</code> rồi chạy các lệnh theo thứ tự.
            Lần configure đầu cần mạng để CMake tải SDL 3.4.8.
          </p>
        </div>
        <HighlightedCode code={checkpointCommands} language="bash" />
      </div>

      <div className="expected-result">
        <b>Kết quả mong đợi</b>
        <p>{guide.expected}</p>
      </div>

      {(lessonDiffs.length > 0 || commonFilesIntroducedHere) && (
        <section className="checkpoint-diff" aria-labelledby="checkpoint-diff-title">
          <header>
            <span>02 / CODE ĐÃ THAY ĐỔI Ở ĐÂU?</span>
            <h3 id="checkpoint-diff-title">So với cuối bài trước</h3>
            <p>
              {lessonDiffs.length > 0 ? (
                <>
                  Dòng bắt đầu bằng <code>+</code> được thêm vào; dòng bắt đầu bằng <code>-</code>{" "}
                  đã bị bỏ hoặc thay thế. Bản so sánh này được tạo trực tiếp từ mã dùng để build nên
                  luôn khớp với gói ZIP.
                </>
              ) : (
                <>
                  Bài cuối bổ sung phần kiểm thử dùng chung trong <code>tests/</code>. Tệp này không
                  thuộc riêng một checkpoint, vì vậy toàn bộ nội dung được đặt ở phần mã nguồn hoàn
                  chỉnh thay vì lặp lại thành một diff dài.
                </>
              )}
            </p>
          </header>
          {lessonDiffs.map(({ path, diff }) => (
            <details key={path} open>
              <summary>
                <code>{path}</code>
              </summary>
              <HighlightedCode code={diff} language="diff" />
            </details>
          ))}
        </section>
      )}

      <section className="source-reading-route" aria-labelledby="source-reading-route-title">
        <header>
          <span>03 / LẦN THEO CODE</span>
          <h3 id="source-reading-route-title">Đọc ba phần này theo thứ tự</h3>
          <p>
            Tìm biến hoặc hàm được nhắc ở mỗi bước, xem dữ liệu đi vào từ đâu và kết quả được dùng ở
            chỗ nào. Cách đọc này dễ theo dõi hơn việc đi từ dòng đầu đến dòng cuối của{" "}
            <code>main.cpp</code>.
          </p>
        </header>
        <ol>
          {guide.steps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <b>{step.title}</b>
                <p>{step.explanation}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="checkpoint-source" aria-labelledby="checkpoint-source-title">
        <header>
          <span>{isFinalLesson ? "04 / TOÀN BỘ MÃ NGUỒN" : "04 / SOURCE CỦA BÀI"}</span>
          <h3 id="checkpoint-source-title">
            {isFinalLesson
              ? `Toàn bộ source của Project ${project.id}`
              : `Những tệp thay đổi trong bài ${lesson.order}`}
          </h3>
          <p>
            {isFinalLesson
              ? "Đây là toàn bộ mã dùng để build bản final, không có nhánh ẩn hay code phải ghép thêm từ bài khác."
              : "Danh sách này được sinh từ diff thật giữa hai checkpoint. Các tệp không đổi vẫn có trong gói ZIP và checkpoint, nhưng không lặp lại ở đây để bạn tập trung vào phần vừa học."}
          </p>
        </header>
        {files.map((file) => {
          const initiallyOpen =
            files.length === 1 || (lesson.order === 1 && file.path === "src/main.cpp");
          return (
            <SourceFile
              key={file.path}
              file={{ path: file.path, language: file.language }}
              projectId={bundle.projectId}
              checkpoint={bundle.checkpoint}
              lineCount={file.source.trimEnd().split("\n").length}
              initialSource={initiallyOpen ? file.source : undefined}
              open={initiallyOpen}
            />
          );
        })}
      </section>

      {isFinalLesson && (
        <section className="complete-project-source" aria-labelledby="ma-hoan-chinh-cua-project">
          <header>
            <span className="section-index">HOÀN THÀNH DỰ ÁN {project.id}</span>
            <h2 id="ma-hoan-chinh-cua-project">Toàn bộ mã nguồn của dự án</h2>
            <p>
              Các tệp bên trên là đủ để build dự án: CMake, chương trình SDL, phần thuật toán và
              tests. Gói ZIP còn có README ghi cách điều khiển. Bạn không cần ghép thêm bất kỳ đoạn
              mã nào từ bài khác.
            </p>
          </header>
          <div className="run-recipe final-recipe">
            <div>
              <span>BẢN HOÀN CHỈNH / BUILD, TEST, RUN</span>
              <h3>Kiểm tra lại toàn bộ dự án</h3>
              <p>
                Build bản final, chạy CTest, sau đó mở ứng dụng và làm lại checklist thủ công. Test
                tự động không thay thế được việc kiểm tra input và hình ảnh trên cửa sổ thật.
              </p>
            </div>
            <HighlightedCode code={finalCommands} language="bash" />
          </div>
          <a className="button button-primary" href={project.download} download>
            Tải ZIP Dự án {project.id} <b>↓</b>
          </a>
        </section>
      )}
    </section>
  );
}
