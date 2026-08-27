# VK Dashboard API และ JSON Format

เอกสารนี้สรุปจาก:

- `References/VK_KV.md`
- `References/VK Dashboard Json Format 2026-07-23.pdf` จำนวน 21 หน้า

ตัวอย่าง response แบบ JSON อยู่ที่ `References/VK_DASHBOARD_RESPONSE_EXAMPLE.json`

> สถานะเอกสาร: เป็นการถอดรูปแบบจาก URL และภาพหน้าจอใน PDF ไม่ใช่ OpenAPI specification และยังไม่ได้ยืนยันกับ response สดจากระบบ Production

## 1. ภาพรวม

VK Dashboard มีหน้าแสดงผล 4 ระดับ:

1. หน้าหลัก แสดงบทที่ผู้เรียนทำแล้ว
2. Course Overview แสดงภาพรวมทั้งหลักสูตร
3. Chapter Overview แสดงภาพรวมเฉพาะบท
4. Personal Item แสดงรายละเอียดรายข้อ/กิจกรรม

Course, Chapter และ Item ใช้ JSON envelope รูปแบบเดียวกัน โดยระดับของหน้าจะทำให้จำนวนค่าใน `x_data` และ `series[].data` ต่างกัน

## 2. URL routes

Base URL ตามเอกสาร:

```text
https://vk-analysis.learning.app.meca.in.th
```

### หน้าหลัก

```text
/analysis/donechapterview/{userId}/course/{courseId}
```

ใช้แสดงสถานะบทที่ผู้เรียนทำแล้ว

### Course Overview

```text
/analysis/overview/{userId}/course/{courseId}
```

### Chapter Overview

```text
/analysis/overview/{userId}/course/{courseId}/chapter/{chapterNo}
```

### Personal Item

```text
/analysis/overview/{userId}/course/{courseId}/chapter/{chapterNo}/sequential/{sequentialNo}/vertical/{verticalNo}/item/{itemNo}
```

ความหมายของ path parameters:

| Parameter | ความหมาย |
|---|---|
| `userId` | UUID ของผู้เรียน |
| `courseId` | Open edX course key เช่น `course-v1:NECTEC+KBAISIM_0002+NECTEC_000021` |
| `chapterNo` | ลำดับบท/Section |
| `sequentialNo` | ลำดับ Subsection ภายในบท |
| `verticalNo` | ลำดับ Unit ภายใน Subsection |
| `itemNo` | ลำดับ Item ภายใน Unit |

จากตัวอย่าง เลขลำดับเริ่มที่ `1` แต่เอกสารไม่ได้ระบุชัดว่าเป็น index หรือตัวระบุถาวร จึงไม่ควรสมมติว่ายังคงเดิมหลังมีการแก้โครงสร้างหลักสูตร

ควร URL-encode `courseId` ก่อนประกอบ URL เช่น:

```text
course-v1:ADTEP+KBAISIM_0001+ADTEP_000101
```

เป็น:

```text
course-v1%3AADTEP%2BKBAISIM_0001%2BADTEP_000101
```

## 3. Top-level JSON

จากภาพใน PDF พบ top-level fields ดังนี้:

| Field | รูปแบบ | ความหมาย |
|---|---|---|
| `Params` | Chart object | ค่าดิบ 23 metrics สำหรับวาดกราฟ |
| `Coding skill` | Skill object | ข้อวิเคราะห์ความถนัดด้านการเขียนโปรแกรม |
| `AI skill` | Skill object | ข้อวิเคราะห์การแก้ปัญหาด้วย AI |
| `AI setup skill` | Skill object | ข้อวิเคราะห์การเตรียมข้อมูลและตั้งค่า AI |
| `Capture skill` | Skill object | ข้อวิเคราะห์ขั้นตอน Capture |
| `Annotate skill` | Skill object | ข้อวิเคราะห์ขั้นตอน Annotate |
| `AI training skill` | Skill object | ข้อวิเคราะห์ขั้นตอน Train |
| `AI building skill` | Skill object | ข้อวิเคราะห์การสร้าง AI Model |
| `VK skill` | Skill object | ข้อวิเคราะห์การใช้งาน VK |
| `QID used` | Chart object | ข้อมูล QID ที่ใช้; PDF แสดงเพียง shape จึงยังอธิบายความหมายย่อยไม่ได้ |
| `done` | Object | ความคืบหน้า เช่น `{ "max": 2, "value": 2 }` |
| `name` | String | ชื่อ/อีเมลผู้เรียนในตัวอย่าง |
| `x_locate` | Array of arrays | ตำแหน่งของข้อมูลบนโครงสร้างหลักสูตร; PDF ไม่แสดงค่าภายใน |
| `x_title` | String array | ชื่อกิจกรรม/หัวข้อที่ตรงกับข้อมูลแต่ละตำแหน่ง |

รูปแบบร่วมของ chart object:

