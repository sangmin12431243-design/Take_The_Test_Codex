# Take The Test Codex

개인용 4지선다 문제은행 웹앱의 초기 버전입니다.

## 기술 스택
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase(Auth + PostgreSQL)

## 시작하기
1. 의존성 설치
   ```bash
   npm install
   ```
2. 환경 변수 설정
   ```bash
   cp .env.example .env.local
   ```
3. `.env.local`에 Supabase 프로젝트 값을 입력
4. 개발 서버 실행
   ```bash
   npm run dev
   ```

## 구현된 범위
- 기본 프로젝트 세팅
- Supabase 클라이언트 연결
- Google OAuth 로그인/로그아웃 연결
- DB 스키마 기반 TypeScript 타입 정의
- 모바일 퍼스트 반응형 레이아웃
- 첫 페이지 메뉴 UI + 비로그인 상태 버튼 비활성화
- 라우트 페이지 골격 생성
  - `/`
  - `/problems`
  - `/quiz/setup`
  - `/quiz/play/[id]`
  - `/quiz/result/[id]`
  - `/wrong-notes`
  - `/starred`
  - `/resume`


## DB 스키마
- `supabase/schema.sql` 파일에 초기 테이블/제약조건/RLS 활성화 스크립트를 포함했습니다.


## 문제 관리 시스템(/problems)
- 로그인 사용자 기준 문제/카테고리 조회
- 문제 추가 + `problem_stats` 기본 row 생성
- 문제 수정(동일 폼 재사용)
- 문제 비활성화(`is_active=false`)
- 카테고리 생성/선택
- 검색/필터(카테고리, 난이도, 활성 여부, 키워드)
- 반응형 목록 UI(모바일 카드, PC 테이블)
- 퀴즈 출제용 조회는 `is_active=true`만 사용하도록 분리 함수 제공
