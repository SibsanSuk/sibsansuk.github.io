# Student Dashboard v2: API และลำดับการทำงาน

เอกสารนี้สรุป API ที่หน้า `studentv2/student.html` เรียกใช้งานจริงจากโค้ด `studentv2/student.js` เพื่อให้ทีม Product, Frontend และ Backend ใช้อ้างอิงร่วมกัน

- ขอบเขต: Student Dashboard v2 (`/studentv2`)
- วันที่ตรวจโค้ด: 18 สิงหาคม 2026
- แหล่งอ้างอิงหลัก: `studentv2/student.html` และ `studentv2/student.js`
- เอกสารนี้อธิบายพฤติกรรมของโค้ดปัจจุบัน ไม่ได้ยืนยันสัญญา API ฝั่ง Backend หรือแทน OpenAPI specification

## สรุปสำหรับทีม

หน้า Student Dashboard ใช้ `courseid` จาก URL และข้อมูลผู้เรียนจาก OIDC เป็นตัวเชื่อมข้อมูลจากหลายระบบ โดยมี Course API เป็น API แรกที่ต้องสำเร็จก่อน แล้วจึงเรียก API ของเครื่องมือการเรียนที่มีอยู่ในรายวิชา

ข้อควรรู้ที่สำคัญ:

1. Course tree เป็น dependency หลัก หากโหลดไม่สำเร็จ API ข้อมูลการเรียนอื่นจะถูกข้าม
2. BookRoll, VK และ API เดิมของ Chatbot ใช้ `userId` ที่ resolve จาก OIDC โดยคาดหวังให้เป็น Keycloak `sub`
3. Video, Chatbot API ใหม่ และ Adaptive Quiz ใช้อีเมลจาก OIDC profile
4. เปอร์เซ็นต์ความคืบหน้ารวมคำนวณจาก BookRoll และ Video ที่จับคู่กับ course tree ได้เท่านั้น
5. คะแนน Chatbot และข้อมูล VK แสดงบน dashboard แต่ยังไม่รวมในเปอร์เซ็นต์ความคืบหน้ารวม
6. Chatbot ใช้ API ใหม่ก่อน ถ้าไม่มีข้อมูลหรือเรียกไม่ได้จึง fallback ไป API เดิมของ SBS ยกเว้นกรณี API ใหม่ตอบ `401`
7. VK เรียกหนึ่งครั้งระดับรายวิชา แล้ว fan-out เพิ่มหนึ่งครั้งต่อบทที่ API ระดับรายวิชาระบุ
8. Adaptive Quiz shared dashboard ถูกโหลดมาเก็บและแสดงใน debug status แต่ข้อมูลชุดนี้ยังไม่ได้ใช้คำนวณหรือวาด dashboard หลัก

## ภาพรวม Endpoint

