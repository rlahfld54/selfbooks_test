# Accounting Pro 공통 UI 구현 기록

## 실행

Node 24 이상 권장. frontend 디렉터리에서 실행한다.

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

개발 서버의 콘솔에 표시되는 Local 주소로 접속한다.
본 작업에서는 127.0.0.1:3001에서 확인했다.

## 변경 범위

| 위치 | 역할 |
| --- | --- |
| frontend/app/app.vue, frontend/nuxt.config.ts | AppShell 진입, 한국어 메타데이터, 전역 CSS |
| frontend/app/assets/main.css | 색상·간격·반경 토큰, 레이아웃 및 반응형 스타일 |
| frontend/app/components/AppShell.vue | 사이드바, 헤더, 중복 없는 업무 탭, 전역 UI |
| frontend/app/components/HomeDashboard.vue | 홈 통계, 차트, 처리 내역, 공지, 바로가기 |
| frontend/app/components/WorkPage.vue | 일반전표·거래처관리 및 후속 업무 자리표시 화면 |
| frontend/app/components/ComponentGallery.vue | 공통 컴포넌트 검증 화면 |
| frontend/app/components/Ui*.vue | Button/Input/Select/Checkbox/Radio/Badge/Tooltip/Card/Modal/Toast/Icon |
| frontend/app/components/FormField.vue, NumberInput.vue, AmountInput.vue, DatePicker.vue, DateRangePicker.vue | 재사용 입력 요소 |
| frontend/app/components/DataTable.vue, PageToolbar.vue | 조회 테이블, 페이지 툴바 |
| frontend/app/components/SearchDialog.vue, SearchPanel.vue, DetailPanel.vue | 검색 선택 및 오른쪽 상세 보기 |
| frontend/app/components/ConfirmDialog.vue, LoadingState.vue, EmptyState.vue, ErrorState.vue | 피드백과 예외 상태 |
| frontend/app/composables/useWorkspace.ts, useSearch.ts | 상태/브라우저 저장 및 공통 검색 |
| frontend/app/utils/workspace.ts, data/demo.ts | 순수 상태 로직 및 분리된 샘플 데이터 |
| frontend/tests/workspace.test.ts | 핵심 상태 정상/예외 테스트 |
| frontend/package.json, package-lock.json | 테스트·타입 검사 명령 및 개발 의존성 |
| docs/ui-system-spec.md, requirements.md, architecture.md, decisions.md | 요구사항 원문과 설계 기록 |

백엔드·DB·회계 업무 규칙은 변경하지 않았다. 작업 전 존재하던 자료와 변경은 유지했다.

## 재사용 API

- UiButton: variant(primary/secondary/danger/ghost), size, disabled, type, 기본 slot.
- UiInput/NumberInput/AmountInput/DatePicker: 문자열 v-model. label/id/aria 속성 전달.
- UiSelect: 문자열 v-model, options(value/label).
- Checkbox/Radio: v-model, label 및 disabled. Radio는 name/value.
- FormField: label/id/error/hint. slot의 describedby를 입력의 aria-describedby에 전달.
- DataTable: columns(key/label/width/amount/sortable), rows, rowKey, selected, density,
  loading, pageSize, caption. select 및 update:density 이벤트. cell-{key} slot 지원.
- UiModal: open/title/size, close 이벤트, footer slot. ConfirmDialog는 confirm/cancel 이벤트.
- SearchDialog: open/items, select/close 이벤트. code/name 검색, 방향키/Enter/Escape.
- DetailPanel: open/width/title, close/update:width 이벤트, 본문 slot.
- 모든 샘플 금액은 정수 문자열이며 금액 입력에 실수 연산을 사용하지 않는다.

## 검증 결과 (2026-11-09)

- Node 상태 테스트 12개 통과: 탭 중복, 입력 유지, 미저장 닫기 거절/승인, 비활성 탭 닫기,
  허용 필드 저장, 손상 데이터 복구, 탭 ID 검증, 패널 너비 경계, 사용자/회사 격리,
  회사별 샘플 분리, 큰 정수 표시, 새 탭 객체 격리.
- npm run typecheck 통과.
- npm run build 통과. 최초 샌드박스 파일 접근 오류 이후 승인된 권한으로 재실행.
- 브라우저: 검색 방향키/Enter 선택, 포커스 복귀, 미저장 닫기 경고, 회사 전환 취소 시
  기존 회사/입력 유지, 승인 시 새 회사 홈 및 별도 샘플 표시 확인.
- 브라우저: 사이드바 220↔64px, 탭 전환 입력 유지, 새로고침 후 탭/활성 탭/밀도/사이드바 복원 확인.
- 브라우저: 금액 오름차순, 6개 항목 페이지 이동, 검색 결과 없음, 기본/압축형 선택 확인.
- 브라우저: 데스크톱 패널 360px 열기 시 본문 860px(1440px 화면), 너비 조정,
  모바일 전체 너비 패널, Escape 닫기와 선택 행으로 포커스 복귀 확인.
- 1920/1440/1366/1024/768/390px에서 document.scrollWidth가 viewport 너비와 일치.
  390px 거래처 테이블은 표 내부에서 가로 스크롤.
- 최종 화면: [대시보드](ui-screenshots/dashboard-1440.jpg).

## 의도적으로 남긴 범위 및 차이

- 실제 API·권한·회사 전환·전표 저장·회계 검증·신고·VoucherGrid는 구현하지 않았다.
  모든 회사/거래처/통계/날짜/공지/분개는 샘플이다.
- 회계관리 및 거래처관리 외 메뉴는 확장을 위한 자리표시 화면이다.
- 새로고침 시 실제 입력/자유 검색어/선택 레코드는 복원하지 않는다.
- 사용자가 입력한 내용은 저장되지 않으므로 beforeunload 경고를 제공한다.
  브라우저 정책에 따라 경고 표시 여부와 문구는 브라우저가 결정한다.
- 참고 이미지의 상단 디자인 가이드 영역과 독립 창은 구현 화면에 포함하지 않는다.
  노트북 그림은 가벼운 CSS 일러스트로 대체했다.
- 달력 팝업 UI는 브라우저 기본 date input을 사용한다. 값은 YYYY-MM-DD이다.
- 화면 크기 측정과 핵심 동작은 실제 브라우저에서 확인했으나, 모든 보조기기/브라우저 조합을
  자동화한 접근성 테스트는 포함하지 않는다.
- 설치 시 npm audit가 기존 의존성 트리를 포함해 low 6/moderate 6건을 보고했다.
  업무와 무관한 의존성 강제 업그레이드는 수행하지 않았다.

모바일 캡처: [거래처관리 390px](ui-screenshots/partners-390.jpg). 검증용 개발 서버는 작업 종료 시 정리했다.
