# selfbooks_test
셀프북스 테스트 환경입니다. Node.js 24와 npm을 사용합니다.

## 로컬 실행

프로젝트 루트에서 한 번에 실행합니다. 종료는 같은 터미널에서 `Ctrl+C`를 누릅니다.

```sh
npm run dev
```

새로 내려받은 환경에서만 먼저 의존성을 설치합니다.

```sh
npm ci
npm run setup
```

`concurrently`가 두 서버의 로그를 `[backend]`, `[frontend]`로 구분하고 한 프로세스가 종료되면 다른 프로세스도 종료합니다. 개별 실행은 `npm run dev:backend`, `npm run dev:frontend`, Supabase 연결 확인은 `npm run db:check`를 사용합니다. Postman 설치는 필요하지 않습니다.

Nuxt는 `http://localhost:3000`, Fastify API는 `http://localhost:4000/api`에서 접속할 수 있습니다. Nuxt에서 **매입매출관리 → 수임업체관리**를 열면 개발용 목록을 볼 수 있습니다.

## 환경변수

- 프로젝트 루트 `.env`에 Supabase Connect 화면의 Session pooler 주소를 `DIRECT_URL`로 설정합니다. 비밀번호 자리의 예시 대괄호는 제거하고 예약 문자는 URL 인코딩합니다. `DIRECT_URL`이 없으면 `DATABASE_URL`을 사용합니다.
- Supabase Dashboard의 Database Settings → SSL Configuration에서 CA를 내려받아 PEM 파일 경로를 `DB_SSL_CA_PATH`에 지정합니다. 상대 경로의 기준은 프로젝트 루트입니다. Fastify의 DB 연결은 CA 체인과 호스트명을 검증합니다. [Supabase PostgreSQL SSL 설정](https://supabase.com/docs/guides/platform/ssl-enforcement)
- `DEV_FIXTURE_OFFICE_ID`와 쉼표로 구분한 `DEV_FIXTURE_CLIENT_IDS`에는 확인된 합성 테스트 레코드의 UUID만 지정합니다. 두 설정을 비우면 디렉터리 API가 503을 반환합니다.
- 포트가 충돌하면 `BACKEND_PORT` 또는 Nuxt의 `--port` 옵션을 조정하고 각각 `frontend/.env`의 `NUXT_PUBLIC_API_BASE`, 루트 `.env`의 `FRONTEND_ORIGIN`을 함께 맞춥니다. 브라우저 설정에는 Fastify API 주소만 들어갑니다.

Fastify는 로컬 개발 모드에서 루프백에 바인딩합니다. 터널이나 역방향 프록시로 공개하지 마세요. 실제 서비스에서는 사용자 인증, 사무소 단위 권한 검증, RLS가 적용되는 최소 권한 DB 역할이 필요합니다.

## SNS 간편 로그인 설정

1. Supabase **Authentication → URL Configuration → Redirect URLs**에 `http://localhost:3000/auth/callback`을 추가합니다. 다른 주소나 포트로 실행하면 그 주소의 `/auth/callback`을 등록합니다. [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
2. 제공사 개발자 콘솔에서 웹 로그인 앱을 등록합니다. 각 앱의 콜백에는 Supabase의 해당 제공사 설정 화면에 표시되는 **Callback URL**을 사용합니다. Client ID와 Secret은 Supabase **Authentication → Sign In / Providers**에서 입력합니다.
   - **카카오**는 카카오 로그인을 활성화하고 REST API 키와 카카오 로그인 Client Secret을 Supabase의 Kakao 항목에 입력합니다. 앱이 이메일을 제공할 수 없다면 Kakao 항목에서 이메일 없는 로그인을 허용하고 기존 관리자 계정에 직접 연결합니다. [Kakao 설정](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao)
   - **네이버**는 Custom OIDC에 식별자 `custom:naver`, Issuer `https://nid.naver.com`, scope `openid`로 등록합니다. **Email optional**을 활성화하고 기존 관리자 계정에 먼저 직접 연결합니다. 네이버 개발 단계에서는 등록된 테스트 계정으로 확인합니다. [Supabase Custom OIDC](https://supabase.com/docs/guides/auth/custom-oauth-providers) · [네이버 OIDC 개발 가이드](https://developers.naver.com/docs/login/devguide/devguide.md)
   - **Google**은 Google Cloud의 웹 애플리케이션 OAuth Client ID와 Secret을 Supabase의 Google 항목에 입력합니다. Google OAuth 앱이 테스트 상태라면 사용할 계정을 테스트 사용자에 등록합니다. [Google 설정](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
3. 기존 관리자만 로그인하는 테스트 프로젝트에서는 **Allow manual linking**을 켜고 **Allow new users to sign up**을 끕니다. 이메일·비밀번호로 먼저 로그인한 뒤 업무 화면 우측 상단 프로필 아이콘의 **SNS 계정 연결**을 엽니다. 연결을 마치면 로그아웃 후 `/login`에서 해당 SNS 버튼으로 로그인합니다. Fastify는 등록된 활성 관리자와 사무소 소속을 확인합니다. [Supabase Auth 일반 설정](https://supabase.com/docs/guides/auth/general-configuration)

API 명세는 [docs/api-spec.md](docs/api-spec.md), 확인한 DB 관계는 [docs/database.md](docs/database.md)를 참고하세요.

양쪽 디렉터리에서 `npm test`, `npm run typecheck`, `npm run build`를 실행할 수 있습니다.