| กลุ่ม | Method | Endpoint | Auth | Identifier หลัก | ใช้งาน |
|---|---|---|---|---|---|
| OIDC | GET redirect | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/auth` | PKCE | `client_id`, `redirect_uri` | เริ่ม login |
| OIDC | POST | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/token` | PKCE verifier | authorization `code` | แลก code เป็น token |
| OIDC | GET | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/userinfo` | Bearer token | access token | โหลด profile, email และ user ID |
| OIDC | GET redirect | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/logout` | ID token hint | `id_token_hint` | ออกจากระบบ |
| Course | GET | `https://sbs-backend.mooc.meca.in.th/lms/{courseId}` | ไม่ส่ง Bearer | Course ID | ชื่อวิชา, course tree และชนิดเครื่องมือ |
| BookRoll | GET | `https://bookroll.thaidlt.com/meca/student/readingData` | ไม่ส่ง Bearer | user ID + Course ID | จำนวนหน้าที่อ่านและเปอร์เซ็นต์การอ่าน |
| Video | GET | `https://viola.thaidlt.com/meca/chart/bar/` | ไม่ส่ง Bearer | email + Course ID | เปอร์เซ็นต์การดูวิดีโอ |
| Video | GET | `https://viola.thaidlt.com/meca/chart/heatmapTime/` | ไม่ส่ง Bearer | email + Course ID | กิจกรรมการรับชมตามช่วงเวลา |
| VK | GET | `{VK_BASE}/analysis/overview/{userId}/course/{courseId}` | ไม่ส่ง Bearer | user ID + Course ID | ภาพรวม VK รายวิชาและรายชื่อบท |
| VK | GET, หลายครั้ง | `{VK_BASE}/analysis/overview/{userId}/course/{courseId}/chapter/{chapterNo}` | ไม่ส่ง Bearer | user ID + Course ID + เลขบท | รายละเอียด metric ของ VK รายบท |
| Chatbot ใหม่ | GET | `{PROFILE_BASE}/api/kidbright/course/{courseId}/data/chatbot?email={email}` | Bearer token | email + Course ID | คะแนน, เวลา, attempt และข้อมูลเทียบกลุ่ม |
| Chatbot เดิม | GET | `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/{courseId}/{userId}` | ไม่ส่ง Bearer | Course ID + user ID | เวลาทำ Quiz |
| Chatbot เดิม | GET | `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotPerformance/{courseId}/{userId}` | ไม่ส่ง Bearer | Course ID + user ID | คะแนน Quiz |
| Chatbot debug | GET | `https://sbs-backend.mooc.meca.in.th/me/data/chatbot/{courseId}` | Bearer token | Course ID | ตรวจสอบ endpoint ใหม่เมื่อเปิด debug |
| Adaptive Quiz | GET | `https://edubot.abdul.in.th/adaptive-quiz/api/v1/shared-dashboard/learner/{email}/by-lead-label/{leadLabel}?ref_code={refCode}` | `x-api-key` | email + lead label + ref code | โหลด shared learner dashboard |

## ลำดับการโหลดข้อมูล

```text
เปิด /studentv2/student.html?courseid=course-v1:ORG+COURSE+RUN
│
├─ ไม่มี session และไม่ได้เปิด loginbtn=true
│  └─ OIDC Authorization Code + PKCE
│     ├─ POST token
│     └─ GET userinfo
│
└─ GET SBS /lms/{courseId}
   │
   ├─ Course API ล้มเหลว
   │  └─ ข้ามงานข้อมูลการเรียนทั้งหมด
   │
   └─ Course API สำเร็จ
      ├─ ถ้าพบ BookRoll → GET BookRoll readingData
      ├─ ถ้าพบ Video
      │  ├─ GET Video bar
      │  └─ GET Video heatmapTime
      ├─ ถ้าพบ VK
      │  ├─ GET VK course overview
      │  └─ GET VK chapter overview × จำนวนบทที่พบใน course overview
      ├─ ถ้าพบ Chatbot
      │  ├─ GET Chatbot API ใหม่
      │  └─ ถ้าไม่มีข้อมูล/เรียกไม่ได้ → GET speed + performance พร้อมกัน
      ├─ ถ้า debug=1 และพบ Chatbot → GET /me/data/chatbot/{courseId}
      └─ ตรวจ Adaptive Quiz shared dashboard เสมอ
         └─ เรียกจริงเมื่อมี email, courseId, refCode และ API key
```

หลัง Course API สำเร็จ งาน BookRoll, Video, VK, Chatbot และ Adaptive Quiz จะเริ่มแบบขนานด้วย `Promise.allSettled()` แต่บางงานถูกข้ามตาม tool inventory ของ course tree

## ตัวแปรและ Identifier ที่ใช้ร่วมกัน

### `courseId`

- อ่านจาก query string `courseid`
- โค้ดรักษาเครื่องหมาย `+` ใน Open edX course key ไม่ให้กลายเป็นช่องว่าง
- ถือว่าใช้ได้เมื่อ string มี `course-v1:`
- ตัวอย่าง: `course-v1:NECTEC+COURSE_01+RUN_01`
- เก็บชั่วคราวใน `sessionStorage.post_login_courseid` ระหว่าง redirect ไป login

