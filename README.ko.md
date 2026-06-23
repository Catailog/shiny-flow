# shiny-flow

> [English](./README.md)

Next.js App Router 프로젝트를 인터랙티브 페이지 플로우 그래프로 시각화하는 도구.

**Live demo: [shiny-flow.vercel.app](https://shiny-flow.vercel.app)**

---

## 기능

**분석기**

- Next.js App Router 전체 페이지·레이아웃 자동 탐색
- `<Link>`, `router.push`, `redirect` 호출을 재귀적으로 추적해 엣지 생성
- `tsconfig.json` paths alias 자동 인식

**Flow 뷰어**

- Dagre 자동 레이아웃
- 노드 그룹화 / 접기·펼치기
- 메모, 색상 태그, 댓글 노드
- 노드·엣지·캔버스 컨텍스트 메뉴
- JSON 내보내기 / 불러오기로 그래프 저장·복원

**스크린샷**

- Playwright로 각 페이지 스크린샷 캡처
- 쿠키·Form 로그인 인증 지원
- 동적 라우트 파라미터 직접 입력 후 재캡처
- 리다이렉트 감지 및 별도 아이콘 표시

**클라우드 (SaaS)**

- Flow 저장·불러오기 (GitHub 로그인 필요)
- 읽기 전용 공유 링크 생성

---

## CLI

### 기본 사용법

분석 대상 프로젝트 디렉토리에서 dev server를 실행한 뒤 사용한다.

```bash
# 현재 디렉토리를 분석 (스크린샷 없음)
npx shiny-flow .

# 분석 + 스크린샷
npx shiny-flow . -s

# 경로를 직접 지정
npx shiny-flow <프로젝트/경로> -s

# 분석·스크린샷 없이 뷰어만 열기
npx shiny-flow
```

경로(`.` 포함)를 넘기면 프로젝트 분석이 활성화된다. 스크린샷을 함께 찍으려면 `-s`를 추가한다. 경로 없이 실행하면 뷰어만 열린다.

### 옵션

| 플래그         | 단축 | 기본값                  | 설명                                       |
| -------------- | ---- | ----------------------- | ------------------------------------------ |
| `--url`        | `-u` | `http://localhost:3000` | 대상 dev server URL                        |
| `--port`       | `-p` | `3000`                  | shiny-flow 서버 포트                       |
| `--screenshot` | `-s` | —                       | 스크린샷 활성화                            |
| `--lang`       | `-l` | `en`                    | 언어 (`en` / `ko`)                         |
| `--version`    | `-v` | —                       | 버전 출력                                  |

### 인증

로그인이 필요한 페이지를 캡처하려면 프로젝트 디렉토리에서 인증 스크립트를 생성한다.

```bash
npx shiny-flow init
# 한국어 템플릿:
npx shiny-flow init --lang ko
```

`shiny-flow.auth.js`가 생성된다. Playwright API로 로그인 로직을 작성하면 프로젝트 경로를 넘길 때 자동으로 불러온다.

```bash
npx shiny-flow <프로젝트/경로>
```

**예시: form 로그인**

```js
// shiny-flow.auth.js
module.exports = async function authenticate(page, baseUrl) {
  await page.goto(baseUrl + '/login');
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'yourpassword');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
};
```

셀렉터와 계정 정보를 실제 앱에 맞게 바꾸면 된다. `page`는 [Playwright `Page`](https://playwright.dev/docs/api/class-page) 객체이므로 Playwright의 모든 API를 사용할 수 있다.

---

## 웹앱

[shiny-flow.vercel.app](https://shiny-flow.vercel.app) 에 접속해 로컬 dev server 주소를 입력한다.

GitHub 로그인 후 Flow를 저장하고 공유 링크를 발급할 수 있다.

---

## 기술 스택

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- React Flow (@xyflow/react), Dagre
- Supabase, Auth.js v5
- Playwright