```json
{
  "series": [
    {
      "name": "ชื่อ metric",
      "data": [0]
    }
  ],
  "x_data": ["Item 1"]
}
```

ข้อกำหนดสำคัญคือ `series[i].data.length` ต้องสัมพันธ์กับ `x_data.length`

## 4. `Params.series` จำนวน 23 metrics

ลำดับและตัวสะกดควรรักษาตาม response เพราะ frontend อาจค้นหาด้วย `name`

| Index | `name` | ความหมายโดยสังเขป |
|---:|---|---|
| 0 | `Time used` | เวลารวม |
| 1 | `Coding mark` | คะแนน Coding |
| 2 | `Coding time` | เวลาที่ใช้ Coding |
| 3 | `Solution mark` | คะแนน Solution |
| 4 | `Scene used` | Scene ที่ถูกใช้ |
| 5 | `Scene unused` | Scene ที่ไม่ถูกใช้ |
| 6 | `Object used` | Object ที่ถูกใช้ |
| 7 | `Object unused` | Object ที่ไม่ถูกใช้ |
| 8 | `Image used` | รูปที่ถูกใช้ใน Capture |
| 9 | `Image unused` | รูปที่ไม่ถูกใช้ใน Capture |
| 10 | `Snap count` | จำนวนการ Snap |
| 11 | `Snap delete count` | จำนวนการลบ Snap |
| 12 | `Label used` | Label ที่ถูกใช้ |
| 13 | `Label unused` | Label ที่ไม่ถูกใช้ |
| 14 | `AIBlock time` | เวลาที่ใช้กับ AIBlock |
| 15 | `AIBlock used` | AIBlock ที่ถูกใช้ |
| 16 | `AIBlock unused` | AIBlock ที่ไม่ถูกใช้ |
| 17 | `AIBlock set` | จำนวน/สถานะการตั้งค่า AIBlock |
| 18 | `Capture time` | เวลาขั้นตอน Capture |
| 19 | `Annotate time` | เวลาขั้นตอน Annotate |
| 20 | `VK time` | เวลาที่ใช้งาน VK |
| 21 | `Switch count` | จำนวนการสลับระหว่าง IDE และ VK |
| 22 | `Train time` | เวลาขั้นตอน Train |

หมายเหตุเกี่ยวกับชื่อ field:

- ในคำอธิบายหน้าหนึ่งของ PDF เขียน `Solution mask` แต่ object ในภาพใช้ `Solution mark` จึงควรยึด `Solution mark`
- `Params` ใช้ `Coding mark` เอกพจน์ แต่ `Coding skill.series` ใช้ `Coding marks` พหูพจน์
- `AIBlock` ต้องรักษาตัวพิมพ์ใหญ่/เล็กตามนี้

## 5. การใช้ `Params` สร้างกราฟ

### Course และ Chapter

ใช้ `x_data` เป็นแกนของบทหรือรายการ เช่น:

```json
{
  "x_data": [2, 3],
  "series": [
    {
      "name": "Time used",
      "data": [4.18, 1.49],
      "smooth": true,
      "type": "line"
    }
  ]
}
```

PDF แสดงกราฟเวลาในระดับ Course/Chapter เป็นหน่วย **นาที**

กลุ่มที่ถูกเลือกไปสร้างกราฟประกอบด้วย:

- คะแนน: `Coding mark`, `Solution mark`
- เวลา: `Time used`, `Coding time`, `Capture time`, `Annotate time` และในภาพกราฟมี `VK time`

### Item

Item ใช้ `x_data` เช่น `["Item 1"]` และใช้ bar series พร้อม metadata สำหรับ ECharts:

```json
{
  "name": "Time used",
  "data": [258],
  "type": "bar",
  "showBackground": true,
  "backgroundStyle": {
    "color": "rgba(180, 180, 180, 0.2)"
  },
  "itemStyle": {
    "color": "#EE6666"
  }
}
```

PDF แสดงกราฟเวลาในระดับ Item เป็นหน่วย **วินาที** จึงต้องระวังไม่รวมค่าข้ามระดับโดยไม่แปลงหน่วย

กลุ่มกราฟ Item ที่ PDF ระบุ:

| กราฟ | Metrics |
|---|---|
| เวลา | `Time used`, `Coding time`, `AIBlock time`, `Capture time`, `Annotate time`, `VK time`, `Train time` |
| การใช้ VK | `Scene used`, `Scene unused`, `Object used`, `Object unused`, `Switch count` |
| Capture Step | `Image used`, `Image unused` |
| Annotate Step | `Label used`, `Label unused` |
| Train Step | `AIBlock time`, `AIBlock used`, `AIBlock unused` |

`Coding mark`, `Solution mark`, `Snap count`, `Snap delete count` และ `AIBlock set` อยู่ใน `Params` เช่นกัน แม้ PDF ไม่ได้แสดงเป็นกราฟเฉพาะในหน้าท้าย ๆ

## 6. Skill objects

