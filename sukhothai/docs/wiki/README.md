# Sukhothai Wiki Hub

ศูนย์กลางเอกสารสำหรับ MVP เท่านั้น (ไม่แสดงบันทึกหลังบ้าน)

## Website Entry

- เปิดเว็บ wiki: `docs/wiki/index.html`
- เปิดเอกสาร `.md` แบบอ่านง่าย: `docs/wiki/view.html?doc=../mvp/content-registry-mvp.md`

## Team Sync (แชร์สถานะกับทีม)

1. ใช้เทมเพลต `docs/wiki/google-apps-script-template.js` ไปวางใน Google Apps Script
2. Deploy เป็น Web App แล้วคัดลอก URL
   - ถ้าเคย deploy ไปแล้ว ให้ `Manage deployments` -> `Edit` -> `New version` แล้ว Deploy ใหม่
3. เปิด `docs/wiki/index.html` และกรอก:
   - `ชื่อผู้แก้ไข`
   - `Team Key` (ให้ทีมใช้ค่าเดียวกัน)
   - `Sync Endpoint URL` (Web App URL)
4. ใช้ปุ่ม:
   - `Save Team` เพื่อบันทึกขึ้นเซิร์ฟเวอร์ทีม
   - `Load Team` เพื่อดึงสถานะล่าสุดของทีม
   - `Export/Import JSON` สำหรับโอนย้ายข้อมูล (ไม่ใช่ local autosave)

หมายเหตุ: ระบบนี้ไม่บันทึกลง `localStorage` เพื่อกันข้อมูลคลาดเคลื่อนระหว่างเครื่อง
หมายเหตุเพิ่ม: โค้ด sync ใช้ `form-urlencoded` เพื่อลด CORS preflight (แก้ปัญหา 405)

## Quick Start

- สรุป MVP: `docs/wiki/view.html?doc=../mvp/mvp-summary.md`
- ทะเบียนขอบเขต MVP: `docs/wiki/view.html?doc=../mvp/content-registry-mvp.md`
- แผนการทำงาน MVP: `docs/wiki/view.html?doc=../mvp/phase-workflow.md`

## Source of Truth (MVP)

1. `docs/mvp/content-registry-mvp.md`
2. `docs/mvp/architecture-decisions.md`
3. `docs/mvp/mvp-summary.md`
4. `docs/mvp/mvp-technical-design.md`

หมายเหตุ: หน้าเว็บ wiki นี้จำกัดการแสดงผลเฉพาะเอกสารใน `docs/mvp/`
