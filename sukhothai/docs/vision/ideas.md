# Sukhothai - Product Vision & Content Backlog

เอกสารนี้เป็นภาพรวมระดับโปรดักต์ (Big Picture) สำหรับเกม Sukhothai
- ใช้เป็น `Vision + Backlog` ระยะยาว
- ไม่ใช่ขอบเขตส่งมอบทันที
- ขอบเขตพัฒนาปัจจุบันให้ยึด `docs/mvp/mvp-summary.md` และ `docs/mvp/mvp-technical-design.md`

---

## 1) Product Scope Policy

### 1.1 Scope Bands
- `MVP (Now)`: ฟีเจอร์ที่ต้องมีเพื่อเดโมและขอทุน
- `Post-MVP (Next)`: ฟีเจอร์ที่เพิ่มความลึกหลังได้ทุน/มีทรัพยากรเพิ่ม
- `Vision (Later)`: ฟีเจอร์ระดับภาพใหญ่ที่ยังไม่ commit เวลา

### 1.2 Rules
- ห้ามดึงรายการจาก `Post-MVP` หรือ `Vision` เข้าสปรินต์ MVP โดยไม่อนุมัติ
- ทุกระบบที่เข้า MVP ต้องมี: gameplay purpose, effort estimate, owner, test criteria
- ถ้ามีข้อขัดแย้ง ให้เอกสาร MVP มีลำดับความสำคัญสูงกว่าเอกสารนี้

---

## 2) Design Direction (High-Level)
- แนวเกม: Historical City-Builder (กลิ่นอาย Pharaoh + Zeus/Caesar + Emperor)
- เอกลักษณ์หลัก: ระบบน้ำ/นาข้าว/ศรัทธา/การค้าในบริบทสุโขทัย
- ประสบการณ์ผู้เล่น: วางผังเมือง -> ผลิต/กระจาย -> ยกระดับคุณภาพชีวิต -> รับมือวิกฤต

---

## 3) Content Taxonomy
เนื้อหาถูกจัดเป็น 5 กลุ่มหลัก
- Resources
- Buildings
- Characters
- Map / POI
- Trading

---

## 4) Resources Backlog

### 4.1 Food
- ข้าว
- กล้วย
- ปลา
- มะม่วง
- ตาล / น้ำตาลโตนด
- มะขาม
- มะพร้าว
- ไก่

ตัวอย่าง chain (concept)
- ข้าว: นา -> กระท่อมชาวนา -> อาหารหลัก
- ปลา: จุดปลาในแม่น้ำ/คลอง -> ท่าจับปลา/ท่าเรือประมง -> อาหารหลัก
- ตาล: สวนตาล -> กระท่อมดูแลผลไม้ -> โรงทำน้ำตาล -> น้ำตาลโตนด

### 4.2 Clothing
- ผ้าฝ้าย
- ผ้าไหม

ตัวอย่าง chain (concept)
- ผ้าฝ้าย: ไร่ฝ้าย -> กระท่อมปลูกฝ้าย -> โรงทอผ้าฝ้าย
- ผ้าไหม: ไร่หม่อน -> กระท่อมเลี้ยงหม่อน/ไหม -> โรงทอผ้าไหม

### 4.3 Luxury
- หมาก
- สังคโลก
- เครื่องเงิน
- ไม้หอม (กฤษณา)

### 4.4 General Resources
- ไม้
- ดินเหนียว
- อิฐ
- แกลบ
- ศิลาแลง
- หินทราย
- เหล็ก
- เงิน
- สมุนไพร
- ฝ้าย
- ใยไหม

---

## 5) Buildings Backlog

### 5.1 Housing
- บ้านชาวบ้าน
- บ้านชนชั้นสูง

### 5.2 Food & Farming
- นาข้าว + กระท่อมชาวนา
- กระท่อมคนดูแลผลไม้ + สวนผลไม้
- เล้าไก่
- ท่าจับปลา / ท่าเรือประมง
- สวนหมาก
- กระท่อมคนหาของป่า
- ไร่ฝ้าย + กระท่อมปลูกฝ้าย
- ไร่หม่อน + กระท่อมเลี้ยงหม่อน/ไหม

### 5.3 Industry
- โรงทำน้ำตาล
- โรงทอผ้า
- โรงตัดไม้
- บ่อดินเหนียว
- เตาทุเรียง (สังคโลก)
- เตาเผาอิฐ
- โรงหลอมเหล็ก/เงิน
- กระท่อมตัดหินศิลาแลง/หินทราย
- โรงผลิตเครื่องเงิน
- โรงกษาปณ์

