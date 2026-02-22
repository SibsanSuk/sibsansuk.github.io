# Sukhothai MVP - Technical Design Document (Software Architecture)

## 1) Document Scope
- เอกสารนี้กำหนดสถาปัตยกรรมซอฟต์แวร์สำหรับ MVP เท่านั้น
- เป้าหมาย: ส่งมอบ vertical slice ที่เล่นได้ 10-15 นาทีตาม `mvp-summary.md`
- โฟกัส: maintainable codebase, iteration เร็ว, debug ง่าย

## 2) Technical Goals
- รองรับ core loop: build -> produce -> distribute -> upgrade -> crisis -> win/lose
- เพิ่มคอนเทนต์ผ่าน data ได้โดยไม่แก้ logic หลักมาก
- Simulation คงที่ (deterministic พอสำหรับ debug/replay สั้น)
- ลด coupling ระหว่าง gameplay logic, UI, rendering, persistence

## 3) Architecture Overview
- ใช้สถาปัตยกรรมแบบ `Layered + Data-Driven + Event Bus`
- แบ่งเป็น 6 ชั้นหลัก:
1. `Presentation Layer`
   - HUD, build menu, alerts, tutorial prompts
2. `Application Layer`
   - Use cases เช่น place building, set labor priority, toggle speed, pause
3. `Domain Simulation Layer`
   - ระบบเมืองทั้งหมด (resources, population, service coverage, crisis)
4. `AI/Agent Layer`
   - Walker movement และ task execution
5. `Infrastructure Layer`
   - Save/Load, config loader, logging, telemetry
6. `Platform Layer`
   - Engine API (input, rendering, audio, filesystem)

## 4) Runtime Model
### 4.1 Main Loop (Fixed Tick)
- ใช้ `fixed simulation tick` เช่น 5 ticks/sec
- Render อิสระจาก simulation
- ลำดับต่อ tick:
1. รับ player commands (queue)
2. Validate/commit commands
3. Run simulation systems
4. Resolve events
5. Push state snapshots (read-only) ให้ UI

### 4.2 Game Speed
- รองรับ `x1, x2, pause`
- x2 = รัน simulation 2 ticks ต่อ frame budget (หรือ catch-up loop)

## 5) Core Modules
### 5.1 Map & Placement Module
- Grid map (tile-based)
- Tile attributes: terrain, fertility, flood-risk, occupancy, road-connection
- Placement rules:
  - building footprint valid
  - terrain compatible
  - road/water requirement met

### 5.2 Economy Module
- Resource ledger: food, wood, clay/pottery, gold, labor, faith
- Production chain runtime:
  - input check
  - work progress
  - output commit to storage
- Stockpile/market distribution policy แบบ MVP (nearest-first)

### 5.3 Population & Housing Module
- Household tiers: T1-T3 (MVP ใช้ T1-T2 ก็ได้)
- Need evaluation ต่อ tick window:
  - water coverage
  - food availability
  - service access
- Upgrade/downgrade state machine

### 5.4 Service Coverage Module
- Services: water, market, temple, safety
- MVP algorithm: road-distance radius + periodic recalculation
- Output เป็น coverage cache ต่อบ้าน

### 5.5 Crisis Module
- รองรับ event เดียวใน MVP: `flood` หรือ `drought`
- Event phases:
  - warning
  - active impact
  - recovery
- Impact modifiers ต่อ production และ happiness/stability

### 5.6 Win/Lose Module
- Win checks: population threshold + faith threshold + survive crisis
- Lose checks: prolonged food deficit / population collapse / stability collapse
- ประเมินทุก N ticks เพื่อลด cost

### 5.7 Agent/Walker Module
- Agent types: laborer, carrier, service walker
- Pathfinding: A* บน road graph (fallback: BFS radius สำหรับ service)
- Queue task model:
  - request task
  - reserve task
  - execute task
  - commit delivery/service

### 5.8 UI State Module
- อ่านจาก read model เท่านั้น (no direct write simulation)
- ส่ง action ผ่าน command bus
- HUD widgets: resources, objectives, alerts, speed controls

### 5.9 Data Layer Overlay Module
- รองรับการเปิด/ปิดชั้นข้อมูลเหมือน Photoshop layers
- ชั้นข้อมูลเริ่มต้นใน MVP:
  - `water_network_layer` (คลอง/จุดตักน้ำ/coverage)
  - `service_coverage_layer` (market/faith/safety coverage)
  - `logistics_layer` (เส้นทางขนส่งและคอขวด)
  - `housing_need_layer` (บ้านที่ขาดเงื่อนไขอัปเกรด)
- Overlay อ่านจาก read model เท่านั้น (ไม่กระทบ simulation state)
- ควรมี `single layer mode` และ `multi layer mode` สำหรับผู้เล่นสายวิเคราะห์

