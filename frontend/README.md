# SelfBooks Frontend

Nuxt 코드 작성 기준과 공식 문서 확인 방법은 [Nuxt 개발 지침](../docs/nuxt-guide.md)을 따릅니다.

업무 페이지 추가, 탭 상태 관리, API 연결, 검증 방법은 [프런트엔드 아키텍처](../docs/frontend-architecture.md)를 참고하세요.

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## GitHub Pages 미리보기

[저장소 Settings → Pages](https://github.com/rlahfld54/selfbooks_test/settings/pages)에서 **Build and deployment → Source → GitHub Actions**를 선택합니다. 변경 사항이 `main`에 올라가면 워크플로가 `frontend`의 정적 결과물(`.output/public`)을 배포합니다. 처음 설정한 뒤에는 Actions에서 **Deploy frontend to GitHub Pages → Run workflow → main**으로도 실행할 수 있습니다.

배포 주소는 [SelfBooks 미리보기](https://rlahfld54.github.io/selfbooks_test/)입니다. 공개 URL이며 수임업체와 매입매출전표는 샘플 데이터를 사용합니다. 미리보기에서 매입매출전표 저장과 삭제는 비활성화됩니다.

Windows PowerShell에서 동일한 설정으로 생성하려면 `frontend`에서 실행합니다.

```powershell
$env:NUXT_APP_BASE_URL = '/selfbooks_test/'
$env:NUXT_PUBLIC_PAGES_PREVIEW = 'true'
npm run generate
Remove-Item Env:NUXT_APP_BASE_URL, Env:NUXT_PUBLIC_PAGES_PREVIEW
```

정적 생성 후 `node tests/pages-preview.browser.mjs`를 실행하면 브라우저가 `/selfbooks_test/`로 요청하는 파일을 `.output/public`에서 읽어 검증합니다. 실제 호스팅 주소를 검사하려면 `SELFBOOKS_TEST_URL`에 끝 슬래시를 포함한 URL을 설정합니다. Playwright Chromium을 설치하거나 `SELFBOOKS_BROWSER`에 설치된 Chromium 계열 브라우저의 실행 파일을 지정합니다.
