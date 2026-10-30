import type { Metadata } from "next";
import Link from "@/components/app-link";
import { currentProjects, revisedProjects } from "@/lib/course";
import type { PublishedProjectSummary } from "@/lib/course";

export const metadata: Metadata = {
  title: "Tải mã nguồn",
  description:
    "Starter, checkpoint, bản hoàn chỉnh và tests; các gói bản cũ được tách riêng khi project đã đổi đề bài.",
};

function DownloadCard({
  project,
  previous = false,
}: {
  project: PublishedProjectSummary;
  previous?: boolean;
}) {
  return (
    <article>
      <span>P{project.id}</span>
      <div>
        {previous && <span className="revision-badge">BẢN CŨ</span>}
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        {previous && (
          <p className="previous-download-note">
            Gói này chưa triển khai đề bài mới.{" "}
            <Link href={`/roadmap/${project.id}`}>Xem phạm vi mới →</Link>
          </p>
        )}
        <ul>
          <li>starter để tự viết</li>
          <li>{project.lessonCount} checkpoint độc lập</li>
          <li>final + CTest + README</li>
        </ul>
      </div>
      <a
        className={`button ${previous ? "button-secondary" : "button-primary"}`}
        href={project.download}
        download
      >
        {previous ? "Tải ZIP bản cũ" : "Tải ZIP"} <b>↓</b>
      </a>
    </article>
  );
}

export default function DownloadsPage() {
  return (
    <main className="shell page-wrap">
      <header className="page-hero compact">
        <span className="eyebrow">
          <i /> MÃ NGUỒN
        </span>
        <h1>
          Mỗi project là một gói
          <br />
          có thể build độc lập.
        </h1>
        <p>
          Chọn project bạn đang học, tải ZIP rồi giải nén. Mỗi gói chứa bản để bạn tự viết, mã tham
          khảo sau từng bài, bản hoàn chỉnh và tests. SDL 3.4.8 sẽ được CMake tải ở lần configure
          đầu tiên.
        </p>
      </header>

      <section className="download-intro" aria-labelledby="download-workflow-title">
        <header>
          <span className="section-index">TRƯỚC KHI TẢI</span>
          <h2 id="download-workflow-title">Bạn sẽ dùng các bản source như thế nào?</h2>
        </header>
        <ol>
          <li>
            <b>Viết trong starter</b>
            <span>Đây là bản làm bài của bạn. Build lại cùng một target sau mỗi thay đổi.</span>
          </li>
          <li>
            <b>Đối chiếu checkpoint</b>
            <span>Chỉ mở checkpoint sau khi đã thử tự sửa; mỗi bản ứng với đúng cuối một bài.</span>
          </li>
          <li>
            <b>Kiểm tra bằng final và tests</b>
            <span>
              Dùng bản hoàn chỉnh để rà kết quả, không dùng nó thay cho quá trình tự viết.
            </span>
          </li>
        </ol>
        <p>
          Chưa cài compiler hoặc chưa quen CMake?{" "}
          <Link href="/getting-started">Làm theo hướng dẫn chuẩn bị môi trường trước →</Link>
        </p>
      </section>

      <section aria-labelledby="current-downloads-title">
        <h2 id="current-downloads-title">
          Gói mã nguồn cho hướng dẫn hiện tại ({currentProjects.length})
        </h2>
        <div className="download-grid">
          {currentProjects.map((project) => (
            <DownloadCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      {revisedProjects.length > 0 && (
        <section
          className="previous-downloads"
          id="previous-editions"
          aria-labelledby="previous-downloads-title"
        >
          <h2 id="previous-downloads-title">Gói tham khảo bản cũ ({revisedProjects.length})</h2>
          <p>
            Các project này đã đổi đề bài. ZIP dưới đây vẫn chứa sản phẩm cũ, không phải source cho
            sản phẩm mới trên roadmap. ZIP mới chỉ xuất hiện khi project được xây dựng lại.
          </p>
          <div className="download-grid">
            {revisedProjects.map(({ previous }) => (
              <DownloadCard key={previous.id} project={previous} previous />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
