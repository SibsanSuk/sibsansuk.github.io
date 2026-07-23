# API ที่ใช้งานจริง — Student และ Teacher

อ้างอิงจากโค้ดใน `Production/teacher.js`, `Production/student.js` และ `Production/gen-overview.mjs`

## Base URLs

| ชื่อ | URL |
|---|---|
| Profile API | `https://adaptive-profile-bn.ae.app.meca.in.th` |
| SBS API | `https://sbs-backend.mooc.meca.in.th` |
| OIDC | `https://id.meca.in.th/auth/realms/kidbright` |
| BookRoll | `https://bookroll.thaidlt.com` |
| Video | `https://viola.thaidlt.com` |
| Adaptive Quiz | `https://edubot.abdul.in.th` |

ไม่มี `-dev` เป็นค่า default ใน Production

## OIDC

| Method | Endpoint | ผู้ใช้ | ใช้ทำอะไร |
|---|---|---|---|
| GET | `/auth/realms/kidbright/protocol/openid-connect/auth` | Student, Teacher | เริ่ม login ด้วย Authorization Code + PKCE |
| POST | `/auth/realms/kidbright/protocol/openid-connect/token` | Student, Teacher | แลก authorization code เป็น token |
| GET | `/auth/realms/kidbright/protocol/openid-connect/userinfo` | Student | อ่าน profile, email และ Keycloak `sub` |
| GET | `/auth/realms/kidbright/protocol/openid-connect/logout` | Student, Teacher | Logout |

ค่าหลัก:

- Client ID: `dashboard`
- Scope: `openid profile email`
- API ที่ต้องยืนยันตัวตนส่ง `Authorization: Bearer <access-token>`

---

## Teacher APIs

### 1. โหลดข้อมูลบัญชีและห้องเรียนหลัง Login

| Method | Endpoint | Identifier | Auth |
|---|---|---|---|
| GET | `{PROFILE_BASE}/api/kidbright/user/{sub}` | Keycloak `sub` | Bearer token |
| GET | `{PROFILE_BASE}/api/kidbright/teacher/{sub}` | Keycloak `sub` | Bearer token |
| GET | `{PROFILE_BASE}/api/kidbright/course/teacher/{sub}?instituteId={instituteId}` | Keycloak `sub`, institute ID | Bearer token |

ใช้เพื่อหา:

- ชื่อและอีเมลครู
- role
- institute
- รายการ assignment/ห้องเรียน

ห้ามใช้ `/api/kidbright/user/query?email=...` จาก role ครู เพราะตอบ `401`

### 2. ค้นรายวิชาและจัดการห้องเรียน

| Method | Endpoint | Auth | เรียกเมื่อ |
|---|---|---|---|
| GET | `{PROFILE_BASE}/api/kidbright/course?grade={grade}&level={level}&classRoom={classRoom}&instituteId={instituteId}&createDate={from,to}` | Bearer token | เปิดหน้าต่างเพิ่มห้องเรียน/ค้น course |
| GET | `{PROFILE_BASE}/api/kidbright/institute?instituteName={name}` | Bearer token | ค้นโรงเรียน |
| POST | `{PROFILE_BASE}/api/kidbright/assign` | Bearer token | ยืนยันเพิ่มห้องเรียน |
| DELETE | `{PROFILE_BASE}/api/kidbright/assign/{assignId}` | Bearer token | ยืนยันนำห้องเรียนออก |

ฟิลด์หลักของ `POST /assign`:

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

### 3. โหลดข้อมูลเมื่อเลือกห้องเรียน

สาม endpoint นี้เรียกแบบขนาน:

| Method | Endpoint | Auth | ใช้ทำอะไร |
|---|---|---|---|
| GET | `{SBS_BASE}/lms/{courseId}` | ไม่ส่ง Bearer | Course tree และชนิดเครื่องมือ |
| GET | `{PROFILE_BASE}/api/kidbright/assign/{assignId}/progress` | Bearer token | ความคืบหน้าของนักเรียน |
| GET | `{PROFILE_BASE}/api/kidbright/assign/{assignId}/grades` | Bearer token | คะแนนของนักเรียน |

### 4. โหลดข้อมูลเมื่อเปิดรายละเอียดนักเรียน

สาม service นี้เรียกแบบขนาน:

