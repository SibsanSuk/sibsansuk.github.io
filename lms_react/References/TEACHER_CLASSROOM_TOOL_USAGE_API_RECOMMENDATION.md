# ข้อเสนอ API: ภาพรวมการใช้งานเครื่องมือรายห้องเรียน

เอกสารนี้เสนอรูปแบบ API สำหรับหน้า **Teacher Dashboard > ภาพรวมการใช้งานเครื่องมือของห้องเรียน** โดยให้ Backend รวบรวมและสรุปข้อมูลจาก Course Structure, รายชื่อนักเรียน, Progress, Grade, BookRoll, Video และ Chatbot/Quiz แล้วส่งข้อมูลที่พร้อมแสดงผลให้ Frontend ในครั้งเดียว

## 1. เป้าหมาย

ปัจจุบัน Frontend ต้องดึงรายการห้องเรียนและไล่ขอข้อมูลหลายแหล่งทีละห้อง รวมถึงอาจต้องขอข้อมูลเครื่องมือแยกเป็นรายนักเรียน ทำให้เกิด request จำนวนมากและใช้เวลาสรุปข้อมูลนาน

API ใหม่นี้ควร:

- คืนภาพรวมการใช้งานเครื่องมือของห้องเรียนจาก endpoint เดียว
- คืนข้อมูลที่นำไปแสดง Summary Card และตารางรายบทเรียนได้ทันที
- ใช้โครงสร้างกลางเดียวกัน แม้ข้อมูลต้นทางของ BookRoll, Video และ Chatbot/Quiz จะต่างกัน
- รองรับกรณีข้อมูลบางแหล่งยังมาไม่ครบ โดยไม่ทำให้ทั้งหน้าล้ม
- ไม่ส่งข้อมูลส่วนบุคคลของนักเรียนโดยไม่จำเป็น
- รองรับการเพิ่มเครื่องมือประเภทใหม่ในอนาคต

## 2. Endpoint ที่แนะนำ

```http
GET /api/kidbright/classroom/{classroomId}/tool-usage
Authorization: Bearer <access-token>
```

`classroomId` เป็นรหัสหลักของห้องเรียน ส่วน `assignId` และ `courseId` ให้ Backend map และคืนกลับมาใน response เพื่อรองรับระบบเดิมในช่วงเปลี่ยนผ่าน

### Query parameters

| Parameter | Type | Required | Default | Description |
|---|---:|---:|---|---|
| `from` | ISO 8601 datetime | No | เริ่มตั้งแต่มีข้อมูล | เวลาเริ่มต้นของช่วงที่ต้องการสรุป |
| `to` | ISO 8601 datetime | No | เวลาปัจจุบัน | เวลาสิ้นสุดของช่วงที่ต้องการสรุป |
| `timezone` | string | No | `Asia/Bangkok` | Timezone ที่ใช้แบ่งวันสำหรับสถิติ |
| `include` | comma-separated string | No | `tools,activities` | ข้อมูลเสริม เช่น `tools`, `activities`, `timeseries` |

ตัวอย่าง:

```http
GET /api/kidbright/classroom/clr_123/tool-usage?include=tools,activities&timezone=Asia/Bangkok
```

ไม่แนะนำให้ส่งรายละเอียดรายนักเรียนใน endpoint หลัก เพราะ payload อาจใหญ่และมีข้อมูลส่วนบุคคล หากต้องใช้ควรแยกเป็น endpoint แบบ pagination ตามหัวข้อที่ 10

