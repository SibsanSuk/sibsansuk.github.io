# MVP Architecture Decisions (ADR Lite)

Last Updated: 2026-02-21
Purpose: บันทึกการตัดสินใจเชิงเทคนิคที่ "ล็อกแล้ว" สำหรับ MVP เพื่อให้ทำต่อได้ตรงกัน

## ADR-001: Water Model
- Date: 2026-02-21
- Status: accepted
- Decision:
  - ใช้โมเดลน้ำแบบ `canal_segment + water_collect_point`
  - ไม่ใช้บ่อน้ำ (`well`) ใน MVP
- Why:
  - สอดคล้องเอกลักษณ์เกม (น้ำ/นา)
  - ลด scope และคุมระบบน้ำให้อยู่ในแกนเดียว
- Impact:
  - ต้องมี placement rule สำหรับคลองและจุดตักน้ำ
  - ต้องมี coverage check สำหรับบ้าน
- Related:
  - `docs/mvp/mvp-summary.md`
  - `docs/mvp/mvp-technical-design.md`
  - `docs/mvp/content-registry-mvp.md`

## ADR-002: Command and ID Model
- Date: 2026-02-21
- Status: accepted
- Decision:
  - ผู้เล่นแก้สถานะเกมผ่าน command bus เท่านั้น
  - ใช้ ID สองชนิด: `*_type_id` (static), `*_instance_id` (runtime)
- Why:
  - Debug ง่ายและ replay สั้นได้
  - ลด coupling ระหว่าง UI กับ simulation
- Impact:
  - command validation ต้องบังคับรูปแบบ ID
  - เอกสาร command/event ต้องอัปเดตเมื่อเพิ่ม action ใหม่
- Related:
  - `docs/mvp/player-commands-examples.md`
  - `docs/shared/naming-conventions.md`

## ADR-003: Simulation Tick Model
- Date: 2026-02-21
- Status: accepted
- Decision:
  - ใช้ fixed simulation tick
  - รองรับ `pause | x1 | x2`
- Why:
  - พฤติกรรมระบบเสถียรกว่า variable delta time
  - ง่ายต่อการวัดประสิทธิภาพ per tick
- Impact:
  - ทุก system ต้องทำงานตาม tick contract เดียวกัน
  - UI อ่านจาก read model snapshot หลัง resolve events
- Related:
  - `docs/mvp/mvp-technical-design.md`

## ADR-004: Overlay Layers (MVP Scope)
- Date: 2026-02-21
- Status: accepted
- Decision:
  - MVP มี overlay อย่างน้อย 4 ชั้น:
    - `water_network_layer`
    - `service_coverage_layer`
    - `logistics_layer`
    - `housing_need_layer`
  - Overlay เป็น read-only ต่อ simulation state
- Why:
  - ช่วย debug/playtest และเพิ่มความอ่านง่ายของระบบเมือง
- Impact:
  - ต้องมี command `SetOverlayLayerVisibility`
  - ต้องมี UI layer panel ขั้นต่ำ
- Related:
  - `docs/mvp/mvp-technical-design.md`
  - `docs/mvp/player-commands-examples.md`
  - `docs/mvp/content-registry-mvp.md`

## Pending Decisions
- แรงงาน MVP จะเป็น `per-building target workers` ลึกแค่ไหน
- walker simulation ระดับรายละเอียดขั้นต่ำที่ยอมรับได้
- เลือกวิกฤตหลักในเดโม: `flood` หรือ `drought`
- save/load v1 จะเป็น manual-only หรือมี autosave

## Update Rule
- เมื่อมีการตัดสินใจใหม่ ให้เพิ่ม ADR รายการใหม่เท่านั้น (ไม่แก้ทับรายการเดิม)
- ถ้าเปลี่ยนใจ ให้เพิ่มรายการใหม่พร้อมสถานะ `supersedes ADR-xxx`
