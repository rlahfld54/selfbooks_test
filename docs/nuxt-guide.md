# SelfBooks Nuxt 공식 문서 적용 지침

확인일: 2026-11-09. 적용 버전: 설치된 Nuxt **4.6.4** (`frontend/package.json`의 범위는 `^4.6.4`). 전체 공식 문서의 복제본이 아니라 현재 프로젝트에 필요한 개발 기준이다. 버전 변경이나 새로운 API 도입 시 해당 공식 문서를 다시 확인한다.

## 공식 근거와 확인 범위

공식 사이트 일부 페이지는 조회 도구에서 Markdown 콘텐츠를 처리하지 못했다. 이번에 읽은 공식 자료는 아래와 같다. GitHub `main` 문서는 변경될 수 있으므로 새 기능은 설치 버전의 타입과 함께 확인한다.

- [Nuxt 공식 Auto Imports 튜토리얼](https://learn.nuxt.com/en/concepts/auto-imports): 디렉터리 관례에 따른 자동 import, 타입 정보 유지.
- [공식 useAsyncData 문서 원문](https://github.com/nuxt/nuxt/blob/main/docs/4.api/2.composables/use-async-data.md): 조회 키, handler, 상태, 취소, SSR 옵션.
- [공식 Nuxt 설정 문서 원문](https://github.com/nuxt/nuxt/blob/main/docs/4.api/6.nuxt-config.md): runtimeConfig 공개 범위와 환경변수 덮어쓰기.

후속 개발 시 확인할 공식 문서: [디렉터리 구조](https://nuxt.com/docs/4.x/guide/directory-structure), [라우팅](https://nuxt.com/docs/4.x/getting-started/routing), [상태 관리](https://nuxt.com/docs/4.x/getting-started/state-management), [TypeScript](https://nuxt.com/docs/4.x/guide/concepts/typescript), [커스텀 조회](https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch). 이 목록은 이번에 전문을 모두 읽었다는 의미가 아니다.

## 디렉터리와 import

현재 `app/app.vue` → `NuxtLayout` → `NuxtPage` 구성을 유지한다. `pages/`는 경로와 페이지 메타, `layouts/`는 공통 배치, `components/`는 재사용 UI, `composables/`는 Vue/Nuxt 상태 조합, `utils/`는 순수 함수를 담당한다. `~/`는 현재 구성에서 `frontend/app/` 기준이다.

`features/`, `services/`, `stores/`, `types/`는 SelfBooks가 선택한 분리 방식이며 Nuxt가 강제하는 폴더가 아니다. 기능 내부 컴포넌트·서비스는 명시적으로 import한다. 업무 폴더 전체를 자동 import 대상으로 확대하지 않는다. 생성된 `.nuxt` 파일을 직접 수정하지 않는다.

페이지는 `<script setup lang="ts">`와 `definePageMeta`로 업무 화면을 연결한다. 경로 정의는 `pages/`, 메뉴와 탭 표시는 `utils/workspace-routes.ts`에 둔다. 세부 작업 공간 규칙은 [프런트엔드 아키텍처](frontend-architecture.md)를 따른다.

## 조회와 서비스 경계

`useAsyncData`는 Nuxt 컨텍스트에서 생성한다. handler는 데이터를 반환하는 역할만 맡기며 UI 변경·저장 같은 부수효과를 넣지 않는다. 데이터가 없을 때도 `{ data: null }` 같은 응답 객체를 반환한다. 같은 키의 호출은 상태를 공유하므로 handler와 캐시 관련 옵션을 일관되게 유지한다. 취소 signal은 실제 HTTP 요청까지 전달한다. 화면에서는 `idle`, `pending`, `success`, `error`를 구분한다. [공식 설명](https://github.com/nuxt/nuxt/blob/main/docs/4.api/2.composables/use-async-data.md)

현재 수임업체 화면은 `server: false`로 hydration 이후 조회하며 재진입 시 재조회한다. 이 정책은 브라우저에서 로컬 Fastify를 호출하는 현재 화면의 선택이다. 모든 페이지에 일괄 적용하지 않는다. SSR 조회로 바꿀 때는 서버의 API 접근 주소와 인증 전달 계약부터 확인한다.

SelfBooks의 호출 경계:

```text
페이지/업무 UI
  → useDirectoryData: Nuxt 컨텍스트, 조회 키, 상태, 수명
  → createClientDirectoryService(request): API 경로와 응답 타입
  → createApiClient: HTTP, 오류, 제한 시간, 취소
  → Fastify: 인증 범위와 회계 검증
```

`useBackendApi()`는 setup에서 동기적으로 호출하여 runtimeConfig를 읽는다. 서비스는 request를 인자로 받으며 Nuxt 전역 호출에 의존하지 않는다. 서비스 테스트는 Nuxt 실행 없이 수행할 수 있다. 이는 공식 composable 사용법과 프로젝트의 계층 분리 원칙을 함께 적용한 설계다.

## 상태와 SSR

현재 작업 공간 store는 레이아웃마다 생성한다. 요청 간 공유되는 모듈 최상위에 사용자·회사별 `ref`/`reactive` 데이터를 새로 만들지 않는다. 기존 탭 세션은 탭 객체를 키로 하는 WeakMap이며 서로 다른 store의 탭을 공유하지 않아야 한다.

SSR과 브라우저가 공유할 새 상태에 `useState`를 선택할 때에는 직렬화 가능한 값과 안정적인 키를 사용한다. 현재 레이아웃 전용 상태를 일괄 이전할 필요는 없다. `window`, `document`, `localStorage` 접근은 클라이언트 생명주기나 클라이언트 조건 안에 둔다. 초기 렌더와 hydration의 일치 여부는 브라우저에서 검증한다.

## 런타임 설정과 보안

API 주소는 `runtimeConfig.public.apiBase`, 배포 환경의 덮어쓰기는 `NUXT_PUBLIC_API_BASE`를 사용한다. `public`은 브라우저에 공개되므로 비밀번호·DB 연결 문자열·비밀 키를 넣지 않는다. 설정 파일에는 기본값을 선언하고 소비 코드는 `useRuntimeConfig()`로 읽는다. [공식 설정 문서](https://github.com/nuxt/nuxt/blob/main/docs/4.api/6.nuxt-config.md)

Nuxt 라우트 middleware는 화면 이동 정책에 사용한다. 실제 회사 범위와 권한은 Fastify에서 검증한다. 프런트엔드 회사 선택값을 서버 권한으로 사용하지 않는다. 새로운 회계 규칙이나 API는 공식 Nuxt 예제에서 추론하지 않고 프로젝트 요구사항과 API 계약에 근거한다.

## 구현과 검증 절차

1. 요구사항과 이 문서, 변경할 Nuxt API의 공식 문서를 확인한다.
2. 변경 파일과 계획을 먼저 제시하고 현재 사용자 변경을 보존한다.
3. UI·composable·서비스·백엔드의 책임에 맞춰 구현한다.
4. 정상 응답, 오류, 취소 등 변경 경계의 테스트를 추가한다.
5. `frontend/`에서 `npm test`, `npm run typecheck`, `npm run build`를 실행한다.
6. 라우팅·화면·상태 수명이 바뀌면 `node tests/workspace.browser.mjs`로 직접 접근, 탭 이동, hydration을 확인한다. 실행하지 못한 검증은 보고한다.

새 Nuxt 기능의 공식 문서와 설치 버전이 다르면 미확정 사항으로 기록하고 버전을 임의로 올리지 않는다.
