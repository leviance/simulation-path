import type { Metadata } from "next";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";
import { getProjectRevision, revisedProjects } from "@/lib/course";

export function generateStaticParams() {
  return revisedProjects.map((project) => ({ id: project.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectRevision(id);
  return project ? { title: `Dự án ${id} — ${project.title}`, description: project.summary } : {};
}

export default async function PlannedProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProjectRevision(id);
  if (!project) notFound();
  const { revision, previous } = project;

  return (
    <main className="shell page-wrap planned-project">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href={`/roadmap#project-${id}`}>Lộ trình</Link>
        <span>/</span>
        <b>Dự án {id}</b>
      </nav>
      <header className="page-hero compact">
        <span className="eyebrow">
          DỰ ÁN {id} · {project.part}
        </span>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
        <span className="revision-badge">CHỜ XÂY DỰNG LẠI</span>
      </header>

      <aside className="revision-notice">
        <h2>Đây là đề bài mới, chưa phải bài hướng dẫn</h2>
        <p>
          Bài học, ứng dụng C++/SDL3, Canvas và ZIP cho sản phẩm này chưa được phát hành. Các yêu
          cầu dưới đây là mục tiêu cần xây dựng và kiểm chứng, không phải kết quả đã đạt.
        </p>
      </aside>

      <section className="planned-outcome" aria-labelledby="planned-outcome-title">
        <span className="section-index">BẠN SẼ TẠO RA GÌ?</span>
        <h2 id="planned-outcome-title">{revision.question}</h2>
        <p>{revision.outcome}</p>
        <h3>Những thao tác phải làm được</h3>
        <ul>
          {revision.interactions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="planned-details">
        <section>
          <h2>Toán và lập trình phục vụ hình ảnh</h2>
          <ul>
            {revision.concepts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Cần biết trước</h2>
          <p>{revision.prerequisites}</p>
        </section>
        <section>
          <h2>Quy mô phải kiểm chứng</h2>
          <p>{revision.workload}</p>
          <p>Canvas hỗ trợ giải thích, không thay thế ứng dụng C++/SDL3 hoàn chỉnh.</p>
        </section>
      </div>

      <section className="previous-edition" aria-labelledby="previous-edition-title">
        <span className="revision-badge">TÀI LIỆU BẢN CŨ</span>
        <h2 id="previous-edition-title">{previous.title}</h2>
        <p>
          Bản này còn được giữ để tham khảo và tiếp tục phần đã học. Nội dung cùng ZIP của nó không
          phải lời giải cho đề bài mới ở trên.
        </p>
        <Link className="button button-secondary" href={`/projects/${previous.slug}`}>
          Xem hướng dẫn bản cũ →
        </Link>
      </section>
    </main>
  );
}
