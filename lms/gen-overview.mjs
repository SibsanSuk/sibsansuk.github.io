import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API_BASE = process.env.BASEURL || "https://adaptive-profile-bn.ae.app.meca.in.th";
const START_DATE = "2020-01-01";
const TODAY = new Date().toISOString().slice(0, 10);
const RANGE = `${START_DATE},${TODAY}`;

const fetchEnrollmentRange = async (range) => {
  const url = new URL("/api/kidbright/enroll/query", API_BASE);
  url.searchParams.set("createAt", range);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Enrollment API ${response.status}: ${url}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(`Enrollment API returned ${typeof payload}; expected an array`);
  }
  return payload;
};

const data = await fetchEnrollmentRange(RANGE);
if (!data.length) throw new Error("Enrollment API returned an empty array");

const inThailand = (lat, lng) =>
  Number.isFinite(Number(lat)) &&
  Number.isFinite(Number(lng)) &&
  Number(lat) >= 5 &&
  Number(lat) <= 21 &&
  Number(lng) >= 97 &&
  Number(lng) <= 106;

let totalUsers = 0;
const courses = new Map();
const provinces = new Map();
let topInstitute = null;

for (const item of data) {
  const userCount = Number(item.instituteUserCount) || 0;
  totalUsers += userCount;

  for (const course of item.courses || []) {
    const key = course.courseId || course.courseName;
    if (!key) continue;
    const current = courses.get(key) || { name: course.courseName || "-", users: 0 };
    current.users += Number(course.courseUserCount) || 0;
    courses.set(key, current);
  }

  const coordinates = item.coordinates || {};
  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.long);
  if (!inThailand(lat, lng)) continue;

  const provinceName = item.instituteProvince || "-";
  const current = provinces.get(provinceName) || {
    name: provinceName,
    users: 0,
    lat: 0,
    lng: 0,
    count: 0,
  };
  current.users += userCount;
  current.lat += lat;
  current.lng += lng;
  current.count += 1;
  provinces.set(provinceName, current);

  if (!topInstitute || userCount > topInstitute.users) {
    topInstitute = {
      name: item.instituteName || "-",
      province: provinceName,
      users: userCount,
      lat,
      lng,
    };
  }
}

const provinceRows = [...provinces.values()]
  .map((item) => ({
    name: item.name,
    users: item.users,
    lat: item.lat / item.count,
    lng: item.lng / item.count,
  }))
  .filter((item) => item.users > 0);
const courseRows = [...courses.values()].sort((a, b) => b.users - a.users);
const provinceRanking = [...provinceRows].sort((a, b) => b.users - a.users);

if (!courseRows.length || !provinceRanking.length || !topInstitute) {
  throw new Error("Enrollment data is missing courses, provinces, or institutes");
}

