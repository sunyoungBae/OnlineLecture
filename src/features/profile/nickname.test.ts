import { describe, expect, it } from "vitest";

import { areNicknamesEqual, validateNickname } from "./nickname";

describe("validateNickname", () => {
  it.each(["가a", "홍길동", "Online_2026", "한글_English99"])(
    "2~20자의 한글·영문·숫자·밑줄 별명 %s를 허용한다",
    (nickname) => {
      expect(validateNickname(nickname)).toEqual({ valid: true, nickname });
    },
  );

  it.each(["가", "a", "가나다라마바사라마바사라마바사라마바사라마바사라마바사라마바사라마바사라마바사라마바사"])(
    "2~20자 범위 밖 별명 %s를 거부한다",
    (nickname) => {
      expect(validateNickname(nickname)).toEqual({
        valid: false,
        reason: "invalid_length",
      });
    },
  );

  it.each(["홍 길동", "별명!", "name-1", "테스트🙂"])(
    "허용하지 않은 문자가 포함된 별명 %s를 거부한다",
    (nickname) => {
      expect(validateNickname(nickname)).toEqual({
        valid: false,
        reason: "invalid_characters",
      });
    },
  );
});

describe("areNicknamesEqual", () => {
  it("영문 대소문자가 다른 별명을 중복으로 판단한다", () => {
    expect(areNicknamesEqual("Online_Lecture", "online_lecture")).toBe(true);
  });

  it("다른 별명은 중복으로 판단하지 않는다", () => {
    expect(areNicknamesEqual("온라인", "온라인2")).toBe(false);
  });
});
