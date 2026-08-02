import { describe, expect, it } from "vitest";

import {
  STORAGE_QUOTA_BYTES,
  assessStorageQuota,
} from "./quota";

const percent = (value: number) => (STORAGE_QUOTA_BYTES * value) / 100;

describe("assessStorageQuota", () => {
  it("예상 사용량이 정확히 80%이면 경고하지 않는다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: percent(79), incomingBytes: percent(1), warningArmed: true }),
    ).toMatchObject({ uploadAllowed: true, warningVisible: false, shouldSendWarning: false });
  });

  it("예상 사용량이 80%를 처음 초과하면 경고를 1회 예약하고 해제한다", () => {
    expect(
      assessStorageQuota({
        currentUsageBytes: percent(80),
        incomingBytes: 1,
        warningArmed: true,
      }),
    ).toMatchObject({
      uploadAllowed: true,
      warningVisible: true,
      shouldSendWarning: true,
      nextWarningArmed: false,
    });
  });

  it("경고가 해제된 동안 80% 초과 상태에서 이메일을 반복하지 않는다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: percent(85), incomingBytes: 0, warningArmed: false }),
    ).toMatchObject({ warningVisible: true, shouldSendWarning: false, nextWarningArmed: false });
  });

  it("삭제 후 실제 사용량이 80% 아래로 내려가면 경고를 재무장한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: percent(79), incomingBytes: 0, warningArmed: false }),
    ).toMatchObject({ warningVisible: false, shouldSendWarning: false, nextWarningArmed: true });
  });

  it("재무장 조건과 재상승이 한 요청에 함께 있으면 다시 경고한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: percent(79), incomingBytes: percent(2), warningArmed: false }),
    ).toMatchObject({ warningVisible: true, shouldSendWarning: true, nextWarningArmed: false });
  });

  it("예상 사용량이 95% 미만이면 업로드를 허용한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: percent(94), incomingBytes: percent(1) - 1, warningArmed: false }),
    ).toMatchObject({ uploadAllowed: true });
  });

  it("예상 사용량이 정확히 95%이면 업로드를 차단하고 미적용 사용량으로 판정한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: percent(94), incomingBytes: percent(1), warningArmed: true }),
    ).toMatchObject({
      projectedUsageBytes: percent(95),
      uploadAllowed: false,
      shouldSendWarning: false,
      nextWarningArmed: true,
    });
  });

  it("삭제 후 실제 사용량이 95% 아래면 업로드를 다시 허용한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: percent(95) - 1, incomingBytes: 0, warningArmed: false }),
    ).toMatchObject({ uploadAllowed: true });
  });

  it.each([
    { currentUsageBytes: -1, incomingBytes: 0 },
    { currentUsageBytes: 0, incomingBytes: -1 },
    { currentUsageBytes: Number.POSITIVE_INFINITY, incomingBytes: 0 },
  ])("잘못된 바이트 입력을 거부한다: $currentUsageBytes/$incomingBytes", (input) => {
    expect(() => assessStorageQuota({ ...input, warningArmed: true })).toThrowError(
      "사용량은 0 이상의 유한한 값이어야 합니다.",
    );
  });
});
