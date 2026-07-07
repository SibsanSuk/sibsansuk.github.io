/* =====================================================================
 * Teacher Dashboard — "Teacher Dashboard Design" applied to live data.
 * Self-contained vanilla port of the design prototype.
 * Real course/progress/score JSON is wired into the dashboard tabs;
 * landing map, school ranking and notifications use design demo data.
 * ===================================================================== */

/* ------------------------------ config + loaders ------------------------------ */
const TEACHER_LOCAL_DATA_PATHS = {
  course: "./teacher_dashboard_data/course.json",
  progress: "./teacher_dashboard_data/progress.json",
  score: "./teacher_dashboard_data/score.json",
};
const teacherQuery = new URLSearchParams(globalThis.location?.search || "");
const readTeacherDashboardConfig = () => {
  const runtime = globalThis.TEACHER_DASHBOARD_CONFIG || {};
  return {
    // Default to the real MECA login/API. Use ?source=local for the offline JSON demo.
    source: teacherQuery.get("source") || runtime.source || "api",
    oidc: runtime.oidc || {},
    courseId: teacherQuery.get("courseid") || teacherQuery.get("courseId") || runtime.courseId || "",
    teacherId: teacherQuery.get("teacherid") || teacherQuery.get("teacherId") || runtime.teacherId || "",
    instituteId: teacherQuery.get("instituteid") || teacherQuery.get("instituteId") || runtime.instituteId || "",
    apiBaseUrl: runtime.apiBaseUrl || "",
    // live MECA API (see API_ENDPOINT_LINKS.md)
    baseUrl: runtime.baseUrl || "https://adaptive-profile-bn-dev.ae.app.meca.in.th",
    sbsUrl: runtime.sbsUrl || "https://sbs-backend.mooc.meca.in.th",
    clientId: runtime.clientId || "dashboard",
    assignId: teacherQuery.get("assignid") || teacherQuery.get("assignId") || runtime.assignId || "",
    localPaths: { ...TEACHER_LOCAL_DATA_PATHS, ...(runtime.localPaths || {}) },
    endpoints: { course: null, progress: null, score: null, ...(runtime.endpoints || {}) },
  };
};
const teacherConfig = readTeacherDashboardConfig();

/* =====================================================================
 * Live MECA integration — Keycloak (OIDC/PKCE) login + assign-based data.
 * Mirrors the flow in index.html. BASEURL calls require a Bearer token;
 * SBS /lms is public. Enabled with source:"api" (or ?source=api);
 * otherwise the dashboard runs on the bundled local JSON (offline demo).
 * ===================================================================== */
const OIDC = {
  authorizationEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/auth",
  tokenEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/token",
  userinfoEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/userinfo",
  logoutEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/logout",
  clientId: teacherConfig.clientId,
  redirectUri: globalThis.location ? globalThis.location.origin + globalThis.location.pathname : "",
  scope: "openid profile email",
  ...teacherConfig.oidc,
};
const b64url = (buf) => { const b = new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const sha256 = (plain) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
const decodeJwt = (token) => { try { const p = token.split(".")[1]; const pad = p.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(p.length / 4) * 4, "="); return JSON.parse(atob(pad)); } catch (_) { return null; } };
const storeAuth = (a) => sessionStorage.setItem("oidc_auth", JSON.stringify(a));
const readAuth = () => { try { return JSON.parse(sessionStorage.getItem("oidc_auth")); } catch (_) { return null; } };
const clearAuth = () => sessionStorage.removeItem("oidc_auth");
const authSub = (a) => a?.sub || (a?.token?.access_token ? decodeJwt(a.token.access_token)?.sub : null) || (a?.token?.id_token ? decodeJwt(a.token.id_token)?.sub : null);
const authExpired = (a) => { const p = a?.token?.access_token ? decodeJwt(a.token.access_token) : null; return p?.exp ? p.exp * 1000 < Date.now() : false; };
async function startLogin() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await sha256(verifier));
  sessionStorage.setItem("pkce_verifier", verifier);
  const params = new URLSearchParams({ client_id: OIDC.clientId, redirect_uri: OIDC.redirectUri, response_type: "code", scope: OIDC.scope, code_challenge: challenge, code_challenge_method: "S256" });
  globalThis.location.href = `${OIDC.authorizationEndpoint}?${params.toString()}`;
}
async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem("pkce_verifier");
  if (!verifier) throw new Error("missing PKCE verifier");
  const body = new URLSearchParams({ grant_type: "authorization_code", client_id: OIDC.clientId, redirect_uri: OIDC.redirectUri, code, code_verifier: verifier });
  const res = await fetch(OIDC.tokenEndpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error((await res.text()) || "token exchange failed");
  return res.json();
}
function oidcLogout() {
  const a = readAuth();
  clearAuth();
  const idToken = a?.token?.id_token;
  if (!idToken) { globalThis.location.href = OIDC.redirectUri; return; }
  const params = new URLSearchParams({ id_token_hint: idToken, post_logout_redirect_uri: OIDC.redirectUri, client_id: OIDC.clientId });
  globalThis.location.href = `${OIDC.logoutEndpoint}?${params.toString()}`;
}
const authHeader = () => { const a = readAuth(); return a?.token?.access_token ? { Authorization: `Bearer ${a.token.access_token}` } : {}; };
const DEBUG = teacherQuery.get("debug") === "1";
const API_LOG = [];
const apiGet = async (url, { auth = true } = {}) => {
  const entry = { url, auth, at: new Date().toLocaleTimeString("th-TH") };
  API_LOG.push(entry);
  try {
    const res = await fetch(url, { headers: auth ? authHeader() : {} });
    entry.status = res.status;
    if (!res.ok) { entry.ok = false; entry.error = `${res.status} ${res.statusText}`; throw new Error(entry.error); }
    const json = await res.json();
    entry.ok = true;
    entry.count = Array.isArray(json) ? json.length : (Array.isArray(json?.data) ? json.data.length : undefined);
    if (DEBUG) entry.sample = json;
    return json;
  } catch (e) { entry.ok = false; entry.error = entry.error || e.message; throw e; }
};
const apiUser = (sub) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/user/${encodeURIComponent(sub)}`);
const apiTeacher = (sub) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/teacher/${encodeURIComponent(sub)}`);
const apiUserInfo = () => apiGet(OIDC.userinfoEndpoint);
const apiClassrooms = (sub, instituteId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/course/teacher/${encodeURIComponent(sub)}${instituteId ? `?instituteId=${encodeURIComponent(instituteId)}` : ""}`);
const apiAssign = (assignId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}`);
const apiProgress = (assignId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/progress`);
const apiGrades = (assignId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/grades`);
const apiCourseTree = (courseId) => apiGet(`${teacherConfig.sbsUrl}/lms/${encodeURIComponent(courseId)}`, { auth: false });

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const toNumber = (v, f = 0) => { const n = Number(v); return Number.isFinite(n) ? n : f; };
const avg = (values) => { const n = values.map(Number).filter(Number.isFinite); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const normalizeListPayload = (p) => {
  if (Array.isArray(p)) return p;
  if (!p || typeof p !== "object") return [];
  return p.data || p.results || p.items || p.rows || [];
};
const fetchJson = async (url) => {
  const full = new URL(url, globalThis.location?.href || "http://localhost/");
  full.searchParams.set("v", String(Date.now()));
  const res = await fetch(full.toString());
  if (!res.ok) throw new Error(`โหลด ${url} ไม่สำเร็จ (${res.status})`);
  return res.json();
};
const buildUrl = (endpoint, params = {}) => {
  if (!endpoint) return "";
  if (typeof endpoint === "function") return endpoint(params);
  const url = new URL(endpoint, teacherConfig.apiBaseUrl || (globalThis.location?.href || "http://localhost/"));
  Object.entries(params).forEach(([k, v]) => { if (v != null && String(v).trim() !== "") url.searchParams.set(k, v); });
  return url.toString();
};
const loadTeacherData = async () => {
  if (teacherConfig.source === "api") {
    const p = { courseId: teacherConfig.courseId, course_id: teacherConfig.courseId, teacherId: teacherConfig.teacherId, teacher_id: teacherConfig.teacherId, instituteId: teacherConfig.instituteId, institute_id: teacherConfig.instituteId };
    const urls = { course: buildUrl(teacherConfig.endpoints.course, p), progress: buildUrl(teacherConfig.endpoints.progress, p), score: buildUrl(teacherConfig.endpoints.score, p) };
    const miss = Object.entries(urls).filter(([, u]) => !u).map(([k]) => k);
    if (miss.length) throw new Error(`ยังไม่ได้ตั้งค่า teacher API endpoint: ${miss.join(", ")}`);
    const [course, progress, score] = await Promise.all([fetchJson(urls.course), fetchJson(urls.progress), fetchJson(urls.score)]);
    return { source: "api", course, progress: normalizeListPayload(progress), score: normalizeListPayload(score) };
  }
  const lp = teacherConfig.localPaths;
  const [course, progress, score] = await Promise.all([fetchJson(lp.course), fetchJson(lp.progress), fetchJson(lp.score)]);
  return { source: "local", course, progress: normalizeListPayload(progress), score: normalizeListPayload(score) };
};

/* ------------------------------ data derivation ------------------------------ */
const compareSortPath = (a, b) => {
  const p = (r) => { const x = String(r || "").split(".").map(Number).filter(Number.isFinite); return x.length ? x : [9999]; };
  const aa = p(a), bb = p(b), len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) { const d = (aa[i] ?? 0) - (bb[i] ?? 0); if (d) return d; }
  return 0;
};
const fullName = (r) => `${r?.firstName || ""} ${r?.lastName || ""}`.replace(/\s+/g, " ").trim() || r?.email || "-";
const scoreRate = (s) => (s && s.max > 0 ? clamp((s.score / s.max) * 100, 0, 100) : null);

const buildScoreByEmail = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const email = String(row?.email || "").trim().toLowerCase();
    if (!email) return;
    const prev = map.get(email) || { score: 0, max: 0, count: 0, modules: new Set() };
    prev.score += toNumber(row.score, 0); prev.max += toNumber(row.maxScore, 0); prev.count += 1;
    if (row.moduleId) prev.modules.add(row.moduleId);
    map.set(email, prev);
  });
  return map;
};

const statusOf = (p) => {
  if (p >= 100) return { key: "done", label: "เรียนจบ", color: "#0f766e", bg: "#d1fae5" };
  if (p >= 60) return { key: "learning", label: "กำลังเรียน", color: "#3730a3", bg: "#e0e7ff" };
  return { key: "followup", label: "ต้องติดตาม", color: "#c2410c", bg: "#ffedd5" };
};
const progColor = (p) => (p >= 100 ? "#22c55e" : p >= 75 ? "#14b8a6" : p >= 50 ? "#f59e0b" : p >= 1 ? "#fb923c" : "#d0d5dd");
const initialsOf = (n) => { const t = String(n || "").trim(); return t ? (/[a-zA-Z]/.test(t[0]) ? t.slice(0, 2).toUpperCase() : t.slice(0, 1)) : "?"; };
const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
};

const mergeStudents = (progressRows, scoreRows) => {
  const scores = buildScoreByEmail(scoreRows);
  return progressRows.map((row) => {
    const email = String(row?.email || "").trim().toLowerCase();
    const sc = scores.get(email) || null;
    const progress = clamp(toNumber(row.progress, 0), 0, 100);
    const score = sc ? { score: sc.score, max: sc.max, count: sc.count, moduleCount: sc.modules.size } : null;
    const rate = scoreRate(score);
    const s = statusOf(progress);
    return {
      id: row.id ?? email,
      email,
      name: fullName(row),
      room: (/\d/.test(row.levelOfEducation || "") ? String(row.levelOfEducation).trim() : "") || row.province || "-",
      province: row.province || "-",
      progress,
      lastUpdate: row.lastUpdate || null,
      updated: fmtDate(row.lastUpdate || null),
      score,
      rate,
      status: s,
      quizText: score && score.max > 0 ? `${score.score} / ${score.max}` : "—",
      quizPct: rate != null ? `${Math.round(rate)}%` : "",
      initials: initialsOf(fullName(row)),
      progColor: progColor(progress),
      progW: progress + "%",
    };
  });
};

