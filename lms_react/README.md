# MECA Teacher Dashboard — React CDN

Teacher Dashboard ชุดนี้เขียนใหม่ด้วย React + Tailwind ผ่าน CDN จึงไม่ต้องติดตั้ง package และไม่ต้อง compile

## เปิดใช้งานในเครื่อง

ต้องเปิดผ่าน HTTP server (ไม่ใช้ `file://`) เพื่อให้ OIDC และ `fetch()` ทำงานถูกต้อง

```bash
python3 -m http.server 3000
```

จากนั้นเปิด `http://localhost:3000/`

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | โหลด React, Babel, Tailwind, Leaflet และ runtime config |
| `src/teacher-api.js` | OIDC, API endpoints และ data normalization |
| `src/app.js` | React components (JSX) และ state ของ dashboard |
| `src/app.runtime.js` | JavaScript พร้อมใช้สำหรับเปิด `index.html` ด้วย double-click |
| `src/styles.css` | CSS เฉพาะส่วนที่ Tailwind ไม่ครอบคลุม |
| `References/overview.json` | ข้อมูล aggregate สำหรับแผนที่หน้าแรก |

## เปิดด้วย double-click

สามารถ double-click `index.html` เพื่อดูหน้า Preview ได้ทันที ระบบจะใช้ `src/app.runtime.js`

ข้อจำกัดของ `file://`:

- เบราว์เซอร์ไม่อนุญาตให้โหลด `overview.json` และข้อมูล API บางส่วน
- OIDC Login ไม่รองรับ redirect URI แบบ local file
- เมื่อต้องการ Login หรือทดสอบข้อมูลจริง ให้เปิดผ่าน HTTP server ตามคำสั่งด้านบน

## Runtime config

แก้ค่า `window.TEACHER_DASHBOARD_CONFIG` ใน `index.html` ก่อน script ของแอป:

```html
<script>
  window.TEACHER_DASHBOARD_CONFIG = {
    baseUrl: "https://adaptive-profile-bn.ae.app.meca.in.th",
    bookrollBaseUrl: "https://adaptive-profile-bn.ae.app.meca.in.th",
    sbsUrl: "https://sbs-backend.mooc.meca.in.th",
    clientId: "dashboard",
    instituteId: "",
    assignId: ""
  };
</script>
```

เมื่อนำขึ้นโดเมนใหม่ ต้องเพิ่ม URL ของหน้า dashboard ใน OIDC Redirect URIs และ Web Origins ด้วย

## แนวทางแก้ไข

- แก้หน้าตาและ component หลักที่ `src/app.js`
- แก้ endpoint หรือการแปลงข้อมูลที่ `src/teacher-api.js`
- สีหลักและ font อยู่ใน `tailwind.config` ที่ `index.html`
- ไม่มี mock data ใน runtime; ถ้า API ล้มเหลว UI จะแสดง error หรือ empty state
