# Sukhothai - Content Registry (MVP)

เอกสารนี้ใช้ล็อกรายการคอนเทนต์ที่ “เข้า MVP จริง” เท่านั้น
อ้างอิงขอบเขตจาก `mvp-summary.md` และ `mvp-technical-design.md`

## 1) Usage Rules

- ห้ามเพิ่มรายการใหม่โดยไม่ระบุ owner + estimate + acceptance
- `priority`: P0 (must ship), P1 (important), P2 (optional for MVP)
- `estimate`: S (<= 1 วัน), M (2-4 วัน), L (5-10 วัน)
- `status`: todo | doing | blocked | done

## 2) Resource Registry (MVP)

| id | display_name_th | category | priority | owner | estimate | status | acceptance_criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rice | ข้าว | food | P0 | design | S | todo | ใช้เป็นอาหารหลักและแสดงใน HUD ได้ |
| fish | ปลา | food | P0 | design | S | todo | ผลิตจากอาคารประมงและเข้า stock ได้ |
| wood | ไม้ | material | P0 | design | S | todo | ใช้ก่อสร้างอาคารหลักได้ |
| pottery | เครื่องปั้น | goods | P1 | design | S | todo | จบ chain แล้วได้ output เข้าคลัง |
| labor | แรงงาน | population | P0 | code | M | todo | ระบบจองแรงงานต่ออาคารทำงานถูกต้อง |
| faith | ศรัทธา | service | P1 | code | M | todo | ค่า faith เพิ่มจากอาคารศาสนาและถูกอ่านโดย objective |
| gold | เงิน | economy | P1 | code | M | todo | รายรับ/รายจ่ายพื้นฐานแสดงใน UI |

## 3) Building Registry (MVP)

| id | display_name_th | category | chain/service | priority | owner | estimate | status | acceptance_criteria |
|---|---|---|---|---|---|---|---|---|
| road | ถนน | infrastructure | connectivity | P0 | code | M | todo | อาคารเชื่อมต่อถนนแล้วเดินทางได้ |
| house_t1 | บ้านชาวบ้าน | housing | population | P0 | code | M | todo | รับผู้อยู่อาศัยและผูก need checks |
| house_t2 | บ้านยกระดับ | housing | population | P1 | code | M | todo | อัปเกรดจาก T1 เมื่อเงื่อนไขครบ |
| canal_segment | คลองส่งน้ำ | infrastructure | water_network | P0 | code | M | todo | ขุดและเชื่อมเครือข่ายคลองได้ต่อเนื่อง |
| water_collect_point | จุดตักน้ำ | service | water_access | P0 | code | M | todo | บ้านใกล้จุดตักน้ำ/คลองได้สถานะน้ำ |
| rice_farm | นาข้าว | production | rice_chain | P0 | code | M | todo | สร้างงานผลิตข้าวตามรอบเวลา |
| fisher_hut | กระท่อมประมง | production | fish_chain | P0 | code | M | todo | ผลิตปลาเมื่อเข้าถึงจุดน้ำได้ |
| lumber_camp | กระท่อมตัดไม้ | production | wood_chain | P0 | code | M | todo | ผลิตไม้และส่งเข้า stockpile ได้ |
| pottery_kiln | เตาเครื่องปั้น | production | pottery_chain | P1 | code | L | todo | ใช้วัตถุดิบครบก่อนผลิต output |
| granary | ยุ้งฉาง | storage | food_storage | P0 | code | M | todo | เพิ่มความจุอาหารและอ่านค่าได้ถูกต้อง |
| stockpile | โกดัง | storage | goods_storage | P0 | code | M | todo | เก็บไม้/เครื่องปั้นและรองรับ distribution |
| market | ตลาด | service | distribution | P0 | code | L | todo | กระจายสินค้าให้บ้านในรัศมี |
| shrine | ศาสนสถานเล็ก | service | faith | P1 | code | M | todo | เพิ่ม faith/ความสุขในพื้นที่บริการ |
| watch_post | จุดลาดตระเวน | safety | stability | P2 | code | M | todo | ลดความเสี่ยงความไม่สงบพื้นฐาน |

## 4) Character/Agent Registry (MVP)

| id | role | priority | owner | estimate | status | acceptance_criteria |
|---|---|---|---|---|---|---|
| laborer | คนงานทั่วไป | P0 | code | L | todo | รับ task และเดินเส้นทางได้ |
| carrier | คนขนส่ง | P0 | code | L | todo | รับ-ส่งสินค้าระหว่างอาคารได้ |
| service_walker | ผู้ให้บริการ | P1 | code | M | todo | กระจาย service token ให้บ้านตามรัศมีถนน |

