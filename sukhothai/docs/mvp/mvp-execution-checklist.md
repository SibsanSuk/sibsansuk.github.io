# MVP Execution Checklist (Docs-First)

Last Updated: 2026-02-21
Purpose: เช็กลำดับงานที่ต้องครบเพื่อไปถึง vertical slice

## Quick Use
1. เลือก phase ปัจจุบัน (M1-M5)
2. กรอกข้อมูลใน `Required Information Guide` ให้ครบก่อนเริ่มงาน
3. ปิด checklist ของ phase นั้น
4. อัปเดต `Cross-Doc Sync Checklist` ก่อนจบรอบ

## Required Information Guide

| required_info | why_needed | source_file | done_when |
|---|---|---|---|
| current_phase + phase_goal | ให้ทุกคน/agent เข้าใจเป้าหมายรอบเดียวกัน | `docs/mvp/phase-workflow.md` | ระบุชัดเจน 1 บรรทัด |
| in-scope items (P0/P1) | กัน scope หลุดจาก MVP | `docs/mvp/content-registry-mvp.md` | มีรายการ ID ที่จะทำในรอบนี้ |
| acceptance criteria | ใช้ตัดสินว่า item ปิดงานได้หรือยัง | `docs/mvp/content-registry-mvp.md` | ทุก item มีเกณฑ์วัดผล |
| impacted technical decisions | กันเอกสารขัดกัน | `docs/mvp/architecture-decisions.md` | ระบุ ADR ที่เกี่ยวข้อง/ไม่มีผลกระทบ |
| command/event impact | กัน contract เพี้ยนระหว่างระบบ | `docs/mvp/player-commands-examples.md` | ระบุว่าจะเพิ่ม/ไม่เพิ่ม command/event |
| player impact | ให้การเปลี่ยนเอกสารยังตอบ journey 10-15 นาที | `docs/mvp/mvp-summary.md` | ระบุว่ากระทบช่วงไหนของ journey |
| technical impact | คุมความสอดคล้องกับ architecture | `docs/mvp/mvp-technical-design.md` | ระบุ module/system ที่กระทบ |
| evidence of completion | ลดงานค้างกำกวม | เอกสารที่แก้จริงในรอบนี้ | มีลิงก์ไฟล์ + สถานะทดสอบ |

## Round Entry Template (Copy/Fill)
```text
[YYYY-MM-DD] Round: <name>
Phase: <M1|M2|M3|M4|M5>
Phase goal:
In-scope item IDs:
Acceptance criteria to close:
Related ADR:
Command/Event impact:
Player journey impact:
Technical module impact:
Changed docs:
Test status:
```

## M1 Foundation
- [ ] ยืนยัน command contracts (`PlaceBuilding`, `SetGameSpeed`, `SetLaborPriority`)
- [ ] ล็อก placement rules ขั้นต่ำในเอกสาร
- [ ] กำหนด map constraints ของ `map_river_01`
- [ ] ล็อก data schema ขั้นต่ำของไฟล์ใน `data/*.json`

## M2 Core Economy
- [ ] ล็อกสูตร chain หลัก: ข้าว, ปลา, ไม้
- [ ] ล็อก role ของ `granary` และ `stockpile`
- [ ] ล็อกเงื่อนไข needs ที่มีผลต่อบ้าน T1 -> T2
- [ ] ล็อกคำนิยาม resource delta ที่ HUD ต้องแสดง

## M3 Playable Loop
- [ ] ล็อก objective ช่วงนาที 0-6 ให้ measurable
- [ ] ล็อก coverage model (water/market/faith)
- [ ] ล็อก alert สำคัญที่ต้องมีใน MVP
- [ ] ล็อก tutorial steps ขั้นต่ำให้จบช่วงต้นเกม

## M4 Crisis + Win/Lose
- [ ] ตัดสินใจวิกฤตหลัก (`flood` หรือ `drought`)
- [ ] ล็อก phase ของ crisis: warning -> active -> recovery
- [ ] ล็อกเงื่อนไขแพ้ที่วัดผลได้จริง
- [ ] ล็อกเงื่อนไขชนะที่จบเดโมได้ใน 10-15 นาที

## M5 Polish + Playtest
- [ ] ล็อก telemetry/events ที่ใช้ประเมิน KPI
- [ ] ล็อก playtest script (เริ่ม-จบรัน)
- [ ] ล็อกรายการ bug class ที่ต้องปิดก่อนเดโม
- [ ] สรุป known issues ที่ยอมรับได้ใน MVP

## Cross-Doc Sync Checklist
- [ ] `docs/mvp/content-registry-mvp.md` อัปเดต status ล่าสุด
- [ ] `docs/mvp/mvp-summary.md` สอดคล้องกับ player journey ปัจจุบัน
- [ ] `docs/mvp/mvp-technical-design.md` สอดคล้องกับระบบที่ทำจริง
- [ ] `docs/mvp/player-commands-examples.md` ครอบคลุม command ใหม่
- [ ] `docs/mvp/architecture-decisions.md` บันทึก decision สำคัญล่าสุด
- [ ] `docs/mvp/phase-workflow.md` ยังสอดคล้องกับ phase ที่กำลังทำจริง
