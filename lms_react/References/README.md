# Production Dashboard Handoff

เอกสารนี้สรุปสิ่งที่ต้องทราบเมื่อนำชุด Teacher/Student Dashboard ไปเปิดเป็นโปรเจกต์ใหม่

## 1. ไฟล์ในชุด Production

| ไฟล์ | หน้าที่ |
|---|---|
| `teacher.html` | Entry page สำหรับครู |
| `teacher.js` | Login, ห้องเรียน, รายชื่อนักเรียน และการเรียก API ฝั่งครู |
| `student.html` | Entry page สำหรับนักเรียน |
| `student.js` | Login, โครงสร้างบทเรียน และผลจากเครื่องมือการเรียน |
| `dashboard.css` | Stylesheet ของหน้า Student |
| `overview.json` | Aggregate จริงสำหรับหน้าแรก Teacher |
| `gen-overview.mjs` | สร้าง `overview.json` จาก Production Enrollment API |

หน้าเว็บเปิดตรงผ่าน `teacher.html` และ `student.html` ได้ ไม่จำเป็นต้องมี `index.html`

## 2. วิธีเปิดในเครื่อง

ต้องเปิดผ่าน HTTP server ห้ามเปิดด้วย `file://` เพราะ OIDC, `fetch()` และ relative URLs จะทำงานไม่ครบ

```bash
cd Production
python3 -m http.server 3000
```

เปิด:

- Teacher: `http://localhost:3000/teacher.html`
- Student: `http://localhost:3000/student.html?courseid=course-v1:ORG+COURSE+RUN`

ตรวจ syntax:

```bash
node --check teacher.js
node --check student.js
node --check gen-overview.mjs
```

## 3. OIDC Login

ทั้งสองหน้าใช้ Authorization Code Flow with PKCE

| รายการ | URL/ค่า |
|---|---|
| Authorization | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/auth` |
| Token | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/token` |
| UserInfo | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/userinfo` |
| Logout | `https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/logout` |
| Client ID | `dashboard` |
| Scope | `openid profile email` |

ก่อน deploy โปรเจกต์ใหม่ ต้องเพิ่ม redirect URI ของทั้งสองหน้าใน OIDC client เช่น:

```text
https://new-domain.example/teacher.html
https://new-domain.example/student.html
```

ต้องตั้ง Web Origins/CORS ของ OIDC ให้ตรงกับ origin ใหม่ด้วย

ข้อมูล session เก็บใน `sessionStorage`:

- `oidc_auth`
- `pkce_verifier`
- `post_login_courseid` เฉพาะหน้า Student ระหว่าง redirect

อย่า log หรือส่งต่อ access token, ID token และค่าจาก `oidc_auth`

## 4. Runtime configuration

### Teacher

ตั้งค่าก่อนโหลด `teacher.js` ผ่าน `window.TEACHER_DASHBOARD_CONFIG` ใน `teacher.html`

```html
<script>
  window.TEACHER_DASHBOARD_CONFIG = {
    baseUrl: "https://adaptive-profile-bn.ae.app.meca.in.th",
    bookrollBaseUrl: "https://adaptive-profile-bn.ae.app.meca.in.th",
    sbsUrl: "https://sbs-backend.mooc.meca.in.th",
    clientId: "dashboard",
    instituteId: "",
    assignId: "",
    oidc: {
      // redirectUri: "https://new-domain.example/teacher.html"
    }
  };
</script>
```

Query parameters:

| Parameter | ใช้ทำอะไร |
|---|---|
| `instituteid` / `instituteId` | ระบุสถาบันเมื่อไม่มีค่าจากบัญชีครู |
| `assignid` / `assignId` | เปิดห้องเรียนที่กำหนดหลัง login |
| `debug=1` | แสดง API debug panel ห้ามเปิดเป็นค่า default ใน production |

### Student

ตั้งค่าก่อนโหลด `student.js` ผ่าน `window.STUDENT_DASHBOARD_CONFIG` ใน `student.html`

```html
<script>
  window.STUDENT_DASHBOARD_CONFIG = {
    oidc: {
      redirectUri: "https://new-domain.example/student.html"
    },
    adaptiveQuiz: {
      refCode: ""
    }
  };
