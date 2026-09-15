import Link from "@/components/app-link";
import type { ProjectMeta } from "@/lib/course";

export function CourseSidebar({
  project,
  activeLesson,
}: {
  project: ProjectMeta;
  activeLesson?: string;
}) {
  return (
    <aside className="course-sidebar">
      <div className="sidebar-project">
        <span>DỰ ÁN {project.id}</span>
        <b>{project.title}</b>
      </div>
      <nav aria-label={`Các bài của Dự án ${project.id}`}>
        {project.lessons.map((lesson) => (
          <Link
            className={activeLesson === lesson.slug ? "active" : ""}
            key={lesson.id}
            href={`/projects/${project.slug}/${lesson.slug}`}
          >
            <i>{String(lesson.order).padStart(2, "0")}</i>
            <span>
              {lesson.title}
              <small>{lesson.estimatedMinutes} phút</small>
            </span>
          </Link>
        ))}
      </nav>
      <Link className="sidebar-back" href="/roadmap">
        ← Trở lại lộ trình
      </Link>
    </aside>
  );
}
