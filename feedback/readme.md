# LBT Risk Awareness Trainer (Single File)

โปรเจกต์นี้ใช้ **ไฟล์เดียว `index.html` (HTML + JavaScript)** สำหรับทำ Babylon.js training simulation
เพื่อวิจัยเรื่อง **Risk Awareness** ระหว่างการฝึกใช้งาน Load Break Tool (LBT)

## ขอบเขตปัจจุบัน

1. โฟกัสหลัก: วัดพฤติกรรมการรับรู้ความเสี่ยง
2. ยังคง step-by-step และ **ห้ามข้ามขั้น**
3. เก็บ metrics/logging เพื่อ export เป็น JSON หลังจบ session

## สถานะล่าสุด (2026-02-09)

งานถูกปรับตาม requirement ใหม่แล้วให้เหลือ single-file เท่านั้น

1. รวม logic ทั้งหมดไว้ใน `index.html`
- Scene setup (โหลด `high_voltage_pole.glb` + `lbt.glb` พร้อม fallback mesh)
- Drag interaction + accident click / intentional drag
- Step machine: `Positioning -> Attaching -> Hooking -> Pulling -> Detaching -> Completed`
- Risk zones: safe / warning / danger
- Feedback UI: status, awareness, bars, yellow/red vignette
- Audio feedback: beep/spark พร้อม cooldown
- Reflection dialog (multiple choice)
- Metrics logger + export JSON

2. ลบโครง TypeScript เดิมออกทั้งหมด
- ไม่มี `src/`, `tsconfig.json`, `config.json`, `questions.json` แล้ว
- config และ question bank ฝังไว้ในสคริปต์ของ `index.html`

3. ตั้งชื่อไฟล์โมเดลสำหรับใช้งานจริง
- `lbt.glb` = โมเดล LBT
- `high_voltage_pole.glb` = โมเดลเสาไฟแรงสูง

## วิธีใช้งาน

1. รันผ่าน local server (แนะนำ)

```bash
python3 -m http.server 8000
```

2. เปิด `http://localhost:8000`
3. ลาก LBT ด้วยเมาส์เพื่อทำตามขั้น
4. กด `Export JSON` เพื่อดาวน์โหลดผล session

## Metrics สำคัญที่เก็บ

1. yellow/red exposure และเวลาในโซนเสี่ยง
2. beep count, nudge dialog count
3. accident click count, stop midway count, wrong direction count
4. drag samples ระหว่างใช้งาน
5. step stats และ Risk Awareness score

## ข้อจำกัดปัจจุบัน

1. ยังใช้ anchor/pull-ring เป็น helper mesh (ยังไม่ bind จุด interaction จาก bone/node ในโมเดลจริง)
2. Detaching 5.1/5.2 ยังเป็นกฎเชิง heuristic ระดับ prototype
3. threshold ต่าง ๆ ยังต้อง calibrate จาก pilot data

## งานถัดไปที่แนะนำ

1. map ตำแหน่ง risk zone จากโมเดลจริง
2. ปรับ reflection question ให้ตรง protocol งานวิจัย
3. ปรับ scoring formula ให้สัมพันธ์กับผลภาคสนาม
4. เพิ่ม participant/trial metadata ใน JSON export

## กติกาการทำงานร่วมกัน

ทุกครั้งที่แก้โค้ด ต้องอัปเดต `readme.md` ให้มี:

1. วันที่และสิ่งที่เปลี่ยน
2. ผลกระทบต่อพฤติกรรมระบบ
3. ข้อจำกัดที่ยังเหลือ
4. next steps ที่แนะนำ
