# SelfBooks 구조

프런트엔드 구현 기준은 [프런트엔드 아키텍처](frontend-architecture.md), 화면과 토큰 기준은 [공통 UI 시스템 지시서](ui-system-spec.md)를 참조한다.

Nuxt는 파일 기반 라우트와 작업 공간 레이아웃을 제공한다. 업무 화면·편집 상태·조회 서비스는 기능별로 분리한다. 서버 데이터는 Fastify API를 경유한다. 로컬 개발 읽기 범위와 응답 계약은 [API 명세](api-spec.md) 및 [DB 설계](database.md)에 기록한다.
