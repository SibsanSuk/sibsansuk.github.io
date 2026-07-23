// Control test for per-learner endpoints.
//
// Some services in this stack answer HTTP 200 with a full, well-formed payload for an
// identifier they have never seen — every value zeroed. That is indistinguishable from a real
// learner who has done nothing, so the dashboard renders confident, fabricated numbers. Two
// endpoints were caught doing exactly this (bookroll.thaidlt.com and SBS chatbotSpeed), one of
// them only after it had already shipped a screen full of fake 0%.
//
// The check: call each endpoint for a real learner and for an address that cannot exist. If the
// answers are byte-identical, the endpoint is not reading the identifier.
//
// One trap to avoid — a course nobody has touched returns all-zero for everyone, real or fake,
// which looks the same as a faking endpoint. So pass TWO real learners whose activity differs
// (--email and --email2): if their answers differ, the endpoint reads the identifier and the
// verdict is decided without relying on the fake at all. Without --email2 an identical result
// is reported as inconclusive rather than damning.
//
// Usage:
//   node teacher_dashboard_data/probe-endpoints.mjs \
//     --course "course-v1:NECTEC+AILOWERSECONDARY01+NECTEC_000008" \
//     --email active.learner@example.com --email2 other.learner@example.com \
//     [--userid <keycloak-uuid>] [--token <access_token>]
//
// The token is the teacher's Keycloak access_token — in the browser:
//   JSON.parse(sessionStorage.oidc_auth).token.access_token
// Endpoints needing auth are skipped when it is absent; the public ones still run.

import { createHash } from "node:crypto";

const arg = (name, fallback = "") => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const BASE = arg("base", "https://adaptive-profile-bn.ae.app.meca.in.th");
const SBS = arg("sbs", "https://sbs-backend.mooc.meca.in.th");
const COURSE = arg("course");
const EMAIL = arg("email");
const EMAIL2 = arg("email2");
const USERID = arg("userid");
const TOKEN = arg("token", process.env.TOKEN || "");

if (!COURSE || !EMAIL) {
  console.error("ต้องระบุ --course และ --email (ดูวิธีใช้ที่หัวไฟล์)");
  process.exit(1);
}

// Identifiers that provably belong to nobody. If a response for these matches the real one,
// the endpoint ignored what we sent.
const FAKE_EMAIL = `no-such-learner-${Date.now()}@example.invalid`;
const FAKE_UUID = "00000000-0000-4000-8000-000000000000";
const e = encodeURIComponent;

const targets = [
  {
    name: "BookRoll proxy (MECA)",
    auth: true,
    url: (id) => `${BASE}/api/kidbright/course/${e(COURSE)}/data/bookroll?email=${e(id)}`,
    real: EMAIL, fake: FAKE_EMAIL,
  },
  {
    name: "BookRoll ตรง (thaidlt)",
    auth: false,
    url: (id) => `https://bookroll.thaidlt.com/meca/student/readingData?userID=${e(id)}&usageId=${e(COURSE)}&view=student`,
    real: EMAIL, fake: FAKE_EMAIL,
  },
  {
    name: "Viola video bar",
    auth: false,
    url: (id) => `https://viola.thaidlt.com/meca/chart/bar/?userName=${e(id)}&usageId=${e(COURSE)}`,
    real: EMAIL, fake: FAKE_EMAIL,
  },
  {
    name: "SBS chatbotSpeed",
    auth: false,
    url: (id) => `${SBS}/stats/echart/chatbotSpeed/${e(COURSE)}/${e(id)}`,
    real: USERID || EMAIL, fake: USERID ? FAKE_UUID : FAKE_EMAIL, other: EMAIL2,
  },
];
targets.forEach((t) => { if (t.other === undefined) t.other = EMAIL2; });

const call = async (url, auth) => {
  try {
    const res = await fetch(url, {
      headers: auth && TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
      signal: AbortSignal.timeout(25000),
    });
    const body = await res.text();
    return { status: res.status, body, digest: createHash("sha1").update(body).digest("hex").slice(0, 8) };
  } catch (err) {
    return { status: 0, body: "", digest: "-", error: err.message };
  }
};

const verdict = (real, fake, other) => {
  if (real.status === 0) return ["⚠️ ", `เรียกไม่สำเร็จ: ${real.error}`];
  if (real.status === 401) return ["⚠️ ", "401 — ต้องมี --token ที่ยังไม่หมดอายุ"];
  if (real.status >= 400) return ["⚠️ ", `ผู้เรียนจริงได้ ${real.status} — ตรวจ --course/--email ก่อน`];
  if (fake.status >= 400) return ["✅", `แยกผู้ใช้ได้ (id ปลอมได้ ${fake.status})`];
  if (real.digest !== fake.digest) return ["✅", "แยกผู้ใช้ได้ (ต่างจาก id ปลอม)"];
  // Identical to the fake. Decisive only if we can show it tells two real learners apart.
  if (other && other.status < 400 && other.digest !== real.digest) {
    return ["⛔", "เท่ากับ id ปลอม ทั้งที่แยกผู้เรียนสองคนได้ — ผู้เรียนคนนี้ไม่มีข้อมูล"];
  }
  if (other && other.digest === real.digest) {
    return ["⚠️ ", "ผู้เรียนสองคนและ id ปลอมได้ผลเท่ากันหมด — วิชานี้น่าจะไม่มีข้อมูลใครเลย ลองวิชาอื่น"];
  }
  return ["⚠️ ", "เท่ากับ id ปลอม แต่สรุปไม่ได้ — ใส่ --email2 ที่มีกิจกรรมต่างกันเพื่อชี้ขาด"];
};

console.log(`course : ${COURSE}`);
console.log(`learner: ${EMAIL}${USERID ? ` / ${USERID}` : ""}`);
console.log(`control: ${FAKE_EMAIL}\n`);

let bad = 0, unknown = 0;
for (const t of targets) {
  if (t.auth && !TOKEN) {
    console.log(`⏭️   ${t.name.padEnd(24)} ข้าม — ต้องมี --token`);
    unknown += 1;
    continue;
  }
  const [real, fake, other] = await Promise.all([
    call(t.url(t.real), t.auth),
    call(t.url(t.fake), t.auth),
    t.other ? call(t.url(t.other), t.auth) : Promise.resolve(null),
  ]);
  const [mark, note] = verdict(real, fake, other);
  if (mark === "⛔") bad += 1;
  if (mark.startsWith("⚠")) unknown += 1;
  console.log(`${mark}  ${t.name.padEnd(24)} จริง ${String(real.status).padEnd(3)} ${real.digest}  ปลอม ${String(fake.status).padEnd(3)} ${fake.digest}  ${note}`);
}

// "ยังสรุปไม่ได้" must never be reported as a pass — that is the same false confidence this
// script exists to catch.
if (bad) console.log(`\n⛔ ${bad} endpoint ตอบเหมือน id ที่ไม่มีอยู่จริง — อย่านำไปแสดงเป็นข้อมูลรายคน`);
if (unknown) console.log(`${bad ? "" : "\n"}⚠️  ${unknown} endpoint ยังสรุปไม่ได้ — ยังไม่ผ่านการตรวจ ต้องรันซ้ำด้วย --token หรือวิชา/ผู้เรียนที่มีกิจกรรมจริง`);
if (!bad && !unknown) console.log("\n✅ ทุก endpoint แยกผู้ใช้ออกจากกันได้");
process.exit(bad || unknown ? 1 : 0);
