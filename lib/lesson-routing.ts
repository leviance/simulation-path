interface LessonRoutes {
  lessons: readonly { slug: string }[];
  lessonAliases?: Readonly<Record<string, string>>;
}

/** Aliases live with each project's manifest, never in a course-wide route table. */
export function canonicalLessonSlug(project: LessonRoutes, requested: string): string {
  if (project.lessons.some((lesson) => lesson.slug === requested)) return requested;
  const aliases = project.lessonAliases;
  if (!aliases || !Object.hasOwn(aliases, requested)) return requested;
  const target = aliases[requested];
  if (!project.lessons.some((lesson) => lesson.slug === target)) return requested;
  return target;
}
