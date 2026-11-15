export function validateLessonAliases(aliases, lessons, label) {
  if (aliases === undefined) return;
  if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) {
    throw new Error(`${label}: lessonAliases must be an object`);
  }
  const slugs = new Set(lessons.map((lesson) => lesson.slug));
  for (const [alias, target] of Object.entries(aliases)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias) || typeof target !== "string") {
      throw new Error(`${label}: invalid lesson alias ${alias}`);
    }
    if (slugs.has(alias)) throw new Error(`${label}: alias shadows lesson ${alias}`);
    if (!slugs.has(target)) throw new Error(`${label}: alias target is not a lesson: ${target}`);
  }
}
