export type LessonOrderItem = { id: string; position: number };
export type LessonMoveDirection = "up" | "down";

export function moveLessonInOrder(
  lessons: readonly LessonOrderItem[],
  lessonId: string,
  direction: LessonMoveDirection,
): LessonOrderItem[] {
  const ordered = [...lessons].sort((left, right) => left.position - right.position);
  const currentIndex = ordered.findIndex((lesson) => lesson.id === lessonId);
  const targetIndex = currentIndex + (direction === "up" ? -1 : 1);

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const current = ordered[currentIndex];
  const target = ordered[targetIndex];
  return ordered.map((lesson) => {
    if (lesson.id === current.id) return { ...lesson, position: target.position };
    if (lesson.id === target.id) return { ...lesson, position: current.position };
    return lesson;
  }).sort((left, right) => left.position - right.position);
}
