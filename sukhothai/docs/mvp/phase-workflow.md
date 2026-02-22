# MVP Phase Workflow

Last Updated: 2026-02-21
Purpose: คู่มือทำงานต่อทีละ phase (M1-M5) จากเอกสาร MVP ชุดปัจจุบัน

## Usage
1. เลือก phase ที่กำลังทำ
2. เช็ก `required docs update` ของ phase นั้น
3. ปิด `exit criteria` ให้ครบก่อนขยับ phase

## M1 Foundation
- Objective:
  - ทำให้ command + tick + placement contract ชัดเจนพร้อมเริ่มลงโค้ด
- Required docs update:
  - `docs/mvp/player-commands-examples.md`
  - `docs/mvp/mvp-technical-design.md`
  - `docs/mvp/content-registry-mvp.md`
- Exit criteria:
  - command หลักของ MVP ระบุ payload และ validation ครบ
  - placement rules ขั้นต่ำถูกบันทึกชัดเจน
  - สถานะ P0 ที่อยู่ใน M1 ถูกอัปเดตใน registry

## M2 Core Economy
- Objective:
  - ล็อกพฤติกรรม resource flow และ housing needs สำหรับลูปเศรษฐกิจช่วงต้น
- Required docs update:
  - `docs/mvp/content-registry-mvp.md`
  - `docs/mvp/mvp-summary.md`
  - `docs/mvp/mvp-technical-design.md`
- Exit criteria:
  - chain ข้าว/ปลา/ไม้ มีคำนิยาม input-output ที่ใช้ร่วมกันได้
  - need checks ที่กระทบ T1 -> T2 ระบุชัดเจน
  - HUD resource list ตรงกันทุกเอกสาร

## M3 Playable Loop
- Objective:
  - ทำให้ช่วงเล่นนาที 0-6 จบได้แบบวัดผลได้
- Required docs update:
  - `docs/mvp/mvp-summary.md`
  - `docs/mvp/content-registry-mvp.md`
  - `docs/mvp/player-commands-examples.md`
- Exit criteria:
  - objective ช่วงต้นเกม measurable และทดสอบซ้ำได้
  - coverage model (water/market/faith) ล็อกแล้ว
  - tutorial steps ที่จำเป็นถูกระบุครบ

## M4 Crisis + Win/Lose
- Objective:
  - ล็อกวิกฤตหลัก 1 แบบและเงื่อนไขแพ้ชนะที่เทสต์ได้จริง
- Required docs update:
  - `docs/mvp/mvp-summary.md`
  - `docs/mvp/mvp-technical-design.md`
  - `docs/mvp/architecture-decisions.md`
  - `docs/mvp/content-registry-mvp.md`
- Exit criteria:
  - ตัดสินใจชัดว่าใช้ `flood` หรือ `drought`
  - crisis phases และ impact modifiers ถูกระบุชัด
  - win/lose checks มีเกณฑ์วัดผลแบบตัวเลข

## M5 Polish + Playtest
- Objective:
  - ปิดงานให้พร้อมเดโมและพร้อม feedback loop
- Required docs update:
  - `docs/mvp/content-registry-mvp.md`
  - `docs/shared/project-memory.md`
  - `docs/mvp/mvp-execution-checklist.md`
- Exit criteria:
  - playtest script พร้อมใช้งาน
  - KPI ที่ใช้ประเมินผลถูกล็อกและ trace ได้
  - known issues ถูกบันทึกพร้อมระดับความเสี่ยง

## End-of-Phase Note Template
```text
[YYYY-MM-DD] Phase: Mx
Completed:
Open items:
Decision made:
Docs updated:
Next phase entry condition:
```