const walkCourse = (node, out = []) => {
  if (!node || typeof node !== "object") return out;
  out.push(node);
  (Array.isArray(node.children) ? node.children : []).forEach((c) => walkCourse(c, out));
  return out;
};
const toolLabel = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("video")) return "Video";
  if (t.includes("bookroll")) return "BookRoll";
  if (t.includes("chatbot") || t.includes("quiz")) return "Quiz";
  if (t.includes("profile")) return "Profile";
  return type ? type[0].toUpperCase() + type.slice(1) : "Tool";
};
const collectActivities = (course, scoreRows = []) => {
  // distinct learners who engaged per module (only quiz/score modules have real data)
  const byModule = new Map();
  scoreRows.forEach((r) => {
    if (!r?.moduleId) return;
    const set = byModule.get(r.moduleId) || new Set();
    set.add(String(r.email || "").trim().toLowerCase());
    byModule.set(r.moduleId, set);
  });
  const verticals = walkCourse(course).filter((n) => n.kind === "vertical").sort((a, b) => compareSortPath(a.sort, b.sort));
  return verticals.map((v) => {
    const tools = (Array.isArray(v.children) ? v.children : [])
      .filter((c) => c.kind === "aetool")
      .map((t) => ({ type: String(t.fields?.aetool || "tool").toLowerCase(), label: toolLabel(t.fields?.aetool), id: t.id || "", url: t.fields?.iframe_url || "", sort: t.sort || "" }))
      .sort((a, b) => compareSortPath(a.sort, b.sort));
    const reached = new Set();
    tools.forEach((t) => { const s = byModule.get(t.id); if (s) s.forEach((e) => reached.add(e)); });
    const hasReach = tools.some((t) => byModule.has(t.id));
    return { id: v.id, name: v.title || v.fields?.title || "-", code: v.sort || "-", tools, reach: hasReach ? reached.size : null };
  }).filter((a) => a.tools.length);
};

const bucketize = (students) => {
  const prog = [
    { key: "done", label: "100%", min: 100, max: 100, count: 0, color: "#22c55e" },
    { key: "high", label: "75-99%", min: 75, max: 99.999, count: 0, color: "#14b8a6" },
    { key: "mid", label: "50-74%", min: 50, max: 74.999, count: 0, color: "#f59e0b" },
    { key: "low", label: "1-49%", min: 1, max: 49.999, count: 0, color: "#fb923c" },
    { key: "zero", label: "0%", min: 0, max: 0.999, count: 0, color: "#cbd5e1" },
  ];
  const quiz = [
    { label: "80-100%", min: 80, max: 100, count: 0, color: "#22c55e" },
    { label: "60-79%", min: 60, max: 79.999, count: 0, color: "#14b8a6" },
    { label: "40-59%", min: 40, max: 59.999, count: 0, color: "#f59e0b" },
    { label: "0-39%", min: 0, max: 39.999, count: 0, color: "#ef4444" },
    { label: "ไม่มีคะแนน", noScore: true, count: 0, color: "#94a3b8" },
  ];
  students.forEach((st) => {
    const b = prog.find((x) => st.progress >= x.min && st.progress <= x.max); if (b) b.count += 1;
    if (st.rate == null) { quiz.find((x) => x.noScore).count += 1; }
    else { const q = quiz.find((x) => !x.noScore && st.rate >= x.min && st.rate <= x.max); if (q) q.count += 1; }
  });
  return { prog, quiz };
};

/* tool aggregate across the whole course for the Tools page summary cards */
const toolSummary = (activities, scoreRows, studentCount) => {
  const counts = { video: 0, bookroll: 0, quiz: 0, profile: 0 };
  activities.forEach((a) => a.tools.forEach((t) => {
    const l = t.label.toLowerCase();
    if (l === "video") counts.video++;
    else if (l === "bookroll") counts.bookroll++;
    else if (l === "quiz") counts.quiz++;
    else if (l === "profile") counts.profile++;
  }));
  return counts;
};

/* ------------------------------ design demo data ------------------------------ */
const DEMO = {
  demoCourses: [
    { id: "c2", color: "#f5b301", title: "ปัญญาประดิษฐ์สำหรับนักเรียนระดับชั้นมัธยมศึกษาตอนต้น : Module 4 Generative AI", classCode: "K9QX3P", students: 63, progress: 41 },
    { id: "c3", color: "#22c55e", title: "ปัญญาประดิษฐ์สำหรับนักเรียนระดับชั้นมัธยมศึกษาตอนต้น : Module 5 จริยธรรม AI", classCode: "A7YB2H", students: 58, progress: 66 },
    { id: "c4", color: "#0f766e", title: "เรียนปัญญาประดิษฐ์ กับ KidBright AI", classCode: "DX4M9K", students: 41, progress: 23 },
  ],
  notifications: [
    { text: "มีนักเรียน 3 คนยังไม่ส่งแบบทดสอบท้าย Module", time: "10 นาทีที่แล้ว", unread: true },
    { text: "คะแนน Quiz อัปเดตใหม่ 12 รายการ", time: "2 ชั่วโมงที่แล้ว", unread: true },
    { text: "ความคืบหน้าเฉลี่ยของห้องเพิ่มขึ้น 4.2%", time: "เมื่อวาน", unread: false },
  ],
  insightSlides: [
    { bg: "#e9fbf4", label: "ผู้ใช้งานทั่วประเทศ", big: "22,497", unit: "คน", desc: "ครู นักเรียน และบุคลากรทางการศึกษาใช้งานระบบใน 62 จังหวัดทั่วประเทศ", view: { lat: 13.6, lng: 101.2, zoom: 5.3 } },
    { bg: "#eef2ff", label: "วิชาที่เปิดสอนทั้งหมด", big: "48", unit: "วิชา", desc: "ครอบคลุมปัญญาประดิษฐ์ สะเต็มศึกษา และทักษะดิจิทัลสำหรับทุกช่วงชั้น", view: { lat: 15.6, lng: 101.6, zoom: 5.6 } },
    { bg: "#fff1e6", label: "วิชาที่กำลังนิยม", big: "AI เบื้องต้น", unit: "", desc: "มีผู้เรียนมากที่สุด 6,820 คนในเดือนนี้ นำโดยภาคตะวันออกเฉียงเหนือ", view: { lat: 15.0, lng: 102.6, zoom: 6.4 } },
    { bg: "#eafaf3", label: "ผู้ใช้ใหม่ใน 30 วัน", big: "+3,150", unit: "คน", desc: "เพิ่มขึ้น 16% จากเดือนก่อนหน้า นำโดยกรุงเทพฯ และปริมณฑล", view: { lat: 13.8, lng: 100.7, zoom: 6.9 } },
  ],
  mapPoints: [
    { lat: 18.79, lng: 98.98, n: 18, size: 38 }, { lat: 18.29, lng: 99.49, n: 22, size: 40 },
    { lat: 17.0, lng: 100.3, n: 39, size: 46 }, { lat: 17.4, lng: 102.8, n: 27, size: 42 },
    { lat: 16.5, lng: 104.4, n: 18, size: 38 }, { lat: 14.97, lng: 102.1, n: 42, size: 48 },
    { lat: 14.0, lng: 99.5, n: 16, size: 36 }, { lat: 13.75, lng: 100.52, n: 110, size: 62, big: true },
    { lat: 12.6, lng: 102.1, n: 23, pin: true },
  ],
  schoolsGeo: [
    { name: "แคนดงพิทยาคม", prov: "บุรีรัมย์", lat: 15.14, lng: 103.08, students: 79, progress: 84, you: true },
    { name: "บ้านกรวดวิทยาคาร", prov: "บุรีรัมย์", lat: 14.53, lng: 103.51, students: 64, progress: 72 },
    { name: "ประโคนชัยพิทยาคม", prov: "บุรีรัมย์", lat: 14.61, lng: 103.12, students: 88, progress: 61 },
    { name: "นางรองพิทยาคม", prov: "บุรีรัมย์", lat: 14.63, lng: 102.79, students: 102, progress: 90 },
    { name: "ลำปลายมาศ", prov: "บุรีรัมย์", lat: 15.02, lng: 102.82, students: 57, progress: 55 },
    { name: "สตึกประชาสรรค์", prov: "บุรีรัมย์", lat: 15.29, lng: 103.30, students: 71, progress: 78 },
    { name: "พุทไธสง", prov: "บุรีรัมย์", lat: 15.55, lng: 103.00, students: 45, progress: 48 },
    { name: "ราชสีมาวิทยาลัย", prov: "นครราชสีมา", lat: 14.97, lng: 102.10, students: 130, progress: 88 },
    { name: "ศรีสะเกษวิทยาลัย", prov: "ศรีสะเกษ", lat: 15.11, lng: 104.32, students: 96, progress: 70 },
  ],
};

/* ------------------------------ icons ------------------------------ */
const svg = (paths, sw) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 2.1}" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%">${paths.map((d) => `<path d="${d}"></path>`).join("")}</svg>`;
const ICO = {
  usersSm: svg(["M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1", "M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"], 2.1),
  home: svg(["M3.5 11.5 12 4.5l8.5 7", "M5.5 10v9.5h13V10", "M10 19.5v-5.5h4v5.5"], 2),
  bell: svg(["M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z", "M9.7 19a2.3 2.3 0 0 0 4.6 0"], 2.1),
  send: svg(["M4 12l16-7-6 16-2.5-6.5L4 12z"], 2),
  plus: svg(["M12 5v14", "M5 12h14"], 2.2),
  edit: svg(["M4 20.5h4L18.6 9.9a1.9 1.9 0 0 0-2.7-2.7L5.3 17.8 4 20.5z", "M14.3 7.2l2.7 2.7"], 2),
  logout: svg(["M15 4.5h2.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15", "M10.5 16.5l4.5-4.5-4.5-4.5", "M15 12H4"], 2),
  chevron: svg(["M6 9l6 6 6-6"], 2.2),
  id: svg(["M3.5 6h17v12h-17z", "M8 11a1.7 1.7 0 1 0 0-3.4A1.7 1.7 0 0 0 8 11", "M5.6 15.2c.4-1.3 1.4-2 2.4-2s2 .7 2.4 2", "M13.5 9h4", "M13.5 12h4", "M13.5 15h2.5"], 1.9),
  lock: svg(["M6 10.5h12v9.5H6z", "M8.2 10.5V7.2a3.8 3.8 0 0 1 7.6 0v3.3"], 2),
};
const toolStyle = (label) => { const m = { Profile: "#12a89b", Video: "#7b83eb", BookRoll: "#5ab877", Quiz: "#f59e0b" }; return `background:${m[label] || "#94a3b8"};color:#fff`; };

/* ------------------------------ state ------------------------------ */
const state = {
  ready: false, error: null, source: "",
  mode: "local", sub: "", instituteId: "", classrooms: [], loadingCourse: false, authError: null,
  page: "overview", course: null, student: null,
  search: "", filter: "all", sort: "followup",
  authed: false, userMenuOpen: false, editOpen: false, notifOpen: false,
  leadoOpen: false, leadoMsg: "", teacherName: "ครูสมชาย ใจดี", teacherEmail: "somchai.t@candong.ac.th",
  lang: "th", fontSize: "md", mapSlide: 0,
  // derived (filled after load)
  students: [], activities: [], courseData: null, courseTitle: "-", courseKey: "-",
  metrics: null, prog: [], quiz: [], tools: null,
};

/* runtime helpers not part of state */
const maps = { usage: null, compare: null };
let slideTimer = null;

/* ------------------------------ compute per render ------------------------------ */
const CLASS_COLORS = ["#f43f7e", "#f5b301", "#22c55e", "#0f766e", "#6366f1", "#0ea5e9", "#ef4444", "#8b5cf6"];
const numOr = (...vals) => { for (const v of vals) if (v != null && v !== "") return v; return null; };
// One course from /course/teacher/{sub} holds an `assigns[]` array; each assign is
// a classroom (holds assignId + institute/grade/level/classRoom). Flatten to one card each.
const mapClassroom = (course, assign, i) => {
  const courseId = course.courseId || course.course_id || "";
  const inst = assign.institute || {};
  return {
    id: String(assign.assignId || assign.assign_id || assign.id || `cls-${i}`),
    assignId: assign.assignId || assign.assign_id || assign.id || "",
    courseId,
    color: CLASS_COLORS[i % CLASS_COLORS.length],
    title: course.courseName || course.courseTitle || course.title || courseId || "ห้องเรียน",
    classCode: [assign.grade, assign.level, assign.classRoom].filter(Boolean).join("/") || inst.instituteName || "—",
    school: inst.instituteName || "",
    province: inst.province || "",
    students: numOr(assign.studentCount, assign.students, assign.enrollCount, assign.total, assign.memberCount),
    progress: (() => { const p = numOr(assign.progress, assign.avgProgress, assign.averageProgress); return p == null ? null : Math.round(Number(p)); })(),
  };
};
const flattenClassrooms = (courses) => {
  const out = [];
  (courses || []).forEach((course) => {
    const assigns = Array.isArray(course.assigns) && course.assigns.length ? course.assigns
      : Array.isArray(course.assign) && course.assign.length ? course.assign
      : [course]; // back-compat: flat item that already carries assignId at top level
    assigns.forEach((assign) => out.push(mapClassroom(course, assign, out.length)));
  });
  return out;
};
const courseList = () => {
  if (state.mode === "api") return state.classrooms;
  const real = state.courseData
    ? [{
        id: "real", color: "#f43f7e", title: state.courseTitle,
        classCode: (state.courseKey.split("+")[1] || state.courseKey).slice(0, 12),
        students: state.students.length, progress: Math.round(state.metrics?.avgProgress ?? 0),
      }]
    : [];
  return [...real, ...DEMO.demoCourses];
};
const selectedCourse = () => courseList().find((c) => c.id === state.course) || null;

