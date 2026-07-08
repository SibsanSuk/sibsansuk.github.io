// Regenerate overview.json (landing "ภาพรวมโครงการ" summary) from the public enroll aggregate.
// Usage:  node teacher_dashboard_data/gen-overview.mjs
// Produces 10 overview slides + province-level map bubbles + totals. The dashboard reads this
// small file on load (LANDING_OVERVIEW_PATH) instead of pulling the full ~1.7k-row aggregate.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RANGE = "2020-01-01," + new Date().toISOString().slice(0, 10);
const API = "https://adaptive-profile-bn-dev.ae.app.meca.in.th/api/kidbright/enroll/query?createAt=" + RANGE;

const data = await (await fetch(API)).json();

let totalUsers = 0;
const courses = new Map();   // courseId -> { name, users }
const prov = new Map();      // province  -> { name, users, lat, lng, n }
let topInst = null;
for (const it of data) {
  const uc = it.instituteUserCount || 0;
  totalUsers += uc;
  for (const co of it.courses || []) {
    const k = co.courseId || co.courseName;
    const e = courses.get(k) || { name: co.courseName, users: 0 };
    e.users += co.courseUserCount || 0; courses.set(k, e);
  }
  const c = it.coordinates || {};
  if (c.lat && c.long) { // skip the coord-less "ระบุเอง" bucket on the map
    const key = it.instituteProvince || "-";
    const e = prov.get(key) || { name: key, users: 0, lat: 0, lng: 0, n: 0 };
    e.users += uc; e.lat += c.lat; e.lng += c.long; e.n += 1; prov.set(key, e);
    if (!topInst || uc > topInst.users) topInst = { name: it.instituteName, province: it.instituteProvince, users: uc, lat: c.lat, lng: c.long };
  }
}

const provinces = [...prov.values()].map((e) => ({ name: e.name, users: e.users, lat: e.lat / e.n, lng: e.lng / e.n })).filter((p) => p.users > 0);
const provSorted = [...provinces].sort((a, b) => b.users - a.users);
const courseSorted = [...courses.values()].sort((a, b) => b.users - a.users);
const maxU = Math.max(...provinces.map((p) => p.users), 1);
const points = provinces.map((p) => ({ lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5), n: p.users, size: Math.round(30 + 34 * Math.sqrt(p.users / maxU)), big: p.users === maxU }));

const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const short = (s, n = 44) => { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; };
const top5share = Math.round(provSorted.slice(0, 5).reduce((a, b) => a + b.users, 0) / totalUsers * 100);
const totalEnroll = courseSorted.reduce((a, b) => a + b.users, 0);
const avgPerInst = Math.round(totalUsers / data.length);
const provGe500 = provSorted.filter((p) => p.users >= 500).length;
const TH = { lat: 13.6, lng: 101.2, zoom: 5.3 };
const topProv = provSorted[0], topCourse = courseSorted[0];

const slides = [
  { bg: "#e9fbf4", label: "ผู้ใช้งานทั่วประเทศ", big: fmt(totalUsers), unit: "คน", desc: `ครู นักเรียน และบุคลากรทางการศึกษาใช้งานระบบใน ${prov.size} จังหวัดทั่วประเทศ`, view: TH },
  { bg: "#eef2ff", label: "สถาบันที่ร่วมโครงการ", big: fmt(data.length), unit: "แห่ง", desc: "โรงเรียนและสถาบันการศึกษาที่มีผู้เรียนใช้งานระบบ", view: { lat: 15.6, lng: 101.6, zoom: 5.6 } },
  { bg: "#fff1e6", label: "วิชาที่เปิดสอนทั้งหมด", big: fmt(courses.size), unit: "วิชา", desc: "ครอบคลุมปัญญาประดิษฐ์ สะเต็มศึกษา และทักษะดิจิทัลสำหรับทุกช่วงชั้น", view: { lat: 15.0, lng: 100.9, zoom: 5.5 } },
  { bg: "#eafaf3", label: "จังหวัดที่ครอบคลุม", big: fmt(prov.size), unit: "จังหวัด", desc: `5 จังหวัดผู้ใช้สูงสุดคิดเป็น ${top5share}% ของผู้ใช้ทั้งหมด`, view: TH },
  { bg: "#fef2f2", label: "วิชายอดนิยม", big: fmt(topCourse.users), unit: "คน", desc: `“${short(topCourse.name)}” มีผู้เรียนมากที่สุด`, view: { lat: 15.0, lng: 102.6, zoom: 6.0 } },
  { bg: "#f0f9ff", label: "จังหวัดที่ใช้งานสูงสุด", big: topProv.name, unit: "", desc: `${fmt(topProv.users)} ผู้ใช้ นำการใช้งานทั่วประเทศ`, view: { lat: +topProv.lat.toFixed(4), lng: +topProv.lng.toFixed(4), zoom: 8 } },
  { bg: "#fdf4ff", label: "สถาบันที่ใช้งานสูงสุด", big: short(topInst.name, 16), unit: "", desc: `${topInst.province} · ${fmt(topInst.users)} ผู้ใช้`, view: { lat: +topInst.lat.toFixed(4), lng: +topInst.lng.toFixed(4), zoom: 9 } },
  { bg: "#f7fee7", label: "การลงทะเบียนเรียนสะสม", big: fmt(totalEnroll), unit: "ครั้ง", desc: "รวมการลงทะเบียนเรียนทุกวิชาในระบบ (ผู้เรียน 1 คนลงได้หลายวิชา)", view: { lat: 14.2, lng: 101.0, zoom: 5.8 } },
  { bg: "#ecfeff", label: "ค่าเฉลี่ยผู้ใช้ต่อสถาบัน", big: fmt(avgPerInst), unit: "คน/แห่ง", desc: `เฉลี่ยจาก ${fmt(data.length)} สถาบันที่ร่วมโครงการ`, view: { lat: 16.5, lng: 100.5, zoom: 5.7 } },
  { bg: "#fff7ed", label: "จังหวัดที่ใช้งานเข้มข้น", big: fmt(provGe500), unit: "จังหวัด", desc: `มีผู้ใช้ตั้งแต่ 500 คนขึ้นไป จากทั้งหมด ${prov.size} จังหวัด`, view: { lat: 14.0, lng: 100.6, zoom: 6.2 } },
];

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  range: RANGE,
  source: "GET /api/kidbright/enroll/query",
  totals: { users: totalUsers, provinces: prov.size, courses: courses.size, institutes: data.length },
  slides,
  points,
};

// overview.json lives next to teacher.html (VK root), one level up from this script.
const dest = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "overview.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`wrote ${dest} — ${slides.length} slides, ${points.length} points, ${fs.statSync(dest).size} bytes`);
