# VK Dashboard Worklog

## 2026-07-23 — Production data hardening

- Removed mock JSON payloads and replaced the old landing snapshot with a production-generated `overview.json`.
- Replaced the old root prototype with a role-selection page that contains no course, learner, score, or analytics records.
- Removed obsolete root-level prototype and backup files that embedded hardcoded records.
- Removed archived dashboards and captured static payloads that exposed embedded learner emails and results.
- Removed the course-detail viewer's automatic local-data path. It now requires a course ID, an API URL, or manually pasted JSON.
- Teacher landing analytics use `overview.json` as their only source. `gen-overview.mjs` refreshes it from the production enrollment API and writes it atomically.
- Removed teacher access to the management email query that returned `401` for the teacher role.
- Student identity for UUID-only services is resolved from the selected classroom roster only. If unavailable, that service is skipped with an explicit message.
- Teacher BookRoll uses the learner email and selected course ID once.
- Student BookRoll uses one course-level `readingData` request. Per-tool request fan-out was removed.
- Video progress uses the documented email identifier once and does not retry with a different identity.
- The Leado enrollment client now uses the production adaptive-profile host.

## Required behavior

When an upstream service fails, preserve the failure as an error state. Do not replace it with cached sample data, generated values, another identity, another endpoint, or block-level request fan-out.
