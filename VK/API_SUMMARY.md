# API Summary (dashboard.html only)

## Course
- `GET https://sbs-backend.mooc.meca.in.th/lms/{courseId}`

## BookRoll / PDF
- `GET https://bookroll.thaidlt.com/meca/student/BR_activity?userID={userId}&usageId={courseId}`
- `GET https://bookroll.thaidlt.com/meca/student/readingData?userID={userId}&usageId={courseId}&view=student&ts={timestamp}`

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
