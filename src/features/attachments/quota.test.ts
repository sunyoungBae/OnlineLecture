import { describe, expect, it } from "vitest";

import {
  STORAGE_QUOTA_BYTES,
  assessStorageQuota,
} from "./quota";

const percent = (value: number) => (STORAGE_QUOTA_BYTES * value) / 100;
const warningFloor = Math.floor(percent(80));
const warningCeil = Math.ceil(percent(80));
const blockFloor = Math.floor(percent(95));
const blockCeil = Math.ceil(percent(95));

describe("assessStorageQuota", () => {
  it("예상 사용량이 80%의 정수 바이트 floor이면 경고하지 않는다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: warningFloor, incomingBytes: 0, warningArmed: true }),
    ).toMatchObject({ uploadAllowed: true, warningVisible: false, shouldSendWarning: false });
  });

  it("예상 사용량이 80%의 정수 바이트 ceil이면 경고를 1회 예약하고 해제한다", () => {
    expect(
      assessStorageQuota({
        currentUsageBytes: warningFloor,
        incomingBytes: warningCeil - warningFloor,
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
      assessStorageQuota({ currentUsageBytes: Math.ceil(percent(85)), incomingBytes: 0, warningArmed: false }),
    ).toMatchObject({ warningVisible: true, shouldSendWarning: false, nextWarningArmed: false });
  });

  it("삭제 후 실제 사용량이 80% 아래로 내려가면 경고를 재무장한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: Math.floor(percent(79)), incomingBytes: 0, warningArmed: false }),
    ).toMatchObject({ warningVisible: false, shouldSendWarning: false, nextWarningArmed: true });
  });

  it("80% 아래에서 재무장한 뒤 다시 상승하면 경고를 다시 한 번 보낸다", () => {
    const rearmed = assessStorageQuota({
      currentUsageBytes: warningFloor,
      incomingBytes: 0,
      warningArmed: false,
    });
    const risenAgain = assessStorageQuota({
      currentUsageBytes: warningFloor,
      incomingBytes: warningCeil - warningFloor,
      warningArmed: rearmed.nextWarningArmed,
    });

    expect(rearmed.nextWarningArmed).toBe(true);
    expect(risenAgain).toMatchObject({
      warningVisible: true,
      shouldSendWarning: true,
      nextWarningArmed: false,
    });
  });

  it("예상 사용량이 95%의 정수 바이트 floor이면 업로드를 허용한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: blockFloor, incomingBytes: 0, warningArmed: false }),
    ).toMatchObject({ uploadAllowed: true });
  });

  it("예상 사용량이 95%의 정수 바이트 ceil이면 업로드를 차단하고 미적용 사용량으로 판정한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: blockFloor, incomingBytes: blockCeil - blockFloor, warningArmed: true }),
    ).toMatchObject({
      projectedUsageBytes: blockCeil,
      uploadAllowed: false,
      shouldSendWarning: false,
      nextWarningArmed: true,
    });
  });

  it("삭제 후 실제 사용량이 95% 아래면 업로드를 다시 허용한다", () => {
    expect(
      assessStorageQuota({ currentUsageBytes: blockFloor, incomingBytes: 0, warningArmed: false }),
    ).toMatchObject({ uploadAllowed: true });
  });

  it("큰 업로드가 차단된 뒤 같은 실제 사용량에서 작은 업로드를 허용한다", () => {
    const blocked = assessStorageQuota({
      currentUsageBytes: blockFloor - 1,
      incomingBytes: 2,
      warningArmed: false,
    });
    const recovered = assessStorageQuota({
      currentUsageBytes: blockFloor - 1,
      incomingBytes: 1,
      warningArmed: blocked.nextWarningArmed,
    });

    expect(blocked.uploadAllowed).toBe(false);
    expect(recovered).toMatchObject({
      projectedUsageBytes: blockFloor,
      uploadAllowed: true,
    });
  });

  it.each([
    { currentUsageBytes: -1, incomingBytes: 0 },
    { currentUsageBytes: 0, incomingBytes: -1 },
    { currentUsageBytes: Number.POSITIVE_INFINITY, incomingBytes: 0 },
    { currentUsageBytes: 1.5, incomingBytes: 0 },
    { currentUsageBytes: 0, incomingBytes: 1.5 },
    { currentUsageBytes: Number.MAX_SAFE_INTEGER + 1, incomingBytes: 0 },
    { currentUsageBytes: 0, incomingBytes: Number.MAX_SAFE_INTEGER + 1 },
  ])("잘못된 바이트 입력을 거부한다: $currentUsageBytes/$incomingBytes", (input) => {
    expect(() => assessStorageQuota({ ...input, warningArmed: true })).toThrowError(
      "사용량은 0 이상의 유한한 값이어야 합니다.",
    );
  });

  it("현재 사용량과 추가 용량의 합이 안전 정수 범위를 넘으면 거부한다", () => {
    expect(() =>
      assessStorageQuota({
        currentUsageBytes: Number.MAX_SAFE_INTEGER,
        incomingBytes: 1,
        warningArmed: true,
      }),
    ).toThrowError("예상 사용량은 안전한 정수 범위여야 합니다.");
  });
});