## 3. Response ที่แนะนำ

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-09-01T03:30:00.000Z",
  "period": {
    "from": null,
    "to": "2026-09-01T03:30:00.000Z",
    "timezone": "Asia/Bangkok"
  },
  "classroom": {
    "classroomId": "clr_123",
    "assignId": "assign_456",
    "courseId": "course-v1:NECTEC+AILOWERSECONDARY01+NECTEC_000008",
    "name": "ม.1/1 วิทยาการคำนวณ",
    "instituteId": "school_001",
    "grade": "secondary",
    "level": 1,
    "room": "1",
    "learnerCount": 32
  },
  "summary": {
    "toolActivityCount": 12,
    "toolsAvailable": 3,
    "learnersReached": 29,
    "reachRatePct": 90.63,
    "activeLearners": 24,
    "learnersCompleted": 14,
    "completionRatePct": 43.75,
    "averageProgressPct": 61.4,
    "totalUsageSeconds": 123456,
    "lastActivityAt": "2026-08-31T09:10:20.000Z"
  },
  "tools": [
    {
      "type": "bookroll",
      "label": "BookRoll",
      "available": true,
      "activityCount": 4,
      "learnerCount": 32,
      "learnersReached": 28,
      "reachRatePct": 87.5,
      "learnersCompleted": 14,
      "completionRatePct": 50.0,
      "averageProgressPct": 64.2,
      "totalUsageSeconds": null,
      "averageUsageSeconds": null,
      "totalAttempts": null,
      "averageScorePct": null,
      "lastActivityAt": "2026-08-31T08:20:00.000Z",
      "statusCounts": {
        "notStarted": 4,
        "inProgress": 14,
        "completed": 14
      },
      "source": {
        "system": "bookroll",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:30.000Z"
      }
    },
    {
      "type": "video",
      "label": "Video",
      "available": true,
      "activityCount": 5,
      "learnerCount": 32,
      "learnersReached": 24,
      "reachRatePct": 75.0,
      "learnersCompleted": 10,
      "completionRatePct": 41.67,
      "averageProgressPct": 58.8,
      "totalUsageSeconds": 86400,
      "averageUsageSeconds": 3600,
      "totalAttempts": null,
      "averageScorePct": null,
      "lastActivityAt": "2026-08-31T09:10:20.000Z",
      "statusCounts": {
        "notStarted": 8,
        "inProgress": 14,
        "completed": 10
      },
      "source": {
        "system": "viola",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:40.000Z"
      }
    },
    {
      "type": "chatbot",
      "label": "Chatbot / Quiz",
      "available": true,
      "activityCount": 3,
      "learnerCount": 32,
      "learnersReached": 22,
      "reachRatePct": 68.75,
      "learnersCompleted": 18,
      "completionRatePct": 81.82,
      "averageProgressPct": null,
      "totalUsageSeconds": 37056,
      "averageUsageSeconds": 1684.36,
      "totalAttempts": 61,
      "averageScorePct": 76.4,
      "lastActivityAt": "2026-08-30T11:00:00.000Z",
      "statusCounts": {
        "notStarted": 10,
        "inProgress": 4,
        "completed": 18
      },
      "source": {
        "system": "chatbot",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:50.000Z"
      }
    }
  ],
  "activities": [
    {
      "activityId": "block-v1:course+type@vertical+block@lesson-01",
      "code": "1.1",
      "title": "รู้จักปัญญาประดิษฐ์",
      "chapterId": "block-v1:course+type@chapter+block@chapter-01",
      "chapterTitle": "บทที่ 1 ปัญญาประดิษฐ์รอบตัวเรา",
      "sortOrder": 1,
      "learnersReached": 26,
      "reachRatePct": 81.25,
      "lastActivityAt": "2026-08-31T09:10:20.000Z",
      "tools": [
        {
          "toolId": "block-v1:course+type@video+block@video-01",
          "type": "video",
          "title": "AI คืออะไร",
          "learnersReached": 22,
          "reachRatePct": 68.75,
          "learnersCompleted": 10,
          "completionRatePct": 45.45,
          "averageProgressPct": 58.4,
          "averageScorePct": null,
          "totalAttempts": null,
          "totalUsageSeconds": 12000,
          "lastActivityAt": "2026-08-31T09:10:20.000Z"
        },
        {
          "toolId": "bookroll-usage-001",
          "type": "bookroll",
          "title": "เอกสารประกอบบทที่ 1",
          "learnersReached": 24,
          "reachRatePct": 75.0,
          "learnersCompleted": 12,
          "completionRatePct": 50.0,
          "averageProgressPct": 66.2,
          "averageScorePct": null,
          "totalAttempts": null,
          "totalUsageSeconds": null,
          "lastActivityAt": "2026-08-30T04:15:00.000Z"
        }
      ]
    }
  ],
  "dataQuality": {
    "state": "complete",
    "missingSources": [],
    "warnings": [],
    "sources": [
      {
        "name": "course",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:00.000Z"
      },
      {
        "name": "roster",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:10.000Z"
      },
      {
        "name": "bookroll",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:30.000Z"
      },
      {
        "name": "viola",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:40.000Z"
      },
      {
        "name": "chatbot",
        "status": "ok",
        "updatedAt": "2026-09-01T03:29:50.000Z"
      }
    ]
  }
}
```

## 4. ความหมายของข้อมูลสรุป

### `summary`

| Field | Type | ความหมาย |
|---|---:|---|
| `toolActivityCount` | integer | จำนวนกิจกรรมเครื่องมือทั้งหมดใน Course ไม่ใช่จำนวนประเภทเครื่องมือ |
| `toolsAvailable` | integer | จำนวนประเภทเครื่องมือที่มีในห้อง เช่น BookRoll, Video, Chatbot |
| `learnersReached` | integer | จำนวนนักเรียนไม่ซ้ำที่มีหลักฐานว่าเคยใช้อย่างน้อยหนึ่งเครื่องมือ |
| `reachRatePct` | number | `learnersReached / learnerCount * 100` |
| `activeLearners` | integer | จำนวนนักเรียนไม่ซ้ำที่มีกิจกรรมภายในช่วง `from` ถึง `to` |
| `learnersCompleted` | integer | จำนวนนักเรียนไม่ซ้ำที่ผ่านเกณฑ์สำเร็จของห้องหรือ Course |
| `completionRatePct` | number | `learnersCompleted / learnerCount * 100` |
| `averageProgressPct` | number/null | ค่าเฉลี่ยความคืบหน้าของนักเรียนในห้อง 0–100 |
| `totalUsageSeconds` | integer/null | เวลารวมจากเครื่องมือที่มีข้อมูลเวลา ไม่ควรประมาณค่าของเครื่องมือที่ไม่มีข้อมูล |
| `lastActivityAt` | datetime/null | เวลาที่มีกิจกรรมล่าสุดจากทุกเครื่องมือ |

### `tools[]`

ข้อมูลในแต่ละรายการเป็นภาพรวมของเครื่องมือหนึ่งประเภททั้งห้อง:

- `available` หมายถึง Course มีเครื่องมือประเภทนี้ ไม่ได้หมายความว่ามีนักเรียนเริ่มใช้แล้ว
- `activityCount` คือจำนวนกิจกรรมของเครื่องมือนั้นใน Course
- `learnersReached` นับนักเรียนไม่ซ้ำ แม้นักเรียนคนเดียวจะทำหลายกิจกรรม
- `completionRatePct` ของเครื่องมือคำนวณจาก `learnersCompleted / learnersReached * 100`
- `statusCounts` ต้องรวมกันเท่ากับ `learnerCount`
- metric ที่ใช้กับเครื่องมือนั้นไม่ได้หรือไม่มีข้อมูล ให้คืน `null` ไม่ใช้ `0`

### `activities[]`

หนึ่งรายการควรตรงกับ Lesson/Vertical ที่ Teacher Dashboard แสดงในตาราง โดย `tools[]` ภายในกิจกรรมใช้แสดงประเภทเครื่องมือ จำนวนผู้เรียนที่เข้าถึง ความคืบหน้า คะแนน และเวลาการใช้งาน

`activity.learnersReached` ต้องนับแบบ unique union จากทุกเครื่องมือในกิจกรรมนั้น ไม่ใช่นำ `learnersReached` ของแต่ละเครื่องมือมาบวกกัน

## 5. ค่ามาตรฐานและรูปแบบข้อมูล

- Percentage ทุก field ใช้ตัวเลขช่วง `0–100` ไม่ใช้ช่วง `0–1`
- เวลาใช้งานเก็บเป็นจำนวนวินาทีแบบ integer และลงท้ายชื่อ field ด้วย `Seconds`
- วันที่และเวลาใช้ ISO 8601 แบบ UTC เช่น `2026-09-01T03:30:00.000Z`
- ID ทุกชนิดเป็น string แม้ระบบต้นทางจะใช้ตัวเลข
- รายการที่ไม่มีข้อมูลให้คืน array ว่าง `[]`
- metric ที่ไม่เกี่ยวข้องหรือยังคำนวณไม่ได้ให้คืน `null`
- ห้ามใช้ `0` แทน “ไม่ทราบ” เพราะ `0` มีความหมายว่า Backend ยืนยันแล้วว่าไม่มีการใช้งาน
- `type` ของเครื่องมือควรเป็นค่าคงที่ เช่น `bookroll`, `video`, `chatbot`, `quiz`, `vk`
- Frontend ควรแสดงชื่อจาก `label` แต่ใช้ `type` ใน logic
- การเพิ่ม field ใหม่ต้องไม่เปลี่ยนความหมายของ field เดิม และควรเพิ่ม `schemaVersion` เมื่อมี breaking change

## 6. กติกาการนับสถานะ

### สถานะกลาง

| Status | กติกาพื้นฐาน |
|---|---|
| `notStarted` | ไม่มี event, progress, page read, watch time หรือ attempt |
| `inProgress` | เริ่มใช้งานแล้ว แต่ยังไม่ถึงเกณฑ์สำเร็จ |
| `completed` | ถึงเกณฑ์สำเร็จของกิจกรรมหรือเครื่องมือนั้น |

### หลักฐานการเข้าถึงรายเครื่องมือ

| Tool | ถือว่า Reached เมื่อ | ถือว่า Completed เมื่อ |
|---|---|---|
| BookRoll | มีการเปิดเอกสาร, อ่านอย่างน้อย 1 หน้า หรือ progress มากกว่า 0 | อ่านครบตามเกณฑ์ที่กำหนด หรือ progress เท่ากับ 100 |
| Video | มี playback event, watch time มากกว่า 0 หรือ progress มากกว่า 0 | ดูถึง progress threshold ที่ระบบกำหนด เช่น 90% หรือ 100% |
| Chatbot/Quiz | มีอย่างน้อย 1 attempt | ส่งคำตอบครบตามจำนวนคำถามหรือสถานะ collection เป็น completed |

หากเกณฑ์สำเร็จต่างกันในแต่ละ Course ควรส่ง threshold ที่ใช้คำนวณเพิ่มใน `source` หรือ metadata ของ tool เพื่อให้ตรวจสอบย้อนหลังได้

## 7. การจัดการข้อมูลมาไม่ครบ

ไม่ควรทำให้ทั้ง endpoint ล้มเพราะบริการเครื่องมือบางตัวตอบช้าหรือล่ม หากยังสรุปข้อมูลบางส่วนได้ ให้คืน HTTP `200` พร้อม `dataQuality.state = "partial"`

ตัวอย่าง:

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-09-01T03:30:00.000Z",
  "classroom": {
    "classroomId": "clr_123",
    "courseId": "course-v1:NECTEC+AILOWERSECONDARY01+NECTEC_000008",
    "name": "ม.1/1 วิทยาการคำนวณ",
    "learnerCount": 32
  },
  "summary": {
    "toolActivityCount": 12,
    "toolsAvailable": 3,
    "learnersReached": 28,
    "reachRatePct": 87.5,
    "activeLearners": 24,
    "learnersCompleted": null,
    "completionRatePct": null,
    "averageProgressPct": null,
    "totalUsageSeconds": 86400,
    "lastActivityAt": "2026-08-31T09:10:20.000Z"
  },
  "tools": [],
  "activities": [],
  "dataQuality": {
    "state": "partial",
    "missingSources": ["bookroll"],
    "warnings": [
      {
        "code": "SOURCE_TIMEOUT",
        "source": "bookroll",
        "message": "BookRoll did not respond within the aggregation timeout."
      }
    ],
    "sources": [
      {
        "name": "bookroll",
        "status": "timeout",
        "updatedAt": null
      }
    ]
  }
}
```

