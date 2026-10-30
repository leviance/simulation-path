import Link from "@/components/app-link";
import { currentProjects, revisedProjects } from "@/lib/course";
import { ContinueLearning } from "@/components/progress";

export default function HomePage() {
  const projectCount = currentProjects.length;
  const lessonCount = currentProjects.reduce((total, project) => total + project.lessonCount, 0);
  const labCount = currentProjects.filter((project) => project.demoId).length;
  const featuredProjects = [...currentProjects.slice(0, 5), ...currentProjects.slice(-3)].filter(
    (project, index, projects) => projects.findIndex(({ id }) => id === project.id) === index,
  );
  const displayCount = (value: number) => String(value).padStart(2, "0");
  const releasedHeading = `${projectCount} dự án có hướng dẫn hiện tại`;
  const horizonHeading = "Từ một pixel đến những thế giới có thể khám phá.";
  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> C++ · SDL3 · TOÁN VÀ ĐỒ HỌA TƯƠNG TÁC
          </span>
          <h1>
            Tự viết từng pixel.
            <br />
            <em>Tự thấy công thức hoạt động.</em>
          </h1>
          <p className="hero-lede">
            Simulation Path là lộ trình học C++ và SDL3 qua 78 mini project. Bạn bắt đầu bằng một
            cửa sổ trống, rồi tự xây renderer, công cụ tạo hình 3D và những mô phỏng chạy trên GPU.
            Mỗi công thức đều gắn với thứ bạn có thể tạo ra, thay đổi và quan sát.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/getting-started">
              Bắt đầu từ đây <span>→</span>
            </Link>
            <Link className="button button-secondary" href="/roadmap">
              Xem 78 dự án
            </Link>
          </div>
          <ContinueLearning />
          <div className="hero-proof">
            <span>
              <strong>{displayCount(projectCount)}</strong> dự án đã mở
            </span>
            <span>
              <strong>{displayCount(lessonCount)}</strong> bài học
            </span>
            <span>
              <strong>{displayCount(labCount)}</strong> lab tương tác
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Minh họa pipeline từ tọa độ đến pixel">
          <div className="terminal-card">
            <div className="terminal-top">
              <span />
              <span />
              <span />
              <b>framebuffer.cpp</b>
            </div>
            <pre>
              <code>
                <span className="code-dim">{"// world → screen → pixel"}</span>
                {"\n"}
                <span className="code-key">Vec2</span> screen = camera.
                <span className="code-fn">project</span>(point);{"\n"}framebuffer.
                <span className="code-fn">putPixel</span>({"\n"}{" "}
                <span className="code-num">int</span>(screen.x),{"\n"}{" "}
                <span className="code-num">int</span>(screen.y),{"\n"} Color&#123;
                <span className="code-accent">83, 240, 174</span>&#125;{"\n"});
              </code>
            </pre>
          </div>
          <div className="pixel-orbit orbit-a" />
          <div className="pixel-orbit orbit-b" />
          <div className="coordinate-axis axis-x" />
          <div className="coordinate-axis axis-y" />
          <div className="floating-label label-a">index = y × width + x</div>
          <div className="floating-label label-b">Δt = 16.67 ms</div>
        </div>
      </section>

      <section className="manifesto">
        <div className="shell manifesto-grid">
          <div>
            <span className="section-index">01 / CÁCH HỌC</span>
            <h2>Mỗi bài đều bắt đầu bằng một việc cụ thể.</h2>
          </div>
          <div className="learning-loop">
            {[
              ["01", "Tự thử", "Đọc đề bài và thử tìm một hướng giải trước khi xem code mẫu."],
              [
                "02",
                "Xây từng phần",
                "Bắt đầu từ mã chạy được, thêm một thay đổi rồi chạy lại ngay.",
              ],
              [
                "03",
                "Làm sai có chủ đích",
                "Thay một giả định để nhìn tận mắt lỗi xuất hiện từ đâu.",
              ],
              ["04", "Kiểm chứng", "Dùng test, sai số và số đo thay cho cảm giác ‘có vẻ đúng’."],
            ].map(([number, title, description]) => (
              <article key={number}>
                <b>{number}</b>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell released-section">
        <div className="section-heading">
          <div>
            <span className="section-index">02 / ĐÃ PHÁT HÀNH</span>
            <h2>{releasedHeading}</h2>
          </div>
          <p>
            {`${projectCount} dự án có bài học, Canvas và mã nguồn để bắt đầu. ${revisedProjects.length} đề bài đã đổi theo đặc tả mới, đang chờ xây dựng lại và được tách riêng trên lộ trình.`}
          </p>
        </div>
        <div className="project-showcase">
          {featuredProjects.map((project, index) => (
            <Link className="project-card" href={`/projects/${project.slug}`} key={project.id}>
              <span className="project-number">P{project.id}</span>
              <div className={`project-glyph glyph-${index + 1}`} aria-hidden="true">
                <span />
              </div>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <footer>
                <span>
                  {project.lessonCount} bài · {project.duration}
                </span>
                <b>Khám phá →</b>
              </footer>
            </Link>
          ))}
        </div>
        <div className="released-actions">
          <Link className="text-link" href="/roadmap">
            Xem hướng dẫn và trạng thái từng dự án <span>↗</span>
          </Link>
        </div>
      </section>

      {revisedProjects.length > 0 && (
        <section className="shell planned-section" aria-labelledby="planned-heading">
          <div className="section-heading">
            <div>
              <span className="section-index">ĐỀ BÀI MỚI TRONG LỘ TRÌNH</span>
              <h2 id="planned-heading">Những thứ bạn sẽ tự tay tạo ra</h2>
            </div>
            <p>
              {revisedProjects.length} project dưới đây đã đổi sản phẩm đích. Bài học, Canvas và ZIP
              mới chưa phát hành; tài liệu cũ vẫn được giữ và ghi rõ là bản cũ.
            </p>
          </div>
          <div className="planned-cards">
            {revisedProjects.map((project) => (
              <Link href={`/roadmap/${project.id}`} key={project.id}>
                <span className="revision-badge">P{project.id} · CHỜ XÂY DỰNG LẠI</span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <b>Xem sản phẩm dự kiến →</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="shell horizon">
        <span className="section-index">03 / ĐƯỜNG DÀI</span>
        <h2>{horizonHeading}</h2>
        <div className="horizon-track">
          <span>Framebuffer</span>
          <i>→</i>
          <span>3D CPU</span>
          <i>→</i>
          <span>Physics</span>
          <i>→</i>
          <span>GPU</span>
          <i>→</i>
          <span>Công cụ 3D & mô phỏng</span>
        </div>
        <Link className="text-link" href="/roadmap">
          Xem kiến thức nối tiếp nhau qua 78 dự án <span>↗</span>
        </Link>
      </section>
    </main>
  );
}
