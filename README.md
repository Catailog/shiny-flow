# shiny-flow

> [한국어](https://github.com/Catailog/shiny-flow/blob/main/README.ko.md)

Visualize your Next.js App Router project as an interactive page-flow graph.

**Live demo: [shiny-flow.vercel.app](https://shiny-flow.vercel.app)**

---

## Features

**Analyzer**

- Scans pages and layouts across your Next.js App Router project
- Traces `<Link>`, `router.push`, `router.replace`, and `redirect` calls to build edges
- Handles dynamic route segments: `[param]`, `[...slug]`, `[[...slug]]`
- Resolves `tsconfig.json` path aliases

**Canvas**

- Node grouping, memos, color tags, and connections
- Comment nodes
- JSON import / export

**Page Capture**

- Captures each page as a screenshot using Playwright and attaches it to the node
- Supports form-based login authentication
- Specify dynamic route parameters via `params.json`
- Detects and flags redirects

**Cloud (SaaS)**

- Save and load flows (GitHub login required)
- Generate read-only share links

---

## CLI

### Basic usage

Run with the target project's dev server already running.

```bash
# Open the canvas without analysis or page capture
npx shiny-flow

# Analyze the current directory
npx shiny-flow .

# Specify a path explicitly
npx shiny-flow <path/to/project>
```

Without a path, only the canvas opens. Passing a path analyzes the project and builds the graph.

### Options

| Flag           | Alias | Default                 | Description                    |
| -------------- | ----- | ----------------------- | ------------------------------ |
| `--url`        | `-u`  | `http://localhost:3000` | URL of the target dev server   |
| `--port`       | `-p`  | `3000`                  | Port for the shiny-flow server |
| `--screenshot` | `-s`  | -                       | Enable page capture            |
| `--lang`       | `-l`  | `en`                    | Language (`en` / `ko`)         |
| `--version`    | `-v`  | -                       | Print version                  |

### Capture setup

Configuration required when using page capture (`-s`). Run `init` to generate the config files in `.shiny-flow/`.

```bash
npx shiny-flow init
# Korean template:
npx shiny-flow init --lang ko
```

#### Authentication (`auth.js`)

Used when capturing pages behind a login wall. Loaded automatically when running with `-s`.

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

Replace the selectors and credentials with the values for your app. The `page` argument is a [Playwright `Page`](https://playwright.dev/docs/api/class-page) object, so any Playwright API is available.

#### Dynamic route parameters (`params.json`)

Pre-filled with every dynamic route found in your project. Assign a value to each parameter — routes with no entry are skipped during capture.

```json
{
  "/blog/[slug]": { "slug": "hello-world" },
  "/users/[id]/posts/[postId]": { "id": "1", "postId": "42" }
}
```

---

## Web App

Analyze locally with the CLI, export as JSON, then upload it at [shiny-flow.vercel.app](https://shiny-flow.vercel.app) to open it in the canvas.

Sign in with GitHub to save flows and generate share links.

---

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- React Flow (@xyflow/react), Dagre
- Supabase, Auth.js v5
- Playwright
