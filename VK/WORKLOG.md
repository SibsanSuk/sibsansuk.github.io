# VK Demo Worklog (For Next Agent)

Last updated: 2026-02-06

## Goal

Build a new UI (single-file HTML) that can:

- Let user choose a course (`courseid`) from `https://sbs-backend.mooc.meca.in.th/lms` (course list).
- Pass `courseid` + `userId` around via URL query params.
- Render dashboard analytics by calling multiple APIs (many are CORS-blocked in browser), so we added local `mock/*.json` for demo mode.
- Provide a separate course structure viewer page (`coursedetail.html`) for exploring course outline deeply.

## Important URLs / Params

- `courseid` (aka course key like `course-v1:NECTEC+CODING_01+NECTEC_000013`) is passed as `?courseid=...`.
- `userId` is passed as `?userId=...` in `dashboard.html` and as `?userid=...` in `coursedetail.html` (we also accept `userId`).
- Current repo path: `VK/`

## Files

- `index.html`
  - Main prototype app (React UMD + htm).
  - Adds a course picker that fetches course list from `https://sbs-backend.mooc.meca.in.th/lms`.
  - Stores selected course in URL `?courseid=...`.
  - The "Results" page iframe loads `dashboard.html?userId=...&courseid=...`.

- `dashboard.html`
  - Dashboard UI (Tailwind CDN + Chart.js).
  - Has login (OIDC PKCE) like `index.html`, plus manual inputs for `userId` + `courseid` with "ดึงข้อมูล" button.
  - Demo mode: add `?mock=1` (loads `mock/*.json`) to avoid CORS during local demos.
  - CORS: real APIs often fail when called from browser; demo uses mocks.
  - Added tabbed "หัวข้อการเรียนรู้" (chapters) from `courseDetailData`, and per-chapter detail panel.
  - Ordering:
    - Chapters: sorted by number in title (heuristic) and some grouping.
    - Sequentials + Verticals: sorted by `sortByContentOrder()` (Thai content ordering).
  - Vertical type badges:
    - Heuristic from child kinds + deep text scan (AE Tool subtype guesses).
  - Progress:
    - Added a computed per-vertical `%` (deterministic seed-based) + optional BookRoll max-page support (if BookRoll enabled).
    - Updates top "Overall Progress" and the main chart to "ความคืบหน้ารายบท (%)".
  - BookRoll sections are currently hidden by `SHOW_BOOKROLL = false`.

- `coursedetail.html`
  - Renamed from `course_detail_viewer.html` (still exists).
  - Reads URL params: `?courseid=...&userid=...` and updates URL as you type.
  - If `courseid` present, sets `input-url` to `https://sbs-backend.mooc.meca.in.th/lms/{courseid}` and tries to load it; if fail (CORS) falls back to mock.
  - Left: tree; Right: inspector.
  - Shows vertical tool badge at top-level (HTML vs AE Tool subtype), inferred from `vertical -> children -> kind:aetool -> fields.aetool` and fallbacks (deep text scan).
  - When selecting a chapter (activity), right panel shows Sequentials expanded, each with vertical list and tool badges.
  - Ordering of sequentials/verticals in right panel uses `contentGroup()` and numeric parsing; should match dashboard ordering.

- `course_detail_viewer.html`
  - Older viewer; still useful.
  - Can paste JSON, load mock, and inspect nested children + base64 images.
  - Note: mock loader was reverted to simple `fetch("mock/courseDetail.json")`.

- `mock/`
  - `mock/courseDetail.json`: pruned course structure for demo (real data fetched and pruned).
  - `mock/bookrollMaxPage.json`: echart config for "อ่านถึงหน้า".
  - `mock/bookrollActivity.json`: echart config for bookroll activity.
  - `mock/chatbotSpeed.json`: echart-like config (line series).
  - `mock/chatbotPerformance.json`: echart-like config (line series).
  - `mock/doneChapterView.json`: done chapter echart-like config.

## APIs Intended (Browser Often CORS-blocked)

- Course list: `https://sbs-backend.mooc.meca.in.th/lms`
- Course detail: `https://sbs-backend.mooc.meca.in.th/lms/{courseid}`
- BookRoll:
  - `https://bookroll.thaidlt.com/meca/student/BR_activity?userID={userId}&usageId={courseid}` (echart config)
  - `https://sbs-backend.mooc.meca.in.th/stats/echart/bookrollMaxPage/{courseid}/{userId}` (echart config)
- Chatbot:
  - `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/{courseid}/{userId}`
  - `https://sbs-backend.mooc.meca.in.th/stats/stats/echart/chatbotPerformance/{courseid}/{userId}`
- Done chapter:
  - `https://vk-analysis.learning.app.meca.in.th/analysis/donechapterview/{userId}/course/{courseid}`
  - `https://ae-backend.learning.app.meca.in.th/analysis/donechapterview/{userId}/course/{courseid}`
  - Note: browser errors showed CORS 500; also saw 404 when courseid accidentally became userid; guard logic added.

## Known Issues / Notes

- CORS blocks many APIs in browser (`localhost` not allowed). Demo uses mocks.
- Dashboard real/mock toggle is via querystring:
  - Real APIs by default
  - `?mock=1` uses `mock/*.json`
  - `?bookroll=1` enables BookRoll widgets
- `rg` isn't installed in environment; use `grep` instead.
- Some API responses were mojibake (UTF-8 decoded as Latin-1). We added `decodeIfMojibake()` in multiple files.
- Ordering is heuristic due to missing explicit `order/index` fields in course payload.
- `dashboard.html` currently uses deterministic seed-based progress when real per-vertical completion API doesn't exist; replace with real progress mapping later.

## Next Steps (Suggested)

- Add a single toggle UI in `dashboard.html` for demo mode (switch mock/real) instead of editing constants.
- Implement a proper proxy endpoint (server-side) to bypass CORS for real APIs.
- Replace heuristic vertical `%` with a real completion source if available (e.g., per-vertical completion API).
- Improve AE Tool subtype mapping by reading structured fields (e.g., `fields.aetool`, `fields.iframe_url`) consistently in `dashboard.html` (similar to `coursedetail.html`).
