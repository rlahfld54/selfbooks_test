# 로컬 개발 API

기본 주소는 `http://localhost:4000/api`입니다. 모든 라우트는 GET이며 성공 응답은 `{"data": ...}`, 오류 응답은 `{"error":{"code":"...","message":"..."}}` 형식입니다.

| 경로 | 성공 응답 |
| --- | --- |
| `/api/health` | `{ status: "ok" }` |
| `/api/health/db` | PostgreSQL에서 `SELECT 1` 실행 후 `{ status: "ok" }` |
| `/api/clients` | 수임업체 배열. 각 행에는 `id`, `officeId`, `name`, `taxpayerKind`, `status` 포함 |
| `/api/clients/:id` | UUID에 해당하는 수임업체 객체 |
| `/api/tax-offices` | `id`, `name`을 가진 세무회계사무소 배열 |

잘못된 UUID는 400, 조회 범위에 없는 UUID는 404입니다. 허용되지 않은 로컬 요청은 403, DB 상태 확인 실패 또는 디렉터리 설정·권한 조건 미충족은 503을 반환합니다.