| Service | Method/Endpoint | Identifier | Auth |
|---|---|---|---|
| BookRoll | `GET {PROFILE_BASE}/api/kidbright/course/{courseId}/data/bookroll?email={email}` | อีเมลนักเรียน | Bearer token |
| Video | `GET https://viola.thaidlt.com/meca/chart/bar/?userName={email}&usageId={courseId}` | อีเมลนักเรียน | ไม่ส่ง Bearer |
| Chatbot | `GET {SBS_BASE}/stats/echart/chatbotSpeed/{courseId}/{userId}` | Keycloak user UUID | ไม่ส่ง Bearer |

ข้อกำหนด:

- BookRoll เรียกหนึ่งครั้งต่อการเปิดรายละเอียดนักเรียน
- BookRoll ใช้ `courseId` ไม่เรียกซ้ำราย tool/block
- BookRoll `404 User not found` หมายถึงไม่พบอีเมล ไม่ใช่ route หาย
- Video ใช้อีเมลเท่านั้น
- Chatbot ใช้ Keycloak UUID เท่านั้น
- หากไม่มี identifier ที่ถูกต้องให้แสดงไม่มีข้อมูล ห้ามลอง identifier อื่น
- ถ้า row นักเรียนไม่มี Keycloak UUID ระบบอาจเรียก `GET /api/kidbright/course?...` หนึ่งครั้งและ cache roster เพื่อหา UUID จากห้องเรียนเดียวกัน

### 5. หน้าแรก Teacher

หน้าแรกไม่ได้เรียก Enrollment API จาก browser โดยตรง แต่โหลดไฟล์:

```text
GET ./overview.json
```

`overview.json` เป็น primary source เพียงแหล่งเดียว หากไฟล์หายหรือ schema ผิดจะแสดง error และไม่ fallback ไป API อื่น

---

## Student APIs

### 1. Course tree

| Method | Endpoint | Identifier | Auth |
|---|---|---|---|
| GET | `{SBS_BASE}/lms/{courseId}` | `courseid` จาก URL | ไม่ส่ง Bearer |

เรียกก่อน endpoint การเรียนทั้งหมด เพื่อ:

- โหลดชื่อและโครงสร้างบทเรียน
- ตรวจว่ารายวิชามี BookRoll, Video หรือ Chatbot
- หา Adaptive Quiz `refCode`

ถ้า Course tree ล้มเหลว งานอื่นจะถูกข้ามและแสดง error/ไม่มีข้อมูล

### 2. BookRoll

```text
GET https://bookroll.thaidlt.com/meca/student/readingData
  ?userID={keycloakSub}
  &usageId={courseId}
  &view=student
  &ts={timestamp}
```

| รายการ | ค่า |
|---|---|
| `userID` | Keycloak `sub` ของนักเรียนที่ login |
| `usageId` | Course ID |
| จำนวนครั้ง | หนึ่งครั้งต่อรอบโหลด dashboard |
| เงื่อนไข | เรียกเมื่อ Course tree ระบุว่ามี BookRoll |

Response หลัก:

```json
{
  "results": {
    "ชื่อเอกสาร": "หน้าที่อ่านแล้ว:จำนวนหน้าทั้งหมด"
  }
}
```

ไม่มีการเรียกซ้ำราย BookRoll block และไม่มี fallback ไป `BR_activity` หรือ `BR_readingPage`

### 3. Video

| Method | Endpoint | ใช้ทำอะไร |
|---|---|---|
| GET | `https://viola.thaidlt.com/meca/chart/bar/?userName={email}&usageId={courseId}` | เปอร์เซ็นต์การดูวิดีโอ |
| GET | `https://viola.thaidlt.com/meca/chart/heatmapTime/?userName={email}&usageId={courseId}` | การรับชมแยกตามช่วงเวลา |

ข้อกำหนด:

- `userName` ใช้อีเมลจาก OIDC profile เท่านั้น
- `usageId` ใช้ Course ID
- เรียกเมื่อ Course tree ระบุว่ามี Video
- `heatmapTime` เป็นคนละ metric ไม่ใช่ fallback ของ `bar`
- ห้าม retry ด้วย UUID หรือ identifier อื่น

### 4. Chatbot

