import Link from "@/components/app-link";
import { getProjectRevision } from "@/lib/course";

export function ProjectRevisionNotice({ projectId }: { projectId: string }) {
  const planned = getProjectRevision(projectId);
  if (!planned) return null;

  return (
    <aside className="revision-notice" aria-label="Nội dung thuộc bản cũ">
      <span className="revision-badge">BẢN CŨ · P{projectId}</span>
      <h2>Project này đã đổi đề bài</h2>
      <p>
        Bạn đang xem hướng dẫn, Canvas và source của bản cũ: <b>{planned.previous.title}</b>. Chúng
        chưa triển khai sản phẩm mới <b>{planned.title}</b>. Tiến độ đã học vẫn được giữ.
      </p>
      <Link className="text-link" href={`/roadmap/${projectId}`}>
        Xem sản phẩm và phạm vi mới →
      </Link>
    </aside>
  );
}
