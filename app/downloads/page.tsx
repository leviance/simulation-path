import type { Metadata } from "next";
import Link from "@/components/app-link";
import { publishedProjects } from "@/lib/course";

export const metadata: Metadata = {
  title: "Tải mã nguồn",
  description: "Starter, checkpoint, bản hoàn chỉnh và tests của các project đã phát hành.",
};

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

      <div className="download-grid">
        {publishedProjects.map((project) => (
          <article key={project.id}>
            <span>P{project.id}</span>
            <div>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              <ul>
                <li>starter để tự viết</li>
                <li>{project.lessonCount} checkpoint độc lập</li>
                <li>final + CTest + README</li>
              </ul>
            </div>
            <a className="button button-primary" href={project.download} download>
              Tải ZIP <b>↓</b>
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
