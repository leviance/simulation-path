import Link from "@/components/app-link";
import type { LessonReference } from "@/course/learning/types";

export function LessonReferences({ references }: { references: LessonReference[] }) {
  if (references.length === 0) return null;

  return (
    <section className="lesson-references" aria-labelledby="lesson-references-title">
      <header>
        <span className="section-index">TRA CỨU KHI CẦN</span>
        <h2 id="lesson-references-title">API và thuật ngữ của bài</h2>
        <p>
          Bạn không cần đọc hết tài liệu SDL trước khi viết code. Chỉ mở mục liên quan khi muốn xác
          nhận tham số, giá trị trả về, đơn vị hoặc trường hợp lỗi của API đang dùng.
        </p>
      </header>
      <ul>
        {references.map((reference) => (
          <li key={reference.href}>
            <span>{reference.kind}</span>
            {reference.href.startsWith("/") ? (
              <Link href={reference.href}>{reference.label}</Link>
            ) : (
              <a href={reference.href} target="_blank" rel="noreferrer">
                {reference.label} ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
