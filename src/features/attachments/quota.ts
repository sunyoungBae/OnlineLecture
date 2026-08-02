export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;
export const STORAGE_WARNING_RATIO = 0.8;
export const STORAGE_BLOCK_RATIO = 0.95;

export type StorageQuotaInput = {
  currentUsageBytes: number;
  incomingBytes: number;
  warningArmed: boolean;
};

export type StorageQuotaAssessment = {
  projectedUsageBytes: number;
  uploadAllowed: boolean;
  warningVisible: boolean;
  shouldSendWarning: boolean;
  nextWarningArmed: boolean;
};

export function assessStorageQuota({
  currentUsageBytes,
  incomingBytes,
  warningArmed,
}: StorageQuotaInput): StorageQuotaAssessment {
  if (
    !Number.isFinite(currentUsageBytes) ||
    currentUsageBytes < 0 ||
    !Number.isFinite(incomingBytes) ||
    incomingBytes < 0
  ) {
    throw new RangeError("사용량은 0 이상의 유한한 값이어야 합니다.");
  }

  const projectedUsageBytes = currentUsageBytes + incomingBytes;
  const warningThreshold = STORAGE_QUOTA_BYTES * STORAGE_WARNING_RATIO;
  const blockThreshold = STORAGE_QUOTA_BYTES * STORAGE_BLOCK_RATIO;
  const uploadAllowed = projectedUsageBytes < blockThreshold;
  const effectiveWarningArmed =
    currentUsageBytes < warningThreshold ? true : warningArmed;
  const appliedUsageBytes = uploadAllowed
    ? projectedUsageBytes
    : currentUsageBytes;
  const warningVisible = appliedUsageBytes > warningThreshold;
  const shouldSendWarning =
    uploadAllowed && warningVisible && effectiveWarningArmed;

  return {
    projectedUsageBytes,
    uploadAllowed,
    warningVisible,
    shouldSendWarning,
    nextWarningArmed: shouldSendWarning ? false : effectiveWarningArmed,
  };
}