### `userId`

หลัง token exchange โค้ด resolve ตามลำดับนี้:

1. `userinfo.sub`
2. `userinfo.preferred_username`
3. `userinfo.email`
4. `id_token.sub`
5. `id_token.preferred_username`
6. `id_token.email`

BookRoll, VK และ Chatbot API เดิมรับค่านี้ ดังนั้นระบบควรรับประกันว่า `userinfo.sub` มีค่า เพราะ fallback เป็น username/email อาจไม่ตรง identifier ที่แต่ละ service คาดหวัง

### `learnerEmail`

- ใช้เฉพาะ `auth.profile.email`
- ไม่ fallback ไป user ID
- ใช้กับ Video, Chatbot API ใหม่ และ Adaptive Quiz

### Token

- access token และ ID token ถูกเก็บใน `sessionStorage.oidc_auth`
- Bearer token ใช้กับ OIDC userinfo, Chatbot API ใหม่ และ Chatbot debug endpoint
- เมื่อ token หมดอายุตาม JWT `exp` ระบบล้าง auth และแสดง session-expired overlay

## รายละเอียดแต่ละกลุ่ม API

### 1. OIDC Login และ Logout

ค่าปริยาย:

| ค่า | ปริยาย |
|---|---|
| Client ID | `dashboard` |
| Scope | `openid profile email` |
| Flow | Authorization Code + PKCE S256 |
| Redirect URI | URL ของหน้าปัจจุบัน โดยตัด query string และ hash ออก |

#### Authorization

```http
GET /auth/realms/kidbright/protocol/openid-connect/auth
  ?client_id=dashboard
  &redirect_uri={studentPageUrl}
  &response_type=code
  &scope=openid%20profile%20email
  &code_challenge={challenge}
  &code_challenge_method=S256
```

เป็น browser redirect ไม่ใช่ `fetch()`

#### Token exchange

```http
POST /auth/realms/kidbright/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
client_id=dashboard
redirect_uri={studentPageUrl}
code={authorizationCode}
code_verifier={pkceVerifier}
```

#### Userinfo

```http
GET /auth/realms/kidbright/protocol/openid-connect/userinfo
Authorization: Bearer {accessToken}
```

หากตอบ `401` ระบบแสดง session-expired overlay

#### Logout

```http
GET /auth/realms/kidbright/protocol/openid-connect/logout
  ?id_token_hint={idToken}
  &post_logout_redirect_uri={studentPageUrl}
  &client_id=dashboard
```

ระบบล้าง session auth ก่อน redirect ถ้าไม่มี ID token จะล้างเฉพาะ local session และไม่ redirect ไป OIDC logout

### 2. Course Tree จาก SBS

```http
GET https://sbs-backend.mooc.meca.in.th/lms/{urlEncodedCourseId}
```

ไม่ส่ง Bearer token

ข้อมูลที่ frontend ใช้:

- `courseTitle` หรือ `title` สำหรับชื่อวิชา
- `courseKey` หรือ `course_key` สำหรับ course key
- tree ของ `chapter → sequential → vertical → children`
- `kind`, node `id`, `title` และ `fields` เพื่อจำแนก BookRoll, Video, Chatbot และ VK
- iframe URL, `aetool`, `tool_type` และข้อมูลใน `fields.data` เพื่อหา subtype และ Adaptive Quiz `refCode`

ผลลัพธ์จาก API นี้ถูกเก็บใน `window.courseDetailData` และสร้าง `window.courseToolInventory`

ถ้า API นี้ผิดพลาด:

- ไม่แสดงชื่อ/โครงสร้างรายวิชา
- ล้าง tool inventory
- ข้าม API การเรียนทั้งหมดในรอบนั้น
- ผู้ใช้กด retry ได้จาก loading status

### 3. BookRoll Reading Data

