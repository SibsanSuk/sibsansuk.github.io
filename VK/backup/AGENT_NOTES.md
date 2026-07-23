# Agent Notes (VK Learning Dashboard)

Last updated: 2026-07-23

This directory contains browser-based production entrypoints:

- `index.html`: role selection only; it contains no learner or course records.
- `teacher.html` + `teacher.js`: teacher dashboard.
- `student.html` + `student.js`: learner dashboard.
- `overview.json`: generated production aggregate used as the teacher landing page's primary data source.
- `gen-overview.mjs`: regenerates `overview.json` from the production enrollment API.
- `coursedetail.html`: course structure inspector using an explicit course ID, API URL, or manually pasted JSON.

## Data-safety policy

- Render only data returned by the configured production services or `overview.json` generated from those services.
- Do not add hardcoded learner, course, progress, score, analytics, or map records.
- `overview.json` is a declared primary source, not a fallback. If it is missing or invalid, show an error.
- Do not substitute another local file or a second API when the intended source fails.
- Treat missing identifiers, non-2xx responses, and unexpected response shapes as explicit empty/error states.
- BookRoll `readingData` must be requested once at course level. Do not fan out requests by tool or block ID.
- A test fixture may be used only inside automated tests and must never be reachable from a production entrypoint.

## Local verification

```bash
python3 -m http.server 3000
node --check teacher.js
node --check student.js
node --check gen-overview.mjs
```

Then open `http://localhost:3000/`.

Regenerate the landing aggregate with `node gen-overview.mjs`.

## Configuration

Production service URLs are declared near the top of `teacher.js` and `student.js`.
Runtime overrides, where supported, must be explicit and must not silently change service or identity when a request fails.