const decoratedStudents = () => {
  let list = state.students.slice();
  const q = state.search.trim().toLowerCase();
  if (q) list = list.filter((x) => x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q) || x.province.toLowerCase().includes(q));
  if (state.filter !== "all") list = list.filter((x) => x.status.key === state.filter);
  const rank = { followup: 0, learning: 1, done: 2 };
  list.sort((a, b) => {
    switch (state.sort) {
      case "progress": return b.progress - a.progress;
      case "quiz": return (b.rate == null ? -1 : b.rate) - (a.rate == null ? -1 : a.rate);
      case "name": return a.name.localeCompare(b.name, "th");
      default: return (rank[a.status.key] - rank[b.status.key]) || (a.progress - b.progress);
    }
  });
  return list;
};

/* ------------------------------ small view helpers ------------------------------ */
const iconBox = (svgStr, color, bg) => `<span style="width:30px;height:30px;border-radius:9px;background:${bg};display:inline-flex;align-items:center;justify-content:center;color:${color}">${svgStr}</span>`;

/* ============================== SCREENS ============================== */

function viewLandingSignIn() {
  return `
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:340px;width:100%;margin:0 auto">
    <div style="font:800 26px 'Noto Sans Thai';color:#101828;margin-bottom:28px">เข้าสู่ระบบผู้สอน</div>
    <button data-act="signIn" class="h-bright" style="display:flex;align-items:center;justify-content:center;gap:12px;width:100%;border:none;background:linear-gradient(100deg,#12a594,#0d9488);color:#fff;border-radius:999px;padding:16px 18px;font:700 15.5px 'Noto Sans Thai';cursor:pointer;box-shadow:0 8px 20px rgba(13,148,136,.3)">
      <span style="width:22px;height:22px;display:inline-flex">${ICO.id}</span>เข้าสู่ระบบด้วย MECA ID<span style="font:700 17px Inter">→</span>
    </button>
    <div style="display:flex;align-items:center;gap:9px;margin-top:16px;background:#f7f8fa;border:1px solid #eceef1;border-radius:11px;padding:11px 14px">
      <span style="width:16px;height:16px;color:#98a2b3;flex:none">${ICO.lock}</span>
      <span style="font:500 11.5px/1.5 'Noto Sans Thai';color:#667085">การเข้าสู่ระบบดำเนินการผ่าน MECA ID อย่างปลอดภัย ระบบไม่เก็บรหัสผ่านของท่าน</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin:26px 0">
      <div style="flex:1;height:1px;background:#eceef1"></div><span style="font:500 12px 'Noto Sans Thai';color:#b2b8c2">หรือ</span><div style="flex:1;height:1px;background:#eceef1"></div>
    </div>
    <div style="text-align:center;font:500 13px 'Noto Sans Thai';color:#667085">ยังไม่มีบัญชี MECA ID? <span style="font:700 13px 'Noto Sans Thai';color:#0f766e;cursor:pointer">ลงทะเบียนที่นี่</span></div>
    <div style="font:500 11.5px/1.6 'Noto Sans Thai';color:#b2b8c2;margin-top:30px;text-align:center">การเข้าใช้งานถือว่าท่านยอมรับ <span style="color:#667085;cursor:pointer">เงื่อนไขการใช้บริการ</span> และ <span style="color:#667085;cursor:pointer">นโยบายความเป็นส่วนตัว</span></div>
  </div>`;
}