</script>
```

Query parameters:

| Parameter | ใช้ทำอะไร |
|---|---|
| `courseid` | Course key รูปแบบ `course-v1:ORG+COURSE+RUN` |
| `ref_code`, `refCode`, `adaptive_ref_code` | ระบุ Adaptive Quiz ref code หากหาไม่ได้จาก course tree |
| `debug=1` | เปิด debug card และ endpoint ตรวจ Chatbot V2 |
| `loginbtn=true` | แสดงปุ่ม login/logout สำหรับการตรวจสอบ |

## 5. API ที่หน้า Teacher ใช้

Base URLs:

```text
PROFILE_BASE = https://adaptive-profile-bn.ae.app.meca.in.th
SBS_BASE     = https://sbs-backend.mooc.meca.in.th
```

### โหลดบัญชีและห้องเรียน

| Method | Endpoint | Identifier/Auth | ใช้เมื่อ |
|---|---|---|---|
| GET | `{PROFILE_BASE}/api/kidbright/user/{sub}` | Keycloak `sub`, Bearer token | หลัง login |
| GET | `{PROFILE_BASE}/api/kidbright/teacher/{sub}` | Keycloak `sub`, Bearer token | หลัง login |
| GET | `{PROFILE_BASE}/api/kidbright/course/teacher/{sub}?instituteId={instituteId}` | Keycloak `sub`, Bearer token | โหลดห้องเรียนของครู |
| GET | `{PROFILE_BASE}/api/kidbright/course?grade={grade}&level={level}&classRoom={classRoom}&instituteId={instituteId}&createDate={from,to}` | Bearer token | ค้นรายวิชา/ห้องเรียน |
| GET | `{PROFILE_BASE}/api/kidbright/institute?instituteName={name}` | Bearer token | ค้นสถาบัน |
| POST | `{PROFILE_BASE}/api/kidbright/assign` | Bearer token + JSON body | เพิ่มห้องเรียน |
| DELETE | `{PROFILE_BASE}/api/kidbright/assign/{assignId}` | Bearer token | นำห้องเรียนออก |

Body หลักของการสร้าง assignment:

```json
{
  "userId": "<teacher-sub>",
  "teacherId": "<teacher-sub>",
  "courseId": "course-v1:...",
  "instituteId": "...",
  "grade": "...",
  "level": 1,
  "classRoom": "...",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

### เปิดห้องเรียน

สามคำขอต่อไปนี้ทำงานแบบขนานเมื่อครูเลือกห้องเรียน:

| Method | Endpoint | ใช้ทำอะไร |
|---|---|---|
| GET | `{SBS_BASE}/lms/{courseId}` | Course tree และชนิด AE Tool |
| GET | `{PROFILE_BASE}/api/kidbright/assign/{assignId}/progress` | ความคืบหน้านักเรียน |
| GET | `{PROFILE_BASE}/api/kidbright/assign/{assignId}/grades` | คะแนน |

### เปิดรายละเอียดนักเรียน

เมื่อเปิด drawer นักเรียน จะเรียกข้อมูลของแต่ละบริการแบบขนาน:

| Service | Endpoint | Identifier ที่ต้องใช้ |
|---|---|---|
| BookRoll | `GET {PROFILE_BASE}/api/kidbright/course/{courseId}/data/bookroll?email={email}` | อีเมลนักเรียน |
| Video | `GET https://viola.thaidlt.com/meca/chart/bar/?userName={email}&usageId={courseId}` | อีเมลนักเรียน |
| Chatbot | `GET {SBS_BASE}/stats/echart/chatbotSpeed/{courseId}/{userId}` | Keycloak user UUID |

ข้อกำหนดสำคัญ:

- Teacher BookRoll เรียกหนึ่งครั้งต่อการเปิดรายละเอียดนักเรียน
- `{courseId}` เพียงพอ ไม่ต้องเรียกซ้ำราย tool/block
- BookRoll `404` ที่ระบุว่าไม่พบ User หมายถึงไม่พบอีเมลนั้น ไม่ใช่ให้เปลี่ยน identifier
- ห้ามเรียก `/api/kidbright/user/query?email=...` จาก role ครู เพราะ endpoint นี้ตอบ `401`
- Chatbot ต้องใช้ Keycloak UUID เท่านั้น ถ้าหาไม่ได้ให้แสดงไม่มีข้อมูล ห้ามเปลี่ยนไปใช้อีเมล
- Video ใช้อีเมลเท่านั้น ห้าม retry ด้วย UUID

## 6. API ที่หน้า Student ใช้

หน้า Student ต้องมี `courseid` และใช้ Keycloak `sub` จากผู้ใช้ที่ login เป็น `userId`

### Course tree

```text
GET https://sbs-backend.mooc.meca.in.th/lms/{courseId}
```

Course tree ต้องโหลดสำเร็จก่อน ระบบจึงตรวจว่ารายวิชามี BookRoll, Video หรือ Chatbot และเรียกเฉพาะ service ที่มีอยู่ในวิชา

### BookRoll

```text
GET https://bookroll.thaidlt.com/meca/student/readingData
  ?userID={keycloakSub}
  &usageId={courseId}
  &view=student
  &ts={timestamp}
```

Response ที่ใช้งาน:

```json
{
  "results": {
    "ชื่อเอกสาร": "หน้าที่อ่านแล้ว:จำนวนหน้าทั้งหมด"
  }
}
```

ข้อกำหนด:

- เรียกหนึ่งครั้งระดับรายวิชา
- ห้าม fan-out เรียกราย BookRoll block
- ห้ามสลับไปใช้ `BR_activity`, `BR_readingPage` หรือ endpoint อื่นเมื่อไม่พบข้อมูล

### Video

```text
GET https://viola.thaidlt.com/meca/chart/bar/
  ?userName={loginEmail}
  &usageId={courseId}

GET https://viola.thaidlt.com/meca/chart/heatmapTime/
  ?userName={loginEmail}
  &usageId={courseId}
```

- `bar` ใช้แสดงเปอร์เซ็นต์การดู
- `heatmapTime` เป็นอีก metric สำหรับช่วงเวลาการรับชม ไม่ใช่ fallback ของ `bar`
- ใช้อีเมลจาก OIDC profile เท่านั้น

### Chatbot

```text
GET https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/{courseId}/{keycloakSub}
GET https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotPerformance/{courseId}/{keycloakSub}
```

ต้องใช้ Keycloak `sub` ห้ามใช้อีเมลหรือ ID ประเภทอื่น เพราะ unknown ID อาจตอบ HTTP 200 พร้อมค่าศูนย์ ทำให้เกิดข้อมูลผิดโดยไม่เห็น error

เมื่อเปิด `debug=1` จะมี endpoint สำหรับตรวจสอบเพิ่มเติม:

```text
GET https://sbs-backend.mooc.meca.in.th/me/data/chatbot/{courseId}
Authorization: Bearer <access-token>
```

endpoint นี้ไม่ใช่แหล่งข้อมูลหลักของหน้าปกติ

### Adaptive Quiz shared dashboard

```text
GET https://edubot.abdul.in.th/adaptive-quiz/api/v1/shared-dashboard/learner/{learnerEmail}/by-lead-label/{leadLabel}?ref_code={refCode}
x-api-key: <server-managed-key>
```

ค่าที่ใช้:

- `learnerEmail`: อีเมลจาก OIDC profile
- `leadLabel`: `courseId` ที่ตัด prefix `course-v1:` ออก
- `refCode`: จาก config/query parameter หรือ block ID ใน course tree

ข้อควรแก้ก่อนเปิด public project:

- `student.js` ปัจจุบันมี Adaptive Quiz API key อยู่ใน client bundle
- Static frontend ไม่สามารถเก็บ API key เป็นความลับได้ แม้ชื่อ key จะระบุว่า read-only
- ควร rotate key เดิม และย้ายการเรียก Adaptive Quiz ผ่าน backend/serverless proxy ที่จำกัด origin, rate และข้อมูลผู้ใช้
- ห้ามคัดลอกค่าจาก source ไปใส่เอกสาร, repository ใหม่ หรือ environment ฝั่ง browser

## 7. ข้อมูลหน้าแรก Teacher

`teacher.js` อ่าน `./overview.json` เป็น primary source เพียงแหล่งเดียว ไม่มี API fallback

Schema หลัก:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "range": "YYYY-MM-DD,YYYY-MM-DD",
  "source": "production enrollment endpoint",
  "totals": {},
  "regions": [],
  "unassignedRegion": {},
  "trend": [],
  "slides": [],
  "points": []
}
```

สร้างใหม่ด้วย Node.js 20 ขึ้นไป:

```bash
node gen-overview.mjs
```

Generator:

- เรียก `https://adaptive-profile-bn.ae.app.meca.in.th/api/kidbright/enroll/query`
- ใช้ production host เป็น default
- สรุปเฉพาะ aggregate ไม่บันทึกอีเมลหรือรายชื่อนักเรียน
- แยกยอดผู้ใช้เป็น 6 ภาค และรายงานข้อมูลจังหวัดที่จัดเข้าภาคไม่ได้ใน `unassignedRegion`
- เขียน `.overview.json.tmp` แล้ว rename เป็น `overview.json` เพื่อป้องกันไฟล์ครึ่งเดียว
- หาก API ล้มเหลวหรือ schema ไม่ถูกต้อง จะไม่เขียนทับไฟล์เดิม

