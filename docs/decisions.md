# UI 설계 결정

## 2026-11-13 실제 인증

- Nuxt 4.6.4 + @supabase/supabase-js 2.119.0. 클라이언트 플러그인에 SDK 인스턴스를 두고 useAuth에서 인증 상태와 Fastify 토큰 전달을 처리한다.
- 브라우저 세션을 사용하는 작업 공간은 ClientOnly로 렌더하여 서버의 게스트 UI와 인증된 클라이언트 UI가 충돌하지 않게 한다. 글로벌 라우트 middleware는 화면 이동만 보호하고 서버 API는 별도로 검증한다.
- 공개 키는 환경변수로 구성한다. 기존 계정과 사무소 소속을 재사용하며 권한 자동 부여는 하지 않는다.
- 공식 근거: https://supabase.com/docs/reference/javascript/auth-signinwithpassword , https://supabase.com/docs/reference/javascript/auth-getuser , https://github.com/nuxt/nuxt/blob/main/docs/4.api/3.utils/define-nuxt-route-middleware.md . 설치 버전의 타입 검사도 수행한다.

## 2026-11-09

- 작업 공간 전용 컴포넌트·탐색·설정·모바일 동작·store는 `features/workspace/`에 모은다. 공통 UI와 앱 조립 계층을 구분하고 레이아웃의 명시적 import로 연결한다. `useWorkspaceProvider`는 레이아웃마다 상태를 제공하고 업무 화면은 `useWorkspaceContext`로 접근한다. 기존 URL·탭·저장 형식은 유지한다.

- 기존 Nuxt 4/Vue 3 유지. 추가 UI 프레임워크나 상태 관리 패키지 없이 Vue Composition API 사용.
- 기존 아이콘 체계가 없으므로 UiIcon에 일관된 선형 SVG 아이콘을 모았다.
- 업무 탭을 Nuxt 파일 기반 라우트와 연결한다. URL 직접 접근과 히스토리를 지원하며, 서버 인증은 후속 범위다. 세부 규칙은 [프런트엔드 아키텍처](frontend-architecture.md)에 기록한다.
- 사용자 설정은 accounting-pro:v1 네임스페이스로 저장하며 회사별 탭과 사용자 공통 설정을 분리한다.
- localStorage 실패/손상은 기본값으로 복구하고 저장 불가 안내를 표시한다.
- 자유 검색어에는 거래처 등 민감한 정보가 들어갈 수 있으므로 재접속 복원에서 제외한다.
- 금액 입력/표시는 정수 문자열로 유지하며 정렬에는 BigInt를 사용한다. 회계 계산은 하지 않는다.
- Pretendard는 버전 고정 CDN CSS를 사용한다. 오프라인 환경에서는 시스템 sans-serif로 대체된다.
- 대시보드 그림은 CSS로 구성한다. 참고 이미지의 색상·배치를 따르되 다중 창 대신 탭·패널을 사용한다.
- 실제 신고기한을 추측하지 않도록 참고 이미지의 D-day 카드는 검토 대기 샘플 카드로 대체했다.
- 패널 너비는 마우스와 키보드 모두 사용하는 range 입력으로 320~480px 조정한다.
- 검증용 개발 의존성 typescript/vue-tsc만 추가했다. 테스트는 Node 기본 test runner를 사용한다.


## 2026-11-10

- 사용자 확인으로 매입매출전표는 해솔문구 본점의 실제 DB 저장을 제공한다. 상태는 `draft`, 차대 일치와 세액 0원 확인이 필수이며 `posted`/마감 기간은 변경 불가다.
- 기존 pg 접근 계층과 공통 journal_entries/journal_lines를 재사용하고 sales_vouchers 상세만 추가한다. ORM 전환은 이번 범위가 아니다.
- 미확정 자동분개·세액 산식·계정코드 매핑을 추측하지 않는다. 회사 계정 마스터를 사용해 수기 분개를 입력한다.
- 전표 공급가액+세액과 분개 합계의 자동 매핑 검증은 정책 미확정으로 적용하지 않는다. 차대 검증은 서버에서 수행한다.
- 입력 화면은 `/sales-journal`을 신규 추가하고 기존 `/sales` 자리표시 화면을 보존한다. 작업 공간의 샘플 회사 선택과 실제 저장 대상이 다름을 화면/하단에 명시한다.
