# Agent Notes (VK LMS/Dashboard Prototype)

Last updated: 2026-02-06

This repo folder (`VK/`) is a browser-only prototype (single-file HTML pages) to demo:

- Course selection from SBS LMS (`courseid` in querystring).
- Dashboard analytics UI driven by `userId` + `courseid`.
- Course structure explorer (`coursedetail.html`) that shows chapter -> sequential -> vertical and the AE tool subtype (bookroll/video/chatbot/etc).
- Demo mode using `mock/*.json` to avoid CORS during stakeholder review.

If you are continuing this work, also read `WORKLOG.md` (it contains deeper background + API list).

## Quick Start (Local Demo)

1. Start a static server from `VK/`:

```bash
python3 -m http.server 3000
```

2. Open:

- `http://localhost:3000/index.html`
- `http://localhost:3000/dashboard.html?userId=<uuid>&courseid=<course-v1:...>`
- `http://localhost:3000/coursedetail.html?userid=<uuid>&courseid=<course-v1:...>`

## URL Params (Shareable Links)

- `courseid`: course key like `course-v1:NECTEC+CODING_01+NECTEC_000013`
- `userId`: used in `dashboard.html`
- `userid`: used in `coursedetail.html` (it also accepts `userId`)

Both `dashboard.html` and `coursedetail.html` update the querystring when you type, so copy/paste URLs reproduce the same view.

## Pages

- `index.html`
  - Fetches course list from `https://sbs-backend.mooc.meca.in.th/lms`.
  - Shows course picker (label = `courseTitle`, value = `course_key` -> `courseid`).
  - Loads dashboard in an iframe: `dashboard.html?userId=...&courseid=...`.

- `dashboard.html`
  - Main stakeholder-facing dashboard (UI-first, hides raw JSON behind collapsible sections).
  - Has login (OIDC PKCE) similar to `index.html` plus manual inputs for `userId` + `courseid`.
  - Uses multiple APIs, but browser CORS blocks many, so it supports mock mode via `mock/*.json`.
  - API mode:
    - Real APIs by default.
    - Add `?mock=1` to load `mock/*.json` instead (for CORS-free demos).
    - Add `?bookroll=1` to enable BookRoll sections.
  - Bottom area uses tabs per chapter/learning topic, and shows per-sequential/per-vertical detail.
  - Current chapter list UI: renders a per-chapter accordion list (instead of visible tabs) showing:
    - Header: chapter title, item count, chapter %.
    - Expanded: vertical items with status dot (done/doing/todo) + tool type + ID.
  - Sorting is important: chapter/sequential/vertical ordering is heuristic because payload lacks an explicit `order/index`.

- `coursedetail.html`
  - Course structure explorer: left = activities/chapters, right = sequentials expanded and verticals listed.
  - Shows vertical type at the top-level:
    - `html`
    - `aetool` subtype (tries to infer deep, e.g. `bookroll`, `video`, `simulator`, `chatbot`, `iframe`)
  - If `courseid` exists, tries to fetch `https://sbs-backend.mooc.meca.in.th/lms/{courseid}` and falls back to mock if it fails.

## Mock Data

Folder `mock/` contains demo payloads used when real APIs are CORS-blocked:

- `mock/courseDetail.json`
- `mock/doneChapterView.json`
- `mock/chatbotSpeed.json`
- `mock/chatbotPerformance.json`
- `mock/bookrollMaxPage.json`
- `mock/bookrollActivity.json`

When adding a new API widget, prefer:

- Save a representative response as `mock/<name>.json`.
- Load it from the UI under a `USE_MOCK_API` flag so the demo works offline/CORS-free.

## Ordering (Why + How)

The course payloads observed so far do not expose a stable ordering field for activities/sequentials/verticals.
To keep the UI readable:

- Chapters are ordered by parsing numbers from titles (heuristic).
- Sequentials and verticals are ordered by Thai content grouping (heuristic), e.g. objective/indicator/content/activity/quiz.

If you get a better ordering signal from the API (like `position`, `index`, `order`, `start`), replace heuristics with that.

## Known Constraints / Gotchas

- CORS: calling these APIs directly from `http://localhost:3000` often fails.
- Mojibake: some strings in payloads are UTF-8 mis-decoded; there are helper functions in the pages to detect/fix.
- Progress per vertical in `dashboard.html` is currently heuristic/deterministic (not true completion) until real completion sources exist.

## Next Improvements (Most Valuable)

1. Add a clear UI toggle in `dashboard.html` for mock vs real.
2. Introduce a small proxy (or deploy-side proxy) to bypass CORS for real demo.
3. Replace heuristic completion with real per-vertical completion signals (if/when APIs exist).
4. Unify "AE tool subtype" inference logic between `coursedetail.html` and `dashboard.html` (prefer structured fields over text scanning).
