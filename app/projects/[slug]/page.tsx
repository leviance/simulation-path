import type { Metadata } from "next";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";
import { CourseSidebar } from "@/components/course-sidebar";
import { InteractiveLab } from "@/components/labs/interactive-lab";
import { ProjectChallenge } from "@/components/project-challenge";
import { ProjectProgress } from "@/components/progress";
import { getProjectSummary, getPublishedProject, publishedProjects } from "@/lib/course";

export function generateStaticParams() {
  return publishedProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectSummary(slug);
  return project?.status === "published"
    ? {
        title: `Dự án ${project.id} — ${project.title}`,
        description: project.summary,
      }
    : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();

  return (
    <main className="course-layout shell">
      <CourseSidebar project={project} />
      <section className="course-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/roadmap">Lộ trình</Link>
          <span>/</span>
          <b>Dự án {project.id}</b>
        </nav>

        <header className="project-hero">
          <span className="project-kicker">
            DỰ ÁN {project.id} · {project.part}
          </span>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          <div className="project-meta">
            <span>
              <small>THỜI GIAN</small>
              {project.duration}
            </span>
            <span>
              <small>BÀI HỌC</small>
              {project.lessons.length} bài
            </span>
            <span>
              <small>TRẠNG THÁI</small>Đã mở
            </span>
          </div>
        </header>

        <ProjectChallenge project={project} />
        <ProjectProgress lessonIds={project.lessons.map((lesson) => lesson.id)} />

        <section className="project-briefing" aria-labelledby="project-briefing-title">
          <header>
            <span className="section-index">TRƯỚC KHI BẮT ĐẦU</span>
            <h2 id="project-briefing-title">Đầu vào, đích đến và kiến thức chính</h2>
            <p>
              Trước khi làm thử thách, hãy kiểm tra kiến thức đầu vào, kết quả cần đạt và những khái
              niệm sẽ xuất hiện.
            </p>
          </header>
          <div>
            <article>
              <small>CẦN BIẾT TRƯỚC</small>
              <ul>
                {project.prerequisites.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/getting-started">Kiểm tra môi trường build →</Link>
            </article>
            <article>
              <small>SẢN PHẨM CUỐI</small>
              <p>{project.challenge.outcome}</p>
            </article>
            <article>
              <small>KIẾN THỨC SẼ DÙNG</small>
              <ul>
                {project.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {project.demoId && (
          <section className="project-demo" aria-labelledby="project-demo-title">
            <header>
              <span className="section-index">MÔ HÌNH TƯƠNG TÁC</span>
              <h2 id="project-demo-title">Thử ý tưởng chính trước khi tự viết</h2>
              <p>
                Canvas không chạy mã C++, nhưng dùng cùng biến và công thức với project. Hãy thay
                tham số, dự đoán kết quả rồi quan sát xem suy luận của bạn đúng đến đâu.
              </p>
            </header>
            <InteractiveLab demo={project.demoId} />
          </section>
        )}

        <section className="lesson-list" id="lessons">
          <header>
            <span className="section-index">LỘ TRÌNH</span>
            <h2>{project.lessons.length} bước để hoàn thành dự án</h2>
          </header>
          {project.lessons.map((lesson) => (
            <Link key={lesson.id} href={`/projects/${project.slug}/${lesson.slug}`}>
              <span>{String(lesson.order).padStart(2, "0")}</span>
              <div>
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
              </div>
              <small>{lesson.estimatedMinutes} phút</small>
              <b>→</b>
            </Link>
          ))}
        </section>

        <section className="source-strip">
          <div>
            <span>GÓI MÃ NGUỒN</span>
            <h2>Một gói ZIP, đủ mọi mốc để học và đối chiếu</h2>
            <p>
              Viết bài trong starter, mở checkpoint khi cần so sánh và dùng bản final để kiểm tra
              kết quả cuối.
            </p>
          </div>
          <a className="button button-primary" href={project.download} download>
            Tải Dự án {project.id} <b>↓</b>
          </a>
        </section>
      </section>
    </main>
  );
}
