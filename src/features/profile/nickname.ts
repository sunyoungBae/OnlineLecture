export const MIN_NICKNAME_LENGTH = 2;
export const MAX_NICKNAME_LENGTH = 20;

const NICKNAME_PATTERN = /^[가-힣A-Za-z0-9_]+$/;

export type NicknameValidationResult =
  | { valid: true; nickname: string }
  | { valid: false; reason: "invalid_length" | "invalid_characters" };

export function validateNickname(value: string): NicknameValidationResult {
  const length = [...value].length;

  if (length < MIN_NICKNAME_LENGTH || length > MAX_NICKNAME_LENGTH) {
    return { valid: false, reason: "invalid_length" };
  }

  if (!NICKNAME_PATTERN.test(value)) {
    return { valid: false, reason: "invalid_characters" };
  }

  return { valid: true, nickname: value };
}

export function areNicknamesEqual(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}