function viewCourseList() {
  const courses = courseList();
  return `
  <div style="width:100%;max-width:560px;margin:24px auto 0">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:20px">
      <div style="display:flex;align-items:baseline;gap:10px">
        <div style="font:800 23px 'Noto Sans Thai';color:#101828">ห้องเรียน</div>
        <span style="font:600 13px 'Noto Sans Thai';color:#0f766e;background:#e9fbf4;border-radius:999px;padding:3px 11px">${courses.length} ห้องเรียน</span>
      </div>
      <button class="h-teal" style="display:flex;align-items:center;gap:6px;border:none;background:#0d9488;color:#fff;border-radius:999px;padding:9px 16px;font:700 12.5px 'Noto Sans Thai';cursor:pointer;box-shadow:0 4px 12px rgba(13,148,136,.25)">
        <span style="width:15px;height:15px;display:inline-flex">${ICO.plus}</span>เพิ่มห้องเรียน
      </button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      ${courses.length ? courses.map((c) => {
        const pnum = typeof c.progress === "number" ? c.progress : null;
        const stu = c.students == null ? "—" : c.students;
        return `
        <div data-act="pickCourse" data-arg="${esc(c.id)}" class="h-card" style="display:flex;align-items:stretch;background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);cursor:pointer;overflow:hidden">
          <div style="width:5px;flex:none;background:${c.color}"></div>
          <div style="flex:1;padding:17px 18px;min-width:0">
            <div style="font:700 15.5px/1.4 'Noto Sans Thai';color:#101828">${esc(c.title)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
              <span style="font:600 11px 'Noto Sans Thai';color:#0f766e;background:#e9fbf4;border:1px solid #c3f0e2;border-radius:7px;padding:3px 9px">ระดับชั้น: ทั้งหมด</span>
              <span style="display:flex;align-items:center;gap:5px;font:700 11px 'Inter',monospace;letter-spacing:.04em;color:#475467;background:#f7f8fa;border:1px dashed #d3d8de;border-radius:7px;padding:3px 9px"><span style="width:11px;height:11px;display:inline-flex;color:#98a2b3">${ICO.id}</span>${esc(c.classCode)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:11px;margin-top:14px">
              <span style="font:500 11.5px 'Noto Sans Thai';color:#98a2b3;display:flex;align-items:center;gap:5px;flex:none"><span style="width:14px;height:14px;display:inline-flex">${ICO.usersSm}</span>${stu} คน</span>
              <div style="flex:1;height:9px;background:#eef0f3;border-radius:99px;overflow:hidden"><div style="height:100%;border-radius:99px;background:${c.color};width:${pnum == null ? 0 : pnum}%"></div></div>
              <span style="font:700 13px Inter;color:#0f766e;flex:none;width:38px;text-align:right">${pnum == null ? "—" : pnum + "%"}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;padding-right:16px"><span style="width:26px;height:26px;border-radius:50%;background:#f7f8fa;display:flex;align-items:center;justify-content:center;font:700 15px Inter;color:#98a2b3">›</span></div>
        </div>`;
      }).join("") : `<div style="background:#fff;border:1px dashed #e4e7ec;border-radius:16px;padding:28px;text-align:center;font:600 14px 'Noto Sans Thai';color:#98a2b3">ยังไม่มีห้องเรียนสำหรับบัญชีนี้</div>`}
    </div>
  </div>`;
}

function viewLanding() {
  const authed = state.authed;
  return `
  <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:#fff">
    <div style="flex:1;display:flex;min-height:0">
      <div style="flex:1.25;position:relative;background:#dfe7ea;overflow:hidden;isolation:isolate">
        <div id="th-usage-map" style="position:absolute;inset:0"></div>
        <div style="position:absolute;top:24px;left:24px;z-index:600;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.6);border-radius:18px;box-shadow:0 14px 36px rgba(16,24,40,.2);padding:22px 24px;width:320px;overflow:hidden">
          <div id="slide-stage" style="position:relative;min-height:150px">
            ${DEMO.insightSlides.map((sl, i) => `
              <div class="slide" data-i="${i}" style="position:absolute;inset:0;transition:opacity .5s ease,transform .5s ease;opacity:${i === state.mapSlide ? 1 : 0};transform:${i === state.mapSlide ? "translateY(0)" : "translateY(8px)"};pointer-events:none">
                <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
                  <span style="width:6px;height:22px;border-radius:99px;background:${sl.bg};flex:none"></span>
                  <span style="font:700 12.5px 'Noto Sans Thai';color:#475467;letter-spacing:.01em">${esc(sl.label)}</span>
                </div>
                <div style="font:800 30px Inter;color:#101828;line-height:1.15;word-break:break-word">${esc(sl.big)} <span style="font:700 15px 'Noto Sans Thai';color:#98a2b3">${esc(sl.unit)}</span></div>
                <div style="font:500 12.5px/1.6 'Noto Sans Thai';color:#98a2b3;margin-top:8px">${esc(sl.desc)}</div>
              </div>`).join("")}
          </div>
          <div style="display:flex;gap:6px;margin-top:14px;position:relative;z-index:1">
            ${DEMO.insightSlides.map((sl, i) => `<button data-act="goSlide" data-arg="${i}" class="slide-dot" data-i="${i}" style="border:none;cursor:pointer;padding:0;height:6px;border-radius:99px;flex:1;background:${i === state.mapSlide ? "#0d9488" : "#e2e5e9"};transition:background .3s"></button>`).join("")}
          </div>
        </div>
      </div>
      <div class="scrolly" style="flex:.9;min-width:min(430px,42vw);display:flex;flex-direction:column;padding:40px 46px;background:#eef0f3;min-height:0">
        ${authed ? viewCourseList() : viewLandingSignIn()}
      </div>
    </div>
    <div style="flex:none;background:#f7f8fa;border-top:1px solid #ececf1;padding:12px 32px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px">
      <span style="font:700 12px 'Noto Sans Thai';color:#344054">ศูนย์เทคโนโลยีอิเล็กทรอนิกส์และคอมพิวเตอร์แห่งชาติ</span>
      <span style="font:500 11.5px Inter;color:#98a2b3">National Electronics and Computer Technology Center: NECTEC</span>
      <span style="font:500 11.5px 'Noto Sans Thai';color:#98a2b3">· 112 ถนนพหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120, Thailand</span>
      <span style="font:500 11.5px Inter;color:#98a2b3">· Call Center: 662-564-6900</span>
      <span style="font:500 11.5px Inter;color:#0f766e">· info@nectec.or.th</span>
    </div>
  </div>`;
}

/* ---------------- top bar ---------------- */
function viewTopBar() {
  const showLanding = !state.course, inCourse = !!state.course, showProfile = state.authed;
  const initials = (state.teacherName || "").replace(/\s/g, "").slice(0, 2);
  const langFlag = state.lang === "th" ? "🇹🇭" : "🇬🇧";
  const unread = DEMO.notifications.filter((n) => n.unread).length;
  const leadoShow = state.leadoOpen;
  const sel = selectedCourse();
  return `
  <div style="position:fixed;top:0;left:0;right:0;height:60px;z-index:1200;background:rgba(255,255,255,.9);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid rgba(0,0,0,.06);box-shadow:0 2px 10px rgba(16,24,40,.08);display:flex;align-items:center;justify-content:space-between;padding:0 22px">
    <div style="display:flex;align-items:center;gap:14px;min-width:0">
      ${showLanding ? `
        <button data-act="switchCourse" class="h-soft2" title="หน้าแรก" style="background:none;border:none;cursor:pointer;padding:4px 6px;display:flex;align-items:center;border-radius:8px">
          <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-adap-green-untext.1c98bf032947.png" alt="MECA" style="height:34px;object-fit:contain">
        </button>
        <div style="width:1px;height:24px;background:#e6e8ec"></div>
        <div style="display:flex;align-items:center;gap:14px">
          <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-mhesi.f3e5c05e5ebe.png" alt="MHESI" style="height:38px;object-fit:contain">
          <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-nstda.a0c679b2e45e.png" alt="NSTDA" style="height:32px;object-fit:contain">
          <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-nectec.4a797e97e6ed.png" alt="NECTEC" style="height:32px;object-fit:contain">
        </div>` : ""}
      ${inCourse ? `
        <button data-act="switchCourse" class="h-soft" style="display:flex;align-items:center;gap:8px;background:#f4f5f7;border:none;cursor:pointer;padding:9px 14px;border-radius:10px;font:700 14px 'Noto Sans Thai';color:#0f766e">
          <span style="width:26px;height:26px;color:#0f766e;display:inline-flex">${ICO.home}</span>หน้าแรก
        </button>
        <div style="width:1px;height:26px;background:#e6e8ec"></div>
        <span style="font:600 13px 'Noto Sans Thai';color:#98a2b3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px">${esc(sel?.title || state.courseTitle)}</span>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;flex:none">
      ${showProfile ? `
        <div style="position:relative">
          <button data-act="toggleLeado" class="h-soft" style="position:relative;width:46px;height:46px;border-radius:50%;background:#f4f5f7;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
            <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png" alt="Leado" style="width:30px;height:30px;object-fit:contain"></button>
          <div style="position:absolute;top:calc(100% + 10px);right:0;z-index:98;width:308px;transform-origin:top right;transition:opacity .32s cubic-bezier(.2,.8,.2,1),transform .32s cubic-bezier(.2,.8,.2,1);opacity:${leadoShow ? 1 : 0};transform:${leadoShow ? "scale(1) translateY(0)" : "scale(.4) translateY(-14px)"};pointer-events:${leadoShow ? "auto" : "none"}">
            <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 18px 44px rgba(16,24,40,.22);overflow:hidden">
              <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(100deg,#0f766e,#12a594);color:#fff">
                <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png" alt="Leado" style="width:26px;height:26px;border-radius:50%;background:#fff">
                <div style="flex:1"><div style="font:800 13.5px 'Noto Sans Thai'">Leado</div><div style="font:500 10.5px 'Noto Sans Thai';color:#d5f2ec">ผู้ช่วย AI</div></div>
                <button data-act="closeLeado" style="border:none;background:rgba(255,255,255,.18);color:#fff;width:24px;height:24px;border-radius:7px;cursor:pointer;font:700 12px Inter">✕</button>
              </div>
              <div style="padding:14px 16px;background:#f7fdfb"><div style="background:#fff;border:1px solid #e3f3ee;border-radius:14px;border-top-left-radius:4px;padding:11px 14px;font:500 13px/1.6 'Noto Sans Thai';color:#344054;box-shadow:0 1px 2px rgba(16,24,40,.04)">Leado พร้อมให้บริการ ถามข้อมูลได้ที่นี่นะครับ</div></div>
              <div style="display:flex;gap:8px;padding:12px 14px;border-top:1px solid #f2f4f7">
                <input id="leadoMsg" data-inp="setLeadoMsg" value="${esc(state.leadoMsg)}" placeholder="พิมพ์คำถามของคุณ..." class="fld" style="flex:1;border:1px solid #e4e7ec;border-radius:10px;padding:9px 12px;font:500 13px 'Noto Sans Thai';outline:none">
                <button class="h-teal" style="border:none;background:#0d9488;color:#fff;width:38px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span style="width:17px;height:17px;display:inline-flex">${ICO.send}</span></button>
              </div>
            </div>
          </div>
        </div>
        <div style="position:relative">
          <button data-act="toggleNotif" class="h-soft" style="position:relative;width:46px;height:46px;border-radius:50%;background:#f4f5f7;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#344054">
            <span style="width:25px;height:25px;display:inline-flex">${ICO.bell}</span>
            ${unread ? `<span style="position:absolute;top:9px;right:9px;width:9px;height:9px;border-radius:50%;background:#ef4444;border:1.5px solid #fff"></span>` : ""}
          </button>
          ${state.notifOpen ? `
            <div style="position:absolute;top:calc(100% + 10px);right:0;z-index:98;width:320px;background:#fff;border:1px solid #eceef1;border-radius:14px;box-shadow:0 14px 34px rgba(16,24,40,.18);overflow:hidden">
              <div style="padding:14px 16px;border-bottom:1px solid #f2f4f7;font:700 14px 'Noto Sans Thai';color:#101828">การแจ้งเตือน</div>
              ${DEMO.notifications.map((n) => `<div style="display:flex;gap:11px;padding:13px 16px;border-bottom:1px solid #f6f7f8;background:${n.unread ? "#f7fdfb" : "#fff"}"><span style="width:7px;height:7px;border-radius:50%;flex:none;margin-top:6px;background:${n.unread ? "#0d9488" : "#d0d5dd"}"></span><div style="min-width:0"><div style="font:600 12.5px/1.5 'Noto Sans Thai';color:#344054">${esc(n.text)}</div><div style="font:500 11px 'Noto Sans Thai';color:#98a2b3;margin-top:3px">${esc(n.time)}</div></div></div>`).join("")}
            </div>` : ""}
        </div>
        <div style="position:relative">
          <button data-act="toggleUserMenu" class="h-soft" style="display:flex;align-items:center;gap:9px;background:#f4f5f7;border:1px solid #e9ebef;border-radius:999px;padding:5px 10px 5px 6px;cursor:pointer">
            <div style="position:relative;width:36px;height:36px">
              <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#19b3a6,#0d9488);display:flex;align-items:center;justify-content:center;font:700 14px 'Noto Sans Thai';color:#fff">${esc(initials)}</div>
              <span style="position:absolute;bottom:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#fff;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 1px 3px rgba(16,24,40,.25)">${langFlag}</span>
            </div>
            <span style="width:17px;height:17px;color:#98a2b3;display:inline-flex">${ICO.chevron}</span>
          </button>
          ${state.userMenuOpen ? viewUserMenu(initials) : ""}
        </div>` : ""}
    </div>
  </div>`;
}

function viewUserMenu(initials) {
  const langBtn = (code, flag, label) => {
    const on = state.lang === code;
    const stl = on ? "background:#e9fbf4;border-color:#0d9488;color:#0f766e" : "background:#fff;border-color:#e4e7ec;color:#667085";
    return `<button data-act="pickLang" data-arg="${code}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid;border-radius:9px;padding:8px 6px;font:600 12.5px 'Noto Sans Thai';cursor:pointer;${stl}"><span style="font-size:15px">${flag}</span>${label}</button>`;
  };
  const fontBtn = (size, sample) => {
    const on = state.fontSize === size;
    const stl = on ? "background:#e9fbf4;border-color:#0d9488;color:#0f766e" : "background:#fff;border-color:#e4e7ec;color:#667085";
    return `<button data-act="pickFont" data-arg="${size}" style="flex:1;border:1px solid;border-radius:9px;padding:8px 4px;font:700 ${sample} 'Noto Sans Thai';cursor:pointer;${stl}">A</button>`;
  };
  return `
  <div style="position:absolute;top:calc(100% + 10px);right:0;z-index:97;width:236px;background:#fff;border:1px solid #eceef1;border-radius:13px;box-shadow:0 14px 34px rgba(16,24,40,.18);overflow:hidden">
    <div style="padding:14px 16px;border-bottom:1px solid #f2f4f7;display:flex;align-items:center;gap:11px">
      <div style="width:38px;height:38px;border-radius:50%;background:#f0fdfa;color:#0f766e;display:flex;align-items:center;justify-content:center;font:700 14px 'Noto Sans Thai';flex:none;border:1px solid #d6f5ee">${esc(initials)}</div>
      <div style="min-width:0"><div style="font:700 13.5px 'Noto Sans Thai';color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(state.teacherName)}</div><div style="font:500 11px Inter;color:#98a2b3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(state.teacherEmail || "—")}</div></div>
    </div>
    <div style="padding:11px 16px 4px;font:700 11px 'Noto Sans Thai';color:#98a2b3">ภาษา</div>
    <div style="display:flex;gap:6px;padding:0 16px 11px">${langBtn("th", "🇹🇭", "ไทย")}${langBtn("en", "🇬🇧", "English")}</div>
    <div style="height:1px;background:#f2f4f7"></div>
    <div style="padding:11px 16px 4px;font:700 11px 'Noto Sans Thai';color:#98a2b3">ขนาดตัวอักษร</div>
    <div style="display:flex;gap:6px;padding:0 16px 11px">${fontBtn("sm", "13px")}${fontBtn("md", "15px")}${fontBtn("lg", "18px")}</div>
    <div style="height:1px;background:#f2f4f7"></div>
    <button data-act="openEdit" class="h-light" style="display:flex;align-items:center;gap:11px;width:100%;border:none;background:none;cursor:pointer;padding:12px 16px;font:600 13.5px 'Noto Sans Thai';color:#344054;text-align:left"><span style="width:18px;height:18px;color:#667085;display:inline-flex">${ICO.edit}</span>แก้ไขข้อมูลผู้ใช้</button>
    <div style="height:1px;background:#f2f4f7"></div>
    <button data-act="signOut" class="h-red" style="display:flex;align-items:center;gap:11px;width:100%;border:none;background:none;cursor:pointer;padding:12px 16px;font:600 13.5px 'Noto Sans Thai';color:#dc2626;text-align:left"><span style="width:18px;height:18px;color:#dc2626;display:inline-flex">${ICO.logout}</span>ออกจากระบบ</button>
  </div>`;
}

/* ---------------- dashboard shell ---------------- */
function viewDashboard() {
  const navTop = (p) => (state.page === p ? "color:#0f766e;border-bottom-color:#0f766e" : "color:#98a2b3;border-bottom-color:transparent");
  let page = "";
  if (!state.metrics) page = `<div style="padding:40px;text-align:center;font:600 14px 'Noto Sans Thai';color:#98a2b3">กำลังเตรียมข้อมูล...</div>`;
  else if (state.page === "overview") page = viewOverview();
  else if (state.page === "students") page = viewStudents();
  else if (state.page === "tools") page = viewTools();
  else if (state.page === "map") page = viewMap();
  return `
  <div style="display:flex;flex:1;min-height:0">
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;min-height:0">
      <div style="flex:none;background:#fff;border-bottom:1px solid #ececf1;box-shadow:0 1px 2px rgba(16,24,40,.03);z-index:10">
        <div style="max-width:1180px;margin:0 auto;padding:0 40px;display:flex;gap:6px;overflow-x:auto">
          <button data-act="goOverview" style="border:none;cursor:pointer;background:none;padding:15px 6px;margin-right:22px;font:700 15px 'Noto Sans Thai';border-bottom:3px solid transparent;${navTop("overview")}">ภาพรวมทั้งห้อง</button>
          <button data-act="goStudents" style="border:none;cursor:pointer;background:none;padding:15px 6px;margin-right:22px;font:700 15px 'Noto Sans Thai';border-bottom:3px solid transparent;${navTop("students")}">รายชื่อนักเรียน</button>
          <button data-act="goTools" style="border:none;cursor:pointer;background:none;padding:15px 6px;margin-right:22px;font:700 15px 'Noto Sans Thai';border-bottom:3px solid transparent;${navTop("tools")}">การใช้งานเครื่องมือ</button>
          <button data-act="goMap" style="border:none;cursor:pointer;background:none;padding:15px 6px;font:700 15px 'Noto Sans Thai';border-bottom:3px solid transparent;${navTop("map")}">แผนที่เปรียบเทียบ</button>
        </div>
      </div>
      <main class="scrolly" style="flex:1;min-height:0;padding:26px 30px 60px">
        <div style="max-width:1180px;margin:0 auto">${page}</div>
      </main>
    </div>
  </div>`;
}

/* ---------------- overview ---------------- */
function viewCourseHero() {
  const sel = selectedCourse();
  const school = sel?.school ? `${sel.school}${sel.province ? ` (${sel.province})` : ""}` : "แคนดงพิทยาคม (บุรีรัมย์)";
  const chip = (t) => `<span style="font:600 11.5px 'Noto Sans Thai';color:#fff;background:rgba(255,255,255,.16);border-radius:8px;padding:5px 11px">${esc(t)}</span>`;
  return `
    <div style="background:linear-gradient(120deg,#0f766e 0%,#12a594 55%,#15b8a5 100%);border-radius:18px;padding:22px 26px;margin-bottom:18px;box-shadow:0 4px 16px rgba(15,118,110,.18)">
      <div style="font:800 26px/1.25 'Noto Sans Thai';color:#fff;margin:0 0 12px;max-width:820px;letter-spacing:-.01em">${esc(selectedCourse()?.title || state.courseTitle)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${chip("โรงเรียน: " + school)}${chip("ระดับชั้น: ทั้งหมด")}${chip("ห้อง: ทั้งหมด")}</div>
    </div>`;
}

function viewOverview() {
  const m = state.metrics;
  const total = state.students.length;
  const records = state.metrics.records;
  const pmax = Math.max(15, Math.ceil(Math.max(...state.prog.map((b) => b.count), 1) / 15) * 15);
  const axis = [pmax, pmax * 0.75, pmax * 0.5, pmax * 0.25, 0].map((v) => Math.round(v));
  // donut
  const qtotal = state.quiz.reduce((a, b) => a + b.count, 0) || 1;
  let acc = 0;
  const seg = state.quiz.map((x) => { const a0 = (acc / qtotal) * 360; acc += x.count; const a1 = (acc / qtotal) * 360; return `${x.color} ${a0.toFixed(1)}deg ${a1.toFixed(1)}deg`; });
  const donut = `conic-gradient(${seg.join(",")})`;
  const attention = state.students.filter((x) => x.status.key === "followup").sort((a, b) => a.progress - b.progress).slice(0, 4);
  const metricCard = (accent, label, badge, value) => `
    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(16,24,40,.04);position:relative;overflow:hidden">
      <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${accent}"></div>
      <div style="display:flex;align-items:center;justify-content:space-between"><span style="font:600 13px 'Noto Sans Thai';color:#667085">${label}</span>${badge}</div>
      <div style="font:800 32px Inter;color:#101828;margin-top:8px">${value}</div>
    </div>`;
  return `
  <div>
    ${viewCourseHero()}
    <div style="margin-bottom:18px"><div style="font:800 19px 'Noto Sans Thai';color:#101828">ภาพรวมของทั้งห้องเรียน</div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px">
      ${metricCard("#12a594", "ผู้เรียนทั้งหมด", iconBox(ICO.usersSm, "#0f766e", "#e9fbf4"), `${total} <span style="font:600 13px 'Noto Sans Thai';color:#98a2b3">คน</span>`)}
      ${metricCard("#22c55e", "ความคืบหน้าเฉลี่ย", `<span style="font:600 11px 'Noto Sans Thai';color:#16a34a;background:#dcfce7;border-radius:6px;padding:3px 7px">เฉลี่ยทั้งห้อง</span>`, `${m.avgProgress.toFixed(1)}<span style="font:700 18px Inter;color:#667085">%</span>`)}
      ${metricCard("#6366f1", "เรียนครบแล้ว", `<span style="font:600 11px 'Noto Sans Thai';color:#4f46e5;background:#eef2ff;border-radius:6px;padding:3px 7px">${total ? Math.round((m.completed / total) * 100) : 0}%</span>`, `${m.completed} <span style="font:600 13px 'Noto Sans Thai';color:#98a2b3">/ ${total}</span>`)}
      ${metricCard("#f97316", "คะแนน Quiz เฉลี่ย", `<span style="font:600 11px 'Noto Sans Thai';color:#c2410c;background:#ffedd5;border-radius:6px;padding:3px 7px">${records} records</span>`, m.avgRate == null ? `-` : `${m.avgRate.toFixed(1)}<span style="font:700 18px Inter;color:#667085">%</span>`)}
    </div>

    <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:16px;margin-bottom:16px">
      <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;padding:20px 22px;box-shadow:0 1px 2px rgba(16,24,40,.04)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div style="font:700 15px 'Noto Sans Thai';color:#101828">การกระจายความคืบหน้า</div><div style="font:600 12px 'Noto Sans Thai';color:#98a2b3">${total} คน</div></div>
        <div style="display:flex;gap:14px;height:210px">
          <div style="display:flex;flex-direction:column;justify-content:space-between;font:600 11px Inter;color:#b2b8c2;padding-bottom:26px">${axis.map((v) => `<span>${v}</span>`).join("")}</div>
          <div style="flex:1;display:flex;align-items:flex-end;gap:12px;border-left:1px solid #eef0f3;border-bottom:1px solid #eef0f3;padding:0 6px">
            ${state.prog.map((b) => `
              <div style="flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px">
                <div style="font:700 13px Inter;color:#475467">${b.count}</div>
                <div style="width:76%;max-width:56px;border-radius:7px 7px 0 0;background:${b.color};height:${(b.count / pmax) * 100}%;min-height:5px;transition:height .5s ease"></div>
                <div style="font:600 12px 'Noto Sans Thai';color:#667085;padding-top:2px">${b.label}</div>
              </div>`).join("")}
          </div>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;padding:20px 22px;box-shadow:0 1px 2px rgba(16,24,40,.04)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div style="font:700 15px 'Noto Sans Thai';color:#101828">ภาพรวมคะแนน Quiz</div><div style="font:600 12px 'Noto Sans Thai';color:#98a2b3">${records} records</div></div>
        <div style="display:flex;align-items:center;gap:22px">
          <div style="position:relative;width:150px;height:150px;flex:none">
            <div style="width:150px;height:150px;border-radius:50%;background:${donut}"></div>
            <div style="position:absolute;inset:34px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div style="font:800 26px Inter;color:#101828">${m.avgRate == null ? "-" : m.avgRate.toFixed(1)}<span style="font:700 13px Inter">%</span></div>
              <div style="font:600 11px 'Noto Sans Thai';color:#98a2b3">เฉลี่ย</div>
            </div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:9px">
            ${state.quiz.map((q) => `<div style="display:flex;align-items:center;gap:9px"><span style="width:11px;height:11px;border-radius:3px;background:${q.color};flex:none"></span><span style="font:600 12.5px 'Noto Sans Thai';color:#475467;flex:1">${q.label}</span><span style="font:700 12.5px Inter;color:#101828">${q.count}</span></div>`).join("")}
          </div>
        </div>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;padding:18px 22px;box-shadow:0 1px 2px rgba(16,24,40,.04)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:9px"><span style="width:8px;height:8px;border-radius:50%;background:#f97316"></span><div style="font:700 15px 'Noto Sans Thai';color:#101828">นักเรียนที่ต้องติดตาม</div></div>
        <button data-act="goStudents" style="border:none;background:none;cursor:pointer;font:700 13px 'Noto Sans Thai';color:#0f766e">ดูทั้งหมด →</button>
      </div>
      <div style="display:flex;flex-direction:column">
        ${attention.length ? attention.map((a) => `
          <div data-act="openStudent" data-arg="${esc(a.id)}" class="h-light" style="display:flex;align-items:center;gap:14px;padding:11px 8px;border-top:1px solid #f2f4f7;cursor:pointer;border-radius:8px">
            <div style="width:34px;height:34px;border-radius:50%;background:#fff3ea;color:#c2410c;display:flex;align-items:center;justify-content:center;font:700 14px 'Noto Sans Thai';flex:none">${esc(a.initials)}</div>
            <div style="flex:1;min-width:0"><div style="font:600 13.5px 'Noto Sans Thai';color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div><div style="font:500 11.5px Inter;color:#98a2b3">${esc(a.email)}</div></div>
            <div style="width:130px;height:9px;background:#f2f4f7;border-radius:99px;overflow:hidden;flex:none"><div style="height:100%;border-radius:99px;background:${a.progColor};width:${a.progW}"></div></div>
            <div style="font:700 13px Inter;color:#475467;width:42px;text-align:right">${a.progW}</div>
            <span style="font:600 11px 'Noto Sans Thai';color:#c2410c;background:#ffedd5;border-radius:999px;padding:4px 11px;flex:none">ต้องติดตาม</span>
          </div>`).join("") : `<div style="padding:16px 8px;font:600 13px 'Noto Sans Thai';color:#98a2b3;border-top:1px solid #f2f4f7">ไม่มีนักเรียนที่ต้องติดตาม</div>`}
      </div>
    </div>
  </div>`;
}

/* ---------------- students ---------------- */
function viewStudents() {
  const list = decoratedStudents();
  const all = state.students;
  const c = (k) => all.filter((x) => x.status.key === k).length;
  const pills = [
    { key: "all", label: "ทั้งหมด", count: all.length },
    { key: "followup", label: "ต้องติดตาม", count: c("followup") },
    { key: "learning", label: "กำลังเรียน", count: c("learning") },
    { key: "done", label: "เรียนจบ", count: c("done") },
  ];
  const opt = (v, l) => `<option value="${v}"${state.sort === v ? " selected" : ""}>${l}</option>`;
  return `
  <div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px">
      <div><div style="font:800 19px 'Noto Sans Thai';color:#101828">รายชื่อนักเรียน</div><div style="font:500 13px 'Noto Sans Thai';color:#98a2b3;margin-top:2px">แสดง ${list.length} จาก ${all.length} คน</div></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="position:relative">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#98a2b3">${ICO.usersSm}</span>
          <input id="search" data-inp="setSearch" value="${esc(state.search)}" placeholder="ค้นหาชื่อหรืออีเมล" class="fld" style="width:250px;border:1px solid #e4e7ec;border-radius:10px;padding:10px 12px 10px 36px;font:500 13.5px 'Noto Sans Thai';outline:none;background:#fff">
        </div>
        <select data-chg="setSort" class="fld" style="border:1px solid #e4e7ec;border-radius:10px;padding:10px 12px;font:600 13px 'Noto Sans Thai';color:#475467;background:#fff;cursor:pointer;outline:none">
          ${opt("followup", "เรียง: ต้องติดตามก่อน")}${opt("progress", "เรียง: ความคืบหน้ามาก→น้อย")}${opt("quiz", "เรียง: คะแนนมาก→น้อย")}${opt("name", "เรียง: ชื่อ ก→ฮ")}
        </select>
        <button data-act="downloadCsv" class="h-teal2" style="border:1px solid #e4e7ec;border-radius:10px;padding:10px 14px;font:600 13px 'Noto Sans Thai';color:#0f766e;background:#fff;cursor:pointer;display:flex;align-items:center;gap:7px">↓ ดาวน์โหลด CSV</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${pills.map((p) => { const on = state.filter === p.key; const stl = on ? "background:#0d9488;color:#fff;border-color:#0d9488" : "background:#fff;color:#475467;border-color:#e4e7ec"; return `<button data-act="setFilter" data-arg="${p.key}" style="border:1px solid;cursor:pointer;border-radius:999px;padding:7px 15px;font:600 13px 'Noto Sans Thai';display:flex;align-items:center;gap:7px;${stl}">${p.label}<span style="font:700 12px Inter;opacity:.75">${p.count}</span></button>`; }).join("")}
    </div>
    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);overflow:hidden">
      <div style="display:grid;grid-template-columns:2.4fr 1.5fr 1fr 1.3fr 1fr 30px;gap:12px;padding:13px 22px;background:#f9fafb;border-bottom:1px solid #eef0f3;font:700 12px 'Noto Sans Thai';color:#667085">
        <div>ผู้เรียน</div><div>ความคืบหน้า</div><div>คะแนน Quiz</div><div>อัปเดตล่าสุด</div><div>สถานะ</div><div></div>
      </div>
      ${list.length ? list.map((st) => `
        <div data-act="openStudent" data-arg="${esc(st.id)}" class="h-row" style="display:grid;grid-template-columns:2.4fr 1.5fr 1fr 1.3fr 1fr 30px;gap:12px;align-items:center;padding:14px 22px;border-bottom:1px solid #f4f5f7;cursor:pointer">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <div style="width:38px;height:38px;border-radius:50%;background:#f0fdfa;color:#0f766e;display:flex;align-items:center;justify-content:center;font:700 14px 'Noto Sans Thai';flex:none;border:1px solid #d6f5ee">${esc(st.initials)}</div>
            <div style="min-width:0"><div style="font:600 14px 'Noto Sans Thai';color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(st.name)}</div><div style="font:500 11.5px Inter;color:#98a2b3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(st.email)} · ${esc(st.room)}</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:10px"><div style="flex:1;height:10px;background:#f2f4f7;border-radius:99px;overflow:hidden"><div style="height:100%;border-radius:99px;background:${st.progColor};width:${st.progW}"></div></div><span style="font:700 13px Inter;color:#475467;width:38px;text-align:right">${st.progW}</span></div>
          <div><div style="font:700 14px Inter;color:#101828">${esc(st.quizText)}</div><div style="font:600 11px Inter;color:#98a2b3">${esc(st.quizPct)}</div></div>
          <div style="font:500 12.5px 'Noto Sans Thai';color:#667085">${esc(st.updated)}</div>
          <div><span style="font:600 11px 'Noto Sans Thai';border-radius:999px;padding:5px 11px;white-space:nowrap;color:${st.status.color};background:${st.status.bg}">${esc(st.status.label)}</span></div>
          <div style="color:#cdd3db;font:700 16px Inter;text-align:center">›</div>
        </div>`).join("") : `<div style="padding:30px;text-align:center;font:600 14px 'Noto Sans Thai';color:#98a2b3">ไม่พบผู้เรียนตามเงื่อนไข</div>`}
    </div>
  </div>`;
}

/* ---------------- tools ---------------- */
function viewTools() {
  const t = state.tools;
  const records = state.metrics.records, total = state.students.length, avgRate = state.metrics.avgRate;
  const card = (color, glyph, name, big, unit, sub) => `
    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(16,24,40,.04)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="width:32px;height:32px;border-radius:9px;background:${color};display:inline-flex;align-items:center;justify-content:center;color:#fff;font:800 12px Inter">${glyph}</span><span style="font:700 13.5px 'Noto Sans Thai';color:#101828">${name}</span></div>
      <div style="font:800 28px Inter;color:#101828">${big} <span style="font:600 12px 'Noto Sans Thai';color:#98a2b3">${unit}</span></div>
      <div style="font:500 12px 'Noto Sans Thai';color:#98a2b3;margin-top:2px">${sub}</div>
    </div>`;
  return `
  <div>
    <div style="margin-bottom:18px"><div style="font:800 19px 'Noto Sans Thai';color:#101828">ภาพรวมการใช้งานเครื่องมือต่าง ๆ</div><div style="font:500 13px 'Noto Sans Thai';color:#98a2b3;margin-top:2px">รายการเครื่องมือที่พบในแต่ละกิจกรรมของรายวิชา</div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
      ${card("#7b83eb", "▶", "Video", t.video, "บทเรียน", "กิจกรรมที่มีวิดีโอประกอบ")}
      ${card("#5ab877", "▤", "BookRoll", t.bookroll, "บทเรียน", "กิจกรรมที่มีเอกสารอ่าน")}
      ${card("#f59e0b", "✓", "Quiz", records, "ครั้งทำ", `คะแนนเฉลี่ย ${avgRate == null ? "-" : avgRate.toFixed(1) + "%"}`)}
      ${card("#12a89b", "◔", "Profile", total, "ลงทะเบียน", "ผู้เรียนในห้องเรียน")}
    </div>
    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);overflow:hidden">
      <div style="display:grid;grid-template-columns:2.6fr 1.8fr 1.4fr 1fr;gap:14px;padding:13px 22px;background:#f9fafb;border-bottom:1px solid #eef0f3;font:700 12px 'Noto Sans Thai';color:#667085">
        <div>กิจกรรม / บทเรียน</div><div>เครื่องมือ</div><div>ผู้เรียนที่ทำแล้ว</div><div style="text-align:right">ลำดับ</div>
      </div>
      ${state.activities.map((a) => {
        const reachCell = a.reach == null
          ? `<span style="font:500 12px 'Noto Sans Thai';color:#b2b8c2">ไม่มีข้อมูลการเข้าถึง</span>`
          : `<div style="flex:1;height:10px;background:#f2f4f7;border-radius:99px;overflow:hidden"><div style="height:100%;border-radius:99px;background:linear-gradient(90deg,#14b8a6,#0d9488);width:${total ? Math.round((a.reach / total) * 100) : 0}%"></div></div><span style="font:600 12px 'Noto Sans Thai';color:#667085;width:64px;white-space:nowrap;text-align:right">${a.reach}/${total}</span>`;
        return `
        <div style="display:grid;grid-template-columns:2.6fr 1.8fr 1.4fr 1fr;gap:14px;align-items:center;padding:16px 22px;border-bottom:1px solid #f4f5f7">
          <div><div style="font:600 14.5px 'Noto Sans Thai';color:#101828">${esc(a.name)}</div><div style="font:600 11.5px Inter;color:#b2b8c2;margin-top:1px">${esc(a.code)}</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${a.tools.map((tt) => `<span style="font:600 11.5px 'Noto Sans Thai';border-radius:7px;padding:4px 10px;${toolStyle(tt.label)}">${esc(tt.label)}</span>`).join("")}</div>
          <div style="display:flex;align-items:center;gap:10px">${reachCell}</div>
          <div style="font:700 13px Inter;color:#475467;text-align:right">${esc(a.code)}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

/* ---------------- compare map ---------------- */
function viewMap() {
  const schools = DEMO.schoolsGeo;
  const sorted = [...schools].sort((a, b) => b.progress - a.progress);
  const you = schools.find((x) => x.you) || schools[0];
  const avgP = Math.round(schools.reduce((a, b) => a + b.progress, 0) / schools.length);
  const diff = you.progress - avgP;
  const rankOf = sorted.findIndex((x) => x.you) + 1;
  const diffColor = diff >= 0 ? "#16a34a" : "#dc2626", diffBg = diff >= 0 ? "#dcfce7" : "#fee2e2";
  const card = (accent, inner) => `<div style="background:#fff;border:1px solid #ececf1;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(16,24,40,.04);position:relative;overflow:hidden"><div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${accent}"></div>${inner}</div>`;
  return `
  <div>
    <div style="margin-bottom:16px"><div style="font:800 19px 'Noto Sans Thai';color:#101828">แผนที่เปรียบเทียบโรงเรียน</div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px">
      ${card("#ef4444", `<div style="font:600 13px 'Noto Sans Thai';color:#667085">อันดับของโรงเรียนคุณ</div><div style="font:800 32px Inter;color:#101828;margin-top:8px">${rankOf} <span style="font:600 14px 'Noto Sans Thai';color:#98a2b3">/ ${schools.length} โรงเรียน</span></div>`)}
      ${card("#12a594", `<div style="display:flex;align-items:center;justify-content:space-between"><span style="font:600 13px 'Noto Sans Thai';color:#667085">ความคืบหน้าของคุณ</span><span style="font:700 11px Inter;border-radius:6px;padding:3px 7px;color:${diffColor};background:${diffBg}">${diff >= 0 ? "+" : ""}${diff}% vs เฉลี่ย</span></div><div style="font:800 32px Inter;color:#101828;margin-top:8px">${you.progress}<span style="font:700 18px Inter;color:#667085">%</span> <span style="font:600 13px 'Noto Sans Thai';color:#98a2b3">· เฉลี่ย ${avgP}%</span></div>`)}
      ${card("#6366f1", `<div style="font:600 13px 'Noto Sans Thai';color:#667085">โรงเรียนในเครือข่าย</div><div style="font:800 32px Inter;color:#101828;margin-top:8px">${schools.length} <span style="font:600 13px 'Noto Sans Thai';color:#98a2b3">แห่ง</span></div>`)}
    </div>
    <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:16px">
      <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);overflow:hidden;height:600px;position:relative;isolation:isolate">
        <div id="compare-map" style="position:absolute;inset:0"></div>
        <div style="position:absolute;top:16px;left:16px;z-index:600;background:rgba(255,255,255,.94);backdrop-filter:blur(4px);border-radius:11px;box-shadow:0 6px 18px rgba(16,24,40,.14);padding:11px 14px;display:flex;flex-direction:column;gap:7px">
          <div style="display:flex;align-items:center;gap:8px;font:600 11.5px 'Noto Sans Thai';color:#475467"><span style="width:12px;height:12px;border-radius:50%;background:#ef4444"></span>โรงเรียนของคุณ</div>
          <div style="display:flex;align-items:center;gap:8px;font:600 11.5px 'Noto Sans Thai';color:#475467"><span style="width:12px;height:12px;border-radius:50%;background:#14b8a6"></span>ความคืบหน้า ≥ 80%</div>
          <div style="display:flex;align-items:center;gap:8px;font:600 11.5px 'Noto Sans Thai';color:#475467"><span style="width:12px;height:12px;border-radius:50%;background:#f59e0b"></span>60–79%</div>
          <div style="display:flex;align-items:center;gap:8px;font:600 11.5px 'Noto Sans Thai';color:#475467"><span style="width:12px;height:12px;border-radius:50%;background:#fb923c"></span>ต่ำกว่า 60%</div>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);padding:18px 20px;display:flex;flex-direction:column;height:600px">
        <div style="font:700 15px 'Noto Sans Thai';color:#101828;margin-bottom:14px">จัดอันดับความคืบหน้า</div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin:0 -4px;padding:0 4px">
          ${sorted.map((x, i) => {
            const barColor = x.progress >= 80 ? "#14b8a6" : x.progress >= 60 ? "#f59e0b" : "#fb923c";
            const rowStyle = x.you ? "background:#f0fdfa;border:1px solid #cbeee6" : "background:#fff;border:1px solid #f2f4f7";
            const rankStyle = x.you ? "background:#0d9488;color:#fff" : "background:#f2f4f7;color:#667085";
            const nameColor = x.you ? "#0f766e" : "#101828";
            return `<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;${rowStyle}">
              <span style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:800 12px Inter;flex:none;${rankStyle}">${i + 1}</span>
              <div style="flex:1;min-width:0"><div style="font:600 13px 'Noto Sans Thai';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${nameColor}">${esc(x.name)}</div><div style="font:500 10.5px 'Noto Sans Thai';color:#98a2b3">${esc(x.prov)} · ${x.students} คน</div></div>
              <div style="width:64px;height:7px;background:#eef0f3;border-radius:99px;overflow:hidden;flex:none"><div style="height:100%;border-radius:99px;background:${barColor};width:${x.progress}%"></div></div>
              <span style="font:700 12.5px Inter;color:#475467;width:38px;text-align:right">${x.progress}%</span>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- student drawer ---------------- */
function viewDrawer() {
  const st = state.students.find((x) => String(x.id) === String(state.student));
  if (!st) return "";
  const nCh = Math.max(state.activities.length, 1);
  const done = Math.round((st.progress / 100) * nCh);
  const chapters = state.activities.map((c, i) => {
    let lbl, col, bg, dot;
    if (i < done) { lbl = "เรียนจบ"; col = "#0f766e"; bg = "#d1fae5"; dot = "#22c55e"; }
    else if (i === done && st.progress > 0) { lbl = "กำลังเรียน"; col = "#c2410c"; bg = "#ffedd5"; dot = "#f97316"; }
    else { lbl = "ยังไม่เริ่ม"; col = "#98a2b3"; bg = "#f2f4f7"; dot = "#d0d5dd"; }
    return { name: c.name, code: c.code, tools: c.tools, lbl, col, bg, dot };
  });
  const rd = Math.floor((st.progress / 100) * 5), rdDoing = st.progress > 0 && rd < 5 ? 1 : 0, rdLeft = 5 - rd - rdDoing;
  const vd = rd, vdDoing = rdDoing, vdLeft = rdLeft;
  const ring = `conic-gradient(#0d9488 ${st.progress * 3.6}deg,#eaecf0 ${st.progress * 3.6}deg)`;
  const timeSpent = Math.round(15 + st.progress * 0.55);
  const readRow = (color, label, val) => `<div style="display:flex;align-items:center;gap:8px;font:600 12px 'Noto Sans Thai';color:#475467"><span style="width:9px;height:9px;border-radius:50%;background:${color}"></span>${label}<span style="margin-left:auto;font:700 13px Inter;color:#101828">${val}</span></div>`;
  return `
  <div style="position:fixed;inset:0;z-index:100;display:flex;justify-content:flex-end">
    <div data-act="closeStudent" style="position:absolute;inset:0;background:rgba(16,24,40,.45)"></div>
    <div class="scrolly" style="position:relative;width:560px;max-width:94vw;height:100%;background:#f7f8fa;box-shadow:-14px 0 40px rgba(16,24,40,.18)">
      <div style="background:linear-gradient(125deg,#0f766e,#12a594);color:#fff;padding:22px 26px 24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px"><span style="font:600 12px 'Noto Sans Thai';color:#c7f0e8">รายละเอียดผู้เรียน</span><button data-act="closeStudent" style="border:none;background:rgba(255,255,255,.16);color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font:700 15px Inter">✕</button></div>
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font:800 22px 'Noto Sans Thai';flex:none">${esc(st.initials)}</div>
          <div style="min-width:0">
            <div style="font:800 20px 'Noto Sans Thai';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(st.name)}</div>
            <div style="font:500 12.5px Inter;color:#d0f2ec">${esc(st.email)}</div>
            <div style="display:flex;gap:8px;margin-top:8px"><span style="font:600 11px 'Noto Sans Thai';background:rgba(255,255,255,.18);border-radius:6px;padding:3px 9px">${esc(st.room)}</span><span style="font:600 11px 'Noto Sans Thai';border-radius:6px;padding:3px 9px;color:${st.status.color};background:${st.status.bg}">${esc(st.status.label)}</span></div>
          </div>
        </div>
      </div>
      <div style="padding:20px 22px 40px">
        <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:12px;align-items:center;background:#fff;border:1px solid #ececf1;border-radius:14px;padding:16px 18px;margin-bottom:16px">
          <div style="position:relative;width:78px;height:78px"><div style="width:78px;height:78px;border-radius:50%;background:${ring}"></div><div style="position:absolute;inset:11px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font:800 18px Inter;color:#0f766e">${st.progW}</div></div></div>
          <div style="text-align:center;border-right:1px solid #eef0f3"><div style="font:800 22px Inter;color:#101828">${esc(st.quizText)}</div><div style="font:600 11.5px 'Noto Sans Thai';color:#98a2b3">คะแนน Quiz</div></div>
          <div style="text-align:center"><div style="font:800 22px Inter;color:#101828">${timeSpent} <span style="font:600 12px 'Noto Sans Thai';color:#98a2b3">นาที</span></div><div style="font:600 11.5px 'Noto Sans Thai';color:#98a2b3">เวลาที่ใช้เรียน</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:#fff;border:1px solid #ececf1;border-radius:14px;padding:15px 17px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="width:24px;height:24px;border-radius:7px;background:#5ab877;color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 11px Inter">▤</span><span style="font:700 13px 'Noto Sans Thai';color:#101828">ความคืบหน้าการอ่าน</span></div>
            <div style="display:flex;flex-direction:column;gap:7px">${readRow("#22c55e", "อ่านจบ", rd)}${readRow("#f97316", "กำลังอ่าน", rdDoing)}${readRow("#d0d5dd", "ยังไม่ได้อ่าน", rdLeft)}</div>
          </div>
          <div style="background:#fff;border:1px solid #ececf1;border-radius:14px;padding:15px 17px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="width:24px;height:24px;border-radius:7px;background:#7b83eb;color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 10px Inter">▶</span><span style="font:700 13px 'Noto Sans Thai';color:#101828">ความคืบหน้าวิดีโอ</span></div>
            <div style="display:flex;flex-direction:column;gap:7px">${readRow("#22c55e", "ดูจบ", vd)}${readRow("#f97316", "กำลังดู", vdDoing)}${readRow("#d0d5dd", "ยังไม่ได้ดู", vdLeft)}</div>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #ececf1;border-radius:14px;padding:16px 18px">
          <div style="font:700 14px 'Noto Sans Thai';color:#101828;margin-bottom:4px">หัวข้อการเรียนรู้รายบท</div>
          <div style="font:500 11.5px 'Noto Sans Thai';color:#98a2b3;margin-bottom:12px">สถานะการเรียนและเครื่องมือที่ใช้ในแต่ละบท</div>
          ${chapters.map((c) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid #f2f4f7"><span style="width:10px;height:10px;border-radius:50%;flex:none;background:${c.dot}"></span><div style="flex:1;min-width:0"><div style="font:600 13px 'Noto Sans Thai';color:#101828">${esc(c.name)}</div><div style="font:600 10.5px Inter;color:#b2b8c2">${esc(c.code)}</div></div><div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">${c.tools.map((t) => `<span style="font:600 10.5px 'Noto Sans Thai';border-radius:6px;padding:3px 8px;${toolStyle(t.label)}">${esc(t.label)}</span>`).join("")}</div><span style="font:600 10.5px 'Noto Sans Thai';border-radius:999px;padding:3px 10px;white-space:nowrap;color:${c.col};background:${c.bg}">${c.lbl}</span></div>`).join("")}
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="h-teal" style="flex:1;border:none;background:#0d9488;color:#fff;border-radius:11px;padding:13px;font:700 14px 'Noto Sans Thai';cursor:pointer">เปิดหน้ารายละเอียดเต็ม</button>
          <button class="h-light" style="border:1px solid #e4e7ec;background:#fff;color:#475467;border-radius:11px;padding:13px 18px;font:700 14px 'Noto Sans Thai';cursor:pointer">ส่งข้อความ</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- edit modal ---------------- */
function viewEditModal() {
  const initials = (state.teacherName || "").replace(/\s/g, "").slice(0, 2);
  return `
  <div style="position:fixed;inset:0;z-index:101;display:flex;align-items:center;justify-content:center;padding:24px">
    <div data-act="closeEdit" style="position:absolute;inset:0;background:rgba(16,24,40,.5)"></div>
    <form data-sub="saveEdit" style="position:relative;width:100%;max-width:420px;background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(16,24,40,.28);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #f2f4f7;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="flex:1"><div style="font:800 17px 'Noto Sans Thai';color:#101828">แก้ไขข้อมูลผู้ใช้</div><div style="font:500 12px 'Noto Sans Thai';color:#98a2b3;margin-top:2px">อัปเดตชื่อและตำแหน่งที่แสดงในระบบ</div></div>
        <button type="button" data-act="closeEdit" style="border:none;background:#f2f4f7;color:#667085;width:30px;height:30px;border-radius:8px;cursor:pointer;font:700 14px Inter;flex:none">✕</button>
      </div>
      <div style="padding:22px 24px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px"><div style="width:56px;height:56px;border-radius:50%;background:#f0fdfa;color:#0f766e;display:flex;align-items:center;justify-content:center;font:800 20px 'Noto Sans Thai';border:1px solid #d6f5ee">${esc(initials)}</div><button type="button" class="h-teal2" style="border:1px solid #e4e7ec;background:#fff;color:#0f766e;border-radius:9px;padding:8px 14px;font:600 12.5px 'Noto Sans Thai';cursor:pointer">เปลี่ยนรูปโปรไฟล์</button></div>
        <label style="display:block;font:600 13px 'Noto Sans Thai';color:#344054;margin-bottom:7px">ชื่อที่แสดง</label>
        <input id="editName" data-inp="setTeacherName" value="${esc(state.teacherName)}" class="fld" style="width:100%;border:1px solid #e4e7ec;border-radius:11px;padding:12px 14px;font:500 14px 'Noto Sans Thai';outline:none;margin-bottom:16px">
        <label style="display:block;font:600 13px 'Noto Sans Thai';color:#344054;margin-bottom:7px">อีเมล</label>
        <input value="${esc(state.teacherEmail || "")}" readonly style="width:100%;border:1px solid #eceef1;border-radius:11px;padding:12px 14px;font:500 14px 'Noto Sans Thai';outline:none;background:#f7f8fa;color:#98a2b3">
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f2f4f7;display:flex;gap:10px;justify-content:flex-end"><button type="button" data-act="closeEdit" class="h-light" style="border:1px solid #e4e7ec;background:#fff;color:#475467;border-radius:999px;padding:11px 18px;font:700 13.5px 'Noto Sans Thai';cursor:pointer">ยกเลิก</button><button type="submit" class="h-teal" style="border:none;background:#0d9488;color:#fff;border-radius:999px;padding:11px 22px;font:700 13.5px 'Noto Sans Thai';cursor:pointer">บันทึก</button></div>
    </form>
  </div>`;
}

/* ---------- draggable / collapsible debug panel (lives outside #app) ---------- */
let dbgEl = null, dbgBody = null;
const dbgUi = (() => { try { return JSON.parse(localStorage.getItem("td_debug_ui")) || {}; } catch (_) { return {}; } })();
const saveDbgUi = () => { try { localStorage.setItem("td_debug_ui", JSON.stringify(dbgUi)); } catch (_) {} };

function debugBodyHtml() {
  const auth = readAuth();
  const sub = authSub(auth);
  const short = (s) => (s ? String(s).replace(teacherConfig.baseUrl, "").replace(teacherConfig.sbsUrl, "") : "");
  const calls = API_LOG.map((e) => `<div style="padding:6px 0;border-top:1px solid #223">
      <div style="display:flex;gap:6px;align-items:center"><span style="color:${e.ok ? "#22c55e" : "#f87171"};font-weight:700">${e.ok ? "✓" : "✗"}${e.status ? " " + e.status : ""}</span><span style="color:#93c5fd;word-break:break-all;flex:1">${esc(short(e.url))}</span>${e.count != null ? `<span style="color:#fbbf24">${e.count} rows</span>` : ""}</div>
      ${e.error ? `<div style="color:#fca5a5;margin-top:2px">${esc(e.error)}</div>` : ""}
      ${e.sample ? `<pre style="margin:4px 0 0;white-space:pre-wrap;color:#cbd5e1;max-height:160px;overflow:auto;background:#0b1220;padding:6px;border-radius:6px">${esc(JSON.stringify(e.sample, null, 1).slice(0, 4000))}</pre>` : ""}
    </div>`).join("");
  return `
    <div>authed: <b style="color:${state.authed ? "#22c55e" : "#f87171"}">${state.authed}</b> · mode: ${esc(state.mode)} · sub: <span style="color:#93c5fd">${esc(sub || "—")}</span></div>
    <div>profile: <span style="color:#a7f3d0">${esc(state.teacherName || "—")}</span> · ${esc(state.teacherEmail || "—")}</div>
    <div>token exp: ${auth?.token?.access_token ? esc(new Date((decodeJwt(auth.token.access_token)?.exp || 0) * 1000).toLocaleString("th-TH")) : "—"} · instituteId: ${esc(state.instituteId || "—")}</div>
    <div>classrooms mapped: <b style="color:#fbbf24">${state.classrooms.length}</b></div>
    <div style="margin-top:6px;font:700 11px 'Noto Sans Thai'">API calls (${API_LOG.length})</div>
    ${calls || '<div style="color:#64748b">— ยังไม่มีการเรียก API —</div>'}`;
}

function ensureDebugPanel() {
  if (!DEBUG || dbgEl) return;
  const el = document.createElement("div");
  el.id = "td-debug";
  const w = window.innerWidth || 1200, h = window.innerHeight || 800;
  const left = dbgUi.left != null ? dbgUi.left : Math.max(8, w - 440);
  const top = dbgUi.top != null ? dbgUi.top : Math.max(8, h - 380);
  el.style.cssText = `position:fixed;left:${left}px;top:${top}px;z-index:2147483000;width:420px;max-width:92vw;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:12px;box-shadow:0 18px 44px rgba(0,0,0,.45);font:500 11.5px ui-monospace,Menlo,monospace;overflow:hidden`;
  el.innerHTML = `
    <div id="td-debug-head" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:#111c31;cursor:move;user-select:none;border-bottom:1px solid #223;touch-action:none">
      <b style="font:700 12px 'Noto Sans Thai';flex:1">🐞 Debug</b>
      <button id="td-debug-min" title="ย่อ/ขยาย" style="border:none;background:#233047;color:#e2e8f0;width:26px;height:22px;border-radius:6px;cursor:pointer;font:700 14px Menlo;line-height:1">–</button>
    </div>
    <div id="td-debug-body" style="padding:10px 12px;max-height:60vh;overflow:auto"></div>`;
  document.body.appendChild(el);
  dbgEl = el;
  dbgBody = el.querySelector("#td-debug-body");
  const minBtn = el.querySelector("#td-debug-min");
  const applyCollapsed = () => { dbgBody.style.display = dbgUi.collapsed ? "none" : "block"; minBtn.textContent = dbgUi.collapsed ? "+" : "–"; };
  minBtn.addEventListener("click", (e) => { e.stopPropagation(); dbgUi.collapsed = !dbgUi.collapsed; applyCollapsed(); saveDbgUi(); });
  applyCollapsed();

  // drag via pointer events
  const head = el.querySelector("#td-debug-head");
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  head.addEventListener("pointerdown", (e) => {
    if (e.target === minBtn) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
    try { head.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  head.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const vw = window.innerWidth, vh = window.innerHeight, bw = el.offsetWidth, bh = el.offsetHeight;
    const nl = Math.max(0, Math.min(vw - Math.min(bw, 80), ox + (e.clientX - sx)));
    const nt = Math.max(0, Math.min(vh - 24, oy + (e.clientY - sy)));
    el.style.left = nl + "px"; el.style.top = nt + "px";
  });
  const endDrag = () => { if (!dragging) return; dragging = false; const r = el.getBoundingClientRect(); dbgUi.left = Math.round(r.left); dbgUi.top = Math.round(r.top); saveDbgUi(); };
  head.addEventListener("pointerup", endDrag);
  head.addEventListener("pointercancel", endDrag);
}

function updateDebugPanel() {
  if (!DEBUG) return;
  ensureDebugPanel();
  if (dbgBody) dbgBody.innerHTML = debugBodyHtml();
}

function viewLoadingOverlay() {
  return `<div style="position:fixed;inset:0;z-index:1300;background:rgba(238,240,243,.72);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center">
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;background:#fff;border:1px solid #ececf1;border-radius:16px;padding:26px 34px;box-shadow:0 18px 44px rgba(16,24,40,.18)">
      <div style="width:38px;height:38px;border:3px solid #d6f5ee;border-top-color:#0d9488;border-radius:50%;animation:tdspin .8s linear infinite"></div>
      <div style="font:600 13.5px 'Noto Sans Thai';color:#475467">กำลังโหลดข้อมูลห้องเรียน...</div>
    </div>
  </div>`;
}
function viewErrorToast() {
  return `<div style="position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:1400;display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #fecaca;border-left:4px solid #ef4444;border-radius:12px;padding:12px 16px;box-shadow:0 14px 34px rgba(16,24,40,.18);max-width:520px">
    <span style="font-size:17px">⚠️</span>
    <span style="font:600 13px/1.5 'Noto Sans Thai';color:#b42318;flex:1">${esc(state.authError)}</span>
    <button data-act="closeError" style="border:none;background:#fef2f2;color:#b42318;width:26px;height:26px;border-radius:7px;cursor:pointer;font:700 13px Inter;flex:none">✕</button>
  </div>`;
}

/* ============================== ROOT RENDER ============================== */
function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const zoom = state.fontSize === "sm" ? 0.9 : state.fontSize === "lg" ? 1.15 : 1;

  if (!state.ready) {
    app.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:#0f766e;color:#fff">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font:800 26px Inter">TD</div>
      <div style="font:700 15px 'Noto Sans Thai'">${state.error ? esc(state.error) : "กำลังโหลดข้อมูล..."}</div>
    </div>`;
    if (DEBUG) updateDebugPanel();
    return;
  }

  const overlays =
    (state.userMenuOpen ? `<div data-act="closeUserMenu" style="position:fixed;inset:0;z-index:95"></div>` : "") +
    (state.notifOpen ? `<div data-act="closeNotif" style="position:fixed;inset:0;z-index:95"></div>` : "") +
    (state.leadoOpen ? `<div data-act="closeLeado" style="position:fixed;inset:0;z-index:94"></div>` : "");

  app.innerHTML = `
    <div style="height:calc(100dvh / ${zoom});width:calc(100% / ${zoom});display:flex;flex-direction:column;padding-top:60px;overflow:hidden;zoom:${zoom}">
      ${!state.course ? viewLanding() : ""}
      ${overlays}
      ${viewTopBar()}
      ${state.course ? viewDashboard() : ""}
      ${state.editOpen ? viewEditModal() : ""}
      ${state.student != null ? viewDrawer() : ""}
      ${state.authError ? viewErrorToast() : ""}
      ${state.loadingCourse ? viewLoadingOverlay() : ""}
    </div>`;

  if (DEBUG) updateDebugPanel();
  requestAnimationFrame(mountMaps);
}

/* focus retention across full re-render */
function setState(patch) {
  const active = document.activeElement;
  let focus = null;
  if (active && active.id && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    focus = { id: active.id, start: active.selectionStart, end: active.selectionEnd };
  }
  Object.assign(state, patch);
  render();
  if (focus) {
    const el = document.getElementById(focus.id);
    if (el) { el.focus(); try { el.setSelectionRange(focus.start, focus.end); } catch (_) {} }
  }
}

/* ------------------------------ maps ------------------------------ */
function mountMaps() {
  // clear stale instances whose container is gone
  ["usage", "compare"].forEach((k) => {
    const m = maps[k];
    if (m && !document.body.contains(m.getContainer())) { m.remove(); maps[k] = null; }
  });
  if (!window.L) return;

  const usageEl = document.getElementById("th-usage-map");
  if (usageEl && !maps.usage) {
    const v = DEMO.insightSlides[state.mapSlide].view;
    const map = L.map(usageEl, { zoomControl: false, scrollWheelZoom: false, attributionControl: false }).setView([v.lat, v.lng], v.zoom);
    maps.usage = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 12, minZoom: 4 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    DEMO.mapPoints.forEach((p) => {
      let html;
      if (p.pin) html = `<div style="position:relative;transform:translate(-50%,-100%)"><div style="width:34px;height:34px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font:800 13px Inter;color:#fff">${p.n}</div><div style="position:absolute;left:50%;top:30px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #ef4444"></div></div>`;
      else { const fs = p.big ? 16 : 13, halo = p.big ? 12 : 8; html = `<div style="width:${p.size}px;height:${p.size}px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(251,146,60,.98),rgba(249,115,22,.62));display:flex;align-items:center;justify-content:center;font:700 ${fs}px Inter;color:#7c2d12;box-shadow:0 0 0 ${halo}px rgba(249,146,60,.2)">${p.n}</div>`; }
      L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 0] }), interactive: false }).addTo(map);
    });
    setTimeout(() => maps.usage && maps.usage.invalidateSize(), 250);
    startSlideTimer();
  }
  if (!usageEl) stopSlideTimer();

  const cmpEl = document.getElementById("compare-map");
  if (cmpEl && !maps.compare) {
    const map = L.map(cmpEl, { zoomControl: false, scrollWheelZoom: false, attributionControl: false }).setView([15.0, 103.1], 8);
    maps.compare = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 14, minZoom: 5 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    DEMO.schoolsGeo.forEach((sc) => {
      let html;
      if (sc.you) html = `<div style="position:relative;transform:translate(-50%,-100%)"><div style="width:40px;height:40px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font:800 13px Inter;color:#fff">${sc.progress}</div><div style="position:absolute;left:50%;top:36px;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #ef4444"></div></div>`;
      else { const col = sc.progress >= 80 ? "#14b8a6" : sc.progress >= 60 ? "#f59e0b" : "#fb923c"; const size = Math.round(30 + Math.min(sc.students, 150) / 6); html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${col};opacity:.92;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 12px Inter;color:#fff;box-shadow:0 2px 7px rgba(0,0,0,.28);transform:translate(-50%,-50%)">${sc.progress}</div>`; }
      L.marker([sc.lat, sc.lng], { icon: L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 0] }) }).addTo(map).bindTooltip(`${sc.name} · ${sc.progress}%`, { direction: "top", offset: [0, -16] });
    });
    setTimeout(() => maps.compare && maps.compare.invalidateSize(), 250);
  }
}

