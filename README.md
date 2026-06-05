# shiny-flow

> [한국어](./README.ko.md)

Visualize your Next.js App Router project as an interactive page-flow graph.

**Live demo: [shiny-flow.vercel.app](https://shiny-flow.vercel.app)**

---

## Features

**Analyzer**

- Scans pages and layouts across your Next.js App Router project
- Recursively traces `<Link>`, `router.push`, and `redirect` calls to build edges
- Automatically resolves `tsconfig.json` path aliases

**Flow Viewer**

- Auto-layout via Dagre
- Node grouping with collapse / expand
- Memos, color tags, and comment nodes
- Context menu on nodes, edges, and canvas
- JSON export / import to save and restore your graph

**Screenshots**

- Captures each page using Playwright
- Supports cookie-based and form-based authentication
- Re-capture with custom dynamic route parameters
- Detects and flags redirects

**Cloud (SaaS)**

- Save and load flows across sessions (GitHub login required)
- Generate shareable read-only links

---

## CLI

### Basic usage

Run inside your Next.js project directory with the dev server already running:

```bash
# Analyze the current directory and open with screenshots
npx shiny-flow .

# Specify a path explicitly
npx shiny-flow <path/to/your/project>

# Open the viewer only, without analysis or screenshots
npx shiny-flow
```

Passing a path (including `.`) automatically enables screenshot capture and project analysis. Without a path, only the viewer opens.

### Options

| Flag           | Alias | Default                 | Description                                          |
| -------------- | ----- | ----------------------- | ---------------------------------------------------- |
| `--url`        | `-u`  | `http://localhost:3000` | URL of the target dev server                         |
| `--port`       | `-p`  | `3000`                  | Port for the shiny-flow server                       |
| `--screenshot` | `-s`  | —                       | Enable screenshots (auto-enabled when path is given) |
| `--lang`       | `-l`  | `en`                    | Language (`en` / `ko`)                               |
| `--version`    | `-v`  | —                       | Print version                                        |

### Authentication

To capture screenshots of pages behind a login wall, generate an auth script in your project directory:

```bash
npx shiny-flow init
# or Korean template:
npx shiny-flow init --lang ko
```

This creates `shiny-flow.auth.js` — edit it with your login logic (Playwright API). It is auto-loaded when you pass a project path.

```bash
npx shiny-flow <path/to/your/project>
```

**Example: form-based login**

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

Replace the selectors and credentials with the values for your app. The `page` argument is a [Playwright `Page`](https://playwright.dev/docs/api/class-page) object, so any Playwright API is available.

---

## Web App

Visit [shiny-flow.vercel.app](https://shiny-flow.vercel.app) and point it at your running local dev server.

Sign in with GitHub to save flows and share them with a link.

---

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- React Flow (@xyflow/react), Dagre
- Supabase, Auth.js v5
- Playwright