ค่าของ `dataQuality.state`:

- `complete` — แหล่งข้อมูลที่จำเป็นตอบครบ
- `partial` — มีข้อมูลแสดงผลได้ แต่บางแหล่งขาดหาย
- `unavailable` — ไม่สามารถสรุปข้อมูลเครื่องมือได้

Frontend สามารถใช้ `dataQuality` ใน Debug Panel ได้ แต่ไม่จำเป็นต้องแสดงรายละเอียดเชิงระบบในหน้า Production

## 8. HTTP status ที่แนะนำ

| Status | กรณีใช้งาน |
|---:|---|
| `200` | สำเร็จ รวมถึงกรณีข้อมูลบางส่วน โดยตรวจจาก `dataQuality.state` |
| `400` | รูปแบบ query parameter ไม่ถูกต้อง |
| `401` | ไม่มี token หรือ token หมดอายุ |
| `403` | ผู้ใช้ไม่มีสิทธิ์ดูห้องเรียนนี้ |
| `404` | ไม่พบ `classroomId` |
| `422` | ช่วงวันที่ไม่ถูกต้อง เช่น `from` มากกว่า `to` |
| `503` | แหล่งข้อมูลหลักทั้งหมดไม่พร้อมใช้งานและไม่มี cached result |

รูปแบบ error กลาง:

