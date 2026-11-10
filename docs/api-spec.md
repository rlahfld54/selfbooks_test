# 로컬 개발 API

기본 주소는 `http://localhost:4000/api`입니다. 아래 디렉터리·상태 라우트는 GET이며 성공 응답은 `{"data": ...}`, 오류 응답은 `{"error":{"code":"...","message":"..."}}` 형식입니다.

| 경로               | 성공 응답                                                                        |
| ------------------ | -------------------------------------------------------------------------------- |
| `/api/health`      | `{ status: "ok" }`                                                               |
| `/api/health/db`   | PostgreSQL에서 `SELECT 1` 실행 후 `{ status: "ok" }`                             |
| `/api/clients`     | 수임업체 배열. 각 행에는 `id`, `officeId`, `name`, `taxpayerKind`, `status` 포함 |
| `/api/clients/:id` | UUID에 해당하는 수임업체 객체                                                    |
| `/api/tax-offices` | `id`, `name`을 가진 세무회계사무소 배열                                          |

잘못된 UUID는 400, 조회 범위에 없는 UUID는 404입니다. 허용되지 않은 로컬 요청은 403, DB 상태 확인 실패 또는 디렉터리 설정·권한 조건 미충족은 503을 반환합니다.

## 2026-11-10 매입매출전표 API

디렉터리 GET API와 별도로 다음 쓰기 API를 추가했다. 실행은 기존 `npm run dev`를 사용한다. 개발 모드에서만 활성화하며 운영 환경의 인증 우회는 차단한다.

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/sales-journal/meta` | 서버 고정 회사·사업장, 회계기간, 거래처, 계정과목 |
| GET | `/api/sales-journal` | 해당 회사·사업장의 매입매출전표 및 분개 목록 |
| POST | `/api/sales-journal` | 신규 미확정 전표 저장 |
| PUT | `/api/sales-journal/:id` | 미확정 전표 수정 |
| DELETE | `/api/sales-journal/:id?version=N` | 미확정 전표 및 관련 분개 삭제 |

쓰기 요청은 허용된 로컬 Origin과 `Content-Type: application/json`이 필요하다. DELETE 본문은 `{}`로 전송한다. 성공은 `{ data: ... }`, 오류는 `{ error: { code, message } }` 형식을 유지한다.

POST/PUT 본문: `id`(신규 UUID, 재시도 시 동일 값), `version`(신규 0), `date`, `periodId`, `partnerId`, `type`(11/51), `item`, `supply`, `vat`, `payment`(외상/현금/예금/카드/기타), `memo`, `zeroVatConfirmed`, `lines` 배열. 각 분개는 `side`(debit/credit), `account`(계정 UUID), `amount`(정수 문자열), `memo`를 받는다. 회사/사용자/사업장/상태 필드는 받지 않는다.

서버가 차대 일치, 과세 유형 세액 0원 확인, 회사별 마스터 소속, 날짜와 열린 회계기간을 검증한다. 저장 결과에는 전표번호, 상태, 버전, `needsReview`, `zeroVatConfirmed`가 포함된다. 충돌/확정/마감은 409, 잘못된 입력은 400, 범위 밖 전표는 404, 설정 미비는 503이다. 전표번호는 회계기간 내 유일한 `PS-UUID`이며 일련번호 정책은 후속 확정 사항이다.
