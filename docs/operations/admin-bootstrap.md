# 최초 관리자 승격

관리자 역할 편집 UI는 제공하지 않는다. 첫 관리자는 별명 온보딩을 마쳐 `profiles` 행이 생성된 뒤, 프로젝트 DB 소유자가 Supabase Dashboard의 SQL Editor에서 한 번만 승격한다.

## 절차

1. 대상 사용자가 Google 로그인과 별명 설정을 완료했는지 확인한다.
2. SQL Editor에서 대상의 프로필 UUID를 확인한다. 이메일이나 다른 개인정보를 운영 문서·커밋·이슈에 기록하지 않는다.
3. DB 소유자 세션에서 아래 명령의 자리표시자를 대상 UUID로만 바꿔 실행한다.

```sql
select private.bootstrap_first_admin('<대상 profile UUID>');
```

4. 승격 결과는 필요한 운영 세션에서만 확인한다.

```sql
select id, role
from public.profiles
where id = '<대상 profile UUID>';

select promoted_profile_id, promoted_at
from private.admin_bootstrap;
```

정상 실행 후 대상 역할은 `admin`이며 `private.admin_bootstrap`에는 대상 UUID와 승격 시각 한 행만 남는다. 이 테이블은 한 번의 bootstrap 이력만 보호하며, 이후 별도의 승인된 DB 소유자 운영 절차가 필요해지는 경우까지 전역적으로 관리자를 한 명으로 제한하지는 않는다.

## 보호 경계와 실패 처리

- `bootstrap_first_admin`은 `SECURITY DEFINER` 함수지만 `PUBLIC`, `anon`, `authenticated`, `service_role`에는 실행 권한을 주지 않는다. 프로젝트 DB 소유자만 SQL Editor에서 실행한다.
- 대상 프로필이 없거나 이미 `admin`이면 role 변경과 이력 기록이 함께 실패한다.
- bootstrap 이력이 이미 있으면 두 번째 호출은 실패하며 다른 프로필의 role은 바뀌지 않는다.
- UUID, 이메일, SQL Editor 결과, 환경 변수와 service role 키를 커밋하지 않는다.
