# API Summary (dashboard.html only)

## Course
- `GET https://sbs-backend.mooc.meca.in.th/lms/{courseId}`

## BookRoll / PDF
- `GET https://bookroll.thaidlt.com/meca/student/BR_activity?userID={userId}&usageId={courseId}`
- `GET https://bookroll.thaidlt.com/meca/student/readingData?userID={userId}&usageId={courseId}&view=student&ts={timestamp}`

## Video
- `GET https://viola.thaidlt.com/meca/chart/bar/?userName={userName}&usageId={courseId}`

## Chatbot
- `GET https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/{courseId}/{userId}`
- `GET https://sbs-backend.mooc.meca.in.th/stats/stats/echart/chatbotPerformance/{courseId}/{userId}`

## Done Chapter
- `GET https://vk-analysis.learning.app.meca.in.th/analysis/donechapterview/{userId}/course/{courseId}`
- `GET https://ae-backend.learning.app.meca.in.th/analysis/donechapterview/{userId}/course/{courseId}`

## OIDC (login in dashboard)
- `GET https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/auth`
- `POST https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/token`
- `GET https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/userinfo`
- `GET https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/logout`