function startSlideTimer() {
  stopSlideTimer();
  slideTimer = setInterval(() => {
    state.mapSlide = (state.mapSlide + 1) % DEMO.insightSlides.length;
    applySlide();
  }, 5000);
}
function stopSlideTimer() { if (slideTimer) { clearInterval(slideTimer); slideTimer = null; } }
function applySlide() {
  document.querySelectorAll("#slide-stage .slide").forEach((el) => {
    const i = Number(el.dataset.i), on = i === state.mapSlide;
    el.style.opacity = on ? 1 : 0;
    el.style.transform = on ? "translateY(0)" : "translateY(8px)";
  });
  document.querySelectorAll(".slide-dot").forEach((el) => { el.style.background = Number(el.dataset.i) === state.mapSlide ? "#0d9488" : "#e2e5e9"; });
  if (maps.usage) { const v = DEMO.insightSlides[state.mapSlide].view; maps.usage.flyTo([v.lat, v.lng], v.zoom, { duration: 1.1 }); }
}

/* ------------------------------ CSV export ------------------------------ */
function exportCsv() {
  const rows = decoratedStudents();
  const head = ["ชื่อ", "อีเมล", "กลุ่ม", "ความคืบหน้า(%)", "คะแนน", "อัปเดตล่าสุด", "สถานะ"];
  const body = rows.map((s) => [s.name, s.email, s.room, s.progress, s.quizText.replace(/\s/g, ""), s.updated, s.status.label]);
  const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "students.csv"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------ handlers ------------------------------ */
const H = {
  goOverview: () => setState({ page: "overview" }),
  goStudents: () => setState({ page: "students" }),
  goTools: () => setState({ page: "tools" }),
  goMap: () => setState({ page: "map" }),
  pickCourse: async (id) => {
    if (state.mode !== "api") { setState({ course: id, page: "overview", student: null }); return; }
    const cls = state.classrooms.find((c) => String(c.id) === String(id));
    if (!cls) return;
    setState({ loadingCourse: true, authError: null, userMenuOpen: false });
    try {
      const [course, progress, grades] = await Promise.all([
        cls.courseId ? apiCourseTree(cls.courseId) : Promise.resolve(state.courseData || {}),
        apiProgress(cls.assignId),
        apiGrades(cls.assignId),
      ]);
      applyDataset({ course, progress, score: grades, title: cls.title, key: cls.courseId });
      setState({ course: id, page: "overview", student: null, loadingCourse: false });
    } catch (err) {
      setState({ loadingCourse: false, authError: "โหลดข้อมูลห้องเรียนไม่สำเร็จ: " + err.message });
    }
  },
  switchCourse: () => setState({ course: null, student: null, userMenuOpen: false }),
  closeError: () => setState({ authError: null }),
  openStudent: (id) => setState({ student: id }),
  closeStudent: () => setState({ student: null }),
  toggleUserMenu: () => setState({ userMenuOpen: !state.userMenuOpen, notifOpen: false }),
  closeUserMenu: () => setState({ userMenuOpen: false }),
  openEdit: () => setState({ editOpen: true, userMenuOpen: false }),
  closeEdit: () => setState({ editOpen: false }),
  saveEdit: () => setState({ editOpen: false }),
  signOut: () => { if (state.mode === "api") oidcLogout(); else setState({ authed: false, course: null, student: null, userMenuOpen: false }); },
  toggleNotif: () => setState({ notifOpen: !state.notifOpen, userMenuOpen: false }),
  closeNotif: () => setState({ notifOpen: false }),
  toggleLeado: () => setState({ leadoOpen: !state.leadoOpen }),
  closeLeado: () => setState({ leadoOpen: false }),
  signIn: () => { if (state.mode === "api") startLogin(); else setState({ authed: true }); },
  setFilter: (key) => setState({ filter: key }),
  pickLang: (code) => setState({ lang: code }),
  pickFont: (size) => setState({ fontSize: size }),
  goSlide: (i) => { state.mapSlide = Number(i); stopSlideTimer(); applySlide(); startSlideTimer(); },
  downloadCsv: () => exportCsv(),
};
const INP = {
  setSearch: (v) => setState({ search: v }),
  setLeadoMsg: (v) => { state.leadoMsg = v; },
  setTeacherName: (v) => { state.teacherName = v; },
};
const CHG = { setSort: (v) => setState({ sort: v }) };
const SUB = { saveEdit: () => setState({ editOpen: false }), signIn: () => setState({ authed: true }) };

function bindEvents() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const fn = H[t.dataset.act];
    if (fn) { e.preventDefault(); fn(t.dataset.arg); }
  });
  document.addEventListener("input", (e) => {
    const t = e.target.closest("[data-inp]");
    if (!t) return;
    const fn = INP[t.dataset.inp];
    if (fn) fn(t.value);
  });
  document.addEventListener("change", (e) => {
    const t = e.target.closest("[data-chg]");
    if (!t) return;
    const fn = CHG[t.dataset.chg];
    if (fn) fn(t.value);
  });
  document.addEventListener("submit", (e) => {
    const t = e.target.closest("[data-sub]");
    if (!t) return;
    e.preventDefault();
    const fn = SUB[t.dataset.sub];
    if (fn) fn();
  });
}