```json
{
  "error": {
    "code": "CLASSROOM_NOT_FOUND",
    "message": "Classroom was not found.",
    "requestId": "req_01J7..."
  }
}
```

## 9. แหล่งข้อมูลที่ Backend ต้องรวบรวม

| ข้อมูล | แหล่งข้อมูลปัจจุบัน | ใช้สร้างข้อมูลส่วนใด |
|---|---|---|
| Course structure | SBS Course API | รายการบทเรียน กิจกรรม และเครื่องมือที่มี |
| Classroom roster/progress | Classroom assignment/progress API | จำนวนนักเรียนและความคืบหน้ารวม |
| Grade | Classroom assignment/grades API | คะแนนและสถานะสำเร็จ |
| BookRoll usage | BookRoll/Profile integration | การอ่านและ progress ของเอกสาร |
| Video usage | Viola | progress และเวลาในการรับชม |
| Chatbot/Quiz usage | Chatbot/Profile integration | attempts, คะแนน และเวลาใช้งาน |

Backend ควรเป็นผู้จัดการ fan-out, timeout, retry, cache และการ normalize ข้อมูลจากแต่ละระบบ เพื่อไม่ให้ Frontend ต้องรู้ response เฉพาะของผู้ให้บริการแต่ละราย

## 10. Endpoint รายละเอียดนักเรียนแบบเลือกโหลด

