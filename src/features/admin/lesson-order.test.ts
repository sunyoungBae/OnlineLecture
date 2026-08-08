import { describe, expect, it } from "vitest";

import { moveLessonInOrder } from "./lesson-order";

const lessons = [
  { id: "one", position: 1 },
  { id: "two", position: 2 },
  { id: "three", position: 3 },
];

describe("moveLessonInOrder", () => {
  it("첫 회차를 위로 이동하면 순서를 유지한다", () => {
    expect(moveLessonInOrder(lessons, "one", "up")).toEqual(lessons);
  });

  it("중간 회차를 위와 아래로 이동하면 인접 회차와 position만 교환한다", () => {
    expect(moveLessonInOrder(lessons, "two", "up")).toEqual([
      { id: "two", position: 1 },
      { id: "one", position: 2 },
      { id: "three", position: 3 },
    ]);
    expect(moveLessonInOrder(lessons, "two", "down")).toEqual([
      { id: "one", position: 1 },
      { id: "three", position: 2 },
      { id: "two", position: 3 },
    ]);
  });

  it("마지막 회차를 아래로 이동하면 순서를 유지한다", () => {
    expect(moveLessonInOrder(lessons, "three", "down")).toEqual(lessons);
  });
});
