import type { LessonMeta, ProjectMeta } from "@/lib/course";
import { getProjectRevision } from "@/lib/course";
import type { LessonCodeGuide } from "@/course/learning/types";
import { getProjectSourceBundle, type ProjectSourceFile } from "@/lib/project-sources";
import { HighlightedCode } from "@/components/highlighted-code";
import { SourceFile } from "@/components/source-file";
import { SourceDiff } from "@/components/source-diff";

import { diffLines } from "@/lib/diff-lines";
import { learnerBuild } from "@/lib/voxel-workbook";

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
  const learner = learnerBuild(project.id);
  const previousEdition = Boolean(getProjectRevision(project.id));
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
    `cmake -S . -B build-ref -DCMAKE_BUILD_TYPE=Release`,
    `cmake --build build-ref --config Release --parallel 1`,
    `ctest --test-dir build-ref -C Release -L reference --no-tests=error --output-on-failure`,
    `# Windows / Visual Studio`,
    `.\\build-ref\\Release\\${finalTarget}.exe`,
    `# macOS, Linux hoặc Ninja`,
    `./build-ref/${finalTarget}`,
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
          <span>01 / LỜI GIẢI ĐỂ ĐỐI CHIẾU</span>
          <h3>Chạy bản mẫu sau khi đã thử bài làm</h3>
          <p>
            Các lệnh dưới đây chạy checkpoint có sẵn trong ZIP, không chạy bản bạn đang sửa trong{" "}
            <code>{learner.tree}/</code>. Lần configure đầu cần mạng để CMake tải SDL 3.4.8.
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
            <SourceDiff key={`${bundle.sourceVersion}:${path}`} path={path} diff={diff} />
          ))}
        </section>
      )}

      <section className="source-reading-route" aria-labelledby="source-reading-route-title">
        <header>
          <span>03 / LẦN THEO CODE</span>
          <h3 id="source-reading-route-title">Đọc các phần này theo thứ tự</h3>
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
              key={`${bundle.projectId}:${bundle.checkpoint}:${bundle.sourceVersion}:${file.path}`}
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
            <span className="section-index">
              HOÀN THÀNH DỰ ÁN {project.id}
              {previousEdition ? " · BẢN CŨ" : ""}
            </span>
            <h2 id="ma-hoan-chinh-cua-project">Toàn bộ mã nguồn của dự án</h2>
            <p>
              Các tệp bên trên là đủ để build dự án: CMake, chương trình SDL, phần thuật toán và
              tests. Gói ZIP còn có README ghi cách điều khiển. Bạn không cần ghép thêm bất kỳ đoạn
              mã nào từ bài khác.
            </p>
          </header>
          <div className="run-recipe final-recipe">
            <div>
              <span>BÀI LÀM CỦA BẠN / CTEST</span>
              <h3>Kiểm tra mã bạn vừa viết</h3>
              <p>
                Target <code>{learner.check}</code> biên dịch bộ kiểm tra với{" "}
                <code>{learner.tree}/include</code> rồi mới chạy CTest. Nếu build lỗi, hãy sửa lỗi
                đầu tiên; kết quả từ lần chạy cũ không có giá trị. Sau khi test đạt, mở ứng dụng để
                thử chuột, bàn phím và hình ảnh.
              </p>
            </div>
            <HighlightedCode
              code={`cmake -S . -B ${learner.directory} ${learner.flags} -DCMAKE_BUILD_TYPE=Release\ncmake --build ${learner.directory} --config Release --target ${learner.check} --parallel 1`}
              language="bash"
            />
          </div>
          <details>
            <summary>Build và kiểm riêng lời giải trong final/</summary>
            <p>Thư mục build-ref dùng mã mẫu. CTest ở đây không chấm bài của bạn.</p>
            <HighlightedCode code={finalCommands} language="bash" />
          </details>
          <a className="button button-primary" href={project.download} download>
            Tải ZIP Dự án {project.id}
            {previousEdition ? " (bản cũ)" : ""} <b>↓</b>
          </a>
        </section>
      )}
    </section>
  );
}