หากหน้าจอต้อง drill down เพื่อดูว่านักเรียนคนใดยังไม่เริ่มหรือควรได้รับการดูแล ให้แยก endpoint ดังนี้:

```http
GET /api/kidbright/classroom/{classroomId}/tool-usage/learners
    ?toolType=video
    &activityId=block-id
    &status=inProgress
    &page=1
    &pageSize=25
```

ตัวอย่าง response:

```json
{
  "items": [
    {
      "learnerId": "student_001",
      "displayName": "นักเรียน A",
      "toolType": "video",
      "activityId": "block-id",
      "status": "inProgress",
      "progressPct": 45.5,
      "scorePct": null,
      "attempts": null,
      "usageSeconds": 1240,
      "lastActivityAt": "2026-08-31T09:10:20.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 14,
    "totalPages": 1
  }
}
```

ควรคืนชื่อและอีเมลเฉพาะผู้ใช้ที่ได้รับอนุญาต หากหน้าจอไม่ต้องใช้ email ไม่ควรส่งออกมา

## 11. Performance และ Cache

- แนะนำ cache ผลสรุปรายห้องเป็นเวลา 1–5 นาที
- รองรับ `ETag` และ `If-None-Match` เพื่อลด payload เมื่อข้อมูลไม่เปลี่ยน
- กำหนด timeout ของแต่ละ upstream แยกกัน และคืน partial result เมื่อเหมาะสม
- หากจำนวนห้องและนักเรียนมาก ควร pre-aggregate จาก event หรือ background job แทนการ fan-out แบบ real-time ทุกครั้ง
- Endpoint หลักควรมีเป้าหมายตอบภายในประมาณ 2 วินาทีเมื่อ cache hit และไม่เกิน 10 วินาทีเมื่อ aggregate ใหม่
- ระบุ `generatedAt` และเวลาของแต่ละ source ทุกครั้ง เพื่อให้ทราบความสดของข้อมูล

## 12. Security และ Privacy

- ตรวจสอบว่าผู้ใช้เป็นครูผู้ดูแลห้อง หรือมี role ที่ได้รับอนุญาต
- ห้ามส่ง API key หรือ credential ของ BookRoll, Viola และบริการอื่นให้ Frontend
- หลีกเลี่ยงการ log ชื่อ อีเมล หรือ raw upstream response ใน Production
- ใช้ stable internal learner ID ในการ aggregate และส่ง PII เท่าที่หน้าจอต้องใช้
- หากมี export รายบุคคล ควรทำ audit log แยกต่างหาก

## 13. ขอบเขต MVP

API รุ่นแรกควรมีอย่างน้อย:

