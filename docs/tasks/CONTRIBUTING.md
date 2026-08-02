# 작업 카드 작성 규칙

## 상태 전이

작업 카드는 다음 순서로만 상태를 전이한다.

```text
blocked -> ready -> in_progress -> review -> done
```

- 선행 작업이 끝나지 않았으면 `blocked`와 `blocked_reason: dependency`를 사용한다.
- 외부 계정·서비스 대기는 `blocked_reason: external`, 제품 결정 대기는 `blocked_reason: decision`을 사용한다.
- `blocked`가 아닌 카드는 `blocked_reason`을 빈 문자열로 둔다.
- `in_progress`에서는 `owner`와 시간대를 포함한 ISO 8601 `started_at`을 반드시 기록한다.
- `review`에서는 구현 커밋 SHA를 기록한다.
- `done`에서는 구현자와 다른 `reviewer` 및 승인 커밋 SHA인 `review_commit`을 반드시 기록한다.

## 공통 형식

`TEMPLATE.md`의 front matter 키와 순서를 바꾸지 않는다. `depends_on`, `owned_files`, `shared_files`는 비어 있어도 한 줄 대괄호 배열로 기록한다. 모든 시각 값은 시간대를 포함한 ISO 8601 형식을 사용한다.

## 유형별 검증 증거

| 유형 | 필수 증거 |
| --- | --- |
| `feature` | RED: 실패하는 동작 테스트와 예상 실패 출력. GREEN: 최소 구현 뒤 같은 테스트의 통과 출력. |
| 동작을 포함한 `migration` | RED: 변경 전 동작 실패 또는 제약 위반 증거. GREEN: migration 적용 뒤 동작 테스트 통과 증거. |
| `config` | 적용한 설정과 공식 검증 명령의 통과 출력. |
| `docs` | 관련 문서 링크가 유효하고 요구 스키마·형식이 충족됨을 보이는 증거. |
| `manual-checkpoint` | 확인한 환경, 증거, 승인자 기록. |

검증 증거는 카드의 `검증`과 `리뷰 증거`에 남긴다.