/* ------------------------------ init ------------------------------ */
function applyDataset({ course, progress, score, title, key }) {
  const prow = normalizeListPayload(progress);
  const srow = normalizeListPayload(score);
  const students = mergeStudents(prow, srow);
  const activities = collectActivities(course, srow);
  const { prog, quiz } = bucketize(students);
  const completed = students.filter((s) => s.progress >= 100).length;
  const avgProgress = avg(students.map((s) => s.progress)) ?? 0;
  const avgRate = avg(students.map((s) => s.rate).filter((r) => r != null));
  Object.assign(state, {
    students, activities, courseData: course,
    courseTitle: title || course?.courseTitle || course?.title || "-",
    courseKey: key || course?.courseKey || "-",
    prog, quiz, tools: toolSummary(activities, srow, students.length),
    metrics: { completed, avgProgress, avgRate, records: srow.length },
  });
}

async function localInit() {
  try {
    const loaded = await loadTeacherData();
    applyDataset({ course: loaded.course, progress: loaded.progress, score: loaded.score });
    state.ready = true; state.source = loaded.source;
    // optional deep-link (demo): ?course=real&tab=students (also auto-authenticates)
    const dlCourse = teacherQuery.get("course");
    const dlTab = teacherQuery.get("tab");
    if (dlCourse) { state.authed = true; state.course = dlCourse; }
    if (dlTab && ["overview", "students", "tools", "map"].includes(dlTab)) state.page = dlTab;
    render();
  } catch (err) {
    console.warn("Teacher dashboard load failed:", err);
    state.error = err?.message || "โหลดข้อมูลไม่สำเร็จ";
    render();
  }
}