```http
GET https://bookroll.thaidlt.com/meca/student/readingData
  ?userID={urlEncodedUserId}
  &usageId={urlEncodedCourseId}
  &view=student
  &ts={currentTimestamp}
```

เงื่อนไข:

- มี user ID
- มี Course ID รูปแบบ `course-v1:...`
- course tree พบเครื่องมือ BookRoll

`ts` ใช้เป็น cache-busting parameter และ API ถูกเรียกหนึ่งครั้งต่อรอบโหลด dashboard ไม่ได้ fan-out ราย BookRoll block

รูปแบบ response ที่ parser รองรับ:

- Array โดยตรง
- `results`, `result` หรือ `data` ที่เป็น array
- `results`, `result` หรือ `data` ที่เป็น object map
- ค่าแบบ string `"หน้าที่อ่านแล้ว:จำนวนหน้าทั้งหมด"` เช่น `"7:10"`
- object ที่มีคู่ field เช่น `read/total`, `readPage/totalPage`, `current/max`, `done/all`
- object ที่มีเปอร์เซ็นต์ เช่น `progress`, `progressRate`, `rate`, `percent`, `percentage`

ผลที่ normalize แล้ว:

```json
{
  "title": "ชื่อเนื้อหา",
  "usageId": "course หรือ block id",
  "read": 7,
  "total": 10,
  "progress": 70
}
```

frontend จับคู่ข้อมูลกับ course tree ด้วยชื่อก่อน แล้วจึงลองจับคู่ด้วย usage/block ID และเลือก progress ที่มากที่สุดเมื่อพบข้อมูลซ้ำ

### 4. Video Progress และ Heatmap

#### Progress bar data

```http
GET https://viola.thaidlt.com/meca/chart/bar/
  ?userName={urlEncodedOidcEmail}
  &usageId={urlEncodedCourseId}
```

#### Heatmap time data

```http
GET https://viola.thaidlt.com/meca/chart/heatmapTime/
  ?userName={urlEncodedOidcEmail}
  &usageId={urlEncodedCourseId}
```

เงื่อนไข:

- มี Course ID รูปแบบ `course-v1:...`
- มี `auth.profile.email`
- course tree พบเครื่องมือ Video

Progress parser อ่าน ECharts option จาก `Option`, `option` หรือ root object:

- ชื่อวิดีโอ: category `yAxis.data`
- เปอร์เซ็นต์: `series[0].data`
- ค่าเปอร์เซ็นต์ถูกปัดเป็นจำนวนเต็มและจำกัดให้อยู่ในช่วง 0–100

Heatmap parser อ่าน:

- ช่วงเวลา: category `xAxis.data`
- ชื่อวิดีโอ: category `yAxis.data`
- จำนวน event: `series[0].data` รูป `[xIndex, yIndex, count]`

frontend จับคู่ course item ด้วยชื่อแบบ exact/contains และมี fallback ตามลำดับวิดีโอใน course tree หากชื่อไม่ตรง

ข้อสังเกตด้าน error:

- `bar` เป็นข้อมูลหลัก ถ้าเรียกไม่สำเร็จ task Video เป็น error และล้างทั้ง progress/heatmap
- `heatmapTime` เป็นข้อมูลเสริม ถ้าเรียกไม่สำเร็จแต่ `bar` สำเร็จ task Video ยังถือว่าสำเร็จ
- ไม่มีการ retry ด้วย user ID หรือ identifier อื่น

### 5. VK Analysis

Base URL ปริยาย:

```text
https://vk-analysis.learning.app.meca.in.th
```

#### Course overview

```http
GET {VK_BASE}/analysis/overview/{userId}/course/{urlEncodedCourseId}
```

#### Chapter overview

```http
GET {VK_BASE}/analysis/overview/{userId}/course/{urlEncodedCourseId}/chapter/{chapterNo}
```

เงื่อนไข:

- มี user ID และ Course ID
- course tree พบเครื่องมือ VK

ลำดับการทำงาน:

