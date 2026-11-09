# selfbooks_test
셀프북스 테스트 환경입니다. Node.js 24와 npm을 사용합니다.

## 로컬 실행

두 터미널에서 각각 실행합니다.

```sh
cd backend
npm ci
npm run dev
```

```sh
cd frontend
npm ci
npm run dev
```

Nuxt는 `http://localhost:3000`, Fastify API는 `http://localhost:4000/api`에서 접속할 수 있습니다. Nuxt에서 **매입매출관리 → 수임업체관리**를 열면 개발용 목록을 볼 수 있습니다.

## 환경변수

- 프로젝트 루트 `.env`에 Supabase Connect 화면의 Session pooler 주소를 `DIRECT_URL`로 설정합니다. 비밀번호 자리의 예시 대괄호는 제거하고 예약 문자는 URL 인코딩합니다. `DIRECT_URL`이 없으면 `DATABASE_URL`을 사용합니다.
- Supabase Dashboard의 Database Settings → SSL Configuration에서 CA를 내려받아 PEM 파일 경로를 `DB_SSL_CA_PATH`에 지정합니다. 상대 경로의 기준은 프로젝트 루트입니다. Fastify의 DB 연결은 CA 체인과 호스트명을 검증합니다. [Supabase PostgreSQL SSL 설정](https://supabase.com/docs/guides/platform/ssl-enforcement)
- `DEV_FIXTURE_OFFICE_ID`와 쉼표로 구분한 `DEV_FIXTURE_CLIENT_IDS`에는 확인된 합성 테스트 레코드의 UUID만 지정합니다. 두 설정을 비우면 디렉터리 API가 503을 반환합니다.
- 포트가 충돌하면 `BACKEND_PORT` 또는 Nuxt의 `--port` 옵션을 조정하고 각각 `frontend/.env`의 `NUXT_PUBLIC_API_BASE`, 루트 `.env`의 `FRONTEND_ORIGIN`을 함께 맞춥니다. 브라우저 설정에는 Fastify API 주소만 들어갑니다.

Fastify는 로컬 개발 모드에서 루프백에 바인딩합니다. 터널이나 역방향 프록시로 공개하지 마세요. 실제 서비스에서는 사용자 인증, 사무소 단위 권한 검증, RLS가 적용되는 최소 권한 DB 역할이 필요합니다.

API 명세는 [docs/api-spec.md](docs/api-spec.md), 확인한 DB 관계는 [docs/database.md](docs/database.md)를 참고하세요.

양쪽 디렉터리에서 `npm test`, `npm run typecheck`, `npm run build`를 실행할 수 있습니다.
