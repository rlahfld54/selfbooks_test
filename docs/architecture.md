# 공통 UI 구조

- 진입점: frontend/app/app.vue → components/AppShell.vue.
- AppShell: 내비게이션, 업무 탭, 회사 선택, 상세 패널, 전역 확인 모달.
- HomeDashboard / WorkPage / ComponentGallery: API 없는 UI 데모 콘텐츠.
- components/Ui*, FormField, DatePicker, AmountInput 등: 업무와 분리된 표현 컴포넌트.
- DataTable: 조회 전용, 정렬/선택/페이지네이션/밀도/내부 스크롤. 편집 그리드와 분리.
- composables/useWorkspace.ts: 브라우저 수명주기, UI 설정 저장, 확인 후 회사/탭 전환.
- utils/workspace.ts: Vue와 독립된 탭 상태 전이, 복원 데이터 검증, 정수 문자열 표시.
- composables/useSearch.ts: SearchDialog와 SearchPanel의 공통 검색 동작.
- data/demo.ts: 회사별 데모 데이터. 공통 컴포넌트에서 API 호출하지 않는다.
- assets/main.css: 전역 디자인 토큰과 공통/반응형 스타일.

업무 화면은 v-show로 유지하여 탭 이동 시 컴포넌트 상태를 보존한다.
회사 전환 시 회사 ID를 포함한 key로 콘텐츠를 새로 구성한다.
네이티브 dialog의 포커스 격리와 Escape 동작을 사용하며, 오버레이 상세 패널은
본문 inert, Tab 순환, 트리거 포커스 복귀를 제공한다.

신규 업무는 utils/workspace.ts의 메뉴/TabId와 WorkPage의 콘텐츠 분기를 추가한다.
화면이 커지면 콘텐츠를 별도 컴포넌트로 분리한다. AppShell 및 기본 UI에 업무 API를 추가하지 않는다.
