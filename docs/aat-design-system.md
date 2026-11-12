# AAT 공통 디자인 시스템 v1.0

2026-11-12. 기존 Nuxt 4 / 자체 Ui* 컴포넌트에 AAT 브랜드를 적용했다. 이 프로젝트에는 Nuxt UI가 설치되어 있지 않으며 사용자 지시에 따라 새 패키지를 설치하거나 컴포넌트를 교체하지 않았다.

## 스타일 구성

- `frontend/app/assets/css/tokens.css`: 브랜드·상태 색상, 타이포그래피, 간격, 반경, 그림자, 컨트롤, 레이아웃, 테이블, 모션, 계층, 화면 크기 기준.
- `frontend/app/assets/main.css`: 기존 공통 레이아웃과 컴포넌트. 기존 변수 이름은 tokens.css의 AAT 별칭으로 유지한다.
- `frontend/app/assets/css/components.css`: 공통 상호작용 상태, 브랜드 배치, 포커스, 접근성.
- `frontend/app/features/landing/entry.css`: 랜딩·인증 화면의 전용 배치와 AAT 연결.
- `frontend/nuxt.config.ts`: 위 공통 CSS의 순서대로 전역 등록, AAT 기본 페이지 제목.

기존 반응형·상세 패널·전표 편집 CSS는 그대로 유지한다. 기능별 배치를 무리하게 전역 CSS로 옮기지 않는다. 기존 삽화·차트·기능 전용 스타일에는 개별 값이 남아 있으며 모든 값을 토큰으로 전환한 것은 아니다.

## 주요 토큰

| 구분 | 토큰 / 값 |
| --- | --- |
| 브랜드 | `--aat-color-deep-blue` #003B8E, `--aat-color-primary` #0A6EE8, `--aat-color-cyan` #16B4D6, `--aat-color-teal` #22C9A4 |
| 배경 / 표면 | `--aat-color-background` #EEF3F8 / `--aat-color-surface` #FFFFFF |
| 본문 / 보조 / 경계 | #172B4D / #64748B / #E2E8F0 |
| 상태 | success, warning, danger, info 및 연한 배경 |
| 글꼴 | Pretendard → Noto Sans KR → Malgun Gothic → system-ui |
| 크기 | xs/sm/md/lg/xl/2xl = 12/13/14/16/20/24px |
| 간격 | space-1~6, 8, 10, 12 = 4px 단위 |
| 반경 | sm/md/lg = 6/10/14px |
| 컨트롤 높이 | sm/md/lg = 30/36/40px |
| 작업 공간 | 사이드바 220px, 접힘 64px, 헤더 56px, 탭 40px |
| 상세 패널 | 기본 참고값 360px, 최소 320px, 최대 480px; 실제 너비 상태는 기존 store가 관리 |
| 팝업 | sm/md/search/lg = 420/480/640/800px |
| 표 | 헤더 36px, 일반 행 42px, 압축 행 32px, 셀 좌우 12px |
| 모션 | fast 120ms / normal 200ms, reduced-motion 0ms |
| 반응형 | 768 / 1280 / 1440 / 1920px 참고값 |

CSS 변수는 미디어 쿼리 조건에서 사용할 수 없다. breakpoint 토큰은 문서용이며 기존 `@media` 조건을 보존한다. 전표 편집 그리드는 일반 DataTable과 다른 밀도를 유지한다. Cyan/Teal은 작은 본문 글자색으로 사용하지 않는다. 그라데이션은 제공 로고와 인증 브랜드 영역에서 사용한다.

## 재사용

```vue
<UiButton variant="primary">저장</UiButton>
<UiButton variant="outline" size="small">조회</UiButton>
<UiButton :loading="saving" :disabled="invalid">저장</UiButton>
<AatBrand />
<AatBrand inverse />
<AatBrand compact />
```

기존 `normal`, `large`, `primary`, `secondary`, `ghost`, `danger` API를 유지한다. 추가한 `medium`은 normal과 같은 높이다. Loading은 버튼을 비활성화하고 `aria-busy`를 표시한다. 기존 입력·선택·날짜·체크박스·라디오·Badge·Modal·Toast·표·탭은 호환 변수로 AAT 색상을 상속한다. 새 Dropdown/Drawer/DatePicker 라이브러리는 추가하지 않았다.

## 로고

사용자가 제공한 `aat-logo-horizontal.svg`, `aat-symbol.svg`를 원본 그대로 사용한다. `AatBrand.vue`에서 교체하면 랜딩·로그인·회원가입·사이드바·공통 로딩에 반영된다. 접힌 사이드바는 심벌만 표시한다. `app.vue`의 SVG import로 파비콘을 연결하여 baseURL이 달라도 번들러가 경로를 처리한다.

`aat-logo-horizontal-mono.svg`는 제공된 가로형 SVG의 도형을 유지하고 색상만 Deep Blue로 통일한 밝은 배경용 단색 버전이다. 흰색 내부 도형은 원본과 동일하다. 원본 PNG와 SVG의 조형 차이를 임의로 재설계하지 않았다.

## 수정 파일 목록

공통: 위 스타일 4개, `nuxt.config.ts`, `app.vue`, `components/AatBrand.vue`, `components/UiButton.vue`, `components/LoadingState.vue`, `assets/aat-logo-horizontal-mono.svg`.

브랜드 표시: `features/workspace/components/WorkspaceSidebar.vue`, `features/landing/ProductBrand.vue`, `DashboardPreview.vue`, `HeroSection.vue`, `LandingFooter.vue`, `WorkflowSection.vue`, `features/auth/LoginForm.vue`, `RegisterForm.vue`, `features/onboarding/OnboardingWizard.vue`, `layouts/auth.vue`, `layouts/default.vue`, `pages/index.vue`, `login.vue`, `register.vue`, `forgot-password.vue`.

검증 및 문서: `tests/aat-design.browser.mjs`, `tests/screenshots/aat-dashboard.png`, 이 문서.

## 검증 및 영향

- 기존 Node 정상·예외 테스트 32개 통과.
- 최종 Nuxt 타입 검사 및 프로덕션 빌드 통과.
- 기존 작업 공간 브라우저 회귀 8개 시나리오 통과: 라우팅, 탭 입력 보존, 미저장 취소/폐기, 회사별 복원, API fixture, 모바일 패널, 키보드, hydration 등.
- AAT 브라우저 테스트: 1920/1440/1280/390px × 대시보드·일반전표·갤러리·로그인·회원가입, 로고 로딩, 페이지 가로 넘침, 포커스, 비활성, SVG 파비콘 확인.
- 실제 API/DB 검증은 이번 스타일 변경 범위 밖이다. 비즈니스 로직·API·DB·인증·라우팅·탭 상태 코드는 변경하지 않았다. 기존 작업 중이던 전표 수정도 보존했다.

후속 화면에서는 `var(--aat-...)`와 기존 공통 컴포넌트를 우선 사용한다. 모든 화면·보조기기 조합의 접근성 인증이나 전체 기능별 하드코딩 제거까지 완료했다는 의미는 아니다.