const maxProvinceUsers = Math.max(...provinceRows.map((item) => item.users), 1);
const points = provinceRows.map((item) => ({
  lat: Number(item.lat.toFixed(5)),
  lng: Number(item.lng.toFixed(5)),
  n: item.users,
  size: Math.round(30 + 34 * Math.sqrt(item.users / maxProvinceUsers)),
  big: item.users === maxProvinceUsers,
}));

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");
const shorten = (value, maxLength = 44) => {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

const topFiveShare = totalUsers > 0
  ? Math.round(provinceRanking.slice(0, 5).reduce((sum, item) => sum + item.users, 0) / totalUsers * 100)
  : 0;
const totalEnrollment = courseRows.reduce((sum, item) => sum + item.users, 0);
const averagePerInstitute = Math.round(totalUsers / data.length);
const activeProvinceCount = provinceRanking.filter((item) => item.users >= 500).length;
const topProvince = provinceRanking[0];
const topCourse = courseRows[0];
const thailandView = { lat: 13.6, lng: 101.2, zoom: 5.3 };

const slides = [
  { bg: "#e9fbf4", label: "ผู้ใช้งานทั่วประเทศ", big: formatNumber(totalUsers), unit: "คน", desc: `ครู นักเรียน และบุคลากรทางการศึกษาใช้งานระบบใน ${provinces.size} จังหวัดทั่วประเทศ`, view: thailandView },
  { bg: "#eef2ff", label: "สถาบันที่ร่วมโครงการ", big: formatNumber(data.length), unit: "แห่ง", desc: "โรงเรียนและสถาบันการศึกษาที่มีผู้เรียนใช้งานระบบ", view: { lat: 15.6, lng: 101.6, zoom: 5.6 } },
  { bg: "#fff1e6", label: "วิชาที่เปิดสอนทั้งหมด", big: formatNumber(courses.size), unit: "วิชา", desc: "รายวิชาที่มีผู้เรียนลงทะเบียนในระบบ", view: { lat: 15, lng: 100.9, zoom: 5.5 } },
  { bg: "#eafaf3", label: "จังหวัดที่ครอบคลุม", big: formatNumber(provinces.size), unit: "จังหวัด", desc: `5 จังหวัดผู้ใช้สูงสุดคิดเป็น ${topFiveShare}% ของผู้ใช้ทั้งหมด`, view: thailandView },
  { bg: "#fef2f2", label: "วิชายอดนิยม", big: formatNumber(topCourse.users), unit: "คน", desc: `“${shorten(topCourse.name)}” มีผู้เรียนมากที่สุด`, view: { lat: 15, lng: 102.6, zoom: 6 } },
  { bg: "#f0f9ff", label: "จังหวัดที่ใช้งานสูงสุด", big: topProvince.name, unit: "", desc: `${formatNumber(topProvince.users)} ผู้ใช้`, view: { lat: Number(topProvince.lat.toFixed(4)), lng: Number(topProvince.lng.toFixed(4)), zoom: 8 } },
  { bg: "#fdf4ff", label: "สถาบันที่ใช้งานสูงสุด", big: shorten(topInstitute.name, 16), unit: "", desc: `${topInstitute.province} · ${formatNumber(topInstitute.users)} ผู้ใช้`, view: { lat: Number(topInstitute.lat.toFixed(4)), lng: Number(topInstitute.lng.toFixed(4)), zoom: 9 } },
  { bg: "#f7fee7", label: "การลงทะเบียนเรียนสะสม", big: formatNumber(totalEnrollment), unit: "ครั้ง", desc: "รวมการลงทะเบียนเรียนทุกวิชาในระบบ", view: { lat: 14.2, lng: 101, zoom: 5.8 } },
  { bg: "#ecfeff", label: "ค่าเฉลี่ยผู้ใช้ต่อสถาบัน", big: formatNumber(averagePerInstitute), unit: "คน/แห่ง", desc: `เฉลี่ยจาก ${formatNumber(data.length)} สถาบัน`, view: { lat: 16.5, lng: 100.5, zoom: 5.7 } },
  { bg: "#fff7ed", label: "จังหวัดที่ใช้งานเข้มข้น", big: formatNumber(activeProvinceCount), unit: "จังหวัด", desc: `มีผู้ใช้ตั้งแต่ 500 คนขึ้นไป จากทั้งหมด ${provinces.size} จังหวัด`, view: { lat: 14, lng: 100.6, zoom: 6.2 } },
];

const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const now = new Date();
const monthRanges = Array.from({ length: 6 }, (_, index) => {
  const month = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
  const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
  return { label: thaiMonths[month.getMonth()], range: `${start},${end}` };
});

const trend = await Promise.all(monthRanges.map(async ({ label, range }) => {
  const rows = await fetchEnrollmentRange(range);
  return {
    label,
    users: rows.reduce((sum, item) => sum + (Number(item.instituteUserCount) || 0), 0),
  };
}));

const output = {
  generatedAt: new Date().toISOString(),
  range: RANGE,
  source: `${API_BASE}/api/kidbright/enroll/query`,
  totals: {
    users: totalUsers,
    provinces: provinces.size,
    courses: courses.size,
    institutes: data.length,
    averagePerInstitute,
  },
  trend,
  slides,
  points,
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const destination = path.join(scriptDirectory, "overview.json");
const temporary = path.join(scriptDirectory, ".overview.json.tmp");
fs.writeFileSync(temporary, `${JSON.stringify(output, null, 2)}\n`, "utf8");
fs.renameSync(temporary, destination);
console.log(`Wrote ${destination}: ${slides.length} slides, ${points.length} map points`);