## 5) Systems Registry (MVP)

| id | system | priority | owner | estimate | status | acceptance_criteria |
|---|---|---|---|---|---|---|
| sim_tick | fixed tick simulation | P0 | code | L | todo | simulation รันคงที่ที่ tick rate ที่กำหนด |
| command_bus | player command pipeline | P0 | code | L | todo | command valid/invalid ถูกจัดการครบ |
| placement_rules | placement validation | P0 | code | M | todo | วางอาคารผิดเงื่อนไขแล้ว reject ได้ |
| economy_runtime | production + consumption | P0 | code | L | todo | resource delta ถูกต้องตาม chain |
| housing_needs | need evaluation + upgrade | P0 | code | L | todo | T1->T2 ทำงานตามเงื่อนไข |
| service_coverage | water/market/faith coverage | P0 | code | L | todo | coverage cache อัปเดตและอ่านใช้ได้ |
| crisis_event | flood_or_drought | P0 | code | M | todo | วิกฤตเริ่ม-จบและส่งผลต่อเศรษฐกิจ |
| win_lose_eval | objective evaluator | P0 | code | M | todo | ตัดสินแพ้ชนะได้ถูกต้องตามเกณฑ์ |
| save_load | persistence | P1 | code | M | todo | save/load กลับมาเล่นต่อได้ |
| hud_core | resource + objective HUD | P0 | ui | M | todo | ผู้เล่นอ่านทรัพยากร/เป้าหมายได้ชัด |
| alerts_panel | alert & warning UI | P1 | ui | M | todo | แจ้งปัญหาหลักแบบ actionable |
| overlay_layers | data layer visualization | P1 | code | M | todo | เปิด/ปิดชั้นข้อมูลและแสดงผลถูกต้องตาม read model |

## 6) Map/Scenario Registry (MVP)

| id | item | priority | owner | estimate | status | acceptance_criteria |
|---|---|---|---|---|---|---|
| map_river_01 | แผนที่ริมน้ำหลัก | P0 | design | M | todo | เล่นครบ journey 0-15 นาทีได้ |
| fish_spots | จุดปลาในแม่น้ำ | P0 | design | S | todo | ระบบประมงหา resource ได้ |
| fertile_zones | พื้นที่นาปลูกได้ | P0 | design | S | todo | อาคารนาให้ผลผลิตตามเงื่อนไข |
| crisis_trigger_01 | trigger วิกฤต | P0 | design | S | todo | วิกฤตเกิดตาม timeline เดโม |

## 7) UI/Tutorial Registry (MVP)

| id | item | priority | owner | estimate | status | acceptance_criteria |
|---|---|---|---|---|---|---|
| tutorial_step_01 | เริ่มด่าน + objective แรก | P0 | ui | S | todo | ผู้เล่นเข้าใจเป้าหมายใน 10 วินาที |
| tutorial_step_02 | วางถนน/บ้าน/คลอง/จุดตักน้ำ | P0 | ui | S | todo | ผู้เล่นผ่านช่วงที่ 1 ได้โดยไม่ติด |
| tutorial_step_03 | เปิด chain เศรษฐกิจ | P0 | ui | S | todo | ผู้เล่นเริ่มผลิตข้าว/ไม้ได้ |
| end_of_run_summary | หน้าสรุปจบด่าน | P1 | ui | M | todo | แสดงผลแพ้/ชนะและ metric หลัก |
| layer_panel | ปุ่มเลือกชั้นข้อมูล | P1 | ui | M | todo | ผู้เล่น toggle water/service/logistics/housing layers ได้ |

## 8) Milestone Mapping

| milestone | includes | target |
|---|---|---|
| M1 Foundation | sim_tick, command_bus, placement_rules, map_river_01 | สัปดาห์ 1-2 |
| M2 Core Economy | rice/fish/wood chains, housing_needs, granary/stockpile | สัปดาห์ 3-4 |
| M3 Playable Loop | market, service_coverage, HUD/tutorial ช่วงต้น | สัปดาห์ 5-6 |
| M4 Objective Layer | crisis_event, win_lose_eval, summary screen | สัปดาห์ 7-8 |
| M5 Polish | alerts, balance pass, bugfix, playtest support | สัปดาห์ 9-10 |

## 9) Change Log

- 2026-02-20: Initial MVP registry created.
