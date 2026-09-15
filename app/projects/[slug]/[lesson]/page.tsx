import type { Metadata } from "next";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";
import { CourseSidebar } from "@/components/course-sidebar";
import { LessonProgress } from "@/components/progress";
import { LessonTableOfContents } from "@/components/lesson-toc";
import { LessonSourceGuide } from "@/components/lesson-source-guide";
import { LessonWalkthrough } from "@/components/lesson-walkthrough";
import { LessonReferences } from "@/components/lesson-references";
import { renderLesson } from "@/content/registry";
import { getAllPublishedProjects, getPublishedProject } from "@/lib/course";
import { getProjectLearning } from "@/lib/project-learning";

export async function generateStaticParams() {
  const projects = await getAllPublishedProjects();
  return projects.flatMap((project) =>
    project.lessons.map((lesson) => ({
      slug: project.slug,
      lesson: lesson.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lesson: string }>;
}): Promise<Metadata> {
  const { slug, lesson: lessonSlug } = await params;
  const project = await getPublishedProject(slug);
  const lesson = project?.lessons.find((item) => item.slug === lessonSlug);
  return lesson ? { title: lesson.title, description: lesson.summary } : {};
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lesson: string }>;
}) {
  const { slug, lesson: lessonSlug } = await params;
  const [project, content] = await Promise.all([
    getPublishedProject(slug),
    renderLesson(slug, lessonSlug),
  ]);
  const lesson = project?.lessons.find((item) => item.slug === lessonSlug);
  if (!project || !lesson || !content) notFound();
  const learning = await getProjectLearning(project.id);
  const guide = learning?.guides[lesson.id];
  if (!guide) throw new Error(`Missing learning guide for ${lesson.id}`);
  const references = learning?.references[lesson.id] ?? [];
  const index = project.lessons.findIndex((item) => item.id === lesson.id);
  const previous = project.lessons[index - 1];
  const next = project.lessons[index + 1];
  const lessonHref = `/projects/${project.slug}/${lesson.slug}`;

  return (
    <main className="course-layout shell">
      <CourseSidebar project={project} activeLesson={lesson.slug} />
      <article className="course-main lesson-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/roadmap">Lộ trình</Link>
          <span>/</span>
          <Link href={`/projects/${project.slug}`}>Dự án {project.id}</Link>
          <span>/</span>
          <b>Bài {lesson.order}</b>
        </nav>

        <header className="lesson-hero">
          <div>
            <span className="lesson-number">
              BÀI {String(lesson.order).padStart(2, "0")} · {lesson.estimatedMinutes} PHÚT
            </span>
            <h1>{lesson.title}</h1>
            <p>{lesson.summary}</p>
          </div>
          <LessonProgress lesson={{ id: lesson.id, title: lesson.title, href: lessonHref }} />
        </header>

        <LessonTableOfContents showCompleteSource={lesson.order === project.lessons.length} />
        <LessonWalkthrough project={project} lesson={lesson} guide={guide} />
        <div className="prose">
          {content}
          <LessonReferences references={references} />
          <LessonSourceGuide project={project} lesson={lesson} guide={guide} />
        </div>

        <nav className="lesson-nav">
          {previous ? (
            <Link href={`/projects/${project.slug}/${previous.slug}`}>
              <span>← BÀI TRƯỚC</span>
              <b>{previous.title}</b>
            </Link>
          ) : (
            <Link href={`/projects/${project.slug}`}>
              <span>← TỔNG QUAN</span>
              <b>Dự án {project.id}</b>
            </Link>
          )}
          {next ? (
            <Link className="next" href={`/projects/${project.slug}/${next.slug}`}>
              <span>BÀI TIẾP →</span>
              <b>{next.title}</b>
            </Link>
          ) : (
            <Link className="next" href="/roadmap">
              <span>TIẾP THEO →</span>
              <b>Lộ trình</b>
            </Link>
          )}
        </nav>
      </article>
    </main>
  );
}
