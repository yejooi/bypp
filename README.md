# Flushlist (bypp)

**장바구니에 잔뜩 담아두고 뭘 살지 못 정하는 사람이, 이번 달 예산 안에서 결정을 끝내도록 돕는 웹 서비스.**

기존 위시리스트·가계부 앱이 "너무 많이 산다"를 막는다면, Flushlist는 **"못 고른다"를 풀어 줍니다.**
사도 되는 것도, 안 사기로 한 것도 모두 "정리 완료"로 셉니다. 해커톤(BYPP) 출품작이며 1인 개발입니다.

- 배포: https://bypp-hackathon.netlify.app
- 프로젝트 회고(왜 만들었는지, 결정과 문제 해결): [docs/PROJECT_RETROSPECTIVE.md](docs/PROJECT_RETROSPECTIVE.md)
- 기획 원칙과 설계 문서: [CLAUDE.md](CLAUDE.md), [PRODUCT.md](PRODUCT.md)

## 주요 기능

1. **목표와 월 예산 정하기**
   - 목표(1억 모으기, 내집마련, 여행 자금, 직접 입력)와 금액을 정합니다.
   - 월 예산은 직접 입력하거나, 수입·고정 소비·기한을 넣으면 몬테카를로 시뮬레이션(1,000회)으로 권장 저축액과 추천 월 예산을 계산합니다. (입력은 모두 만원 단위)
2. **물건 담기**
   - 장바구니 **스크린샷**을 올리면 AI가 상품명·가격·사진을 자동으로 인식합니다. 광고·추천 상품은 제외합니다.
   - 상품 **링크**를 붙여 넣으면 이름·가격·사진을 가져옵니다. 막힌 사이트(예: 쿠팡)는 수동 입력이나 스크린샷으로 넣을 수 있습니다.
   - 급한 정도, 갖고 싶은 정도, 오래 쓸 것 같은 정도를 1~5로 고르면 점수에 반영됩니다. (기본값 3, 선택 입력)
3. **정리하기 (보드)**
   - 구역: 장바구니 주머니 · AI 심사대 · 살 물건 가판대 · 반품함 · 계산대
   - 물건을 끌어다 놓거나, 톡 눌러 나오는 옮기기 메뉴로 옮깁니다. (폰에서는 길게 눌러 끌기)
   - 가판대는 순서대로 금액을 쌓다가 **예산을 넘는 물건부터 자동으로 "다음 달 선반"** 으로 내립니다.
   - 계산과 반품은 5초 안에 되돌릴 수 있고, 한 번에 계산하기는 확인창을 거칩니다.
   - 이미 산 금액은 이번 달 예산에서 빼서 "남은 예산"으로 보여 줍니다.
4. **AI 판정**
   - 고민되는 물건만 AI 심사대에 올려 판정을 받으면, 물건마다 점수(30~100)가 붙고 마우스를 올리면 이유가 보입니다.
   - AI는 항목별 파라미터(만족 지속 기간, 사용 빈도, 장바구니 중복)만 **추정**하고, 순위 계산은 **코드**가 합니다. 그래서 같은 입력에 결과가 흔들리지 않습니다.
   - "가격순 ↔ AI 판단" 슬라이더(30~100, 기본 65)로 가격 효율과 정성 점수의 비율을 조절합니다.
   - 순서는 참고용이고 **최종 결정은 사용자**가 합니다.
5. **진행 상황**: 하단 바에 절약 진행률과 이번 달 저축액이 표시되고, 아끼거나 넘긴 만큼 캐릭터(치즈냥이)가 말해 줍니다.
6. **이웃 구경과 프로필**: 프로필 사진을 올릴 수 있고, 다른 사용자의 주머니·가판대·계산 완료를 (가격 없이) 구경할 수 있습니다.
7. **튜토리얼**: 계정별로 처음 한 번 자동으로 뜨고, 헤더의 "이용 방법"으로 다시 볼 수 있습니다.

## 설계 원칙

- 결정권은 사용자에게 있다. AI는 막혔을 때만 등장한다.
- 절약을 강요하지 않는다. "사도 됨"은 실패가 아니다.
- 메시지는 해결책 형태로 쓴다. 죄책감이나 손실 프레임을 쓰지 않는다.
- LLM에게 순위를 직접 묻지 않는다. 추정은 LLM, 계산은 코드.
- 어떤 실패든 화면이 비지 않게 한다. (AI 응답 누락, 링크 차단, DB 컬럼 누락 등에 폴백)
- 재미는 장식이 아니라 기능이다. (동물의 숲 스킨, 시그니처 캐릭터)

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19 |
| 스타일 | Tailwind CSS v4 |
| 드래그 앤 드롭 | @dnd-kit/core |
| DB / 인증 | Supabase (Postgres, Auth, RLS) |
| AI | Anthropic API (서버 라우트 전용, `claude-sonnet-5`) |
| 링크 파싱 | cheerio (OG 태그) |
| 배포 | Netlify |