สามารถ override base URL สำหรับการทดสอบแบบ explicit:

```bash
BASEURL=https://approved-host.example node gen-overview.mjs
```

ห้ามตั้ง `-dev` เป็นค่า default ใน production project

## 8. External dependencies และ CSP/CORS

หน้าเว็บโหลด resource ภายนอกดังนี้:

- Google Fonts
- Tailwind CDN (`student.html`)
- Chart.js CDN (`student.html`)
- Leaflet CDN (`teacher.html`)
- OpenStreetMap tile server
- โลโก้จาก LMS/NECTEC

ถ้าโปรเจกต์ใหม่ใช้ Content Security Policy ต้อง allow อย่างน้อย:

```text
id.meca.in.th
adaptive-profile-bn.ae.app.meca.in.th
sbs-backend.mooc.meca.in.th
bookroll.thaidlt.com
viola.thaidlt.com
edubot.abdul.in.th
fonts.googleapis.com
fonts.gstatic.com
cdn.tailwindcss.com
cdn.jsdelivr.net
unpkg.com
*.tile.openstreetmap.org
lms.mooc.meca.in.th
www.nectec.or.th
```

API ทุก host ต้องอนุญาต CORS สำหรับ origin ของโปรเจกต์ใหม่

## 9. กฎด้านข้อมูล