1. เรียก course overview
2. อ่านเลขบทจาก `overview.Params.x_data`
3. ตัดค่าซ้ำและใช้เฉพาะเลขที่มากกว่า 0
4. เรียก chapter overview ทุกบทพร้อมกันด้วย `Promise.allSettled()`
5. chapter ใดล้มเหลวจะไม่นำข้อมูลบทนั้นมาใช้ แต่ task VK โดยรวมยังถือว่าสำเร็จถ้า course overview สำเร็จ

ข้อมูล chapter ที่ frontend ใช้:

- `Params.x_data`: item code
- `Params.series[].name/data`: metrics ของแต่ละ item
- `x_locate`: ตำแหน่ง item
- `x_title`: ชื่อบท/กิจกรรม
- `VK skill.series` ที่ชื่อ `Result`: ข้อสรุปผล

ระบบถือว่า item มีกิจกรรมเมื่ออย่างน้อยหนึ่ง metric ต่อไปนี้มากกว่า 0: Time used, Coding mark/time, Solution mark, Scene/Object/Image used, Snap count, Label used, AIBlock time/used, Capture/Annotate/VK/Train time หรือ Switch count

VK ใช้แสดงจำนวนกิจกรรม, metric และ result แต่ค่าเหล่านี้ยังไม่ถูกนำไปคำนวณเปอร์เซ็นต์ progress รวม

### 6. Chatbot / Quiz

Chatbot มี source priority ดังนี้:

```text
Chatbot API ใหม่ (Profile API + Bearer)
├─ พบ quiz ที่เคยทำ → ใช้ข้อมูลนี้และไม่เรียก API เดิม
├─ response สำเร็จแต่ไม่พบ quiz ที่เคยทำ → fallback API เดิม
├─ error ที่ไม่ใช่ 401 → fallback API เดิม
└─ HTTP 401 → แสดง session expired และจบ task โดยไม่ fallback
```

#### 6.1 Chatbot API ใหม่

Base URL ปริยาย:

```text
https://adaptive-profile-bn.ae.app.meca.in.th
```

Request:

```http
GET {PROFILE_BASE}/api/kidbright/course/{urlEncodedCourseId}/data/chatbot
  ?email={urlEncodedLearnerEmail}
Authorization: Bearer {accessToken}
```

เงื่อนไข:

- course tree พบ Chatbot
- มี Course ID
- มี OIDC profile email
- มี access token

response ที่ frontend คาดหวังมี `collections[]` และ `collections[].quizzes[]` โดยจะนำมาใช้เฉพาะ Quiz ที่มีหลักฐานว่าเคยเริ่มทำ ได้แก่ `total_attempts > 0`, มี `attempt_history`, หรือมี first/last attempt timestamp

ฟิลด์หลักที่ frontend ใช้:

| กลุ่ม | Fields ที่อ่าน |
|---|---|
| ชื่อและประเภท | `collection.title`, `quiz.title`, `quiz.quiz_role` |
| จำนวนข้อ | `best_total_count`, `max_questions`, `attempt_history[].total_count` |
| คะแนนผู้เรียน | `best_correct_count`, `best_score_pct`, `latest_score_pct`, `attempt_history[].correct_count` |
| คะแนนเปรียบเทียบ | `quiz_peer_comparison.cohort_avg_score_pct`, `avg_score_pct` |
| เวลา | `avg_time_seconds`, `attempt_history[].total_time_seconds` |
| Attempt | `total_attempts`, `attempt_history`, `first_attempt_at`, `last_attempt_at` |
| ข้อมูลกลุ่ม | `learner_percentile`, `total_learners_attempted` |
| Completion | `collection.completion_pct` |

เมื่อมีหลาย attempt ระบบเลือก attempt ที่ `correct_count` สูงที่สุดสำหรับคะแนน และใช้ attempt ล่าสุดเป็น fallback สำหรับ total/time

#### 6.2 Chatbot API เดิมจาก SBS