## 로컬에서 실행하기

```bash
npm install
cp .env.example .env.local   # 없다면 아래 환경변수를 직접 만든다
npm run dev
```

http://localhost:3000 에서 확인합니다. 같은 와이파이의 폰에서 확인하려면 `npx next dev -H 0.0.0.0` 으로 실행하고 `http://<컴퓨터 IP>:3000` 으로 접속합니다. (`next.config.ts`의 `allowedDevOrigins`에 주소를 허용해 둬야 합니다.)

### 환경변수 (`.env.local`)

| 이름 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 (클라이언트 노출 가능) |
| `ANTHROPIC_API_KEY` | Anthropic API 키. **서버 라우트에서만 사용하며 절대 클라이언트에 노출하지 않는다** |

### 데이터베이스 준비

1. Supabase 프로젝트를 만들고, 기본 테이블(`sessions`, `items`, `evaluations`)을 [CLAUDE.md](CLAUDE.md) 9-3의 스키마대로 만듭니다.
2. Auth 설정에서 **Confirm email을 끕니다.** (닉네임 + 비밀번호 로그인은 내부용 가짜 이메일을 쓰기 때문)
3. `supabase/migrations/` 의 SQL을 번호 순서대로 SQL Editor에서 실행합니다.

| 파일 | 내용 |
|---|---|
| `0001_fix_rls_and_add_columns.sql` | RLS 정책 재정비, 컬럼 추가 |
| `0002_add_auth_and_profiles.sql` | 로그인용 `profiles` 테이블과 정책 |
| `0003_add_sort_order.sql` | 가판대 순서 (`items.sort_order`) |
| `0004_add_user_ratings.sql` | 1~5 평가 (`urgency`, `desire`, `longevity`) |
| `0005_add_monthly_saving.sql` | 권장 월 저축액 (`sessions.monthly_saving`) |
| `0006_add_avatar_url.sql` | 프로필 사진 (`profiles.avatar_url`) |

일부 컬럼이 없어도(마이그레이션 전) 앱은 동작하지만, 해당 값은 저장되지 않습니다.

## 폴더 구조

```
src/app/
  page.tsx            목표 선택
  budget/             월 예산 설정 (직접 입력 / 몬테카를로)
  board/              메인 보드 (주머니, 심사대, 가판대, 반품함, 계산대)
  login/              닉네임 + 비밀번호 로그인·가입
  wishlists/, u/      이웃 목록과 이웃 위시리스트
  api/
    evaluate/         AI 판정 (로그인 필수, 호출 횟수 제한)
    parse-screenshot/ 스크린샷 인식 (로그인 필수, 호출 횟수 제한)
    parse-link/       링크 OG 파싱 (로그인 필수)
src/components/       보드 UI 조각 (Mascot, Tutorial, ProgressRunner 등)
src/lib/
  scoring.ts          점수 계산 (LLM 추정 + 규칙 기반 + 슬라이더 가중치)
  montecarlo.ts       예산 역산 시뮬레이션
  store.tsx           앱 상태와 Supabase 동기화
  auth.tsx            닉네임 로그인
scripts/              AI 판정 재현성 검증 스크립트 (Phase 1)
supabase/migrations/  DB 마이그레이션
docs/                 프로젝트 회고, 작업 문서
public/tutorial/      튜토리얼용 실제 화면 캡처
```

## 배포

Netlify에 배포합니다. (Vercel 무료 플랜의 하루 배포 한도에 걸려 이전)

```bash
npx netlify-cli deploy --build --prod
```

환경변수 3개를 Netlify 사이트 설정에도 넣어야 합니다. 배포는 로컬에서 확인한 뒤에 한 번씩만 합니다.

## 고지

- 만족 지속 기간과 사용 빈도는 AI 추정값이며 실측이 아닙니다.
- 참고용 판단이며 투자·재무 조언이 아닙니다. 지출 결정의 책임은 사용자에게 있습니다.

## 알려진 한계

- 판정 점수는 이번에 함께 올린 물건들 안에서의 **상대 점수**이며, 새로고침하면 사라집니다.
- 이웃 화면의 가격 숨김은 화면에서만 적용됩니다. (DB 읽기 정책은 공개)
- 쿠팡처럼 봇 차단이 있는 사이트는 링크로 가져올 수 없어 스크린샷이나 수동 입력을 써야 합니다.
- 서비스명은 Flushlist를 쓰고 있으며, 최종 확정은 아직입니다.
