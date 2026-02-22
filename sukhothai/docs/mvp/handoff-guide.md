# MVP Phase Continuation Guide

Last Updated: 2026-02-21
Audience: Human contributors + agents (ทีมเดียวกัน)
Goal: ทำงานต่อจาก phase ปัจจุบันแบบต่อเนื่อง ไม่หลุดบริบท

## 1) Start Here (ทุกครั้ง)
1. อ่าน `docs/shared/project-memory.md`
2. อ่าน `docs/mvp/content-registry-mvp.md` (source of truth หลัก)
3. อ่าน `docs/mvp/architecture-decisions.md`
4. อ่าน `docs/mvp/mvp-summary.md`
5. อ่าน `docs/mvp/mvp-technical-design.md`

## 2) ก่อนเริ่มทำงานรอบใหม่
- ยืนยัน scope ว่ายังอยู่ใน MVP
- ระบุว่าอยู่ phase ไหน (M1-M5) และเป้าหมายรอบนี้คืออะไร
- เลือกงานจาก P0 ก่อน (ใน content registry)
- ระบุ acceptance criteria ที่จะปิดให้ชัด
- ถ้าต้องเพิ่ม command/event ให้เตรียมแก้ `player-commands-examples.md`

## 3) ระหว่างทำงาน
- ห้ามเพิ่ม content นอก MVP โดยไม่แก้ registry
- ถ้าเปลี่ยน technical decision:
  - เพิ่มรายการใหม่ใน `architecture-decisions.md`
  - อัปเดตไฟล์ที่ได้รับผลกระทบ
- ถ้ามี blocker:
  - บันทึก blocker + owner + ทางเลือกที่ลองแล้ว

## 4) ก่อนจบรอบงาน (ต้องกรอก)
- วันที่:
- phase ปัจจุบัน:
- งานที่ทำเสร็จ:
- งานที่กำลังทำค้าง:
- งานถัดไป 3 รายการ:
- ความเสี่ยง/สิ่งที่ต้องระวัง:
- ไฟล์ที่แก้:
- สถานะทดสอบ (ผ่าน/ไม่ผ่าน/ยังไม่ได้รัน):

## 5) Minimal Continuation Entry Template
```text
[2026-02-21] [Owner: <name_or_agent>] [Type: Dev|Design|Docs]
Phase:
Done:
In progress:
Next 3 actions:
Blockers:
Changed files:
Test status:
```

## 6) Definition of Done (MVP Item)
- ตรง acceptance criteria ใน registry
- เอกสารที่เกี่ยวข้องอัปเดตแล้ว
- ไม่มี conflict กับ architecture decisions ที่ accepted
- รอบถัดไปเริ่มต่อได้ทันทีโดยไม่ต้องตีความใหม่
