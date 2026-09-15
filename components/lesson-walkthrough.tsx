import type { LessonMeta, ProjectMeta } from "@/lib/course";
import type { LessonCodeGuide } from "@/course/learning/types";
import { getProjectChangedPaths, getProjectSourceBundle } from "@/lib/project-sources";
import { SourceFile } from "@/components/source-file";

export async function LessonWalkthrough({
  project,
  lesson,
  guide,
}: {
  project: ProjectMeta;
  lesson: LessonMeta;
  guide: LessonCodeGuide;
}) {
  const previous = project.lessons[lesson.order - 2];
  const startTarget = previous
    ? `project_${Number(project.id)}_checkpoint_${previous.order}`
    : `project_${Number(project.id)}_starter`;
  const [startingBundle, changedPaths] = await Promise.all([
    getProjectSourceBundle(project.id, previous ? previous.order : "starter"),
    getProjectChangedPaths(project.id, lesson.order),
  ]);
  const lessonFiles = new Set(changedPaths);
  const startingFiles =
    startingBundle?.files.filter(
      (file) =>
        !file.path.startsWith("tests/") &&
        (lessonFiles.has(file.path) || (!previous && file.path === "CMakeLists.txt")),
    ) ?? [];

  return (
    <section className="lesson-walkthrough" aria-labelledby="lesson-walkthrough-title">
      <header>
        <span className="section-index">TRƯỚC KHI VIẾT CODE</span>
        <h2 id="lesson-walkthrough-title">Bài này bắt đầu từ đâu và sẽ thêm gì?</h2>
        <p>{guide.focus}</p>
      </header>

      <div className="walkthrough-context">
        <article>
          <small>ĐIỂM XUẤT PHÁT</small>
          <b>
            {previous
              ? `Mã đã hoàn thành sau Bài ${previous.order}: ${previous.title}`
              : "Bộ khung starter của project"}
          </b>
          <p>
            Hãy build target <code>{startTarget}</code> một lần trước khi sửa. Nếu điểm xuất phát
            chưa chạy đúng, code mới sẽ chỉ làm việc tìm lỗi khó hơn.
          </p>
        </article>
        <article>
          <small>ĐÍCH CỦA BÀI</small>
          <b>Kết quả bạn phải nhìn thấy sau khi viết xong</b>
          <p>{guide.expected}</p>
        </article>
      </div>

      <div className="walkthrough-files" aria-label="Các tệp cần mở">
        <small>CÁC TỆP SẼ DÙNG</small>
        {changedPaths.length > 0 ? (
          <div>
            {changedPaths.map((file) => (
              <code key={file}>{file}</code>
            ))}
          </div>
        ) : (
          <p>Checkpoint này không đổi source; bài học tập trung chạy lại và kiểm chứng kết quả.</p>
        )}
      </div>

      <p className="walkthrough-reading-note">
        <b>Cách học hiệu quả:</b> chạy điểm xuất phát, đọc vấn đề rồi tự thử trước. Khi cần, mở đúng
        tệp được nhắc trong từng bước và build lại sau mỗi thay đổi có thể quan sát. Cuối bài có
        phần so sánh code cùng toàn bộ mã chạy được để bạn kiểm tra bài làm.
      </p>

      {startingFiles.length > 0 && (
        <section className="starting-source" aria-labelledby="starting-source-title">
          <header>
            <small>{previous ? `SOURCE SAU BÀI ${previous.order}` : "BỘ KHUNG KHỞI ĐẦU"}</small>
            <h3 id="starting-source-title">Mã mà bài này tiếp tục sử dụng</h3>
            <p>
              {previous
                ? "Đây là toàn bộ chương trình ở cuối bài trước. Các tệp được đóng sẵn để trang không quá dài; chỉ cần mở chúng khi bạn quên tên biến hoặc muốn xác nhận vị trí sẽ sửa."
                : "Đây là đúng bộ khung trong thư mục starter của gói ZIP. Không có helper ẩn hay phần code nào bạn phải tự đoán; hãy build nó trước rồi bắt đầu từ bước đầu tiên của bài."}
            </p>
          </header>
          {startingFiles.map((file) => (
            <SourceFile
              key={file.path}
              file={{ path: file.path, language: file.language }}
              projectId={startingBundle!.projectId}
              checkpoint={startingBundle!.checkpoint}
              lineCount={file.source.trimEnd().split("\n").length}
              open={false}
            />
          ))}
        </section>
      )}
    </section>
  );
}