### 5.4 Market & Storage
- ยุ้งฉาง
- โกดัง
- ตลาด
- ท่าเรือสินค้า
- ตลาดประสาน (ค้าระหว่างเมือง)

### 5.5 Governance & Safety
- โรงสมุนไพร
- โรงเก็บภาษี
- หน่วยลาดตระเวน/ความปลอดภัย
- ที่อยู่เจ้าเมือง
- เนินปราสาท (เชิงสัญลักษณ์ประวัติศาสตร์)

### 5.6 Religion & Culture
- วัดพุทธขนาดเล็ก
- เจดีย์
- ลานวัด
- โรงเรียนดนตรี
- โรงเรียนรำ
- วัดฮินดู
- สนามไก่ชน

### 5.7 Military (Vision Candidate)
- โรงผลิตอาวุธ
- คอกม้า
- เพนียดช้าง
- ค่ายทหารราบ/ธนู/ม้า/ช้าง

### 5.8 Major Landmarks / POI
- กลุ่มโบราณสถานในเขตกำแพงเมือง
- กลุ่มโบราณสถานนอกเขตกำแพงเมือง
- สรีดภงส์ (เขื่อนดินโบราณ)

หมายเหตุ: รายชื่อสถานที่จริงให้รักษาเป็น `historical reference set` และคัดเป็น playable subset ตาม scope แต่ละ phase

---

## 6) Character Backlog

### 6.1 Human Roles
- Villager / Laborer
- Farmer / Orchard worker / Fisher
- Carrier / Warehouse worker
- Forester / Miner / Artisan
- Merchant (local + foreign)
- Monk / Brahmin / Performer / Musician
- Guard / Soldier / Commander
- Ruler class (พ่อขุน/ชนชั้นนำ)

### 6.2 Animals
- ไก่บ้าน, ไก่ชน
- วัว, ควาย
- ม้า
- ช้าง

หมายเหตุ production: ใช้โมเดลฐานร่วม + variant textures/props เพื่อลดต้นทุน

---

## 7) Data Standards (สำหรับแปลงไปใช้งานจริง)

### 7.1 Resource Schema (ขั้นต่ำ)
- `id`
- `display_name_th`
- `category`
- `stack_limit`
- `tradable`

### 7.2 Building Schema (ขั้นต่ำ)
- `id`
- `category`
- `footprint`
- `build_cost`
- `build_time`
- `workers_required`
- `inputs[]`
- `outputs[]`
- `service_type` / `service_radius` (ถ้ามี)
- `unlock_condition`

### 7.3 Role Schema (ขั้นต่ำ)
- `id`
- `workplace_buildings[]`
- `primary_tasks[]`

### 7.4 Content IDs
- ใช้ `snake_case` ภาษาอังกฤษทั้งหมด เช่น `rice_farm`, `pottery_kiln`, `city_market`
- ชื่อภาษาไทยใช้เฉพาะฟิลด์แสดงผล

---

## 8) Prioritization Matrix

### 8.1 MVP (Now)
- ระบบน้ำ/อาหารพื้นฐาน
- ที่อยู่อาศัย + ตลาด + โกดัง
- 3 production chains หลัก
- วิกฤตหลัก 1 แบบ
- เงื่อนไขชนะ/แพ้พื้นฐาน

### 8.2 Post-MVP (Next)
- ห่วงโซ่เสื้อผ้าและ luxury เพิ่มเติม
- ศาสนา/วัฒนธรรมลึกขึ้น
- ระบบการค้าข้ามเมืองที่ละเอียดขึ้น

### 8.3 Vision (Later)
- ระบบทหารเต็มรูปแบบ
- ชุดพ่อค้าต่างชาติหลากหลาย faction
- landmark interactions เชิงลึก

---

## 9) Asset Production Strategy
- ทำ `MVP asset pack` ก่อน: reusable modular kit
- ใช้ LOD และ shared materials เพื่อลด draw calls
- Character ใช้ base rig เดียว + variants
- ตั้ง naming convention กลางตั้งแต่แรก

---

## 10) Risks & Governance
- ความเสี่ยงหลัก: scope creep จาก backlog ใหญ่
- วิธีคุม: feature gate ตาม scope band + monthly review
- Definition of Ready ก่อนเริ่มงาน asset/system:
  - มี data schema ชัด
  - มี owner
  - มี acceptance criteria

---

## 11) Next Actions (Recommended)
1. ใช้ไฟล์ `docs/mvp/content-registry-mvp.md` เพื่อล็อกรายการ content ที่เข้า MVP จริง
2. แตก `buildings` และ `resources` เป็นตาราง data-ready (CSV/JSON draft)
3. ทำ estimation per item (S/M/L) สำหรับ art + code + design
