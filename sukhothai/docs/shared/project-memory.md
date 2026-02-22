# Sukhothai Project Memory (Long-Term)

Last Updated: 2026-02-21
Purpose: เอกสารกลางสำหรับคน/agent ที่เข้ามาทำงานต่อในระยะยาวหลายปี

## 1) Project Identity
- Project: Sukhothai (historical city-builder)
- Product Direction: Pharaoh + Zeus/Caesar + Emperor inspiration, but Thai-first identity
- Current Focus: MVP เพื่อเดโมและขอทุน

## 2) Source of Truth (Priority Order)
1. `docs/mvp/content-registry-mvp.md`
2. `docs/mvp/architecture-decisions.md`
3. `docs/mvp/mvp-summary.md`
4. `docs/mvp/mvp-technical-design.md`
5. `docs/mvp/player-commands-examples.md`
6. `docs/mvp/phase-workflow.md`
7. `docs/mvp/handoff-guide.md`
8. `docs/mvp/mvp-execution-checklist.md`
9. `docs/vision/ideas.md` (vision/backlog only)
10. `docs/vision/note.md` (brainstorm notes)

Rule: ถ้าเอกสารขัดกัน ให้ลำดับบนชนะลำดับล่าง

## 3) Scope Governance
- `docs/mvp/*` = สิ่งที่ทำจริงตอนนี้
- `docs/vision/*` = ระยะกลาง/ยาว ยังไม่ commit schedule
- ห้ามดึง item จาก vision เข้า MVP โดยไม่แก้ registry + acceptance criteria

## 4) MVP Non-Negotiables
- Playable loop 10-15 นาทีต้องจบได้
- มี win path และ lose path ที่ทดสอบได้จริง
- Core systems ต้องเสถียร: simulation tick, economy, housing needs, services, crisis, objective
- UI ต้องอ่านง่าย: resource/objective/alerts

## 5) Domain Decisions Locked (Current)
- Water model: `canal_segment + water_collect_point` (ไม่ใช้บ่อน้ำ)
- ID model: ใช้ทั้ง `*_type_id` และ `*_instance_id`
- Overlay model: รองรับ data layers (water/service/logistics/housing)
- Command model: player actions ผ่าน command bus

## 6) Naming & Data Standards
- IDs: `snake_case` ภาษาอังกฤษ
- File docs: `kebab-case`
- Runtime entity IDs: stable pattern เช่น `bld_000123`, `wrk_000987`
- ดูเพิ่มเติม: `docs/shared/naming-conventions.md`

## 7) Architecture Principles (MVP)
- Layered + Data-Driven + Event Bus
- UI อ่านจาก read model เท่านั้น
- Simulation ใช้ fixed tick
- ลด coupling ระหว่าง gameplay logic กับ UI/rendering

## 8) Working Agreement (Human + Agent)
- เปลี่ยน scope ต้องอัปเดต 3 จุดเสมอ:
  1) `docs/mvp/content-registry-mvp.md`
  2) `docs/mvp/mvp-summary.md` (player impact)
  3) `docs/mvp/mvp-technical-design.md` (technical impact)
- เพิ่ม command/event ใหม่ ต้องอัปเดต `docs/mvp/player-commands-examples.md`
- ถ้ามีคำตัดสินสถาปัตยกรรมใหม่ ให้บันทึกในเอกสารนี้ทันที

## 9) Continuation Checklist (Before Pause/Exit)
- [ ] อัปเดต status ใน content registry
- [ ] บันทึกสิ่งที่ตัดสินใจแล้ว (และเหตุผล)
- [ ] บันทึกสิ่งที่ยังไม่ตัดสินใจ
- [ ] ระบุ blocker และ owner
- [ ] ระบุ next 3 actions ที่ควรทำต่อ

## 10) Open Questions Log (Keep Fresh)
- ระบบแรงงาน MVP ใช้ per-building assignment ลึกแค่ไหน
- ความลึกของ walker simulation ในเฟส MVP
- Crisis tuning: flood vs drought น้ำหนักต่อ economy เท่าไร
- ขอบเขต save/load เวอร์ชันแรก (autosave หรือ manual-only)

## 11) Change Log Template
ใช้ format นี้ทุกครั้งที่เปลี่ยนของสำคัญ:

```text
[YYYY-MM-DD] [Type: Scope|Tech|Design|Process]
What changed:
Why:
Affected files:
Risk/Impact:
Owner:
```

## 12) Quick Start for New Contributor / Agent
1. อ่านไฟล์นี้ก่อน
2. อ่าน `docs/mvp/content-registry-mvp.md` เพื่อรู้ขอบเขตจริง
3. อ่าน `docs/mvp/mvp-summary.md` เพื่อเข้าใจ player journey
4. อ่าน `docs/mvp/mvp-technical-design.md` เพื่อเข้าใจ architecture
5. ถ้าจะแก้ command/state model อ่าน `docs/mvp/player-commands-examples.md`

## 13) Next Recommended Improvement
- เชื่อม checklist กับสถานะจริงใน content registry แบบราย milestone (M1-M5)