## 6) Data-Driven Design
### 6.1 Static Data Files
- `data/buildings.json`
- `data/resources.json`
- `data/services.json`
- `data/events.json`
- `data/objectives.json`

### 6.2 Example Building Schema (MVP)
```json
{
  "id": "water_collect_point",
  "category": "service",
  "footprint": [1, 1],
  "cost": {"wood": 8},
  "requires_road": true,
  "requires_adjacent_water_channel": true,
  "service": {
    "type": "water",
    "radius": 10
  }
}
```

### 6.3 Validation Rules
- Unique IDs
- Resource references must exist
- Production inputs/outputs ต้องไม่ติดลบ
- Objective refs ต้องชี้ entity จริง

## 7) Command/Event Contracts
### 7.1 Commands
- `PlaceBuilding`
- `RemoveBuilding` (ถ้า MVP รองรับ)
- `SetLaborPriority`
- `SetGameSpeed`
- `AcknowledgeTutorialStep`
- `SetOverlayLayerVisibility`
- ตัวอย่าง payload และ envelope ดูที่ `player-commands-examples.md`

### 7.2 Domain Events
- `BuildingPlaced`
- `ProductionCompleted`
- `HouseUpgraded`
- `CrisisStarted`
- `ObjectiveCompleted`
- `OverlayLayerChanged`
- `GameWon` / `GameLost`

## 8) State Management
- Simulation state แยกเป็น aggregate:
  - `WorldState`
  - `EconomyState`
  - `PopulationState`
  - `ServiceState`
  - `CrisisState`
  - `ObjectiveState`
- UI รับ `ViewModel Snapshot` ที่ derive แล้ว
- Save game ใช้ snapshot state + version

## 9) Persistence
- Format: JSON (MVP), พร้อม `save_version`
- Save slots: manual 3 slots
- Load safety:
  - version check
  - schema migration hook (stub สำหรับอนาคต)

## 10) Performance Budget (MVP Target)
- เป้าหมาย: 60 FPS render, simulation stable บนเครื่อง dev ทั่วไป
- Budget ต่อ simulation tick:
  - pathfinding <= 3 ms เฉลี่ย
  - economy + services <= 2 ms
  - crisis/objective <= 1 ms
- กลยุทธ์:
  - recalc services แบบ incremental
  - path cache ระยะสั้น
  - evaluate win/lose ทุก N ticks

## 11) Observability & Debugging
- In-game debug overlay:
  - tick time
  - agent count
  - resource delta/sec
  - coverage heatmap (toggle)
- Structured logs สำหรับ command/event
- Optional deterministic seed ใน run config

## 12) Testing Strategy
### 12.1 Unit Tests
- Production math
- Housing upgrade conditions
- Crisis modifiers
- Objective checks

### 12.2 Integration Tests
- Place building -> production starts -> resources increase
- Water service coverage -> house upgrade unlock
- Crisis active -> output reduced -> recovery works

### 12.3 Scenario Smoke Tests
- 10-minute scripted run ต้องไม่ crash
- Win path 1 แบบ และ lose path 1 แบบ ผ่านได้จริง

## 13) Project Structure (Suggested)
```text
src/
  app/
    game_loop.ts
    command_bus.ts
  domain/
    economy/
    population/
    services/
    crisis/
    objectives/
  simulation/
    systems/
    agents/
    pathfinding/
  ui/
    hud/
    panels/
    tutorial/
  infra/
    save_load/
    config/
    logging/
  platform/
    engine_adapter/

data/
  buildings.json
  resources.json
  services.json
  events.json
  objectives.json
```

## 14) MVP Delivery Plan (Engineering)
1. Foundation
- command bus, fixed tick loop, map placement, resource ledger
2. Core Simulation
- economy chains, population needs, service coverage
3. Agent Layer
- basic walker + delivery tasks + simple pathfinding
4. Crisis & Objective
- 1 crisis event, win/lose evaluator
5. UI + Persistence
- HUD, build menu, alert panel, save/load
6. Polish
- balancing hooks, debug tools, bug fixing

## 15) Risks & Mitigations
- Walker complexity สูงเกิน MVP
  - ลด AI scope เหลือ task templates + shortest path only
- Service recalculation แพง
  - ใช้ dirty-region recalculation
- Data inconsistency จาก config
  - เพิ่ม startup validators และ fail-fast
- Scope creep
  - feature freeze หลัง milestone 4

## 16) Definition of Done (MVP Tech)
- เล่นครบ journey 0-15 นาทีได้โดยไม่หลุด loop
- มี 1 win path และ 1 lose path ที่ reproducible
- save/load ใช้งานได้
- ไม่มี blocker bug ระดับ crash/data corruption
- test ชุดหลักผ่านทั้งหมดใน CI/local