เรียกสอง endpoint พร้อมกัน:

```http
GET https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/{courseId}/{userId}
GET https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotPerformance/{courseId}/{userId}
```

ไม่ส่ง Bearer token

response อาจเป็น ECharts config ที่ root หรืออยู่ใต้ `chart`:

- อ่าน category จาก `xAxis.data` หรือ `yAxis.data`
- label รูป `ชื่อ,จำนวนข้อ` จะถูกแยกเป็นชื่อกับ total
- Speed เลือก series ที่ชื่อมีคำว่า `your` สำหรับเวลาผู้เรียน และ `average` สำหรับเวลาเฉลี่ย; หากไม่พบจะใช้ series แรก
- Performance เลือก series ที่ชื่อมีคำว่า `your` สำหรับคะแนนผู้เรียน และ `average` สำหรับคะแนนเฉลี่ย; หากไม่พบจะใช้ series แรก

สอง endpoint เป็นอิสระต่อกัน หากอย่างน้อยหนึ่ง endpoint สำเร็จ task Chatbot ยังถือว่าสำเร็จ

#### 6.3 Chatbot score endpoint เฉพาะ debug

เรียกเฉพาะเมื่อ URL มี `debug=1` และ course tree พบ Chatbot:

```http
GET https://sbs-backend.mooc.meca.in.th/me/data/chatbot/{urlEncodedCourseId}
Authorization: Bearer {accessToken}
```

response ถูกแสดงใน debug API card เท่านั้น ไม่ถูกนำไปคำนวณหรือแสดงใน dashboard หลัก

### 7. Adaptive Quiz Shared Dashboard

```http
GET https://edubot.abdul.in.th/adaptive-quiz/api/v1/shared-dashboard/learner/{urlEncodedEmail}/by-lead-label/{urlEncodedLeadLabel}
  ?ref_code={urlEncodedRefCode}
x-api-key: {readOnlyApiKey}
```

ค่าที่ใช้:

| Parameter | ที่มา |
|---|---|
| `email` | `auth.profile.email` |
| `leadLabel` | Course ID หลังตัด prefix `course-v1:` |
| `refCode` | config → query string → Adaptive Quiz block ใน course tree |
| `x-api-key` | ค่าที่ frontend กำหนดไว้ใน browser bundle ปัจจุบัน |

ลำดับหา `refCode`:

1. `STUDENT_DASHBOARD_CONFIG.adaptiveQuiz.refCode`
2. query `ref_code`
3. query `refCode`
4. query `adaptive_ref_code`
5. block ID หรือ iframe message ของ Adaptive Quiz ใน course tree

การเลือก block จาก course tree ให้ priority ตามลำดับ:

1. iframe ที่มี `/adaptive-quiz/lead`
2. iframe ที่มี `/chat/adaptive/`
3. node ที่ระบุ `aetool=chatbot`

response ถูกเก็บใน `window.adaptiveQuizSharedDashboardRaw` และ debug status ใช้สรุป `total_collections`, `collections[].total_quizzes` หรือจำนวนสมาชิกใน arrays แต่ข้อมูลนี้ยังไม่ได้เชื่อมเข้ากับกราฟหลัก

## การคำนวณข้อมูลบน Dashboard

### ความคืบหน้ารายกิจกรรม

| เครื่องมือ | มีค่า progress สำหรับคำนวณหรือไม่ | ที่มา |
|---|---|---|
| BookRoll | มี | เปอร์เซ็นต์หน้าที่อ่าน |
| Video | มี | `bar` API series data |
| Chatbot | ไม่มีใน progress model | แสดงคะแนน/เวลาแยกต่างหาก |
| VK | ไม่มีใน progress model | แสดง activity/result แยกต่างหาก |

กิจกรรมลงทะเบียนหรือ profile AE Tool ถูกตัดออกและให้ progress เป็น `null`

### ความคืบหน้ารายบท

