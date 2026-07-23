# Adaptive Profile API Endpoint Links

ไฟล์นี้รวบรวมเส้น API ที่ถูกเรียกจากโปรเจกต์ `adaptive-profile-fn` เพื่อ copy ไปใช้ในโปรเจกต์อื่นได้ง่าย

## Base URL

| Name | Value |
| --- | --- |
| `BASEURL` | `https://adaptive-profile-bn.ae.app.meca.in.th` |
| `DEV_BASEURL` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th` |
| `BOOKROLL_BASEURL` | `https://adaptive-profile-bn.ae.app.meca.in.th` (prod-only) |
| `SBS_URL` | `https://sbs-backend.mooc.meca.in.th` |
| API tester ใน repo นี้ | [http://localhost:3000/api-tester.html](http://localhost:3000/api-tester.html) |

> หมายเหตุ: หลายเส้นของ `BASEURL` ต้องใช้ `Authorization: Bearer <keycloak token>` ถ้าคลิก link ตรง ๆ แล้วเจอ `401 Unauthorized` ให้เปิดผ่าน `api-tester.html` หลัง login หรือใช้ curl/Postman พร้อม Bearer token ตัวอย่างบางรายการด้านล่างยังชี้ `DEV_BASEURL` สำหรับการทดสอบ แต่ BookRoll ใช้งานได้เฉพาะ production

## ค่าตัวอย่าง

| Placeholder | Example |
| --- | --- |
| `{sub}` | ใช้ `sub` จาก Keycloak token ของผู้ใช้ |
| `{courseId}` | `course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006` |
| `{assignId}` | ใช้ `assignId` จากหน้า `/course` หรือ `/teacher-dashboard` |
| `{instituteId}` | `1010720039` |
| `{province}` | `กรุงเทพมหานคร` |
| `{dateRange}` | `2025-02-01,2025-04-30` |

## Public / คลิกดูตัวอย่างได้

| Method | Endpoint | Sample link | ใช้ใน |
| --- | --- | --- | --- |
| `GET` | `{SBS_URL}/lms/{courseId}` | [เปิดตัวอย่าง course tree](https://sbs-backend.mooc.meca.in.th/lms/course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006) | `CourseLanding`, `AssignDetail`, `AssignDashboard` |
| `GET` | `{BASEURL}/api/kidbright/enroll/query?createAt={dateRange}` | [เปิดตัวอย่าง enroll aggregate ตามวันที่](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/query?createAt=2025-02-01,2025-04-30) | `Home` |
| `GET` | `{BASEURL}/api/kidbright/enroll/query?createAt={dateRange}&courseId={courseId}` | [เปิดตัวอย่าง enroll aggregate ตามวันที่ + วิชา](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/query?createAt=2025-02-01,2025-04-30&courseId=course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006) | `Home` |

## User

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{BASEURL}/api/kidbright/user/{sub}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/user/{sub}` | - |
| `GET` | `{BASEURL}/api/kidbright/user/query?name={name}` | [ค้นชื่อ test](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/user/query?name=test) | - |
| `GET` | `{BASEURL}/api/kidbright/user/query?email={email}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/user/query?email=user@example.com` | - |
| `GET` | `{BASEURL}/api/kidbright/user/query?institute={keyword}` | [ค้นสถาบัน](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/user/query?institute=%E0%B8%AA%E0%B8%A7%E0%B8%99%E0%B8%81%E0%B8%B8%E0%B8%AB%E0%B8%A5%E0%B8%B2%E0%B8%9A) | - |
| `POST` | `{BASEURL}/api/kidbright/user` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/user` | `{"userId":"{sub}","firstName":"ทดสอบ","lastName":"ระบบ","email":"test@example.com","birthdate":"2000-01-01"}` |
| `PATCH` | `{BASEURL}/api/kidbright/user/{userId}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/user/{userId}` | `{"role":"staff"}` |

## Teacher

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{BASEURL}/api/kidbright/teacher/{sub}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/teacher/{sub}` | - |
| `POST` | `{BASEURL}/api/kidbright/teacher` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/teacher` | `{"teacherId":"{sub}","instituteId":"1010720039"}` |
| `DELETE` | `{BASEURL}/api/kidbright/teacher/{teacherId}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/teacher/{teacherId}` | - |

## Institute

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{BASEURL}/api/kidbright/institute?instituteName={keyword}` | [ค้นโรงเรียน](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/institute?instituteName=%E0%B8%AA%E0%B8%A7%E0%B8%99%E0%B8%81%E0%B8%B8%E0%B8%AB%E0%B8%A5%E0%B8%B2%E0%B8%9A) | - |
| `GET` | `{BASEURL}/api/kidbright/institute?province={province}` | [ค้นตามจังหวัด](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/institute?province=%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3) | - |
| `POST` | `{BASEURL}/api/kidbright/institute` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/institute` | `{"instituteId":"tmp-1","instituteName":"โรงเรียนทดสอบ","province":"กรุงเทพมหานคร","district":"เขตพระนคร","department":"-"}` |

## Course

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{BASEURL}/api/kidbright/course/teacher/{sub}?instituteId={instituteId}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/course/teacher/{sub}?instituteId=1010720039` | - |
| `GET` | `{BASEURL}/api/kidbright/course?createDate={dateRange}` | [ค้น course ตามวันที่](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/course?createDate=2025-02-01,2025-04-30) | - |
| `GET` | `{BASEURL}/api/kidbright/course?grade={grade}&level={level}&classRoom={classRoom}&instituteId={instituteId}` | [ค้น course ตามห้อง](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/course?grade=secondary&level=2&classRoom=1&instituteId=1010720039) | - |
| `POST` | `{BASEURL}/api/kidbright/course` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/course` | `{"courseId":"course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006","courseName":"ปัญญาประดิษฐ์สำหรับนักเรียนระดับชั้นมัธยมศึกษาตอนปลาย"}` |
| `GET` | `{BASEURL}/api/kidbright/course/{usageId}/data/bookroll?email={email}` | `https://adaptive-profile-bn.ae.app.meca.in.th/api/kidbright/course/course-v1%3ANECTEC%2BAILOWERSECONDARY01%2BNECTEC_000008/data/bookroll?email={email}` | - |

## Assign / Teacher Dashboard

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{BASEURL}/api/kidbright/assign/{assignId}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/assign/{assignId}` | - |
| `GET` | `{BASEURL}/api/kidbright/assign/{assignId}/progress` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/assign/{assignId}/progress` | - |
| `GET` | `{BASEURL}/api/kidbright/assign/{assignId}/grades` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/assign/{assignId}/grades` | - |
| `POST` | `{BASEURL}/api/kidbright/assign` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/assign` | `{"userId":"{sub}","courseId":"course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006","teacherId":"{sub}","instituteId":"1010720039","grade":"secondary","level":2,"classRoom":"1","startDate":"2025-02-01","endDate":"2025-04-30"}` |
| `DELETE` | `{BASEURL}/api/kidbright/assign/{assignId}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/assign/{assignId}` | - |

## Flow: เพิ่มห้องเรียนผู้สอน

Flow นี้อยู่ใน `src/pages/Course.tsx` ปุ่ม `เพิ่มห้องเรียน` แค่เปิด modal ยังไม่ได้ยิง API ตอนกดปุ่มทันที แต่รายการใน modal จะมาจาก state ที่โหลดด้วย endpoint ด้านล่างตาม filter ที่เลือก

| Step | ใช้ทำอะไร | Method / Endpoint | Body / Query สำคัญ |
| --- | --- | --- | --- |
| 1 | ตรวจข้อมูลครูและ institute เริ่มต้น | `GET {BASEURL}/api/kidbright/teacher/{sub}` | ใช้ `sub` จาก Keycloak token |
| 2 | ดึงห้องเรียน/assign ที่ครูคนนี้เพิ่มไว้แล้ว เพื่อแสดงในหน้า `/course` | `GET {BASEURL}/api/kidbright/course/teacher/{sub}?instituteId={instituteId}` | ถ้า role เป็น `user` จะส่ง `instituteId` ของครู ถ้า `staff/admin` อาจไม่ส่งเพื่อเห็นหลายโรงเรียน |
| 3 | ดึง "รายการวิชาที่เปิดอยู่/มี enrollment ตรง filter" สำหรับให้เลือกใน modal เพิ่มห้องเรียน | `GET {BASEURL}/api/kidbright/course?{query}` | query ที่ใช้ได้: `instituteId`, `grade`, `level`, `classRoom`, `createDate={startDate},{endDate}` |
| 4 | เลือกวิชาใน modal | ไม่ยิง API | toggle `course.isActive` ฝั่ง frontend |
| 5 | กด `ตกลง` เพื่อเพิ่มห้องเรียน | `POST {BASEURL}/api/kidbright/assign` | ยิง 1 request ต่อ 1 วิชาที่เลือก |
| 6 | หลังเพิ่มเสร็จ refresh รายการห้องเรียน | `GET {BASEURL}/api/kidbright/course/teacher/{sub}?instituteId={instituteId}` | reload จาก `assign` ที่สร้างแล้ว |

ตัวอย่าง endpoint สำหรับดึงรายการวิชาใน modal:

```text
GET {BASEURL}/api/kidbright/course?instituteId=1010720039
GET {BASEURL}/api/kidbright/course?instituteId=1010720039&grade=secondary&level=2&classRoom=1
GET {BASEURL}/api/kidbright/course?instituteId=1010720039&createDate=2025-02-01,2025-04-30
GET {BASEURL}/api/kidbright/course?grade=secondary&level=2&classRoom=1&createDate=2025-02-01,2025-04-30
```

ตัวอย่าง body ตอนกด `ตกลง` เพื่อสร้างห้องเรียน:

```json
{
  "userId": "{sub}",
  "courseId": "course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006",
  "teacherId": "{sub}",
  "instituteId": "1010720039",
  "grade": "secondary",
  "level": 2,
  "classRoom": "1",
  "startDate": "2025-02-01",
  "endDate": "2025-04-30"
}
```

ข้อควรระวังสำหรับโปรเจกต์อื่น:

- รายการวิชาใน modal ใช้ `GET /api/kidbright/course?{query}` ไม่ใช่ `GET /api/kidbright/enroll/query`.
- filter วันที่ของ course ใช้ชื่อ `createDate` เช่น `createDate=2025-02-01,2025-04-30`; ส่วนหน้า Home/enroll aggregate ใช้ `createAt` ซึ่งเป็นคนละ endpoint.
- โค้ดหน้า `Course.tsx` จะไม่ยิง `GET /api/kidbright/course?{query}` ถ้าไม่มี query เลย ดังนั้นอย่างน้อยควรส่ง `instituteId` หรือช่วงวันที่/ชั้น/ห้อง.
- ทุก request ผ่าน `fetchAPI` จะส่ง `Authorization: Bearer <keycloak token>` และ `Content-Type: application/json`.

### สรุปวิธีที่ `VK/teacher.js` ทำให้รายการวิชาแสดง (พอร์ตจาก `Course.tsx`)

บันทึกไว้ให้ reuse: ปุ่ม "เพิ่มห้องเรียน" เปิด modal แล้วดึงรายวิชาจาก `GET /api/kidbright/course?{query}` เส้นเดียว (ฟังก์ชัน `apiCourseSearch` / handler `loadAddCourses`).

1. **หา instituteId ก่อน** (ตัวจุดชนวนให้ list ขึ้น) — จาก `GET /teacher/{sub}` → `teacher.institute.instituteId`
   - role `user` → ผูก instituteId ของตัวเอง (auto), ช่องโรงเรียน readonly
   - role `staff`/`admin` → ครูค้นหาโรงเรียนเองผ่าน `GET /institute?instituteName={คำค้น}` (debounce ~450ms) แล้วเลือก → ได้ instituteId
   - อ่าน role จาก `user.role` หรือ `teacher.user.role`
2. **สร้าง query แบบไม่ว่าง** (backend คืน `[]` ถ้า query ว่าง) จากค่าใน modal — param ที่ใช้: `instituteId`, `grade`, `level`, `classRoom`, `createDate={from},{to}`. ถ้าไม่มี filter/instituteId เลย → ไม่ยิง (โชว์ "เลือกโรงเรียนเพื่อดูรายวิชา")
3. **ยิง** `GET /api/kidbright/course?instituteId=...&grade=...&level=...&classRoom=...&createDate=...` (แนบ Bearer token). ตัวอย่างจริงที่ใช้ได้:

   ```text
   GET {BASEURL}/api/kidbright/course?instituteId=1010720039
   GET {BASEURL}/api/kidbright/course?instituteId=1010720039&grade=secondary&level=2&classRoom=1
   GET {BASEURL}/api/kidbright/course?createDate=2025-02-01,2025-04-30
   ```

4. **Response = `Course[]`** โดยแต่ละ `Course` มี:
   - `courseId`, `courseName` → เอา `courseName` ไปแสดงเป็นรายการให้กดเลือก
   - `enrolls[]` (แต่ละตัวมี `grade`, `level`, `classRoom`) → เอา distinct มาสร้างตัวเลือก dropdown **ระดับชั้น/ชั้นปี/ห้อง** (ไม่ hardcode)
5. **เปลี่ยน filter → re-query ใหม่ทุกครั้ง** (cascading เหมือน `Course.tsx`) — ตัวเลือก dropdown อัปเดตตาม response ล่าสุด
6. **กดเลือก + ยืนยัน** → `POST /api/kidbright/assign` (body ด้านล่าง) แล้ว refetch `GET /course/teacher/{sub}` เพื่อรีเฟรชรายการห้องเรียน

ประเด็นที่ทำให้ "list ไม่ขึ้น" บ่อยสุด: `instituteId` ว่าง (บัญชี staff/admin ต้องเลือกโรงเรียนก่อน) หรือ query ว่าง — ทั้งคู่ทำให้ backend ไม่คืนวิชา. Field mapping (`courseName`/`enrolls`) อิงจาก type `Course` ใน `Course.tsx`; ถ้า response จริงต่างให้ปรับที่ `mapCourseRow`.

## Enroll

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{BASEURL}/api/kidbright/enroll/query?createAt={dateRange}` | [เปิดตัวอย่าง](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/query?createAt=2025-02-01,2025-04-30) | - |
| `GET` | `{BASEURL}/api/kidbright/enroll/query?createAt={dateRange}&courseId={courseId}` | [เปิดตัวอย่าง](https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/query?createAt=2025-02-01,2025-04-30&courseId=course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006) | - |
| `GET` | `{BASEURL}/api/kidbright/enroll/user/{sub}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/user/{sub}` | - |
| `GET` | `{BASEURL}/api/kidbright/enroll/institutes/download?createAt={dateRange}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/institutes/download?createAt=2025-02-01,2025-04-30` | ต้องเรียกพร้อม Bearer token ผ่านแอป/API tester |
| `POST` | `{BASEURL}/api/kidbright/enroll/` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/` | `{"userId":"{sub}","courseId":"course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006","instituteId":"1010720039","studentId":"S001","grade":"secondary","level":2,"classRoom":"1"}` |
| `PATCH` | `{BASEURL}/api/kidbright/enroll/{enrollId}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/{enrollId}` | `{"enrollId":"{enrollId}","userId":"{sub}","courseId":"course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006","instituteId":"1010720039","studentId":"S001","grade":"secondary","level":2,"classRoom":"1"}` |

## Consent

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{BASEURL}/api/kidbright/consent/{sub}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/consent/{sub}` | - |
| `POST` | `{BASEURL}/api/kidbright/consent/` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/consent/` | `{"userId":"{sub}","status":"accept"}` |
| `PATCH` | `{BASEURL}/api/kidbright/consent/{consentId}` | `https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/consent/{consentId}` | `{"userId":"{sub}","status":"reject"}` |

## SBS

| Method | Endpoint | Sample link / URL | Body ตัวอย่าง |
| --- | --- | --- | --- |
| `GET` | `{SBS_URL}/lms/{courseId}` | [เปิดตัวอย่าง course tree](https://sbs-backend.mooc.meca.in.th/lms/course-v1:NECTEC+AIUPPERSECONDARY01+NECTEC_000006) | - |
| `GET` | `{SBS_URL}/stats/echart/chatbotSpeed/{courseId}/{userId}` | `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006/{userId}` | - |
| `POST` | `{SBS_URL}/me` | `https://sbs-backend.mooc.meca.in.th/me` | `{"userId":"{sub}","grade":"secondary","level":2,"classRoom":"1","instituteId":"1010720039","province":"กรุงเทพมหานคร","firstName":"ทดสอบ","lastName":"ระบบ","email":"test@example.com"}` |

## ⚠️ ก่อนนำ endpoint รายบุคคลไปใช้ ต้องตรวจ 3 ข้อนี้ก่อน

หลาย service ในระบบนี้ **ตอบ HTTP 200 พร้อม payload ครบถ้วนแต่เป็นศูนย์ทั้งหมด** ให้กับ id ที่มันไม่รู้จัก ซึ่งหน้าตาเหมือนนักเรียนที่ยังไม่ได้ทำอะไรเลยเป๊ะ ๆ แยกไม่ออก ผลคือ dashboard แสดงตัวเลขที่ดูน่าเชื่อถือแต่เป็นของปลอม เคยเกิดมาแล้วจริงกับ `bookroll.thaidlt.com` และ `chatbotSpeed` โดยตัวแรกหลุดขึ้นหน้าจอไปแล้วก่อนจะจับได้

**1. ยิงด้วย id ที่ไม่มีอยู่จริง** — ถ้าได้ผลเหมือน id จริง แปลว่า endpoint ไม่ได้อ่าน id ที่ส่งไป ห้ามใช้เป็นข้อมูลรายคน

**2. เทียบผู้เรียน 2 คนที่มีกิจกรรมต่างกัน** — ถ้าได้ผลเท่ากันก็แปลว่าไม่แยกผู้ใช้ ข้อนี้จำเป็นเพราะวิชาที่ไม่มีใครใช้เลยจะได้ศูนย์ทั้งหมดทุกคนอยู่แล้ว ทำให้ข้อ 1 สรุปไม่ได้

**3. ถ้ามี 2 แหล่งที่ควรให้คำตอบเดียวกัน ให้เทียบกัน** — ข้อนี้ชี้ขาดที่สุด กรณี BookRoll จับได้เพราะ proxy ตอบ `"Intro to KB AI":"1:36"` ขณะที่ service ตรงตอบ `"0:0"` ให้ผู้เรียนคนเดียวกัน

รันข้อ 1-2 อัตโนมัติได้ด้วย:

```bash
node teacher_dashboard_data/probe-endpoints.mjs \
  --course "course-v1:..." --email active@learner --email2 other@learner \
  --token "$(: เอาจาก JSON.parse(sessionStorage.oidc_auth).token.access_token)"
```

exit code ไม่เป็น 0 เมื่อมี endpoint ที่ปลอมหรือที่ยัง**สรุปไม่ได้** — "ยังไม่ได้ตรวจ" ไม่นับว่าผ่าน

**อย่าใส่ fallback ข้าม service** เมื่อแหล่งหลักล้มเหลว เว้นแต่แหล่งสำรองผ่านการตรวจ 3 ข้อนี้แล้ว การ fallback ไปยัง service ที่ตอบศูนย์ให้ทุกคน แย่กว่าปล่อยให้ขึ้น `-` เพราะกลบ error ที่มองเห็นได้ ให้กลายเป็นข้อมูลผิดที่มองไม่เห็น

## คำอธิบายว่าแต่ละเส้นน่าจะไว้ทำอะไร

คำอธิบายด้านล่างอิงจาก call site ใน `src/`, `public/api-tester.html`, และไฟล์ prototype ใน `design_ref/` ถ้า endpoint ไหนชื่อสื่อความหมายแต่ไม่มี schema/response ยืนยันในโค้ด จะระบุว่า "ไม่แน่ใจ" หรือ "อนุมาน"

เกณฑ์อ่านค่า: `สูง` = เห็นการใช้งานและ payload/field ชัดในโค้ด, `ปานกลาง` = อนุมานจากชื่อ endpoint หรือ call site ได้ แต่ยังไม่แน่ใจ schema/response จริงทั้งหมด

### User

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {BASEURL}/api/kidbright/user/{sub}` | ดึงข้อมูล profile ผู้ใช้ตาม Keycloak `sub` เช่น role, userId, ชื่อ, อีเมล ใช้ตอนกำหนด route/สิทธิ์และโหลดข้อมูลทั่วไป | สูง |
| `GET {BASEURL}/api/kidbright/user/query?name={name}` | ค้นหาผู้ใช้จากชื่อ-สกุลในหน้า management | สูง |
| `GET {BASEURL}/api/kidbright/user/query?email={email}` | ค้นหาผู้ใช้จากอีเมลในหน้า management | สูง |
| `GET {BASEURL}/api/kidbright/user/query?institute={keyword}` | ค้นหาผู้ใช้จากชื่อสถาบันในหน้า management | สูง |
| `POST {BASEURL}/api/kidbright/user` | สร้างหรือบันทึกข้อมูล user/profile กลับเข้า backend หลังผู้ใช้กรอกข้อมูล | สูง |
| `PATCH {BASEURL}/api/kidbright/user/{userId}` | แก้ข้อมูล user บาง field โดยเฉพาะ role ในหน้า management | สูง |

### Teacher

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {BASEURL}/api/kidbright/teacher/{sub}` | ตรวจว่าผู้ใช้เป็น teacher หรือไม่ และดึงข้อมูล teacher พร้อม institute/role สำหรับหน้า profile, course, teacher dashboard | สูง |
| `POST {BASEURL}/api/kidbright/teacher` | ผูก user ให้เป็น teacher ของ institute หนึ่ง ใช้ตอนลงทะเบียนครูหรือ admin เพิ่ม teacher | สูง |
| `DELETE {BASEURL}/api/kidbright/teacher/{teacherId}` | ลบสถานะ/record teacher ของผู้ใช้ | ปานกลาง: มีใน management/debug action แต่ flow หลักไม่ชัดเท่า GET/POST |

### Institute

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {BASEURL}/api/kidbright/institute?instituteName={keyword}` | ค้นหาโรงเรียน/สถาบันจากชื่อ เพื่อ autocomplete ตอนกรอก profile, course landing, course assignment, management | สูง |
| `GET {BASEURL}/api/kidbright/institute?province={province}` | ค้นหาสถาบันตามจังหวัด เพื่อช่วยเติมจังหวัด/อำเภอและตัวเลือกโรงเรียน | สูง |
| `POST {BASEURL}/api/kidbright/institute` | สร้างสถาบันใหม่เมื่อผู้ใช้กรอกโรงเรียนที่ยังไม่มีในระบบ | สูง |

### Course

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {BASEURL}/api/kidbright/course/teacher/{sub}?instituteId={instituteId}` | ดึงรายวิชาและห้องเรียน/assign ที่เกี่ยวกับ teacher คนนั้น ถ้าเป็นครูทั่วไปจะ filter ด้วย institute | สูง |
| `GET {BASEURL}/api/kidbright/course?createDate={dateRange}` | ค้นหารายวิชา/รายการ enroll ตามช่วงวันที่ เพื่อใช้เลือก course สำหรับสร้างห้องเรียน | ปานกลาง: โค้ดใช้ query dynamic จากหน้า `Course`; response shape อนุมานจาก type `Course` |
| `GET {BASEURL}/api/kidbright/course?grade={grade}&level={level}&classRoom={classRoom}&instituteId={instituteId}` | ค้นหารายวิชาที่มีผู้เรียนตรงกับโรงเรียน/ระดับชั้น/ห้อง เพื่อเลือก course ตอนเพิ่มห้องเรียน | สูง |
| `POST {BASEURL}/api/kidbright/course` | สร้างหรือ upsert course ลง backend จาก courseId/courseName ที่ได้จาก SBS `/lms` ตอนลงทะเบียนเรียน | สูง |
| `GET {BASEURL}/api/kidbright/course/{usageId}/data/bookroll?email={email}` | ดึงความคืบหน้าการอ่าน BookRoll รายคน ใช้ในลิ้นชักผู้เรียน **ทดสอบผ่านบน prod 2026-07-23 (ต้องมี Bearer token)** ตอบ `{"results":{"<ชื่อเอกสาร>":"<อ่านแล้ว>:<ทั้งหมด>"}}` เช่น `"Intro to KB AI":"1:36"` โดย `"0:0"` = ยังไม่เปิดอ่าน · `{usageId}` ใส่ courseId หรือ aetool block id ก็ได้ — **คืนรายการทั้งวิชาเหมือนกัน** จึงยิงครั้งเดียวพอ ไม่ต้อง fan-out · **404 = ไม่พบ email นั้นใน User** (body: `Could not find any entity of type "User"`) ไม่ใช่ route หาย · ⚠️ มีเฉพาะบน `adaptive-profile-bn` — บน `-dev` ตอบ 404 ทุกกรณี | สูง (ทดสอบตรง) |

### Assign / Teacher Dashboard

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {BASEURL}/api/kidbright/assign/{assignId}` | ดึง metadata ของห้องเรียน เช่น โรงเรียน วิชา ระดับชั้น ห้อง วันที่เริ่ม/จบ | สูง |
| `GET {BASEURL}/api/kidbright/assign/{assignId}/progress` | ดึงความคืบหน้ารายคนในห้อง เช่น progress %, lastUpdate, ชื่อ, อีเมล, จังหวัด | สูง |
| `GET {BASEURL}/api/kidbright/assign/{assignId}/grades` | ดึงคะแนนราย module/aetool ของนักเรียนในห้อง ใช้รวมกับ progress เพื่อทำ dashboard | สูง |
| `POST {BASEURL}/api/kidbright/assign` | สร้างห้องเรียน/assignment ให้ teacher กับ course และ filter กลุ่มผู้เรียนตาม institute/grade/level/classRoom/date | สูง |
| `DELETE {BASEURL}/api/kidbright/assign/{assignId}` | ลบห้องเรียน/assignment จากหน้า course ของครู | สูง |

### Enroll

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {BASEURL}/api/kidbright/enroll/query?createAt={dateRange}` | ดึงสถิติ aggregate การลงทะเบียน แยกตามสถาบันและรายวิชา ใช้หน้า home/dashboard แผนที่และตาราง | สูง |
| `GET {BASEURL}/api/kidbright/enroll/query?createAt={dateRange}&courseId={courseId}` | ดึง aggregate การลงทะเบียนเหมือนข้างบน แต่ filter เฉพาะรายวิชา | สูง |
| `GET {BASEURL}/api/kidbright/enroll/user/{sub}` | ดึงข้อมูลการลงทะเบียนของผู้ใช้ปัจจุบัน เช่น course, institute, grade, level, classRoom | สูง |
| `GET {BASEURL}/api/kidbright/enroll/institutes/download?createAt={dateRange}` | ดาวน์โหลด CSV จากข้อมูล aggregate ของสถาบัน/การลงทะเบียนตาม filter เดียวกับหน้า home | สูง |
| `POST {BASEURL}/api/kidbright/enroll/` | สร้าง enrollment เมื่อนักเรียนลงทะเบียนเรียน course ใหม่ | สูง |
| `PATCH {BASEURL}/api/kidbright/enroll/{enrollId}` | แก้ enrollment เดิมเมื่อผู้ใช้เคยลงทะเบียน course นั้นไว้แล้ว | สูง |

### Consent

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {BASEURL}/api/kidbright/consent/{sub}` | ดึงสถานะการยินยอมของผู้ใช้ก่อนให้บันทึก/ใช้งาน profile | สูง |
| `POST {BASEURL}/api/kidbright/consent/` | สร้าง consent record ใหม่เมื่อยังไม่มีข้อมูลเดิม | สูง |
| `PATCH {BASEURL}/api/kidbright/consent/{consentId}` | เปลี่ยนสถานะ consent เดิม เช่น accept/reject | สูง |

### SBS

| Endpoint | น่าจะไว้ทำอะไร | ความมั่นใจ |
| --- | --- | --- |
| `GET {SBS_URL}/lms/{courseId}` | ดึงโครงสร้างรายวิชาจาก SBS/LMS เช่น courseKey, courseTitle, chapter, vertical, aetool และ iframe URL | สูง |
| `POST {SBS_URL}/me` | sync ข้อมูล profile/enrollment บางส่วนไปฝั่ง SBS เช่น userId, institute, province, ชื่อ, อีเมล, grade/level/classRoom | ปานกลาง: โค้ดส่งข้อมูลชัดเจน แต่ response/schema ของ SBS ไม่ได้ระบุใน repo |
| `GET {SBS_URL}/stats/echart/chatbotSpeed/{courseId}/{userId}` | ตอบกลับ `{"status":true,"chart":{…ECharts…}}` **แต่ไม่ใช่ "เวลา" อย่างที่ชื่อสื่อ** — ทดสอบ 2026-07-23 ได้ title `"Learning Speed"`, xAxis = `["kbaisim-pre-test","kbaisim-posttest"]`, series = `Average Score` / `Your Score` คือ **คะแนน pre/post test เทียบค่าเฉลี่ย** ⚠️ **ต้องใช้ Keycloak userId เท่านั้น** ส่ง email หรือ id มั่วก็ตอบ 200 พร้อม `Your Score: [0,0]` เหมือนกันหมด (ยืนยันด้วย email ปลอม) จึงห้าม fallback ไป email เพราะจะได้เลข 0 ปลอมแทน error | สูง (ทดสอบตรง) |

## Keycloak Config

โปรเจกต์ใช้ `keycloak-js` ไม่ได้ fetch endpoint เหล่านี้เองโดยตรง แต่ค่าที่ตั้งไว้ใน `.env` คือ:

| Name | Value |
| --- | --- |
| `KEYCLOAK_URL` | `https://id.meca.in.th/auth` |
| `KEYCLOAK_REALM` | `kidbright` |
| `KEYCLOAK_CLIENTID` | `dashboard` |

## Design Reference / Student Dashboard Prototype

ไฟล์ `design_ref/student.js` มี endpoint dashboard ภายนอกที่ยังไม่ได้อยู่ใน React app หลัก แต่เกี่ยวข้องกับข้อมูล course/student dashboard:

| Service | Endpoint template | Sample link | น่าจะไว้ทำอะไร / ความมั่นใจ |
| --- | --- | --- | --- |
| Bookroll activity | `https://bookroll.thaidlt.com/meca/student/BR_activity?userID={uid}&usageId={courseId}` | `https://bookroll.thaidlt.com/meca/student/BR_activity?userID={uid}&usageId=course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006` | เปิด/ดึงหน้ากิจกรรม BookRoll ของผู้เรียนในรายวิชา ความมั่นใจปานกลาง: ชื่อ endpoint ชัด แต่ prototype ใช้เป็น URL ภายนอกมากกว่า schema API |
| Bookroll reading data | `https://bookroll.thaidlt.com/meca/student/readingData?userID={uid}&usageId={courseId}&view=student&ts={timestamp}` | `https://bookroll.thaidlt.com/meca/student/readingData?userID={uid}&usageId=course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006&view=student` | ดึงความคืบหน้าการอ่าน BookRoll โดยอ้างอิง **Keycloak userId** ⛔ **ห้ามส่ง email มาที่เส้นนี้** — ทดสอบ 2026-07-23: ส่ง email จริงหรือ email ที่แต่งขึ้นเองก็ตอบ 200 พร้อมรายการเอกสารครบและค่า `"0:0"` ทุกช่องเหมือนกันหมด แยกไม่ออกจากนักเรียนที่ยังไม่ได้อ่านจริง (เทียบ: proxy ฝั่ง MECA คืน `"Intro to KB AI":"1:36"` ให้ผู้เรียนคนเดียวกัน) teacher dashboard จึงใช้ `GET {BASEURL}/api/kidbright/course/{usageId}/data/bookroll?email=` แทน |
| Viola video bar | `https://viola.thaidlt.com/meca/chart/bar/?userName={userName}&usageId={courseId}` | `https://viola.thaidlt.com/meca/chart/bar/?userName={userName}&usageId=course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006` | ดึง/เปิดข้อมูลกราฟแท่งการดูวิดีโอของผู้เรียน ความมั่นใจปานกลาง: ชื่อ URL ชัด แต่ response schema ไม่อยู่ใน repo |
| Viola video heatmap | `https://viola.thaidlt.com/meca/chart/heatmapTime/?userName={userName}&usageId={courseId}` | `https://viola.thaidlt.com/meca/chart/heatmapTime/?userName={userName}&usageId=course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006` | ดึง/เปิด heatmap เวลาการดูวิดีโอของผู้เรียน ความมั่นใจปานกลาง |
| SBS chatbot speed | `{SBS_URL}/stats/echart/chatbotSpeed/{courseId}/{uid}` | `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006/{uid}` | ดึงสถิติความเร็ว/เวลาในการทำ chatbot/adaptive activity ความมั่นใจปานกลาง: เคยใช้กับ student dashboard แต่ schema ไม่ได้อยู่ใน React app หลัก |
| SBS chatbot performance | `{SBS_URL}/stats/echart/chatbotPerformance/{courseId}/{uid}` | `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotPerformance/course-v1%3ANECTEC%2BAIUPPERSECONDARY01%2BNECTEC_000006/{uid}` | ดึงสถิติ performance/ผลการทำ chatbot/adaptive activity ความมั่นใจปานกลาง |
| Adaptive Quiz shared dashboard | `https://edubot.abdul.in.th/adaptive-quiz/api/v1/shared-dashboard/learner/{learnerEmail}/by-lead-label/{leadLabel}?ref_code={refCode}` | ต้องใส่ header `x-api-key` จาก `design_ref/student.js` จึงควรทดสอบผ่าน fetch/Postman | ดึง dashboard ของ Adaptive Quiz รายผู้เรียนโดยอีเมล, lead label และ ref code ความมั่นใจสูงจากชื่อ function และ debug entry ใน prototype |

## Legacy / ไม่ได้ mount จาก `src/main.tsx` ปัจจุบัน

ไฟล์ `src/App.tsx` เป็นโค้ดรุ่นเก่าที่ไม่ได้ถูก mount ใน entrypoint ปัจจุบัน (`main.tsx` ใช้ `AuthRole`) แต่ยังมี endpoint เดิมเหล่านี้:

| Method | Endpoint | น่าจะไว้ทำอะไร / ความมั่นใจ |
| --- | --- | --- |
| `GET` | `https://kidbright-study-bn.ae.app.meca.in.th/api/kidbright/users/{sub}` | ดึงข้อมูล user จาก backend รุ่นเก่า ความมั่นใจสูงจาก type `General` ใน `src/App.tsx` แต่เป็น legacy |
| `GET` | `https://kidbright-study-bn.ae.app.meca.in.th/api/kidbright/studies/{sub}` | ดึงข้อมูลการเรียนของ user จาก backend รุ่นเก่า เช่น subject/school/grade ความมั่นใจสูงจาก type `Study` แต่เป็น legacy |
| `POST` | `http://localhost:3000/api/kidbright/users` | สร้าง/บันทึก user ใน backend local รุ่นเก่า ความมั่นใจสูง แต่ URL local นี้อาจไม่ใช่ backend ปัจจุบัน |
| `POST` | `http://localhost:3000/api/kidbright/studies` | สร้างข้อมูล study/enrollment แบบเก่า ความมั่นใจสูงจาก handler เดิม แต่เป็น legacy |
| `PATCH` | `http://localhost:3000/api/kidbright/studies/{studyId}` | แก้ข้อมูล study/enrollment แบบเก่า ความมั่นใจสูงจาก handler เดิม แต่เป็น legacy |
