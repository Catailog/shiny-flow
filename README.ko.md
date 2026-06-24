# shiny-flow

> [English](./README.md)

Next.js App Router 프로젝트를 인터랙티브 페이지 플로우 그래프로 시각화하는 도구.

**Live demo: [shiny-flow.vercel.app](https://shiny-flow.vercel.app)**

---

## 기능

**분석기**

- Next.js App Router 전체 페이지, 레이아웃 탐색
- `<Link>`, `router.push`, `router.replace`, `redirect` 호출을 추적해 엣지 생성
- 동적 라우트 세그먼트 지원: `[param]`, `[...slug]`, `[[...slug]]`
- `tsconfig.json` paths alias 인식

**캔버스**

- 노드 그룹화, 메모, 색상 태그, 연결
- 댓글 작성
- JSON 불러오기/내보내기

**페이지 캡처**

- Playwright로 각 페이지 스크린샷 캡처 및 노드/엣지 생성
- Form 로그인 인증 지원
- `params.json`으로 동적 라우트 파라미터 지정
- 리다이렉트 감지 및 별도 아이콘 표시

**클라우드 (SaaS)**

- Flow 저장/불러오기 (GitHub 로그인 필요)
- 읽기 전용 공유 링크 생성

---

## CLI

### 기본 사용법

분석 대상 프로젝트 디렉토리에서 dev server를 실행한 뒤 사용한다.

```bash
# 분석/페이지 캡처 없이 캔버스만 열기
npx shiny-flow

# 현재 디렉토리를 분석
npx shiny-flow .

# 경로를 직접 지정
npx shiny-flow <프로젝트/경로>
```

경로 없이 실행하면 빈 캔버스만 열린다. 경로를 지정하면 프로젝트를 분석해 그래프를 함께 만든다.

### 옵션

| 플래그         | 단축 | 기본값                  | 설명                 |
| -------------- | ---- | ----------------------- | -------------------- |
| `--url`        | `-u` | `http://localhost:3000` | 대상 dev server URL  |
| `--port`       | `-p` | `3000`                  | shiny-flow 서버 포트 |
| `--screenshot` | `-s` | -                       | 스크린샷 활성화      |
| `--lang`       | `-l` | `en`                    | 언어 (`en` / `ko`)   |
| `--version`    | `-v` | -                       | 버전 출력            |

### 캡처 설정

`-s`로 페이지 캡처를 사용할 때 필요한 설정이다. `init` 명령으로 `.shiny-flow/` 디렉토리에 설정 파일을 생성한다.

```bash
npx shiny-flow init
# 한국어 템플릿:
npx shiny-flow init --lang ko
```

#### 인증 (`auth.js`)

로그인이 필요한 페이지를 캡처할 때 사용한다. `-s` 옵션으로 실행하면 자동으로 불러온다.

```js
// .shiny-flow/auth.js
module.exports = async function authenticate(page, baseUrl) {
  await page.goto(baseUrl + '/login');
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'yourpassword');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
};
```

셀렉터와 계정 정보를 실제 앱에 맞게 바꾸면 된다. `page`는 [Playwright `Page`](https://playwright.dev/docs/api/class-page) 객체이므로 Playwright의 모든 API를 사용할 수 있다.

#### 동적 라우트 파라미터 (`params.json`)

프로젝트에서 감지된 동적 라우트가 미리 채워진다. 각 파라미터에 값을 지정하면 캡처 시 해당 경로로 접근하며, 항목이 없는 라우트는 건너뛴다.

```json
{
  "/blog/[slug]": { "slug": "hello-world" },
  "/users/[id]/posts/[postId]": { "id": "1", "postId": "42" }
}
```

---

## 웹앱

CLI로 로컬에서 분석한 뒤 JSON으로 내보내고, [shiny-flow.vercel.app](https://shiny-flow.vercel.app) 에 업로드하면 캔버스에서 열린다.

GitHub 로그인 후 Flow를 저장하고 공유 링크를 발급할 수 있다.

---

## 기술 스택

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- React Flow (@xyflow/react), Dagre
- Supabase, Auth.js v5
- Playwright