```text
chapterPct = ค่าเฉลี่ยเลขคณิตของ progress ทุก vertical ที่มีค่าภายในบท
```

vertical ที่มีหลาย subtool จะเฉลี่ยเฉพาะ subtool ที่มี progress เป็นตัวเลขก่อน

### ความคืบหน้ารวม

```text
overallPct = ค่าเฉลี่ยเลขคณิตของ progress ทุก vertical ที่มีค่าในทุกบท
```

ข้อควรระวัง: การเฉลี่ยนี้ให้น้ำหนักแต่ละ vertical เท่ากัน ไม่ได้ถ่วงน้ำหนักตามจำนวนหน้า, ระยะเวลาวิดีโอ, จำนวน Quiz หรือจำนวนบท และรายการที่ไม่มีข้อมูลจะไม่ถูกนับเป็น 0 แต่จะถูกตัดออกจากตัวหาร

### สถานะ Donut

- 100% ขึ้นไป: เสร็จแล้ว
- มากกว่า 0 แต่น้อยกว่า 100: กำลังทำ
- เท่ากับ 0: ยังไม่เริ่ม
- ไม่มีค่าตัวเลข: ไม่มีข้อมูล และไม่รวมในสามสถานะที่แสดง

## Error, Retry และ Debug

- ทุก task แสดงสถานะ `pending`, `requesting`, `success`, `error` หรือ `skipped`
- หน้าไม่ทำ automatic retry
- ผู้ใช้ retry task ที่ error ทีละรายการหรือ retry รายการที่ล้มเหลวทั้งหมดได้
- ถ้า Course task ล้มเหลว การ retry Course จะเริ่มรอบโหลด dashboard ใหม่ทั้งหมด
- ใช้ `Promise.allSettled()` เพื่อไม่ให้ failure ของ service หนึ่งหยุด service อื่น
- HTTP error อ่าน response text สูงสุด 180 ตัวอักษรมาใช้ประกอบ debug message
- เปิด debug card ด้วย query `debug=1`
- เปิดปุ่ม Login/Logout ด้วย query `loginbtn=true`; ค่า default ซ่อนปุ่มและ redirect ไป login อัตโนมัติเมื่อไม่มี session

## Runtime Configuration

กำหนด `window.STUDENT_DASHBOARD_CONFIG` ก่อนโหลด `student.js`

```html
<script>
  window.STUDENT_DASHBOARD_CONFIG = {
    oidc: {
      authorizationEndpoint: "https://.../auth",
      tokenEndpoint: "https://.../token",
      userinfoEndpoint: "https://.../userinfo",
      logoutEndpoint: "https://.../logout",
      clientId: "dashboard",
      redirectUri: "https://example.org/studentv2/student.html",
      scope: "openid profile email"
    },
    baseUrl: "https://adaptive-profile.example.org",
    vk: {
      baseUrl: "https://vk-analysis.example.org"
    },
    adaptiveQuiz: {
      refCode: "example-ref-code"
    }
  };
</script>
```

หมายเหตุ:

- `baseUrl` เป็น key ระดับบนและใช้เปลี่ยน base URL ของ Chatbot Profile API
- `vk.baseUrl` รองรับการชี้ไป same-origin reverse proxy หาก production API ไม่อนุญาต CORS
- config ปัจจุบันเปลี่ยน Adaptive Quiz `refCode` ได้ แต่ไม่มี config path ที่ถูกใช้อ่าน API key

## External Resources ที่หน้าโหลดเพิ่ม

รายการต่อไปนี้ไม่ใช่ business/data API แต่เป็น network dependencies ของหน้า:

| Resource | URL |
|---|---|
| Tailwind runtime | `https://cdn.tailwindcss.com` |
| Google Fonts CSS | `https://fonts.googleapis.com/css2?...` |
| Google Fonts files | `https://fonts.gstatic.com` |
| ECharts | `https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js` |

หากมี Content Security Policy, offline requirement หรือข้อจำกัด third-party CDN ต้องรวม host เหล่านี้ในการออกแบบด้วย

