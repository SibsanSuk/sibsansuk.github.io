# API Summary (dashboard.html only)

## Course
- `GET https://sbs-backend.mooc.meca.in.th/lms/{courseId}`

## User / Role
- `GET https://sbs-backend.mooc.meca.in.th/me`
  - Use this endpoint to inspect the current user's role data.
  - Expected use: determine whether the person is a student, a teacher, or both a teacher and student.

## Adaptive Quiz / Shared Learner Dashboard
- `GET https://edubot.abdul.in.th/adaptive-quiz/api/v1/shared-dashboard/learner/{learnerEmail}/by-lead-label/{leadLabel}?ref_code={refCode}`
- Required header:
  - `x-api-key: {apiKey}`
  - Do not commit the real API key into this file.
- Example tested on 2026-06-10:
  - learner email: `gm.akisame@gmail.com`
  - lead label: `NECTEC+KB-AC2+NECTEC_000036`
  - ref code: `0a5c7ebef1d54c1985393a91d9a902fd`
  - returned `HTTP 200 OK` with `application/json`
- Response shape:
  - top-level learner fields: `learner_email`, `learner_name`, `identity_type`, `lead_label`, `total_collections`, `collections`
  - each collection includes: `collection_id`, `collection_code`, `title`, `total_quizzes`, `quizzes_attempted`, `completion_pct`, `total_attempts`, `overall_avg_score_pct`, `overall_best_score_pct`, `pretest_best_score_pct`, `posttest_best_score_pct`, `improvement_pct`, `first_attempt_at`, `last_attempt_at`, `quizzes`
  - each quiz includes: `quiz_id`, `share_code`, `title`, `quiz_role`, `adaptive_strategy`, `display_order`, `max_questions`, `total_attempts`, `best_score_pct`, `latest_score_pct`, `avg_score_pct`, `best_correct_count`, `best_total_count`, `first_attempt_at`, `last_attempt_at`
- Example result from the test:
  - learner: `GM Akisame`
  - identity type: `registered`
  - collection: `Kidbright Autonomous EP.2`
  - completion: `100%`
  - total attempts: `6`
  - overall best score: `80%`
  - pretest best score: `80%`
  - posttest best score: `80%`
  - improvement: `0%`

## BookRoll / PDF
- `GET https://bookroll.thaidlt.com/meca/student/BR_activity?userID={userId}&usageId={courseId}`
- `GET https://bookroll.thaidlt.com/meca/student/readingData?userID={userId}&usageId={courseId}&view=student&ts={timestamp}`
- `dashboard.html` uses these exact URLs for BookRoll:
  - `BR_activity` at [dashboard.html](/Users/sibsan/GitHub/sibsansuk.github.io/VK/dashboard.html#L1068)
  - `readingData` at [dashboard.html](/Users/sibsan/GitHub/sibsansuk.github.io/VK/dashboard.html#L1071)
- Verified on 2026-03-30 with user `d23c25da-0d2c-4217-9e99-9be650a8712e` and course `course-v1:NECTEC+CODING_01+NECTEC_000013`
  - `BR_activity` returns ECharts option JSON with `xAxis.data` and stacked `series`
  - `readingData` returns a `results` object map in the form `{ "topic title": "read:total" }`
- `readingData` is parsed by `buildReadingProgressMap()` in [dashboard.html](/Users/sibsan/GitHub/sibsansuk.github.io/VK/dashboard.html#L1179)
- Legacy note:
  - `BR_readingPage` is mentioned in old notes, but a live check on 2026-03-30 returned `{"detail":"Not Found"}`
  - current dashboard does not use `BR_readingPage`

## Video
- `GET https://viola.thaidlt.com/meca/chart/bar/?userName={userName}&usageId={courseId}`
- `GET https://viola.thaidlt.com/meca/chart/heatmapTime/?userName={userName}&usageId={courseId}`
  - returns ECharts heatmap config
  - intended to show watch distribution / watch frequency by time bucket per video topic

## OIDC (login in dashboard)
- `GET https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/auth`
- `POST https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/token`
- `GET https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/userinfo`
- `GET https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/logout`