Skill object ไม่ได้เก็บค่าตัวเลขสำหรับวาดกราฟ แต่เก็บข้อความวิเคราะห์/คำแนะนำใน `series[].data` และผลสรุปใน series ชื่อ `Result`

โครงสร้างทั่วไป:

```json
{
  "series": [
    {
      "name": "ชื่อหัวข้อวิเคราะห์",
      "data": ["ข้อความวิเคราะห์ภาษาไทย"]
    },
    {
      "name": "Result",
      "data": ["OK"]
    }
  ],
  "x_data": ["Overall"]
}
```

จำนวนและชื่อ series ของแต่ละ skill:

| Skill | Series ตามลำดับ |
|---|---|
| `Coding skill` | `Coding marks`, `Coding time`, `No. Switching`, `Result` |
| `AI skill` | `Solution mark`, `Total time`, `Result` |
| `AI setup skill` | `Capture time`, `Annotate time`, `Train time`, `Image`, `Label`, `AIBlock`, `Result` |
| `Capture skill` | `Capture time`, `Image`, `Result` |
| `Annotate skill` | `Annotate time`, `Label`, `Result` |
| `AI training skill` | `Train time`, `AIBlock`, `Result` |
| `AI building skill` | `AIBlock`, `Result` |
| `VK skill` | `Scene used/unused`, `Objects used/unused`, `VK time`, `No. Switching`, `Result` |

ค่าตัวอย่างของ `Result` ที่พบใน PDF ได้แก่ `OK`, `Good` และ `Revise` จึงควรแสดงค่าแบบ dynamic และไม่จำกัดไว้เพียงสามค่านี้จนกว่าจะมี enum จาก backend

## 7. ความหมายของข้อมูลตามระดับ

| ระดับ | `x_data` ที่พบ/คาดหมาย | `series[].data` |
|---|---|---|
| Course | เลขบท เช่น `[2, 3]` | หนึ่งค่าต่อบท |
| Chapter | รายการภายในบท | หนึ่งค่าต่อรายการบนแกน |
| Item | `["Item 1"]` | โดยทั่วไปหนึ่งค่า |
| Skill | `["Overall"]` | โดยทั่วไปหนึ่งข้อความต่อ series |

คำว่า “คาดหมาย” ใช้กับจุดที่ PDF แสดงภาพโครงสร้างแต่ไม่ได้อธิบาย semantic contract เป็นข้อความ

## 8. แนวทางสำหรับ frontend/parser

1. ค้นหา metric ด้วย `series.find(item => item.name === metricName)` แทนการยึด index เพียงอย่างเดียว แต่ตรวจลำดับ 23 รายการเพื่อแจ้ง schema drift ได้
2. ตรวจว่า `data` และ `x_data` เป็น array ก่อนใช้
3. รองรับค่า `0`, ทศนิยม, string และ array ว่างโดยไม่ใช้ truthy check
4. แสดง `Result` ตามค่าที่ backend ส่ง ไม่ hardcode เฉพาะ `OK`
5. รักษาชื่อ key ที่มีช่องว่างและตัวพิมพ์ เช่น `AI setup skill`
6. แปลงหน่วยเวลาก่อนเปรียบเทียบ Course/Chapter กับ Item
7. อย่า log `userId`, `name` หรือ response เต็มใน Production เพราะเป็นข้อมูลรายบุคคล
8. URL ในเอกสารดูเป็นหน้าเว็บ route; เอกสารไม่ได้ระบุ HTTP method, auth headers, CORS, status codes หรือ error response

## 9. ประเด็นที่ยังต้องยืนยันจาก backend

- Route นี้ตอบ JSON โดยตรง หรือหน้าเว็บเรียก data endpoint อื่นภายใน
- Authentication และ authorization ที่ต้องใช้
- `chapter`, `sequential`, `vertical`, `item` เป็น index หรือ ID
- schema และ semantic ที่แท้จริงของ `QID used`
- รูปแบบค่าภายใน `x_locate`
- หน่วยเวลาที่ backend ส่ง หรือ frontend เป็นผู้แปลงหน่วย
- ค่า enum ทั้งหมดของ `Result`
- พฤติกรรมเมื่อไม่มีข้อมูล: คืน `0`, `null`, `[]`, ไม่ส่ง field หรือ HTTP error
- ความหมายเชิงสูตรของ `done.max` และ `done.value`

## 10. ขอบเขตของไฟล์ response ตัวอย่าง

`VK_DASHBOARD_RESPONSE_EXAMPLE.json` เป็น **ตัวอย่างสังเคราะห์** เพื่ออธิบายโครงสร้างและใช้เป็น fixture สำหรับพัฒนาเท่านั้น:

- ไม่ใช่ข้อมูลจริงของผู้เรียน
- ค่าตัวเลขและข้อความเป็นตัวอย่าง
- `x_locate` และ `QID used` แสดงเพียง shape ที่อนุมานจาก PDF
- ชื่อ field และลำดับ `Params.series` ยึดตามภาพใน PDF

