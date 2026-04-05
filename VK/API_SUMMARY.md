# API Summary (dashboard.html only)

## Course
- `GET https://sbs-backend.mooc.meca.in.th/lms/{courseId}`

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
