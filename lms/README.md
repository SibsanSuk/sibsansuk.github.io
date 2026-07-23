# MECA LMS dashboards

The `lms` project uses Vite as a multi-page build system. The existing
dashboard behavior remains unchanged:

- `teacher.html` is the teacher dashboard React entry point.
- `student.html` is the student dashboard entry point.
- `src/teacher/main.jsx` owns the teacher React root and compiled Tailwind CSS.
- `src/teacher/components/LegacyTopBar.jsx` is the active React TopBar and
  preserves the original dashboard design and interactions.
- `src/teacher/components/` also contains in-progress React equivalents of the
  teacher landing page, dashboard views, student drawer, and modals.
- `teacher.js` remains the active visual renderer for every view except the
  TopBar, and remains the shared data controller during the migration.
- `student.js` remains a vanilla JavaScript entry module.
- `overview.json` is emitted as a versioned production asset.

## Requirements

- Node.js 20.19 or newer (Node.js 22.12+ and 24+ are also supported)
- npm

## Development

Install dependencies:

```sh
npm install
```

Start the Vite development server:

```sh
npm run dev
```

Open one of these pages:

```text
http://localhost:3000/teacher.html
http://localhost:3000/student.html
```

OIDC must allow the localhost callback URL before a complete local sign-in can
be tested.

Vite proxies Teacher video-progress requests through `/__viola` during local
development because the upstream service only allows the production website
origin in browser CORS responses. Production builds continue to use the
upstream HTTPS URL directly.

## Production build

```sh
npm run build
```

Vite writes the static production site to `dist/`. Both HTML entry points keep
their existing names, and JavaScript, CSS, and JSON assets receive content
hashes for safe browser caching.

To inspect the production output locally:

```sh
npm run preview
```

The generated `dist/` directory is intentionally not committed. Deployment
should publish its contents at the existing `/lms/` path so the production OIDC
callback URLs remain unchanged.

## Teacher migration

The teacher page uses a React-owned root and build-time Tailwind through Vite.
The TopBar is the first active React island: `LegacyTopBar.jsx` subscribes to
the existing teacher state and the legacy `viewTopBar()` output is disabled.
The existing `teacher.js` renderer remains active for the rest of the page as
the visual source of truth. Additional React components should only replace an
existing view after desktop, tablet, and phone screenshot comparisons pass.

After all views reach parity, `teacher.js` can switch back to headless mode,
then its controller can be extracted into focused service/store modules and the
old inline-template renderer can be deleted.

## Data generation

Regenerate `overview.json` with:

```sh
npm run generate:overview
```