- ไม่มี mock, fake หรือ demo payload ใน runtime
- API ล้มเหลวให้แสดง error/empty state ห้ามสร้างค่าแทน
- ห้ามเปลี่ยน endpoint หรือ identifier เพื่อให้ได้ HTTP 200
- ห้ามแสดงค่าศูนย์จาก unknown identity เป็นข้อมูลจริง
- ห้ามเก็บ response ที่มีอีเมล รายชื่อ คะแนน หรือ token เป็น static file
- `overview.json` ต้องมีเฉพาะ aggregate และต้อง generate จาก production API
- เปิด debug mode เฉพาะตอนตรวจปัญหา และอย่าเผยแพร่ debug payload

## 10. Checklist ก่อน deploy

- [ ] ทั้ง 7 runtime/build files อยู่ใน directory เดียวกัน
- [ ] OIDC redirect URIs และ Web Origins มีทั้ง Teacher และ Student URL
- [ ] เปิดผ่าน HTTPS
- [ ] `courseid` ถูกส่งให้หน้า Student
- [ ] API hosts อนุญาต CORS จาก domain ใหม่
- [ ] Generate `overview.json` ล่าสุดจาก production
- [ ] ตรวจว่า `overview.json` ไม่มี email, user ID หรือ token
- [ ] ย้าย/rotate Adaptive Quiz API key ก่อนเปิด public
- [ ] `node --check` ผ่านทั้งสาม JavaScript files
- [ ] ทดสอบ Teacher login → เลือกห้อง → เปิดนักเรียน
- [ ] ยืนยัน Network ว่า Teacher/Student BookRoll เรียกครั้งเดียวต่อรอบ
- [ ] ทดสอบ Student อย่างน้อยหนึ่งวิชาที่มี BookRoll, Video และ Chatbot
- [ ] ทดสอบสถานะ 401, 404, API timeout และไฟล์ `overview.json` หาย