## ประเด็นที่ควรแก้หรือยืนยัน

### P0 — Security

1. Adaptive Quiz read-only API key ถูกฝังใน `student.js` และส่งจาก browser ผู้ใช้ทุกคนจึงสามารถดูคีย์ได้ ควร rotate คีย์เดิมและย้าย request ผ่าน backend/serverless proxy ที่ตรวจสิทธิ์ผู้ใช้
2. Debug card แสดง raw response ของหลาย API รวมทั้งข้อมูลผู้เรียน ไม่ควรเปิด `debug=1` ให้ผู้ใช้ทั่วไป และควรพิจารณาปิดใน production build

### P1 — Data correctness

1. ยืนยัน contract ว่า OIDC `userinfo.sub` มีเสมอ เพราะ BookRoll, VK และ Chatbot เดิมอาจได้รับ username/email จาก fallback ปัจจุบัน
2. ยืนยันกับ Product ว่า overall progress ควรนับเฉพาะ BookRoll + Video จริงหรือไม่ และรายการที่ไม่มีข้อมูลควรถูกตัดออกจากตัวหารหรือควรนับเป็น 0
3. ยืนยันว่า VK course overview `Params.x_data` เป็นเลขบทที่ stable และเหมาะสำหรับสร้าง chapter URL
4. ยืนยัน mapping Quiz กับ course tree เนื่องจากบางกรณี frontend จับคู่ตามลำดับแทน stable ID

### P2 — Reliability และ Maintainability

1. VK เป็นรูปแบบ N+1 requests ตามจำนวนบท ควรพิจารณา endpoint รวม, concurrency limit หรือ cache หากรายวิชามีหลายบท
2. API หลาย host ถูกเรียกจาก browser โดยตรง จึงต้องตั้ง CORS, TLS และ availability ให้สอดคล้องกันทุกระบบ
3. ไม่มี request timeout หรือ abort controller; request ที่ค้างอาจทำให้ loading task อยู่ในสถานะ requesting นาน
4. ไม่มี automatic retry/backoff; ปัจจุบันพึ่งผู้ใช้กด retry
5. API contract หลายจุดยอมรับ response shape ได้หลายแบบ ซึ่งช่วย compatibility แต่ทำให้ตรวจ schema error ได้ยาก ควรมี versioned schema หรือ contract tests

## Checklist สำหรับทดสอบร่วมกัน

- [ ] Login ใหม่และกลับมาพร้อม `courseid` ที่มีเครื่องหมาย `+` ครบ
- [ ] Session เดิมที่ยังไม่หมดอายุโหลด dashboard ได้โดยไม่ login ซ้ำ
- [ ] Token หมดอายุแสดง session-expired overlay และ login ใหม่ได้
- [ ] วิชาที่มีเฉพาะ BookRoll เรียก BookRoll หนึ่งครั้ง และไม่เรียก Video/Chatbot/VK
- [ ] วิชาที่มี Video เรียกทั้ง `bar` และ `heatmapTime`; heatmap ล้มเหลวแล้วยังแสดง progress ได้
- [ ] Chatbot API ใหม่มีข้อมูลแล้วไม่เรียก SBS legacy endpoints
- [ ] Chatbot API ใหม่ไม่มี attempt แล้ว fallback ไป speed/performance
- [ ] Chatbot API ใหม่ตอบ 401 แล้วไม่ fallback และแสดง session expired
- [ ] VK chapter บางบทล้มเหลวแล้วบทอื่นยังแสดงได้
- [ ] Adaptive Quiz ไม่มี refCode แล้วถูกข้ามโดยไม่ทำให้ task อื่นล้มเหลว
- [ ] Course API ล้มเหลวแล้ว task อื่นถูกข้าม และ retry Course เริ่มโหลดใหม่ทั้งชุด
- [ ] `debug=1` ถูกจำกัดไม่ให้เปิดใน production สำหรับผู้ใช้ทั่วไป
