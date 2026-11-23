# 프로젝트 작업 원칙

## Git 관리는 사용자가 담당

- 사용자는 VS Code에서 Git과 커밋을 직접 관리한다. 별도 요청이 없으면 에이전트는 스테이징, 커밋, 브랜치·worktree 생성, 병합, push 및 커밋 이력 변경을 하지 않는다.
- 자동 커밋이나 별도의 커밋 관리 도구·설정을 추가하지 않는다. 코드 수정과 필요한 검증에 집중한다.
- 기존 `.git`과 사용자의 Git 설정·이력은 보존한다. 변경 확인을 위한 읽기 전용 조회만 필요할 때 사용한다.

## 코드 재사용

- 새 기능을 만들기 전에 `frontend/app/components`, `composables`, `utils`, 해당 `features`의 기존 구현과 호출부를 검색한다.
- 같은 동작을 복사하지 않는다. 두 곳 이상에서 사용하는 UI는 공통 컴포넌트, 상태·이벤트 처리는 composable, 순수 계산·검증은 utility로 추출한다.
- 여러 업무에서 쓰는 UI는 `app/components`, 한 업무에서만 공유하는 UI는 해당 `features/*/components`에 둔다.
- 기능 차이는 명시적인 props/slots/options로 표현한다. 금액 검증, 권한, 저장 방식이 다른 기능을 겉모양만 보고 합치지 않는다.
- 페이지는 라우트 설정과 기능 조합을 담당하고 업무 로직은 feature에 둔다. 교체된 구현은 참조와 테스트를 확인한 뒤 함께 제거한다.
- Nuxt 자동 등록 컴포넌트, 파일 기반 라우트, 동적 호출, 테스트 fixture도 사용처로 확인한다. 메뉴에 보이지 않는다는 이유만으로 페이지를 삭제하지 않는다.

## CSS는 main.css 한 곳에서 관리

- 모든 스타일 규칙은 `frontend/app/assets/css/main.css`에 작성한다.
- Vue `<style>`/`<style scoped>`, 기능별 CSS 파일 및 import, 정적인 인라인 `style`을 추가하지 않는다.
- 기존 규칙을 먼저 찾아 수정하고 같은 선택자를 파일 끝에 반복 추가하지 않는다. 공통 토큰과 컴포넌트 스타일을 재사용한다.
- 업무별 섹션 주석과 고유한 클래스/`data-ui-*` 속성으로 범위를 제한한다. `input`, `table`, `.setting` 같은 범용 선택자가 다른 화면에 적용되지 않게 한다.
- 기존 `data-ui-*`는 이전 scoped 스타일의 적용 범위를 보존하는 공개 HTML 속성이다. main.css의 대응 선택자와 함께 관리하며 새 요소에는 필요한 범위만 지정한다.
- 런타임 값이 필요한 너비·진행률·차트 높이는 `:style`로 CSS 사용자 정의 속성 값만 전달하고 실제 CSS 속성 선언은 main.css에 둔다.
- 변경 후 `npm --prefix frontend test`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run build`로 검증한다. 기존 실패가 있으면 변경으로 인한 실패와 구분해서 보고한다.