| Method | Endpoint | ใช้ทำอะไร |
|---|---|---|
| GET | `{SBS_BASE}/stats/echart/chatbotSpeed/{courseId}/{keycloakSub}` | ข้อมูล speed/คะแนนตาม response ของ SBS |
| GET | `{SBS_BASE}/stats/echart/chatbotPerformance/{courseId}/{keycloakSub}` | ผลการทำแบบฝึกหัด |

ข้อกำหนด:

- ใช้ Keycloak `sub` เท่านั้น
- เรียกเมื่อ Course tree ระบุว่ามี Chatbot
- ห้ามใช้อีเมล เพราะ unknown identifier อาจตอบ HTTP 200 พร้อมค่าศูนย์

### 5. Adaptive Quiz shared dashboard

```text
GET https://edubot.abdul.in.th/adaptive-quiz/api/v1/shared-dashboard/learner/{learnerEmail}/by-lead-label/{leadLabel}?ref_code={refCode}
x-api-key: <API key>
```

| Parameter | ที่มา |
|---|---|
| `learnerEmail` | OIDC profile email |
| `leadLabel` | Course ID ที่ตัด `course-v1:` ออก |
| `refCode` | Runtime config, query parameter หรือ block ID ใน Course tree |

ระบบข้าม endpoint นี้เมื่อไม่พบ email, course ID หรือ ref code

คำเตือนด้านความปลอดภัย:

- โค้ดปัจจุบันมี Adaptive Quiz API key อยู่ใน browser bundle
- ก่อนเปิด repository/public site ต้อง rotate key และย้ายการเรียกผ่าน backend/serverless proxy
- ห้ามนำค่า key ไปใส่เอกสารหรือ client-side environment

### 6. Endpoint ที่เรียกเฉพาะ Debug

เมื่อเปิด `student.html?debug=1` และรายวิชามี Chatbot:

```text
GET {SBS_BASE}/me/data/chatbot/{courseId}
Authorization: Bearer <access-token>
```

endpoint นี้ใช้ตรวจสอบเท่านั้น ไม่ใช่แหล่งข้อมูลหลักของหน้าปกติ

---

## Build-time API สำหรับ `overview.json`

`gen-overview.mjs` เรียก:

```text
GET {PROFILE_BASE}/api/kidbright/enroll/query?createAt={startDate,endDate}
```

การทำงาน:

- เรียกหนึ่งครั้งสำหรับข้อมูลสะสม
- เรียกหกช่วงเดือนสำหรับ trend
- สรุปเป็น `totals`, `slides`, `points` และ `trend`
- ไม่เขียนอีเมล รายชื่อนักเรียน user ID หรือ token ลง `overview.json`
- ใช้ production host เป็น default

คำสั่ง:

```bash
node gen-overview.mjs
```

---

## ลำดับการเรียก API

### Teacher

```text
เปิดหน้า
├─ GET overview.json
└─ OIDC login
   ├─ GET user/{sub}
   ├─ GET teacher/{sub}
   └─ GET course/teacher/{sub}
      └─ เลือกห้องเรียน
         ├─ GET SBS /lms/{courseId}
         ├─ GET assign/{assignId}/progress
         └─ GET assign/{assignId}/grades
            └─ เปิดนักเรียน
               ├─ GET BookRoll proxy หนึ่งครั้ง
               ├─ GET Video bar
               └─ GET Chatbot speed
```

### Student

```text
OIDC login
└─ GET SBS /lms/{courseId}
   ├─ ถ้ามี BookRoll → GET readingData หนึ่งครั้ง
   ├─ ถ้ามี Video
   │  ├─ GET bar
   │  └─ GET heatmapTime
   ├─ ถ้ามี Chatbot
   │  ├─ GET chatbotSpeed
   │  └─ GET chatbotPerformance
   └─ ถ้ามี refCode → GET Adaptive Quiz shared dashboard
```

## กฎสำคัญ

- ไม่มี mock/fake/demo API response ใน runtime
- API error ต้องแสดง error/empty state
- ห้าม fallback ข้าม endpoint
- ห้ามสลับ email กับ UUID
- ห้าม fan-out BookRoll ราย tool
- HTTP 200 ไม่ได้ยืนยันว่า identifier ถูกต้อง ต้องใช้ identifier ตามตารางเท่านั้น