- `classroom`
- `period`
- `summary`
- `tools[]`
- `activities[]`
- `dataQuality`

สิ่งที่เพิ่มภายหลังได้:

- `timeseries` สำหรับกราฟรายวัน/รายสัปดาห์
- การเปรียบเทียบกับห้องอื่นหรือค่าเฉลี่ยระดับชั้น
- รายชื่อนักเรียนแบบ pagination
- Export CSV/Excel
- Event trend และช่วงเวลาที่มีการใช้งานสูงสุด

## 14. TypeScript interface สำหรับอ้างอิง

```ts
type ToolType = "bookroll" | "video" | "chatbot" | "quiz" | "vk" | string;
type DataState = "complete" | "partial" | "unavailable";
type SourceStatus = "ok" | "stale" | "timeout" | "error" | "unavailable";

interface ClassroomToolUsageResponse {
  schemaVersion: string;
  generatedAt: string;
  period: {
    from: string | null;
    to: string | null;
    timezone: string;
  };
  classroom: {
    classroomId: string;
    assignId?: string | null;
    courseId: string;
    name: string;
    instituteId?: string | null;
    grade?: string | null;
    level?: number | null;
    room?: string | null;
    learnerCount: number;
  };
  summary: {
    toolActivityCount: number;
    toolsAvailable: number;
    learnersReached: number;
    reachRatePct: number | null;
    activeLearners: number;
    learnersCompleted: number | null;
    completionRatePct: number | null;
    averageProgressPct: number | null;
    totalUsageSeconds: number | null;
    lastActivityAt: string | null;
  };
  tools: ToolUsageSummary[];
  activities: ActivityToolUsage[];
  dataQuality: {
    state: DataState;
    missingSources: string[];
    warnings: Array<{
      code: string;
      source?: string;
      message: string;
    }>;
    sources: Array<{
      name: string;
      status: SourceStatus;
      updatedAt: string | null;
    }>;
  };
}

interface ToolUsageSummary {
  type: ToolType;
  label: string;
  available: boolean;
  activityCount: number;
  learnerCount: number;
  learnersReached: number;
  reachRatePct: number | null;
  learnersCompleted: number | null;
  completionRatePct: number | null;
  averageProgressPct: number | null;
  totalUsageSeconds: number | null;
  averageUsageSeconds: number | null;
  totalAttempts: number | null;
  averageScorePct: number | null;
  lastActivityAt: string | null;
  statusCounts: {
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  source: {
    system: string;
    status: SourceStatus;
    updatedAt: string | null;
  };
}

interface ActivityToolUsage {
  activityId: string;
  code: string | null;
  title: string;
  chapterId: string | null;
  chapterTitle: string | null;
  sortOrder: number;
  learnersReached: number;
  reachRatePct: number | null;
  lastActivityAt: string | null;
  tools: Array<{
    toolId: string;
    type: ToolType;
    title: string;
    learnersReached: number;
    reachRatePct: number | null;
    learnersCompleted: number | null;
    completionRatePct: number | null;
    averageProgressPct: number | null;
    averageScorePct: number | null;
    totalAttempts: number | null;
    totalUsageSeconds: number | null;
    lastActivityAt: string | null;
  }>;
}
```

## 15. Acceptance checklist

- [ ] ครูเห็นข้อมูลได้เฉพาะห้องที่ตนเองดูแล
- [ ] ห้องที่ไม่มีนักเรียนยังตอบ `200` และไม่เกิดการหารด้วยศูนย์
- [ ] ห้องที่ยังไม่มีการใช้งานคืนค่า count เป็น `0` และ metric ที่ไม่มีข้อมูลเป็น `null`
- [ ] การนับ `learnersReached` ไม่ซ้ำนักเรียนคนเดิม
- [ ] `statusCounts` ของแต่ละ tool รวมเท่ากับ `learnerCount`
- [ ] ข้อมูลจาก upstream บางตัวล่มยังคืน partial response ได้
- [ ] กำหนด threshold ของ completed ชัดเจนและทดสอบได้
- [ ] Percent, duration และ datetime ใช้หน่วยเดียวกันทุก tool
- [ ] Response ไม่เปิดเผย credential หรือ raw provider payload
- [ ] Frontend สามารถสร้าง Summary Card และตารางรายบทเรียนจาก response เดียว