function cleanAuthParams() {
  try {
    const url = new URL(globalThis.location.href);
    ["code", "state", "session_state", "iss"].forEach((k) => url.searchParams.delete(k));
    globalThis.history.replaceState({}, document.title, url.toString());
  } catch (_) {}
}

async function apiInit() {
  state.source = "api";
  // handle Keycloak redirect callback
  try {
    const params = new URLSearchParams(globalThis.location.search || "");
    if (params.get("code")) {
      const token = await exchangeCodeForToken(params.get("code"));
      storeAuth({ token, sub: decodeJwt(token.access_token)?.sub || decodeJwt(token.id_token)?.sub || null });
      cleanAuthParams();
    }
  } catch (err) { state.authError = "เข้าสู่ระบบไม่สำเร็จ: " + err.message; }

  const auth = readAuth();
  const sub = authSub(auth);
  if (!auth || !sub || authExpired(auth)) { state.ready = true; state.authed = false; render(); return; }
  state.authed = true; state.sub = sub;

  // ---- real profile: token claims -> user/{sub} -> teacher/{sub} ----
  const claims = decodeJwt(auth?.token?.id_token || auth?.token?.access_token || "") || {};
  const claimName = claims.name || `${claims.given_name || ""} ${claims.family_name || ""}`.trim();
  if (claimName) state.teacherName = claimName;
  if (claims.email || claims.preferred_username) state.teacherEmail = claims.email || claims.preferred_username;

  try {
    let user = null;
    try { user = await apiUser(sub); } catch (_) {}
    state.debugUser = user;
    if (user) {
      const un = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : (user.name || user.displayName);
      if (un) state.teacherName = un;
      if (user.email) state.teacherEmail = user.email;
    }

    let teacher = null;
    try { teacher = await apiTeacher(sub); } catch (_) {}
    state.debugTeacher = teacher;
    if (teacher) {
      if (!user) {
        const nm = teacher.firstName ? `${teacher.firstName} ${teacher.lastName || ""}`.trim() : (teacher.name || teacher.displayName);
        if (nm) state.teacherName = nm;
      }
      state.instituteId = teacher.instituteId || teacher.institute_id || teacherConfig.instituteId || "";
    } else {
      state.instituteId = teacherConfig.instituteId || "";
    }
    const classroomsResp = await apiClassrooms(sub, state.instituteId);
    state.debugClassroomsRaw = classroomsResp;
    const raw = normalizeListPayload(classroomsResp);
    state.classrooms = flattenClassrooms(raw);
    state.ready = true;
    render();
    // optional direct deep-link ?assignid=... opens a classroom immediately
    if (teacherConfig.assignId) {
      const match = state.classrooms.find((c) => String(c.assignId) === String(teacherConfig.assignId));
      if (match) H.pickCourse(match.id);
    }
  } catch (err) {
    state.ready = true;
    state.authError = "โหลดรายชื่อห้องเรียนไม่สำเร็จ: " + err.message;
    render();
  }
}

async function init() {
  bindEvents();
  state.mode = teacherConfig.source === "api" ? "api" : "local";
  render();
  if (state.mode === "api") return apiInit();
  return localInit();
}
init();
