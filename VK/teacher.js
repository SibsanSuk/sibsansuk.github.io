/* =====================================================================
 * Teacher Dashboard — "Teacher Dashboard Design" applied to live data.
 * Self-contained vanilla port of the design prototype.
 * Real course/progress/score JSON is wired into the dashboard tabs;
 * landing map has a design-data fallback for load failures.
 * ===================================================================== */

/* ------------------------------ config + loaders ------------------------------ */
const teacherQuery = new URLSearchParams(globalThis.location?.search || "");
const readTeacherDashboardConfig = () => {
  const runtime = globalThis.TEACHER_DASHBOARD_CONFIG || {};
  return {
    oidc: runtime.oidc || {},
    instituteId: teacherQuery.get("instituteid") || teacherQuery.get("instituteId") || runtime.instituteId || "",
    // live MECA API (see API_ENDPOINT_LINKS.md)
    baseUrl: runtime.baseUrl || "https://adaptive-profile-bn-dev.ae.app.meca.in.th",
    sbsUrl: runtime.sbsUrl || "https://sbs-backend.mooc.meca.in.th",
    clientId: runtime.clientId || "dashboard",
    assignId: teacherQuery.get("assignid") || teacherQuery.get("assignId") || runtime.assignId || "",
  };
};
const teacherConfig = readTeacherDashboardConfig();

/* =====================================================================
 * Live MECA integration — Keycloak (OIDC/PKCE) login + assign-based data.
 * Mirrors the flow in index.html. BASEURL calls require a Bearer token;
 * SBS /lms is public.
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
const SESSION_EXPIRED_MESSAGE = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
const DEBUG = teacherQuery.get("debug") === "1";
const API_LOG = [];
const apiGet = async (url, { auth = true } = {}) => {
  const entry = { url, auth, at: new Date().toLocaleTimeString("th-TH") };
  API_LOG.push(entry);
  try {
    const res = await fetch(url, { headers: auth ? authHeader() : {} });
    entry.status = res.status;
    if (auth && res.status === 401) {
      entry.ok = false; entry.error = SESSION_EXPIRED_MESSAGE;
      expireSession();
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    if (!res.ok) { entry.ok = false; entry.error = `${res.status} ${res.statusText}`; throw new Error(entry.error); }
    const json = await res.json();
    entry.ok = true;
    entry.count = Array.isArray(json) ? json.length : (Array.isArray(json?.data) ? json.data.length : undefined);
    if (DEBUG) entry.sample = json;
    return json;
  } catch (e) { entry.ok = false; entry.error = entry.error || e.message; throw e; }
};
const apiUser = (sub) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/user/${encodeURIComponent(sub)}`);
const apiUserByEmail = (email) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/user/query?email=${encodeURIComponent(email)}`);
const apiTeacher = (sub) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/teacher/${encodeURIComponent(sub)}`);
const apiUserInfo = () => apiGet(OIDC.userinfoEndpoint);
const apiClassrooms = (sub, instituteId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/course/teacher/${encodeURIComponent(sub)}${instituteId ? `?instituteId=${encodeURIComponent(instituteId)}` : ""}`);
const apiAssign = (assignId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}`);
const apiProgress = (assignId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/progress`);
const apiGrades = (assignId) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/grades`);
const apiCourseTree = (courseId) => apiGet(`${teacherConfig.sbsUrl}/lms/${encodeURIComponent(courseId)}`, { auth: false });
const bookrollReadingUrl = (userId, usageId) => `https://bookroll.thaidlt.com/meca/student/readingData?userID=${encodeURIComponent(userId)}&usageId=${encodeURIComponent(usageId)}&view=student&ts=${Date.now()}`;
const videoProgressUrl = (userName, courseId) => `https://viola.thaidlt.com/meca/chart/bar/?userName=${encodeURIComponent(userName)}&usageId=${encodeURIComponent(courseId)}`;
const externalJson = async (url) => {
  const entry = { url, auth: false, at: new Date().toLocaleTimeString("th-TH") };
  API_LOG.push(entry);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    entry.status = res.status;
    if (!res.ok) { entry.ok = false; entry.error = `${res.status} ${res.statusText}`; throw new Error(entry.error); }
    const json = await res.json();
    entry.ok = true;
    if (DEBUG) entry.sample = json;
    return json;
  } catch (e) {
    const error = e?.name === "AbortError" ? new Error("request timeout") : e;
    entry.ok = false; entry.error = entry.error || error.message; throw error;
  } finally { clearTimeout(timeoutId); }
};
const apiPost = async (url, body) => {
  const entry = { url, method: "POST", at: new Date().toLocaleTimeString("th-TH") };
  API_LOG.push(entry);
  try {
    const res = await fetch(url, { method: "POST", headers: { ...authHeader(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    entry.status = res.status;
    if (res.status === 401) {
      entry.ok = false; entry.error = SESSION_EXPIRED_MESSAGE;
      expireSession();
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    if (!res.ok) { entry.ok = false; entry.error = `${res.status} ${res.statusText}`; throw new Error(entry.error); }
    const json = await res.json().catch(() => ({}));
    entry.ok = true;
    if (DEBUG) entry.sample = json;
    return json;
  } catch (e) { entry.ok = false; entry.error = entry.error || e.message; throw e; }
};
const apiDelete = async (url) => {
  const entry = { url, method: "DELETE", at: new Date().toLocaleTimeString("th-TH") };
  API_LOG.push(entry);
  try {
    const res = await fetch(url, { method: "DELETE", headers: authHeader() });
    entry.status = res.status;
    if (res.status === 401) {
      entry.ok = false; entry.error = SESSION_EXPIRED_MESSAGE;
      expireSession();
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    if (!res.ok) { entry.ok = false; entry.error = `${res.status} ${res.statusText}`; throw new Error(entry.error); }
    const json = await res.json().catch(() => ({})); // 204 / empty body is a valid success here
    entry.ok = true;
    if (DEBUG) entry.sample = json;
    return json;
  } catch (e) { entry.ok = false; entry.error = entry.error || e.message; throw e; }
};
// Catalog of courses a teacher can turn into a classroom.
// GET /course?instituteId&grade&level&classRoom&createDate — note course uses `createDate`
// (start,end), NOT the enroll aggregate's `createAt`. The backend returns nothing for an
// empty query, so callers must pass at least one param.
const apiCourseSearch = ({ grade, level, classRoom, instituteId, createDate } = {}) => {
  const qs = new URLSearchParams();
  if (grade) qs.set("grade", grade);
  if (level) qs.set("level", level);
  if (classRoom) qs.set("classRoom", classRoom);
  if (instituteId) qs.set("instituteId", instituteId);
  if (createDate) qs.set("createDate", createDate);
  const q = qs.toString();
  return apiGet(`${teacherConfig.baseUrl}/api/kidbright/course${q ? `?${q}` : ""}`);
};
const apiCreateAssign = (body) => apiPost(`${teacherConfig.baseUrl}/api/kidbright/assign`, body);
// Removes the classroom from the teacher's list (the assign record, not the course itself).
const apiDeleteAssign = (assignId) => apiDelete(`${teacherConfig.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}`);
const apiInstituteSearch = (name) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/institute?instituteName=${encodeURIComponent(name)}`);
// Public nationwide enrollment aggregate (per-institute counts + coordinates), no auth.
const ENROLL_RANGE = "2020-01-01," + new Date().toISOString().slice(0, 10);
const apiEnrollAggregate = (range = ENROLL_RANGE) => apiGet(`${teacherConfig.baseUrl}/api/kidbright/enroll/query?createAt=${range}`, { auth: false });

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const toNumber = (v, f = 0) => { const n = Number(v); return Number.isFinite(n) ? n : f; };
const avg = (values) => { const n = values.map(Number).filter(Number.isFinite); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const chartOption = (payload) => payload?.Option || payload?.option || payload?.chart || payload || {};
const chartCategoryData = (axis) => {
  const list = Array.isArray(axis) ? axis : [axis];
  return (list.find((item) => item?.type === "category") || list[0])?.data || [];
};
const chartNumber = (value) => {
  const raw = value && typeof value === "object" ? (Array.isArray(value.value) ? value.value.at(-1) : value.value) : value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};
const summarizeProgress = (values, expectedCount = 0) => {
  const progress = values.map(Number).filter(Number.isFinite).map((v) => clamp(v, 0, 100));
  const missing = Math.max(0, Number(expectedCount || 0) - progress.length);
  return {
    done: progress.filter((v) => v >= 100).length,
    doing: progress.filter((v) => v > 0 && v < 100).length,
    todo: progress.filter((v) => v <= 0).length + missing,
    count: progress.length,
  };
};
const normalizeProgressTitle = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
const progressTitleCore = (value) => normalizeProgressTitle(value).replace(/^\d+(?:[-.]\d+)*(?:\s+|$)/, "").trim();
const normalizeUsageId = (value) => String(value || "").trim().toLowerCase();
const studentApiUserIdCache = new Map();
const courseRosterCache = new Map();
const apiUserRows = (payload) => {
  const rows = [];
  const visit = (value, depth = 0) => {
    if (!value || depth > 3) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return; }
    if (typeof value !== "object") return;
    if (value.userId != null || value.userID != null || value.user_id != null || value.sub != null || value.uuid != null || value.keycloakId != null || value.keycloakUserId != null) rows.push(value);
    [value.data, value.results, value.rows, value.items, value.list, value.users, value.user, value.profile].forEach((item) => visit(item, depth + 1));
  };
  visit(payload);
  return rows;
};
const apiUserIdFromPayload = (payload, email = "") => {
  const rows = apiUserRows(payload);
  const emailKey = String(email || "").trim().toLowerCase();
  const row = rows.find((item) => String(item.email || "").trim().toLowerCase() === emailKey) || rows[0];
  if (!row) return "";
  const values = [row.userId, row.userID, row.user_id, row.sub, row.uuid, row.keycloakId, row.keycloak_id, row.keycloakUserId, row.id]
    .map((value) => String(value || "").trim()).filter(Boolean);
  return values.find((value) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value))
    || values.find((value) => !/^\d+$/.test(value))
    || "";
};
const resolveStudentApiUserIdFromRoster = async (student) => {
  const cls = selectedCourse();
  if (!cls) return "";
  const query = {
    instituteId: cls.instituteId || state.instituteId || "",
    grade: cls.grade || "",
    level: cls.level ?? "",
    classRoom: cls.classRoom ?? ""
  };
  if (!query.instituteId && !query.grade && query.level === "" && query.classRoom === "") return "";
  const cacheKey = JSON.stringify(query);
  if (!courseRosterCache.has(cacheKey)) {
    courseRosterCache.set(cacheKey, apiCourseSearch(query).catch(() => null));
  }
  const payload = await courseRosterCache.get(cacheKey);
  const courses = Array.isArray(payload) ? payload : (payload?.data || payload?.results || payload?.items || []);
  const course = (Array.isArray(courses) ? courses : []).find((item) => String(item.courseId || item.course_id || "") === String(cls.courseId)) || null;
  const enrolls = course
    ? (course.enrolls || course.enroll || course.students || course.learners || [])
    : [];
  if (!Array.isArray(enrolls) || !enrolls.length) return "";
  const studentId = String(student?.id || "").trim();
  const email = String(student?.email || "").trim().toLowerCase();
  const match = enrolls.find((item) => {
    const ids = [item?.enrollId, item?.enroll_id, item?.id, item?.studentId, item?.student_id, item?.user?.id]
      .map((value) => String(value || "").trim()).filter(Boolean);
    const itemEmail = String(item?.email || item?.user?.email || item?.profile?.email || "").trim().toLowerCase();
    return (studentId && ids.includes(studentId)) || (email && itemEmail === email);
  });
  return match ? apiUserIdFromPayload(match, email) : "";
};
const resolveStudentApiUserId = async (student) => {
  const embedded = [student?.apiUserId, student?.userId, student?.user_id, student?.sub, student?.uuid]
    .map((value) => String(value || "").trim())
    .find((value) => value && !/^\d+$/.test(value));
  if (embedded) return embedded;
  const email = String(student?.email || "").trim().toLowerCase();
  if (!email) return "";
  if (studentApiUserIdCache.has(email)) return studentApiUserIdCache.get(email);
  const pending = (async () => {
    const rosterUserId = await resolveStudentApiUserIdFromRoster(student);
    if (rosterUserId) return rosterUserId;
    try {
      const userId = apiUserIdFromPayload(await apiUserByEmail(email), email);
      if (userId) return userId;
    } catch (_) { /* teacher role may not have access to the management user search */ }
    return "";
  })();
  studentApiUserIdCache.set(email, pending);
  const resolved = await pending;
  studentApiUserIdCache.set(email, resolved);
  return resolved;
};
const readingProgressEntries = (payload, opts = {}) => {
  const out = [];
  const seen = new Set();
  const usageHint = normalizeUsageId(opts.usageId);
  const titleHint = String(opts.titleHint || "").trim();
  const parseProgress = (value) => {
    if (typeof value === "string") {
      const match = value.trim().match(/^(\d+)\s*:\s*(\d+)$/);
      if (!match) return null;
      const total = Number(match[2]);
      return total > 0 ? Math.round((Number(match[1]) / total) * 100) : null;
    }
    if (!value || typeof value !== "object") return null;
    const read = toNumber(value.read ?? value.readPage ?? value.read_page ?? value.current ?? value.done, NaN);
    const total = toNumber(value.total ?? value.totalPage ?? value.total_page ?? value.max ?? value.all, NaN);
    if (Number.isFinite(read) && Number.isFinite(total)) return total > 0 ? Math.round((read / total) * 100) : null;
    const direct = toNumber(value.progress ?? value.progressRate ?? value.rate ?? value.percent ?? value.percentage, NaN);
    return Number.isFinite(direct) ? direct : null;
  };
  const push = (titleRaw, progress, usageIdRaw = "") => {
    if (!Number.isFinite(progress)) return;
    const title = String(titleRaw || titleHint || "").trim();
    const key = normalizeProgressTitle(title);
    const usageId = normalizeUsageId(usageIdRaw || usageHint);
    const pct = clamp(Math.round(progress), 0, 100);
    const sig = `${usageId}|${key}|${pct}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    out.push({ title, key, usageId, progress: pct });
  };
  const visit = (value, key = "", inheritedUsageId = "") => {
    if (typeof value === "string") {
      const m = value.trim().match(/^(\d+)\s*:\s*(\d+)$/);
      if (m) {
        const total = Number(m[2]);
        const pct = total > 0 ? Math.round((Number(m[1]) / total) * 100) : null;
        push(key, pct, inheritedUsageId);
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    const pct = [value, value.value, value.stats, value.data].map(parseProgress).find(Number.isFinite);
    if (Number.isFinite(pct)) {
      const title = value.title || value.topic || value.label || value.name || value.display_name || value.displayName || value.book_title || value.bookTitle || key;
      const usageId = value.usageId || value.usage_id || value.courseId || value.course_id || value.id || inheritedUsageId;
      push(title, pct, usageId);
      return;
    }
    const nextUsageId = value.usageId || value.usage_id || value.courseId || value.course_id || inheritedUsageId;
    if (Array.isArray(value)) value.forEach((item, i) => visit(item, key || String(i), nextUsageId));
    else Object.entries(value).forEach(([k, item]) => visit(item, k, nextUsageId));
  };
  visit(payload, titleHint, usageHint);
  return out;
};
const readingPayloadHasRows = (payload) => {
  if (Array.isArray(payload)) return payload.length > 0;
  if (!payload || typeof payload !== "object") return false;
  const rows = payload.results ?? payload.result ?? payload.data;
  if (Array.isArray(rows)) return rows.length > 0;
  return !!rows && typeof rows === "object" && Object.keys(rows).length > 0;
};
const videoProgressEntries = (payload) => {
  const option = chartOption(payload);
  const labels = chartCategoryData(option.yAxis);
  const series = Array.isArray(option.series) ? option.series : [];
  const data = Array.isArray(series[0]?.data) ? series[0].data : [];
  const out = [];
  for (let i = 0; i < Math.max(labels.length, data.length); i += 1) {
    const title = String(labels[i] || "").trim();
    const progress = chartNumber(data[i]);
    if (!title || !Number.isFinite(progress)) continue;
    out.push({ title, key: normalizeProgressTitle(title), usageId: "", progress: clamp(Math.round(progress), 0, 100) });
  }
  return out;
};
const findActivityProgress = (activity, entries, toolLabel) => {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return null;
  const toolIds = (activity.tools || [])
    .filter((tool) => String(tool.label || "").toLowerCase() === toolLabel)
    .map((tool) => normalizeUsageId(tool.id))
    .filter(Boolean);
  const byUsageId = list.find((entry) => entry.usageId && toolIds.includes(normalizeUsageId(entry.usageId)));
  if (byUsageId) return byUsageId;
  const title = normalizeProgressTitle(activity.name);
  const exact = list.find((entry) => normalizeProgressTitle(entry.key || entry.title) === title);
  if (exact) return exact;
  const core = progressTitleCore(activity.name);
  if (!core) return null;
  const exactCore = list.find((entry) => progressTitleCore(entry.key || entry.title) === core);
  if (exactCore) return exactCore;
  return list
    .filter((entry) => {
      const entryCore = progressTitleCore(entry.key || entry.title);
      return entryCore.length >= 4 && (entryCore.includes(core) || core.includes(entryCore));
    })
    .sort((a, b) => progressTitleCore(b.key || b.title).length - progressTitleCore(a.key || a.title).length)[0] || null;
};
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
      apiUserId: row.userId || row.user_id || row.sub || row.uuid || "",
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
/* Landing insight/bubbles use this only as a fallback. Real numbers come from the
   enroll aggregate (buildLandingFromAggregate). */
const DEMO = {
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
};

// Landing insight slides + map bubbles: real enroll aggregate if loaded, else demo.
const insightSlides = () => state.landingStats || DEMO.insightSlides;
const mapPoints = () => state.landingPoints || DEMO.mapPoints;
// Coords outside Thailand mean bad/swapped lat-long or a junk province — exclude from the map.
const inThailand = (lat, lng) => lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106;
// Turn the per-institute enroll aggregate into insight slides + province-level bubbles.
function buildLandingFromAggregate(data) {
  if (!Array.isArray(data) || !data.length) return null;
  let totalUsers = 0;
  const courses = new Map();          // courseId -> { name, users }
  const prov = new Map();             // province -> { users, lat, lng, n }
  for (const it of data) {
    const uc = it.instituteUserCount || 0;
    totalUsers += uc;
    for (const co of it.courses || []) {
      const k = co.courseId || co.courseName;
      const e = courses.get(k) || { name: co.courseName, users: 0 };
      e.users += co.courseUserCount || 0;
      courses.set(k, e);
    }
    const c = it.coordinates || {};
    if (inThailand(c.lat, c.long)) {  // valid Thai coords only (skips "ระบุเอง" + bad records)
      const key = it.instituteProvince || "-";
      const e = prov.get(key) || { users: 0, lat: 0, lng: 0, n: 0 };
      e.users += uc; e.lat += c.lat; e.lng += c.long; e.n += 1;
      prov.set(key, e);
    }
  }
  const provinces = [...prov.values()].map((e) => ({ users: e.users, lat: e.lat / e.n, lng: e.lng / e.n })).filter((p) => p.users > 0);
  if (!provinces.length) return null;
  const maxU = Math.max(...provinces.map((p) => p.users), 1);
  const points = provinces.map((p) => ({ lat: p.lat, lng: p.lng, n: p.users, size: Math.round(30 + 34 * Math.sqrt(p.users / maxU)), big: p.users === maxU }));
  const top = [...courses.values()].sort((a, b) => b.users - a.users)[0] || { name: "-", users: 0 };
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const short = (s, n = 44) => { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; };
  const slides = [
    { bg: "#e9fbf4", label: "ผู้ใช้งานทั่วประเทศ", big: fmt(totalUsers), unit: "คน", desc: `ครู นักเรียน และบุคลากรทางการศึกษาใช้งานระบบใน ${prov.size} จังหวัดทั่วประเทศ`, view: { lat: 13.6, lng: 101.2, zoom: 5.3 } },
    { bg: "#eef2ff", label: "วิชาที่เปิดสอนทั้งหมด", big: fmt(courses.size), unit: "วิชา", desc: "ครอบคลุมปัญญาประดิษฐ์ สะเต็มศึกษา และทักษะดิจิทัลสำหรับทุกช่วงชั้น", view: { lat: 15.6, lng: 101.6, zoom: 5.6 } },
    { bg: "#fff1e6", label: "วิชายอดนิยม", big: fmt(top.users), unit: "คน", desc: `“${short(top.name)}” มีผู้เรียนมากที่สุด`, view: { lat: 15.0, lng: 102.6, zoom: 6.4 } },
    { bg: "#eafaf3", label: "สถาบันที่ร่วมโครงการ", big: fmt(data.length), unit: "แห่ง", desc: "โรงเรียนและสถาบันการศึกษาที่มีผู้เรียนใช้งานระบบ", view: { lat: 13.8, lng: 100.7, zoom: 6.9 } },
  ];
  return { slides, points };
}
// Precomputed landing summary (10 overview slides + province bubbles), regenerated from the
// enroll aggregate offline. Reading this small file avoids pulling the full 1.7k-row aggregate.
const LANDING_OVERVIEW_PATH = "./overview.json";
function applyLandingSummary(s) {
  if (!s || !Array.isArray(s.slides) || !s.slides.length) return false;
  state.landingStats = s.slides;
  if (Array.isArray(s.points) && s.points.length) state.landingPoints = s.points;
  if (s.totals) state.landingTotals = s.totals;
  if (Array.isArray(s.trend) && s.trend.length) state.landingTrend = s.trend;
  if (maps.usage) { maps.usage.remove(); maps.usage = null; } // force rebuild with real markers
  render();
  return true;
}
// Landing overview: read the small precomputed file first; only fall back to the live
// aggregate (heavier) if the file is missing/invalid; demo data stands in if both fail.
async function loadLandingStats() {
  try {
    if (applyLandingSummary(await fetchJson(LANDING_OVERVIEW_PATH))) return;
  } catch (_) { /* fall through to live aggregate */ }
  try {
    const built = buildLandingFromAggregate(await apiEnrollAggregate());
    if (built) applyLandingSummary(built);
  } catch (_) { /* keep demo fallback */ }
}

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
  calendar: svg(["M4.5 6.5h15v13h-15z", "M4.5 10h15", "M8 4v4", "M16 4v4"], 2),
  trash: svg(["M4.5 7h15", "M9.5 7V4.8h5V7", "M6.5 7l1 12.2h9L17.5 7", "M10.3 10.5v5.5", "M13.7 10.5v5.5"], 2),
  warn: svg(["M12 4.5 21 20H3l9-15.5z", "M12 10v4.2", "M12 17.1v.1"], 2),
};
const toolStyle = (label) => { const m = { Profile: "#12a89b", Video: "#7b83eb", BookRoll: "#5ab877", Quiz: "#f59e0b" }; return `background:${m[label] || "#94a3b8"};color:#fff`; };

/* ------------------------------ state ------------------------------ */
const state = {
  ready: false, sub: "", instituteId: "", classrooms: [], loadingCourse: false, authError: null, sessionExpired: false,
  page: "overview", course: null, student: null, studentDetail: null,
  search: "", filter: "all", sort: "followup",
  authed: false, userMenuOpen: false, editOpen: false, notifOpen: false,
  // "เพิ่มห้องเรียน" modal
  addOpen: false, addLoading: false, addSaving: false, addError: "", addCourses: [], addSel: null,
  addFilters: { from: "", to: "", grade: "", level: "", classRoom: "", instituteId: "" },
  addOptions: { grades: [], levels: [], classRooms: [] }, // filter choices derived from course enrolls[]
  addInstQuery: "", addInstOptions: [], // institute autocomplete (staff/admin)
  // ⋮ menu on a classroom card + its "นำออกจากรายการ" confirm.
  // cardMenuPos is measured from the ⋮ button so the menu can be position:fixed and escape
  // the card's overflow:hidden and the scrolling list around it.
  cardMenu: null, cardMenuPos: null,
  delTarget: null, delSaving: false, delError: "",
  teacherRole: "",
  // Identity/school are filled from the real profile.
  teacherSchool: "",
  leadoOpen: false, leadoDemo: false, leadoDemoed: false, leadoMsg: "", teacherName: "", teacherEmail: "",
  lang: "th", fontSize: "md", mapSlide: 0,
  // derived (filled after load)
  students: [], activities: [], courseData: null, courseTitle: "-", courseKey: "-",
  metrics: null, prog: [], quiz: [], tools: null,
  // landing insight slides + map bubbles from the real enroll aggregate (null → demo fallback)
  landingStats: null, landingPoints: null, landingTotals: null, landingTrend: null,
  courseTab: "all", // ห้องเรียนของฉัน status filter
};

/* runtime helpers not part of state */
const maps = { usage: null };
let slideTimer = null;

function expireSession() {
  clearAuth();
  Object.assign(state, {
    ready: true,
    authed: false,
    sessionExpired: true,
    authError: null,
    loadingCourse: false,
    student: null,
    userMenuOpen: false,
    addOpen: false,
    editOpen: false,
    cardMenu: null,
    delTarget: null,
    delSaving: false,
  });
  if (document.getElementById("app")) render();
}

/* responsive breakpoints: phone < 700 ≤ tablet < 1024 ≤ desktop */
const BP = () => { const w = window.innerWidth || 1200; return w < 700 ? "phone" : w < 1024 ? "tablet" : "desktop"; };
// Viewport too short to split a full-height row of cards (landscape phone ≈ 390-430px tall).
// Side-by-side cards would crush their fixed-height contents and clip them behind overflow:hidden.
const shortView = () => (window.innerHeight || 800) < 620;
// Left tab rail when width outweighs height: wide desktop (≥1280) OR any landscape
// phone/tablet (short viewport). Frees vertical room for content where it's scarce.
const useSideNav = () => {
  const w = window.innerWidth || 1200, h = window.innerHeight || 800;
  return w >= 1280 || (w > h && w >= 640);
};
const layoutKey = () => BP() + (useSideNav() ? "|s" : "") + (shortView() ? "|h" : "");
let lastLayout = layoutKey();

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
    grade: assign.grade || "", level: assign.level ?? "", classRoom: assign.classRoom ?? "",
    instituteId: assign.instituteId || assign.institute_id || inst.instituteId || inst.institute_id || "",
    school: inst.instituteName || "",
    province: inst.province || "",
    students: numOr(assign.studentCount, assign.students, assign.enrollCount, assign.total, assign.memberCount),
    progress: (() => { const p = numOr(assign.progress, assign.avgProgress, assign.averageProgress); return p == null ? null : Math.round(Number(p)); })(),
    startDate: assign.startDate || assign.createAt || assign.createdAt || null,
    endDate: assign.endDate || null,
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
const courseList = () => state.classrooms;
const selectedCourse = () => courseList().find((c) => c.id === state.course) || null;
// Readable ระดับชั้น / ห้อง for a classroom card; "ทั้งหมด" when the assign has no value.
const GRADE_TH = { primary: "ประถมศึกษา", secondary: "มัธยมศึกษา", vocational: "ปวช.", associate: "ปวส.", bachelor: "ปริญญาตรี", master: "ปริญญาโท", doctoral: "ปริญญาเอก" };
const gradeText = (c) => {
  const g = GRADE_TH[c?.grade] || c?.grade || "";
  const s = [g, c?.level].filter((x) => x !== "" && x != null).join(" ").trim();
  return s || "ทั้งหมด";
};
const roomText = (c) => { const r = c?.classRoom; return (r === "" || r == null) ? "ทั้งหมด" : String(r); };

// ---- landing map + classroom-card helpers ----
// Bubble colour tier by user count. `label` is unused since the map legend was removed,
// but kept as the readable definition of each tier's range.
const USER_TIERS = [
  { min: 2000, color: "#ef4444", label: "มากกว่า 2,000" },
  { min: 1000, color: "#f97316", label: "1,000 - 2,000" },
  { min: 500, color: "#f59e0b", label: "500 - 1,000" },
  { min: 0, color: "#14b8a6", label: "ต่ำกว่า 500" },
];
const tierColor = (n) => (USER_TIERS.find((t) => n >= t.min) || USER_TIERS[USER_TIERS.length - 1]).color;
const kFmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") + "k" : String(n));
const relativeTime = (d) => {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.round(s / 3600)} ชั่วโมงที่แล้ว`;
  if (s < 2592000) return `${Math.round(s / 86400)} วันที่แล้ว`;
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};
// Time-of-day greeting. Boundaries: เช้า 05-11, บ่าย 12-15, เย็น 16-18, ค่ำ 19-04.
const greetingWord = (h = new Date().getHours()) =>
  h >= 19 || h < 5 ? "สวัสดีตอนค่ำ" : h >= 16 ? "สวัสดีตอนเย็น" : h >= 12 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเช้า";
// "10 กรกฎาคม 2569" — th-TH renders the Buddhist era by default.
const todayThai = () => new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
// Module number from the course title ("... Module 4 ...") else sequential.
const moduleNo = (c, i) => { const m = /module\s*(\d+)/i.exec(c?.title || ""); return String(m ? m[1] : i + 1).padStart(2, "0"); };
// Short subject line: title with the "... : Module N ..." tail stripped, or the ระดับชั้น.
const classroomStatus = (c) => (c?.progress == null || c.progress === 0 ? "pending" : c.progress >= 100 ? "done" : "active");
const STATUS_TABS = [["all", "ทั้งหมด"], ["active", "กำลังสอน"], ["pending", "รอเริ่ม"], ["done", "สิ้นสุดแล้ว"]];
// Inline SVG sparkline from a numeric series.
const sparkline = (vals, color, w = 132, h = 34) => {
  const v = (vals || []).map(Number).filter(Number.isFinite);
  if (v.length < 2) return "";
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((y, i) => [(i / (v.length - 1)) * (w - 4) + 2, h - 3 - ((y - min) / span) * (h - 8)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" style="width:${w}px;height:${h}px;display:block"><path d="${area}" fill="${color}" opacity="0.12"></path><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${color}"></circle></svg>`;
};
// Darken a hex colour for the module block's gradient.
const shade = (hex, amt = 0.8) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * amt), g = Math.round(((n >> 8) & 255) * amt), b = Math.round((n & 255) * amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
// The module's topic (text after "Module N") and its education level, for the card's title/subtitle.
const moduleTopic = (title) => { const m = /module\s*\d+\s*[:：]?\s*(.+)$/i.exec(title || ""); return ((m ? m[1] : title) || "").trim() || (title || ""); };
const moduleLevel = (c) => {
  const m = /(มัธยมศึกษาตอน(?:ต้น|ปลาย)|ประถมศึกษา|ปวช\.?|ปวส\.?|ปริญญา\S*)/.exec(c?.title || "");
  if (m) return "ระดับ" + m[1];
  const g = gradeText(c);
  return g === "ทั้งหมด" ? "ทุกระดับชั้น" : g;
};

// ---- "เพิ่มห้องเรียน" helpers ----
// GET /course returns Course[] each with courseName + enrolls[]; keep the fields the modal needs.
const mapCourseRow = (rows) => (rows || []).map((c) => ({
  courseId: c.courseId || c.course_id || "",
  courseName: c.courseName || c.courseTitle || c.title || c.courseId || "",
  enrolls: Array.isArray(c.enrolls) ? c.enrolls : [],
}));
// Filter choices are the distinct grade/level/classRoom actually present in the courses' enrolls[].
const deriveAddOptions = (courses) => {
  const grades = new Set(), levels = new Set(), classRooms = new Set();
  for (const c of courses || []) for (const e of c.enrolls || []) {
    if (e.grade) grades.add(e.grade);
    if (e.level != null && e.level !== "") levels.add(e.level);
    if (e.classRoom != null && e.classRoom !== "") classRooms.add(e.classRoom);
  }
  return {
    grades: [...grades],
    levels: [...levels].sort((a, b) => Number(a) - Number(b)),
    classRooms: [...classRooms].sort((a, b) => String(a).localeCompare(String(b), "th", { numeric: true })),
  };
};
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

function moduleCard(c, i) {
  const color = c.color || CLASS_COLORS[i % CLASS_COLORS.length];
  const pnum = typeof c.progress === "number" ? c.progress : null;
  const stu = c.students == null ? "—" : c.students;
  const started = relativeTime(c.startDate);
  const status = classroomStatus(c);
  const actLabel = status === "pending" ? "เริ่มใช้งาน" : "เปิดห้องเรียน";
  const actStyle = status === "pending" ? "background:#eef2ff;color:#4f46e5" : `background:${color};color:#fff`;
  // flex:none keeps the card at its natural height — a flex column would otherwise shrink cards
  // instead of scrolling. Colour bar identifies the classroom (no module number — they aren't ordered).
  return `
  <div class="h-card" style="flex:none;display:flex;align-items:stretch;background:#fff;border:1px solid #ececf1;border-radius:14px;box-shadow:0 1px 2px rgba(16,24,40,.05);overflow:hidden">
    <div data-act="pickCourse" data-arg="${esc(c.id)}" style="flex:none;width:8px;background:linear-gradient(180deg,${color},${shade(color)});cursor:pointer"></div>
    <div style="flex:1;min-width:0;padding:14px 16px;display:flex;align-items:center;gap:14px">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
        <div data-act="pickCourse" data-arg="${esc(c.id)}" style="cursor:pointer;min-width:0">
          <div style="font:700 14px/1.4 'Noto Sans Thai';color:#101828">${esc(c.title)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;font:500 11px 'Noto Sans Thai';color:#98a2b3;flex-wrap:wrap">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:14px;height:14px;display:inline-flex">${ICO.usersSm}</span>${stu} คน</span>
          ${started ? `<span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;display:inline-flex;color:#b2b8c2">${ICO.calendar}</span>เริ่มสอนเมื่อ ${esc(started)}</span>` : ""}
        </div>
        <div style="display:flex;align-items:center;gap:11px">
          <div style="flex:1;height:8px;background:#eef0f3;border-radius:99px;overflow:hidden"><div style="height:100%;border-radius:99px;background:${color};width:${pnum == null ? 0 : pnum}%"></div></div>
          <span style="font:700 12px Inter;color:#475467;flex:none;width:36px;text-align:right">${pnum == null ? "—" : pnum + "%"}</span>
        </div>
      </div>
      <div style="flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <button data-act="pickCourse" data-arg="${esc(c.id)}" style="border:none;border-radius:9px;padding:8px 13px;font:700 11.5px 'Noto Sans Thai';cursor:pointer;white-space:nowrap;${actStyle}">${actLabel}</button>
        <button data-act="toggleCardMenu" data-arg="${esc(c.id)}" title="ตัวเลือก" style="border:none;background:${state.cardMenu === c.id ? "#f2f4f7" : "none"};border-radius:7px;color:${state.cardMenu === c.id ? "#475467" : "#c0c6cf"};cursor:pointer;font:700 17px Inter;line-height:1;padding:2px 5px">⋮</button>
      </div>
    </div>
  </div>`;
}

function viewCourseList(phone) {
  const all = courseList();
  const counts = { all: all.length, active: 0, pending: 0, done: 0 };
  all.forEach((c) => { counts[classroomStatus(c)]++; });
  const courses = state.courseTab === "all" ? all : all.filter((c) => classroomStatus(c) === state.courseTab);
  const empty = `<div style="background:#fff;border:1px dashed #e4e7ec;border-radius:14px;padding:34px;text-align:center;font:600 13.5px 'Noto Sans Thai';color:#98a2b3">ยังไม่มีห้องเรียนในสถานะนี้</div>`;
  return `
  <div style="${phone ? "flex:none" : "flex:1;max-width:640px"};display:flex;flex-direction:column;background:#fff;border:1px solid #ececf1;border-radius:${phone ? 14 : 18}px;box-shadow:0 1px 3px rgba(16,24,40,.06);overflow:hidden;min-height:0">
    <div style="flex:none;padding:${phone ? "16px 16px 0" : "18px 22px 0"}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px">
        <div style="font:800 ${phone ? 17 : 19}px 'Noto Sans Thai';color:#101828">ห้องเรียนของฉัน</div>
        <button data-act="openAdd" class="h-teal" style="display:flex;align-items:center;gap:6px;border:none;background:#0d9488;color:#fff;border-radius:999px;padding:8px 15px;font:700 12.5px 'Noto Sans Thai';cursor:pointer;box-shadow:0 4px 12px rgba(13,148,136,.25)"><span style="width:14px;height:14px;display:inline-flex">${ICO.plus}</span>เพิ่มห้องเรียน</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid #f2f4f7;padding-bottom:12px">
        ${STATUS_TABS.map(([k, label]) => {
          const on = state.courseTab === k;
          return `<button data-act="setCourseTab" data-arg="${k}" style="display:flex;align-items:center;gap:6px;border:1px solid ${on ? "#0d9488" : "#e9ebef"};background:${on ? "#e9fbf4" : "#fff"};color:${on ? "#0f766e" : "#667085"};border-radius:999px;padding:6px 12px;font:700 12px 'Noto Sans Thai';cursor:pointer">${label}<span style="font:700 10.5px Inter;color:${on ? "#0f766e" : "#98a2b3"};background:${on ? "#c3f0e2" : "#f2f4f7"};border-radius:99px;padding:1px 7px">${counts[k]}</span></button>`;
        }).join("")}
      </div>
    </div>
    <div ${phone ? "" : 'class="scrolly"'} style="flex:1;min-height:0;${phone ? "" : "overflow-y:auto;"}padding:${phone ? "14px 16px" : "16px 22px"};display:flex;flex-direction:column;gap:12px">
      ${courses.length ? courses.map((c, i) => moduleCard(c, i)).join("") : empty}
    </div>
  </div>`;
}

// Rotating overview topics (from overview.json slides) + a 6-month trend, shown over the map.
function viewMapInsight(compact) {
  const slides = insightSlides();
  const stageMin = compact ? "110px" : "128px";
  const bigFs = compact ? "24px" : "29px";
  const vals = (state.landingTrend || []).map((x) => x.users);
  const pct = vals.length >= 2 && vals[vals.length - 2] ? Math.round((vals[vals.length - 1] - vals[vals.length - 2]) / vals[vals.length - 2] * 100) : null;
  const up = pct == null || pct >= 0;
  return `
    <div style="position:absolute;top:${compact ? 14 : 20}px;left:${compact ? 14 : 20}px;${compact ? "right:14px;" : "width:290px;"}z-index:600;background:rgba(255,255,255,.97);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.7);border-radius:16px;box-shadow:0 12px 30px rgba(16,24,40,.18);padding:${compact ? "15px 17px" : "18px 20px"};overflow:hidden">
      <div id="slide-stage" style="position:relative;min-height:${stageMin}">
        ${slides.map((sl, i) => `
          <div class="slide" data-i="${i}" style="position:absolute;inset:0;transition:opacity .5s ease,transform .5s ease;opacity:${i === state.mapSlide ? 1 : 0};transform:${i === state.mapSlide ? "translateY(0)" : "translateY(8px)"};pointer-events:none">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">
              <span style="width:6px;height:20px;border-radius:99px;background:${sl.bg};flex:none"></span>
              <span style="font:700 12px 'Noto Sans Thai';color:#475467">${esc(sl.label)}</span>
            </div>
            <div style="font:800 ${bigFs} Inter;color:#101828;line-height:1.15;word-break:break-word">${esc(sl.big)} <span style="font:700 14px 'Noto Sans Thai';color:#98a2b3">${esc(sl.unit)}</span></div>
            <div style="font:500 12px/1.55 'Noto Sans Thai';color:#98a2b3;margin-top:7px">${esc(sl.desc)}</div>
          </div>`).join("")}
      </div>
      <div style="display:flex;gap:5px;margin-top:12px">
        ${slides.map((sl, i) => `<button data-act="goSlide" data-arg="${i}" class="slide-dot" data-i="${i}" style="border:none;cursor:pointer;padding:0;height:5px;border-radius:99px;flex:1;background:${i === state.mapSlide ? "#0d9488" : "#e2e5e9"};transition:background .3s"></button>`).join("")}
      </div>
      ${vals.length >= 2 ? `<div style="height:1px;background:#eef0f3;margin:12px 0 8px"></div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px">
          <div style="min-width:0"><div style="font:600 10.5px 'Noto Sans Thai';color:#98a2b3;margin-bottom:2px">แนวโน้ม 6 เดือน</div>${sparkline(vals, "#0d9488", compact ? 110 : 150, 26)}</div>
          ${pct != null ? `<span style="font:700 12px Inter;color:${up ? "#16a34a" : "#dc2626"};display:flex;align-items:center;gap:2px;white-space:nowrap">${up ? "▲" : "▼"} ${Math.abs(pct)}%</span>` : ""}
        </div>` : ""}
    </div>`;
}

function viewMapCard(compact) {
  const fullBtn = `<button data-act="noop" style="position:absolute;bottom:${compact ? 14 : 20}px;right:${compact ? 14 : 20}px;z-index:600;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e6e8ec;border-radius:11px;padding:10px 14px;font:700 12.5px 'Noto Sans Thai';color:#0f766e;cursor:pointer;box-shadow:0 6px 16px rgba(16,24,40,.12)">ดูรายละเอียดแผนที่เต็ม<span style="font:700 13px Inter">↗</span></button>`;
  return `
    <div style="${compact ? "flex:none" : "flex:1.35"};display:flex;flex-direction:column;background:#fff;border:1px solid #ececf1;border-radius:${compact ? 14 : 18}px;box-shadow:0 1px 3px rgba(16,24,40,.06);overflow:hidden;min-height:0">
      <div style="position:relative;flex:1;min-height:${compact ? "360px" : "0"};background:#dfe7ea;isolation:isolate">
        <div id="th-usage-map" style="position:absolute;inset:0"></div>
        ${viewMapInsight(compact)}${fullBtn}
      </div>
    </div>`;
}

function viewSignInCard(phone) {
  // Side-by-side: scroll inside the card rather than clip. The card is height-constrained by the
  // row, and overflow:hidden would swallow the sign-in button on any viewport too short to fit it.
  const overflow = phone ? "overflow:hidden" : "overflow-x:hidden;overflow-y:auto";
  return `
    <div ${phone ? "" : 'class="scrolly"'} style="${phone ? "flex:none" : "flex:1;max-width:520px"};display:flex;background:#fff;border:1px solid #ececf1;border-radius:${phone ? 14 : 18}px;box-shadow:0 1px 3px rgba(16,24,40,.06);${overflow};min-height:0">
      <div style="flex:1;display:flex;padding:${phone ? "34px 24px" : "48px 44px"}">
        ${viewLandingSignIn()}
      </div>
    </div>`;
}

// Greeting + today's date above the landing cards. Signed-in only — it needs a name.
function viewGreeting(phone) {
  const name = (state.teacherName || "").trim();
  return `
    <div style="flex:none;padding:${phone ? "16px 16px 0" : "22px 22px 0"}">
      <div style="font:800 ${phone ? 20 : 24}px 'Noto Sans Thai';color:#101828">${esc(greetingWord())}${name ? `, ${esc(name)}` : ""}</div>
      <div style="display:flex;align-items:center;gap:7px;margin-top:6px;font:500 12.5px 'Noto Sans Thai';color:#98a2b3">
        <span style="width:14px;height:14px;display:inline-flex;flex:none;color:#b2b8c2">${ICO.calendar}</span>วันนี้ ${esc(todayThai())}
      </div>
    </div>`;
}

function viewLanding() {
  const authed = state.authed;
  // Stack + page-scroll on a narrow viewport OR a short one (landscape phone): both lack the
  // room to hold two full-height cards side by side without clipping their contents.
  const phone = BP() === "phone" || shortView();
  const rightPanel = authed ? viewCourseList(phone) : viewSignInCard(phone);
  const footer = `
    <div style="flex:none;background:#f7f8fa;border-top:1px solid #ececf1;padding:12px ${phone ? "18px" : "32px"};display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px">
      <span style="font:700 12px 'Noto Sans Thai';color:#344054">ศูนย์เทคโนโลยีอิเล็กทรอนิกส์และคอมพิวเตอร์แห่งชาติ</span>
      <span style="font:500 11.5px Inter;color:#98a2b3">National Electronics and Computer Technology Center: NECTEC</span>
      <span style="font:500 11.5px 'Noto Sans Thai';color:#98a2b3">· 112 ถนนพหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120, Thailand</span>
      <span style="font:500 11.5px Inter;color:#0f766e">· info@nectec.or.th</span>
    </div>`;
  // The greeting supplies the top padding when present, so the cards drop theirs to avoid a double gap.
  const pad = phone ? (authed ? "12px 14px 14px" : "14px") : (authed ? "16px 22px 22px" : "22px");
  // phone: flex:none so the page scrolls the full content + footer (flex:1 would compress the
  // cards and let their fixed-height children spill over the footer). desktop: flex:1 fills the viewport.
  const cards = `<div style="${phone ? "flex:none" : "flex:1;min-height:0"};display:flex;${phone ? "flex-direction:column;" : ""}gap:${phone ? 14 : 18}px;padding:${pad}">
      ${viewMapCard(phone)}
      ${rightPanel}
    </div>`;
  const head = authed ? viewGreeting(phone) : "";
  if (phone) {
    return `
    <div class="scrolly" style="flex:1;display:flex;flex-direction:column;min-height:0;background:#eef1f4">
      ${head}${cards}${footer}
    </div>`;
  }
  return `
  <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:#eef1f4">
    ${head}${cards}${footer}
  </div>`;
}

/* ---------------- top bar ---------------- */
function viewTopBar() {
  const phone = BP() === "phone";
  const showLanding = !state.course, inCourse = !!state.course, showProfile = state.authed;
  const initials = (state.teacherName || "").replace(/\s/g, "").slice(0, 2);
  const langFlag = state.lang === "th" ? "🇹🇭" : "🇬🇧";
  // Notifications: no live endpoint yet — show the empty-state concept (no demo data pulled).
  const notifs = [];
  const unread = notifs.filter((n) => n.unread).length;
  const leadoOpen = state.leadoOpen, leadoDemo = state.leadoDemo;
  const leadoStyle = leadoDemo
    ? "opacity:0;animation:leadoDemo 2.6s ease forwards;pointer-events:none"
    : leadoOpen
      ? "opacity:1;transform:scale(1) translateY(0);animation:leadoIn .3s cubic-bezier(.2,.8,.2,1);pointer-events:auto"
      : "opacity:0;transform:scale(.4) translateY(-14px);pointer-events:none";
  const sel = selectedCourse();
  return `
  <div data-act="closeAllPanels" style="position:fixed;top:0;left:0;right:0;height:60px;z-index:1200;background:rgba(255,255,255,.9);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid rgba(0,0,0,.06);box-shadow:0 2px 10px rgba(16,24,40,.08);display:flex;align-items:center;justify-content:space-between;padding:0 ${phone ? "12px" : "22px"}">
    <div style="display:flex;align-items:center;gap:14px;min-width:0">
      ${showLanding ? `
        <button data-act="switchCourse" class="h-soft2" title="หน้าแรก" style="background:none;border:none;cursor:pointer;padding:4px 6px;display:flex;align-items:center;border-radius:8px">
          <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-adap-green-untext.1c98bf032947.png" alt="MECA" style="height:34px;object-fit:contain">
        </button>
        ${phone ? "" : `
        <div style="width:1px;height:24px;background:#e6e8ec"></div>
        <img src="https://www.nectec.or.th/wp-content/uploads/2021/08/cropped-logo.png" alt="NECTEC" style="height:34px;object-fit:contain">`}` : ""}
      ${inCourse ? `
        <button data-act="switchCourse" class="h-soft" style="display:flex;align-items:center;gap:8px;background:#f4f5f7;border:none;cursor:pointer;padding:9px 14px;border-radius:10px;font:700 14px 'Noto Sans Thai';color:#0f766e">
          <span style="width:26px;height:26px;color:#0f766e;display:inline-flex">${ICO.home}</span>หน้าแรก
        </button>
        <div style="width:1px;height:26px;background:#e6e8ec"></div>
        <span style="font:700 14px 'Noto Sans Thai';color:#1d2939;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px">${esc(sel?.title || state.courseTitle)}</span>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;flex:none">
      ${showProfile ? `
        <div style="position:relative">
          <button data-act="toggleLeado" class="h-soft" style="position:relative;width:46px;height:46px;border-radius:50%;background:#f4f5f7;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
            <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png" alt="Leado" style="width:30px;height:30px;object-fit:contain"></button>
          <div data-act="noop" style="position:absolute;top:calc(100% + 10px);right:0;z-index:98;width:308px;transform-origin:top right;${leadoStyle}">
            <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 18px 44px rgba(16,24,40,.22);overflow:hidden">
              <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(100deg,#0f766e,#12a594);color:#fff">
                <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png" alt="Leado" style="width:26px;height:26px;border-radius:50%;background:#fff">
                <div style="flex:1"><div style="font:800 13.5px 'Noto Sans Thai'">Leado</div><div style="font:500 10.5px 'Noto Sans Thai';color:#d5f2ec">ผู้ช่วย AI</div></div>
                <button data-act="closeLeado" style="border:none;background:rgba(255,255,255,.18);color:#fff;width:24px;height:24px;border-radius:7px;cursor:pointer;font:700 12px Inter">✕</button>
              </div>
              <div style="padding:14px 16px;background:#f7fdfb"><div id="leado-greet" data-full="Leado พร้อมให้บริการ ถามข้อมูลได้ที่นี่นะครับ" style="background:#fff;border:1px solid #e3f3ee;border-radius:14px;border-top-left-radius:4px;padding:11px 14px;font:500 13px/1.6 'Noto Sans Thai';color:#344054;box-shadow:0 1px 2px rgba(16,24,40,.04);min-height:22px"></div></div>
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
            <div data-act="noop" style="position:absolute;top:calc(100% + 10px);right:0;z-index:98;width:320px;background:#fff;border:1px solid #eceef1;border-radius:14px;box-shadow:0 14px 34px rgba(16,24,40,.18);overflow:hidden">
              <div style="padding:14px 16px;border-bottom:1px solid #f2f4f7;font:700 14px 'Noto Sans Thai';color:#101828">การแจ้งเตือน</div>
              ${notifs.length ? notifs.map((n) => `<div style="display:flex;gap:11px;padding:13px 16px;border-bottom:1px solid #f6f7f8;background:${n.unread ? "#f7fdfb" : "#fff"}"><span style="width:7px;height:7px;border-radius:50%;flex:none;margin-top:6px;background:${n.unread ? "#0d9488" : "#d0d5dd"}"></span><div style="min-width:0"><div style="font:600 12.5px/1.5 'Noto Sans Thai';color:#344054">${esc(n.text)}</div><div style="font:500 11px 'Noto Sans Thai';color:#98a2b3;margin-top:3px">${esc(n.time)}</div></div></div>`).join("")
                : `<div style="padding:34px 20px;text-align:center"><div style="width:44px;height:44px;border-radius:50%;background:#f4f5f7;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#cdd2da"><span style="width:22px;height:22px;display:inline-flex">${ICO.bell}</span></div><div style="font:700 13px 'Noto Sans Thai';color:#475467">ยังไม่มีการแจ้งเตือน</div><div style="font:500 11.5px 'Noto Sans Thai';color:#98a2b3;margin-top:4px">เราจะแจ้งเตือนคุณเมื่อมีความเคลื่อนไหว</div></div>`}
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
  <div data-act="noop" style="position:absolute;top:calc(100% + 10px);right:0;z-index:97;width:236px;background:#fff;border:1px solid #eceef1;border-radius:13px;box-shadow:0 14px 34px rgba(16,24,40,.18);overflow:hidden">
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
  const phone = BP() === "phone", side = useSideNav(), compact = (window.innerWidth || 1200) < 1024;
  let page = "";
  if (!state.metrics) page = `<div style="padding:40px;text-align:center;font:600 14px 'Noto Sans Thai';color:#98a2b3">กำลังเตรียมข้อมูล...</div>`;
  else if (state.page === "overview") page = viewOverview();
  else if (state.page === "students") page = viewStudents();
  else if (state.page === "tools") page = viewTools();
  else if (state.page === "map") page = viewMap();
  const tabs = [["overview", "goOverview", "ภาพรวมทั้งห้อง"], ["students", "goStudents", "รายชื่อนักเรียน"], ["tools", "goTools", "การใช้งานเครื่องมือ"]];

  // left vertical tab rail, content fills the rest (more vertical room on landscape / wide)
  if (side) {
    const railW = compact ? 190 : 236;
    const navV = ([p, act, label]) => {
      const on = state.page === p;
      const stl = on ? "background:#f0fdfa;color:#0f766e;font-weight:700" : "background:none;color:#475467;font-weight:600";
      return `<button data-act="${act}" class="${on ? "" : "h-light"}" style="display:flex;align-items:center;gap:11px;width:100%;border:none;cursor:pointer;text-align:left;border-radius:10px;padding:${compact ? "10px 11px" : "12px 13px"};font:${compact ? 13.5 : 15}px 'Noto Sans Thai';${stl}"><span style="width:4px;height:18px;border-radius:99px;flex:none;background:${on ? "#0d9488" : "transparent"}"></span>${label}</button>`;
    };
    return `
    <div style="display:flex;flex:1;min-height:0">
      <div style="flex:none;width:${railW}px;background:#fff;border-right:1px solid #ececf1;box-shadow:1px 0 2px rgba(16,24,40,.03);padding:${compact ? "12px 10px" : "18px 14px"};display:flex;flex-direction:column;gap:4px;overflow-y:auto;z-index:10">
        <div style="font:700 11px 'Noto Sans Thai';color:#98a2b3;padding:2px 13px 10px">เมนูห้องเรียน</div>
        ${tabs.map(navV).join("")}
      </div>
      <main class="scrolly" data-scroll-key="dashboard-main" style="flex:1;min-height:0;padding:${compact ? "18px 18px 44px" : "26px 34px 60px"}">
        <div style="max-width:1180px;margin:0 auto">${page}</div>
      </main>
    </div>`;
  }

  const navTop = (p) => (state.page === p ? "color:#0f766e;border-bottom-color:#0f766e" : "color:#98a2b3;border-bottom-color:transparent");
  const navT = ([p, act, label], last) => `<button data-act="${act}" style="border:none;cursor:pointer;background:none;padding:15px 6px;${last ? "" : `margin-right:${phone ? 16 : 22}px;`}font:700 15px 'Noto Sans Thai';border-bottom:3px solid transparent;white-space:nowrap;${navTop(p)}">${label}</button>`;
  return `
  <div style="display:flex;flex:1;min-height:0">
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;min-height:0">
      <div style="flex:none;background:#fff;border-bottom:1px solid #ececf1;box-shadow:0 1px 2px rgba(16,24,40,.03);z-index:10">
        <div style="max-width:1180px;margin:0 auto;padding:0 ${phone ? 14 : 40}px;display:flex;gap:6px;overflow-x:auto">
          ${tabs.map((t, i) => navT(t, i === tabs.length - 1)).join("")}
        </div>
      </div>
      <main class="scrolly" data-scroll-key="dashboard-main" style="flex:1;min-height:0;padding:${phone ? "16px 14px 48px" : "26px 30px 60px"}">
        <div style="max-width:1180px;margin:0 auto">${page}</div>
      </main>
    </div>
  </div>`;
}

/* ---------------- overview ---------------- */
function viewCourseHero() {
  const phone = BP() === "phone";
  const sel = selectedCourse();
  const school = sel?.school ? `${sel.school}${sel.province ? ` (${sel.province})` : ""}` : (state.teacherSchool || "—");
  const chip = (t) => `<span style="font:600 11.5px 'Noto Sans Thai';color:#fff;background:rgba(255,255,255,.16);border-radius:8px;padding:5px 11px">${esc(t)}</span>`;
  return `
    <div style="background:linear-gradient(120deg,#0f766e 0%,#12a594 55%,#15b8a5 100%);border-radius:${phone ? 14 : 18}px;padding:${phone ? "17px 18px" : "22px 26px"};margin-bottom:${phone ? 14 : 18}px;box-shadow:0 4px 16px rgba(15,118,110,.18)">
      <div style="font:800 ${phone ? "20px" : "26px"}/1.25 'Noto Sans Thai';color:#fff;margin:0 0 12px;max-width:820px;letter-spacing:-.01em">${esc(sel?.title || state.courseTitle)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${chip("โรงเรียน: " + school)}${chip("ระดับชั้น: " + gradeText(sel))}${chip("ห้อง: " + roomText(sel))}</div>
    </div>`;
}

function viewOverview() {
  const phone = BP() === "phone";
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
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px"><span style="font:600 13px 'Noto Sans Thai';color:#667085">${label}</span>${badge}</div>
      <div style="font:800 ${phone ? "26px" : "32px"} Inter;color:#101828;margin-top:8px">${value}</div>
    </div>`;
  return `
  <div>
    ${viewCourseHero()}
    <div style="margin-bottom:18px"><div style="font:800 19px 'Noto Sans Thai';color:#101828">ภาพรวมของทั้งห้องเรียน</div></div>
    <div style="display:grid;grid-template-columns:repeat(${phone ? 2 : 4},1fr);gap:${phone ? 10 : 16}px;margin-bottom:${phone ? 14 : 18}px">
      ${metricCard("#12a594", "ผู้เรียนทั้งหมด", iconBox(ICO.usersSm, "#0f766e", "#e9fbf4"), `${total} <span style="font:600 13px 'Noto Sans Thai';color:#98a2b3">คน</span>`)}
      ${metricCard("#22c55e", "ความคืบหน้าเฉลี่ย", `<span style="font:600 11px 'Noto Sans Thai';color:#16a34a;background:#dcfce7;border-radius:6px;padding:3px 7px">เฉลี่ยทั้งห้อง</span>`, `${m.avgProgress.toFixed(1)}<span style="font:700 18px Inter;color:#667085">%</span>`)}
      ${metricCard("#6366f1", "เรียนครบแล้ว", `<span style="font:600 11px 'Noto Sans Thai';color:#4f46e5;background:#eef2ff;border-radius:6px;padding:3px 7px">${total ? Math.round((m.completed / total) * 100) : 0}%</span>`, `${m.completed} <span style="font:600 13px 'Noto Sans Thai';color:#98a2b3">/ ${total}</span>`)}
      ${metricCard("#f97316", "คะแนน Quiz เฉลี่ย", `<span style="font:600 11px 'Noto Sans Thai';color:#c2410c;background:#ffedd5;border-radius:6px;padding:3px 7px">${records} records</span>`, m.avgRate == null ? `-` : `${m.avgRate.toFixed(1)}<span style="font:700 18px Inter;color:#667085">%</span>`)}
    </div>

    <div style="display:grid;grid-template-columns:${phone ? "1fr" : "1.15fr 1fr"};gap:16px;margin-bottom:16px">
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
          <div data-act="openStudent" data-arg="${esc(a.id)}" class="h-light" style="display:flex;align-items:center;gap:${phone ? 10 : 14}px;padding:11px 8px;border-top:1px solid #f2f4f7;cursor:pointer;border-radius:8px">
            <div style="width:34px;height:34px;border-radius:50%;background:#fff3ea;color:#c2410c;display:flex;align-items:center;justify-content:center;font:700 14px 'Noto Sans Thai';flex:none">${esc(a.initials)}</div>
            <div style="flex:1;min-width:0"><div style="font:600 13.5px 'Noto Sans Thai';color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div><div style="font:500 11.5px Inter;color:#98a2b3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.email)}</div></div>
            ${phone ? "" : `<div style="width:130px;height:9px;background:#f2f4f7;border-radius:99px;overflow:hidden;flex:none"><div style="height:100%;border-radius:99px;background:${a.progColor};width:${a.progW}"></div></div>`}
            <div style="font:700 13px Inter;color:#475467;width:42px;text-align:right;flex:none">${a.progW}</div>
            <span style="font:600 11px 'Noto Sans Thai';color:#c2410c;background:#ffedd5;border-radius:999px;padding:4px 11px;flex:none">${phone ? "ติดตาม" : "ต้องติดตาม"}</span>
          </div>`).join("") : `<div style="padding:16px 8px;font:600 13px 'Noto Sans Thai';color:#98a2b3;border-top:1px solid #f2f4f7">ไม่มีนักเรียนที่ต้องติดตาม</div>`}
      </div>
    </div>
  </div>`;
}

/* ---------------- students ---------------- */
function viewStudents() {
  const phone = BP() === "phone";
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
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;${phone ? "width:100%" : ""}">
        <div style="position:relative;${phone ? "flex:1 1 100%" : ""}">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#98a2b3">${ICO.usersSm}</span>
          <input id="search" data-inp="setSearch" value="${esc(state.search)}" placeholder="ค้นหาชื่อหรืออีเมล" class="fld" style="width:${phone ? "100%" : "250px"};border:1px solid #e4e7ec;border-radius:10px;padding:10px 12px 10px 36px;font:500 13.5px 'Noto Sans Thai';outline:none;background:#fff">
        </div>
        <select data-chg="setSort" class="fld" style="${phone ? "flex:1;min-width:0;" : ""}border:1px solid #e4e7ec;border-radius:10px;padding:10px 12px;font:600 13px 'Noto Sans Thai';color:#475467;background:#fff;cursor:pointer;outline:none">
          ${opt("followup", "เรียง: ต้องติดตามก่อน")}${opt("progress", "เรียง: ความคืบหน้ามาก→น้อย")}${opt("quiz", "เรียง: คะแนนมาก→น้อย")}${opt("name", "เรียง: ชื่อ ก→ฮ")}
        </select>
        <button data-act="downloadCsv" class="h-teal2" style="border:1px solid #e4e7ec;border-radius:10px;padding:10px 14px;font:600 13px 'Noto Sans Thai';color:#0f766e;background:#fff;cursor:pointer;display:flex;align-items:center;gap:7px">↓ ดาวน์โหลด CSV</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${pills.map((p) => { const on = state.filter === p.key; const stl = on ? "background:#0d9488;color:#fff;border-color:#0d9488" : "background:#fff;color:#475467;border-color:#e4e7ec"; return `<button data-act="setFilter" data-arg="${p.key}" style="border:1px solid;cursor:pointer;border-radius:999px;padding:7px 15px;font:600 13px 'Noto Sans Thai';display:flex;align-items:center;gap:7px;${stl}">${p.label}<span style="font:700 12px Inter;opacity:.75">${p.count}</span></button>`; }).join("")}
    </div>
    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);overflow:hidden">
      ${phone ? "" : `<div style="display:grid;grid-template-columns:2.4fr 1.5fr 1fr 1.3fr 1fr 30px;gap:12px;padding:13px 22px;background:#f9fafb;border-bottom:1px solid #eef0f3;font:700 12px 'Noto Sans Thai';color:#667085">
        <div>ผู้เรียน</div><div>ความคืบหน้า</div><div>คะแนน Quiz</div><div>อัปเดตล่าสุด</div><div>สถานะ</div><div></div>
      </div>`}
      ${list.length ? list.map((st) => phone ? `
        <div data-act="openStudent" data-arg="${esc(st.id)}" class="h-row" style="padding:13px 14px;border-bottom:1px solid #f4f5f7;cursor:pointer">
          <div style="display:flex;align-items:center;gap:11px">
            <div style="width:38px;height:38px;border-radius:50%;background:#f0fdfa;color:#0f766e;display:flex;align-items:center;justify-content:center;font:700 14px 'Noto Sans Thai';flex:none;border:1px solid #d6f5ee">${esc(st.initials)}</div>
            <div style="flex:1;min-width:0"><div style="font:600 14px 'Noto Sans Thai';color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(st.name)}</div><div style="font:500 11.5px Inter;color:#98a2b3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(st.email)} · ${esc(st.room)}</div></div>
            <span style="font:600 11px 'Noto Sans Thai';border-radius:999px;padding:5px 10px;white-space:nowrap;flex:none;color:${st.status.color};background:${st.status.bg}">${esc(st.status.label)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:11px">
            <div style="flex:1;height:8px;background:#f2f4f7;border-radius:99px;overflow:hidden"><div style="height:100%;border-radius:99px;background:${st.progColor};width:${st.progW}"></div></div>
            <span style="font:700 12.5px Inter;color:#475467;width:36px;text-align:right;flex:none">${st.progW}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;font:500 11.5px 'Noto Sans Thai';color:#98a2b3">
            <span>Quiz: <b style="font:700 12px Inter;color:#475467">${esc(st.quizText)}</b>${st.quizPct ? ` · ${esc(st.quizPct)}` : ""}</span>
            <span>${esc(st.updated)}</span>
          </div>
        </div>` : `
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
  const phone = BP() === "phone";
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
    <div style="display:grid;grid-template-columns:repeat(${phone ? 2 : 4},1fr);gap:${phone ? 10 : 16}px;margin-bottom:${phone ? 14 : 20}px">
      ${card("#7b83eb", "▶", "Video", t.video, "บทเรียน", "กิจกรรมที่มีวิดีโอประกอบ")}
      ${card("#5ab877", "▤", "BookRoll", t.bookroll, "บทเรียน", "กิจกรรมที่มีเอกสารอ่าน")}
      ${card("#f59e0b", "✓", "Quiz", records, "ครั้งทำ", `คะแนนเฉลี่ย ${avgRate == null ? "-" : avgRate.toFixed(1) + "%"}`)}
      ${card("#12a89b", "◔", "Profile", total, "ลงทะเบียน", "ผู้เรียนในห้องเรียน")}
    </div>
    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);overflow:hidden">
      ${phone ? "" : `<div style="display:grid;grid-template-columns:2.6fr 1.8fr 1.4fr 1fr;gap:14px;padding:13px 22px;background:#f9fafb;border-bottom:1px solid #eef0f3;font:700 12px 'Noto Sans Thai';color:#667085">
        <div>กิจกรรม / บทเรียน</div><div>เครื่องมือ</div><div>ผู้เรียนที่ทำแล้ว</div><div style="text-align:right">ลำดับ</div>
      </div>`}
      ${state.activities.map((a) => {
        const reachCell = a.reach == null
          ? `<span style="font:500 12px 'Noto Sans Thai';color:#b2b8c2">ไม่มีข้อมูลการเข้าถึง</span>`
          : `<div style="flex:1;height:10px;background:#f2f4f7;border-radius:99px;overflow:hidden"><div style="height:100%;border-radius:99px;background:linear-gradient(90deg,#14b8a6,#0d9488);width:${total ? Math.round((a.reach / total) * 100) : 0}%"></div></div><span style="font:600 12px 'Noto Sans Thai';color:#667085;width:64px;white-space:nowrap;text-align:right">${a.reach}/${total}</span>`;
        return phone ? `
        <div style="padding:14px 14px;border-bottom:1px solid #f4f5f7">
          <div style="font:600 14px 'Noto Sans Thai';color:#101828">${esc(a.name)}</div>
          <div style="font:600 11px Inter;color:#b2b8c2;margin-top:1px">${esc(a.code)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">${a.tools.map((tt) => `<span style="font:600 11.5px 'Noto Sans Thai';border-radius:7px;padding:4px 10px;${toolStyle(tt.label)}">${esc(tt.label)}</span>`).join("")}</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px">${reachCell}</div>
        </div>` : `
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
  const phone = BP() === "phone";
  const card = (accent, inner) => `<div style="background:#fff;border:1px solid #ececf1;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(16,24,40,.04);position:relative;overflow:hidden"><div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${accent}"></div>${inner}</div>`;
  return `
  <div>
    <div style="margin-bottom:16px"><div style="font:800 19px 'Noto Sans Thai';color:#101828">แผนที่เปรียบเทียบโรงเรียน</div></div>
    <div style="display:grid;grid-template-columns:repeat(${phone ? 1 : 3},1fr);gap:${phone ? 10 : 16}px;margin-bottom:16px">
      ${card("#ef4444", `<div style="font:600 13px 'Noto Sans Thai';color:#667085">อันดับของโรงเรียนคุณ</div><div style="font:800 32px Inter;color:#101828;margin-top:8px">-</div>`)}
      ${card("#12a594", `<div style="font:600 13px 'Noto Sans Thai';color:#667085">ความคืบหน้าของคุณเทียบกับโรงเรียนอื่น</div><div style="font:800 32px Inter;color:#101828;margin-top:8px">-</div>`)}
      ${card("#6366f1", `<div style="font:600 13px 'Noto Sans Thai';color:#667085">โรงเรียนในเครือข่าย</div><div style="font:800 32px Inter;color:#101828;margin-top:8px">-</div>`)}
    </div>
    <div style="background:#fff;border:1px solid #ececf1;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04);min-height:${phone ? 280 : 420}px;display:flex;align-items:center;justify-content:center;padding:28px;text-align:center">
      <div><div style="font:700 15px 'Noto Sans Thai';color:#475467">ยังไม่มีข้อมูลเปรียบเทียบโรงเรียนจาก API</div><div style="font:500 12.5px 'Noto Sans Thai';color:#98a2b3;margin-top:5px">จะแสดงแผนที่และอันดับเมื่อมีข้อมูลจริง</div></div>
    </div>
  </div>`;
}

/* ---------------- student drawer ---------------- */
async function loadStudentDetailApis(st) {
  const selected = selectedCourse();
  const cid = selected?.courseId || state.courseKey;
  const email = String(st?.email || "").trim();
  const identityPromise = resolveStudentApiUserId(st);
  const result = {
    studentId: st?.id, loading: true,
    readingLoading: true, videoLoading: true,
    apiUserId: null, reading: null, video: null, readingEntries: [], videoEntries: [], errors: []
  };
  const publish = (patch) => {
    Object.assign(result, patch);
    if (String(state.student) !== String(st?.id)) return;
    setState({ studentDetail: { ...state.studentDetail, ...patch, studentId: st?.id, errors: [...result.errors] } });
  };
  if (!cid || (!email && !st?.apiUserId)) {
    result.errors.push("ไม่พบ courseId หรือข้อมูลระบุตัวนักเรียน");
    publish({ loading: false, readingLoading: false, videoLoading: false });
    return result;
  }
  identityPromise.then((userId) => publish({ apiUserId: userId || null }));

  const loadReading = async () => {
    const userId = await identityPromise;
    if (!userId) {
      result.errors.push("BookRoll: ไม่พบ Keycloak userId ของนักเรียนจาก email");
      publish({ reading: null, readingEntries: [], readingLoading: false });
      return;
    }
    let entries = [];
    let courseLevelAnswered = false;
    const bookrollTargets = state.activities.flatMap((activity) => activity.tools
      .filter((tool) => String(tool.label).toLowerCase() === "bookroll")
      .map((tool) => ({ usageId: tool.id, title: activity.name })));
    try {
      const payload = await externalJson(bookrollReadingUrl(userId, cid));
      courseLevelAnswered = readingPayloadHasRows(payload);
      entries = readingProgressEntries(payload, { usageId: cid });
    }
    catch (err) { result.errors.push(`BookRoll: ${err.message}`); }
    if (!entries.length && !courseLevelAnswered) {
      const targets = [...new Map(bookrollTargets.filter((target) => target.usageId).map((target) => [target.usageId, target])).values()];
      const responses = await Promise.allSettled(targets.map((target) => externalJson(bookrollReadingUrl(userId, target.usageId))));
      responses.forEach((response, index) => {
        if (response.status === "fulfilled") {
          entries.push(...readingProgressEntries(response.value, {
            usageId: targets[index].usageId,
            titleHint: targets[index].title
          }));
        }
      });
    }
    publish({
      reading: entries.length ? summarizeProgress(entries.map((entry) => entry.progress), bookrollTargets.length) : null,
      readingEntries: entries,
      readingLoading: false
    });
  };

  const loadVideo = async () => {
    const videoCount = state.activities.flatMap((activity) => activity.tools)
      .filter((tool) => String(tool.label).toLowerCase() === "video").length;
    const userId = await identityPromise;
    const candidates = [...new Set([email, userId].filter(Boolean))];
    for (const candidate of candidates) {
      try {
        const entries = videoProgressEntries(await externalJson(videoProgressUrl(candidate, cid)));
        if (entries.length) {
          publish({ video: summarizeProgress(entries.map((entry) => entry.progress), videoCount), videoEntries: entries, videoLoading: false });
          return;
        }
      } catch (err) {
        result.errors.push(`Video (${candidate}): ${err.message}`);
      }
    }
    publish({ video: null, videoLoading: false });
  };

  await Promise.allSettled([loadReading(), loadVideo()]);
  publish({ loading: false, readingLoading: false, videoLoading: false });
  return result;
}

function viewDrawer() {
  const st = state.students.find((x) => String(x.id) === String(state.student));
  if (!st) return "";
  const detail = String(state.studentDetail?.studentId) === String(st.id) ? state.studentDetail : null;
  const reading = detail?.reading;
  const video = detail?.video;
  const readingLoading = !!detail?.readingLoading;
  const videoLoading = !!detail?.videoLoading;
  const loadingSpinner = (size = 12, width = 2) => `<span role="status" aria-label="กำลังโหลด" title="กำลังโหลด" style="display:inline-block;width:${size}px;height:${size}px;border:${width}px solid #d0d5dd;border-top-color:#0d9488;border-radius:50%;animation:tdspin .75s linear infinite;vertical-align:middle"></span>`;
  const chapters = state.activities.map((activity) => {
    const tools = (activity.tools || []).map((tool) => {
      const label = String(tool.label || "").toLowerCase();
      const isReading = label === "bookroll";
      const isVideo = label === "video";
      const showProgress = isReading || isVideo;
      if (!showProgress) return { ...tool, showProgress: false };
      const entry = isReading
        ? findActivityProgress(activity, detail?.readingEntries, "bookroll")
        : (isVideo ? findActivityProgress(activity, detail?.videoEntries, "video") : null);
      const loading = (isReading && readingLoading) || (isVideo && videoLoading);
      const progress = Number.isFinite(entry?.progress) ? clamp(Math.round(entry.progress), 0, 100) : null;
      if (loading && progress == null) return { ...tool, showProgress, loading: true, progress: null, progressLabel: "", progressColor: "#667085", progressBg: "#f2f4f7" };
      if (progress == null) return { ...tool, showProgress, loading: false, progress: null, progressLabel: "-", progressColor: "#667085", progressBg: "#f2f4f7" };
      if (progress >= 100) return { ...tool, showProgress, loading: false, progress, progressLabel: "100%", progressColor: "#0f766e", progressBg: "#d1fae5" };
      if (progress > 0) return { ...tool, showProgress, loading: false, progress, progressLabel: `${progress}%`, progressColor: "#c2410c", progressBg: "#ffedd5" };
      return { ...tool, showProgress, loading: false, progress, progressLabel: "0%", progressColor: "#667085", progressBg: "#f2f4f7" };
    });
    const trackedTools = tools.filter((tool) => String(tool.label || "").toLowerCase() === "video" || String(tool.label || "").toLowerCase() === "bookroll");
    const known = trackedTools.filter((tool) => Number.isFinite(tool.progress));
    const dot = known.length && known.length === trackedTools.length && known.every((tool) => tool.progress >= 100)
      ? "#22c55e"
      : (known.some((tool) => tool.progress > 0) ? "#f97316" : "#d0d5dd");
    return { name: activity.name, code: activity.code, tools, dot };
  });
  const ring = `conic-gradient(#0d9488 ${st.progress * 3.6}deg,#eaecf0 ${st.progress * 3.6}deg)`;
  const readRow = (color, label, val) => `<div style="display:flex;align-items:center;gap:8px;font:600 12px 'Noto Sans Thai';color:#475467"><span style="width:9px;height:9px;border-radius:50%;background:${color}"></span>${label}<span style="margin-left:auto;font:700 13px Inter;color:#101828">${val}</span></div>`;
  return `
  <div style="position:fixed;inset:0;z-index:1300;display:flex;justify-content:flex-end">
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
        <div style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;background:#fff;border:1px solid #ececf1;border-radius:14px;padding:16px 18px;margin-bottom:16px">
          <div style="position:relative;width:78px;height:78px"><div style="width:78px;height:78px;border-radius:50%;background:${ring}"></div><div style="position:absolute;inset:11px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font:800 18px Inter;color:#0f766e">${st.progW}</div></div></div>
          <div style="text-align:center"><div style="font:800 22px Inter;color:#101828">${esc(st.quizText)}</div><div style="font:600 11.5px 'Noto Sans Thai';color:#98a2b3">คะแนน Quiz</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:#fff;border:1px solid #ececf1;border-radius:14px;padding:15px 17px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="width:24px;height:24px;border-radius:7px;background:#5ab877;color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 11px Inter">▤</span><span style="font:700 13px 'Noto Sans Thai';color:#101828">ความคืบหน้าการอ่าน</span></div>
            <div style="display:flex;flex-direction:column;gap:7px">${readRow("#22c55e", "อ่านจบ", readingLoading ? loadingSpinner() : (reading?.done ?? "-"))}${readRow("#f97316", "กำลังอ่าน", readingLoading ? loadingSpinner() : (reading?.doing ?? "-"))}${readRow("#d0d5dd", "ยังไม่ได้อ่าน", readingLoading ? loadingSpinner() : (reading?.todo ?? "-"))}</div>
          </div>
          <div style="background:#fff;border:1px solid #ececf1;border-radius:14px;padding:15px 17px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="width:24px;height:24px;border-radius:7px;background:#7b83eb;color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 10px Inter">▶</span><span style="font:700 13px 'Noto Sans Thai';color:#101828">ความคืบหน้าวิดีโอ</span></div>
            <div style="display:flex;flex-direction:column;gap:7px">${readRow("#22c55e", "ดูจบ", videoLoading ? loadingSpinner() : (video?.done ?? "-"))}${readRow("#f97316", "กำลังดู", videoLoading ? loadingSpinner() : (video?.doing ?? "-"))}${readRow("#d0d5dd", "ยังไม่ได้ดู", videoLoading ? loadingSpinner() : (video?.todo ?? "-"))}</div>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #ececf1;border-radius:14px;padding:16px 18px">
          <div style="font:700 14px 'Noto Sans Thai';color:#101828;margin-bottom:4px">หัวข้อการเรียนรู้รายบท</div>
          <div style="font:500 11.5px 'Noto Sans Thai';color:#98a2b3;margin-bottom:12px">สถานะการเรียนและเครื่องมือที่ใช้ในแต่ละบท</div>
          ${chapters.map((c) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid #f2f4f7"><span style="width:10px;height:10px;border-radius:50%;flex:none;background:${c.dot}"></span><div style="flex:1;min-width:0"><div style="font:600 13px 'Noto Sans Thai';color:#101828">${esc(c.name)}</div><div style="font:600 10.5px Inter;color:#b2b8c2">${esc(c.code)}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${c.tools.map((t) => t.showProgress ? `<span style="display:inline-flex;align-items:stretch;border-radius:6px;overflow:hidden;white-space:nowrap"><span style="font:600 10.5px 'Noto Sans Thai';padding:3px 7px;${toolStyle(t.label)}">${esc(t.label)}</span><span style="font:700 10.5px Inter;min-width:29px;padding:3px 7px;color:${t.progressColor};background:${t.progressBg};display:inline-flex;align-items:center;justify-content:center">${t.loading ? loadingSpinner(10, 1.5) : esc(t.progressLabel)}</span></span>` : `<span style="font:600 10.5px 'Noto Sans Thai';border-radius:6px;padding:3px 7px;white-space:nowrap;${toolStyle(t.label)}">${esc(t.label)}</span>`).join("")}</div></div>`).join("")}
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

// ⋮ menu for one classroom card. position:fixed at coordinates measured from the button, so
// neither the card's overflow:hidden nor the scrolling list can clip it.
function viewCardMenu() {
  const p = state.cardMenuPos;
  if (!p) return "";
  return `
  <div data-act="noop" style="position:fixed;top:${p.top}px;right:${p.right}px;z-index:97;width:198px;background:#fff;border:1px solid #eceef1;border-radius:12px;box-shadow:0 14px 34px rgba(16,24,40,.18);overflow:hidden;padding:5px">
    <button data-act="askRemoveClass" data-arg="${esc(state.cardMenu)}" class="h-red" style="display:flex;align-items:center;gap:10px;width:100%;border:none;background:none;cursor:pointer;padding:10px 11px;border-radius:8px;font:600 13px 'Noto Sans Thai';color:#dc2626;text-align:left"><span style="width:17px;height:17px;color:#dc2626;display:inline-flex;flex:none">${ICO.trash}</span>นำออกจากรายการ</button>
  </div>`;
}

// Confirm before DELETE /assign/{assignId} — the card disappears for every teacher on that assign.
function viewRemoveModal() {
  const c = state.classrooms.find((x) => String(x.id) === String(state.delTarget));
  if (!c) return "";
  return `
  <div style="position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center;padding:24px">
    <div data-act="closeRemove" style="position:absolute;inset:0;background:rgba(16,24,40,.5)"></div>
    <div style="position:relative;width:100%;max-width:410px;background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(16,24,40,.28);overflow:hidden">
      <div style="padding:24px 24px 18px;display:flex;gap:14px">
        <span style="width:42px;height:42px;border-radius:11px;background:#fef2f2;color:#dc2626;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:10px">${ICO.warn}</span>
        <div style="min-width:0">
          <div style="font:800 16.5px 'Noto Sans Thai';color:#101828">นำห้องเรียนออกจากรายการ</div>
          <div style="font:500 12.5px/1.6 'Noto Sans Thai';color:#667085;margin-top:6px">ห้องเรียน <b style="color:#344054">${esc(c.title)}</b> จะถูกนำออกจากรายการของคุณ และจะไม่สามารถเปิดดูความคืบหน้าของนักเรียนในห้องนี้ได้อีก</div>
        </div>
      </div>
      ${state.delError ? `<div style="margin:0 24px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;font:600 12px/1.5 'Noto Sans Thai';color:#dc2626">${esc(state.delError)}</div>` : ""}
      <div style="padding:14px 24px;border-top:1px solid #f2f4f7;display:flex;gap:10px;justify-content:flex-end">
        <button type="button" data-act="closeRemove" class="h-light" style="border:1px solid #e4e7ec;background:#fff;color:#475467;border-radius:999px;padding:11px 18px;font:700 13.5px 'Noto Sans Thai';cursor:pointer">ยกเลิก</button>
        <button type="button" data-act="confirmRemove" class="h-bright" style="border:none;background:${state.delSaving ? "#f7a3a3" : "#dc2626"};color:#fff;border-radius:999px;padding:11px 22px;font:700 13.5px 'Noto Sans Thai';cursor:${state.delSaving ? "default" : "pointer"}"${state.delSaving ? " disabled" : ""}>${state.delSaving ? "กำลังนำออก..." : "นำออก"}</button>
      </div>
    </div>
  </div>`;
}

function viewAddModal() {
  const phone = BP() === "phone";
  const f = state.addFilters;
  const list = state.addCourses || [];
  const isStaff = ["staff", "admin"].includes(state.teacherRole);
  const fldStl = "border:1px solid #e4e7ec;border-radius:10px;padding:10px 12px;font:500 13px 'Noto Sans Thai';color:#344054;outline:none;background:#fff";
  const opt = (v, cur, label) => `<option value="${esc(v)}"${String(cur) === String(v) ? " selected" : ""}>${esc(label)}</option>`;
  const sel = (chg, cur, ph, opts) => `<select data-chg="${chg}" style="${fldStl};flex:1;min-width:0;cursor:pointer;color:${cur ? "#344054" : "#98a2b3"}"><option value=""${cur ? "" : " selected"}>${esc(ph)}</option>${opts}</select>`;
  // Filter options are derived from the fetched courses' enrolls[] (like the original).
  const gradeOpts = state.addOptions.grades.map((g) => opt(g, f.grade, GRADE_TH[g] || g)).join("");
  const levelOpts = state.addOptions.levels.map((l) => opt(l, f.level, `ชั้นปี ${l}`)).join("");
  const roomOpts = state.addOptions.classRooms.map((r) => opt(r, f.classRoom, `ห้อง ${r}`)).join("");
  const check = (on) => `<span style="width:24px;height:24px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:${on ? "#0d9488" : "#f4f5f7"};color:${on ? "#fff" : "#cdd2da"};border:1px solid ${on ? "#0d9488" : "#e4e7ec"};transition:all .15s"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><path d="M5 12.5l4.5 4.5L19 7"></path></svg></span>`;

  // school field: readonly for role=user, searchable AutoComplete for staff/admin
  const schoolField = isStaff
    ? `<div style="position:relative;flex:1;min-width:0">
        <input id="addInst" data-inp="setAddInst" value="${esc(state.addInstQuery)}" placeholder="ค้นหาชื่อโรงเรียน..." autocomplete="off" style="${fldStl};width:100%">
        ${state.addInstOptions.length ? `<div style="position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:20;background:#fff;border:1px solid #e4e7ec;border-radius:10px;box-shadow:0 12px 28px rgba(16,24,40,.16);max-height:220px;overflow-y:auto">
          ${state.addInstOptions.map((o) => `<div data-act="selectAddInst" data-arg="${esc(o.value)}" class="h-light" style="padding:10px 13px;font:500 13px 'Noto Sans Thai';color:#344054;cursor:pointer;border-bottom:1px solid #f5f6f7">${esc(o.label)}</div>`).join("")}
        </div>` : ""}
      </div>`
    : `<input value="${esc(state.teacherSchool)}" placeholder="—" readonly style="${fldStl};flex:1;background:#f7f8fa;color:#667085;cursor:not-allowed">`;

  let rows;
  if (state.addLoading) rows = `<div style="padding:40px;text-align:center;font:600 13.5px 'Noto Sans Thai';color:#98a2b3">กำลังโหลดรายวิชา...</div>`;
  else if (state.addError) rows = `<div style="padding:40px;text-align:center;font:600 13.5px 'Noto Sans Thai';color:#dc2626">${esc(state.addError)}</div>`;
  else if (!list.length) rows = `<div style="padding:40px;text-align:center;font:600 13.5px 'Noto Sans Thai';color:#98a2b3">${isStaff && !f.instituteId ? "เลือกโรงเรียนเพื่อดูรายวิชา" : "ไม่พบรายวิชาตามเงื่อนไข"}</div>`;
  else rows = list.map((c) => {
    const on = state.addSel === c.courseId;
    return `<div data-act="selectAddCourse" data-arg="${esc(c.courseId)}" class="h-card" style="display:flex;align-items:center;gap:14px;padding:15px 17px;border:1px solid ${on ? "#0d9488" : "#ececf1"};border-radius:13px;cursor:pointer;background:${on ? "#f0fdfa" : "#fff"};box-shadow:0 1px 2px rgba(16,24,40,.04);transition:all .15s">
      <div style="flex:1;min-width:0;font:600 14px/1.45 'Noto Sans Thai';color:#1d2939">${esc(c.courseName)}</div>
      ${check(on)}
    </div>`;
  }).join("");

  const addDisabled = !state.addSel || state.addSaving;
  return `
  <div style="position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:${phone ? "0" : "24px"}">
    <div data-act="closeAdd" style="position:absolute;inset:0;background:rgba(16,24,40,.5)"></div>
    <div style="position:relative;width:100%;max-width:820px;height:${phone ? "100%" : "min(88vh,760px)"};background:#fff;border-radius:${phone ? "0" : "18px"};box-shadow:0 24px 60px rgba(16,24,40,.28);display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #f2f4f7;display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none">
        <div style="font:800 19px 'Noto Sans Thai';color:#101828">เพิ่มห้องเรียน</div>
        <button type="button" data-act="closeAdd" style="border:none;background:#f2f4f7;color:#667085;width:30px;height:30px;border-radius:8px;cursor:pointer;font:700 15px Inter;flex:none">✕</button>
      </div>
      <div style="padding:18px 24px 8px;flex:none;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <label style="font:700 13.5px 'Noto Sans Thai';color:#344054;flex:none;white-space:nowrap"><span style="color:#ef4444">*</span> โรงเรียน:</label>
          ${schoolField}
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <label style="font:700 13.5px 'Noto Sans Thai';color:#344054;flex:none;white-space:nowrap">วันที่ลงทะเบียน:</label>
          <input type="date" data-chg="setAddFrom" value="${esc(f.from)}" style="${fldStl};flex:1;min-width:130px;cursor:pointer">
          <span style="color:#98a2b3;font:600 13px 'Noto Sans Thai'">→</span>
          <input type="date" data-chg="setAddTo" value="${esc(f.to)}" style="${fldStl};flex:1;min-width:130px;cursor:pointer">
          ${sel("setAddGrade", f.grade, "ระดับชั้น", gradeOpts)}
          ${sel("setAddLevel", f.level, "ชั้นปี", levelOpts)}
          ${sel("setAddRoom", f.classRoom, "ห้องเรียน", roomOpts)}
        </div>
      </div>
      <div class="scrolly" style="flex:1;min-height:0;overflow-y:auto;padding:8px 24px 18px;display:flex;flex-direction:column;gap:11px">
        ${rows}
      </div>
      <div style="padding:15px 24px;border-top:1px solid #f2f4f7;display:flex;gap:10px;justify-content:flex-end;align-items:center;flex:none">
        ${state.addSel ? `<span style="font:600 12.5px 'Noto Sans Thai';color:#0f766e;margin-right:auto">เลือกแล้ว 1 รายวิชา</span>` : ""}
        <button type="button" data-act="closeAdd" class="h-light" style="border:1px solid #e4e7ec;background:#fff;color:#475467;border-radius:999px;padding:11px 18px;font:700 13.5px 'Noto Sans Thai';cursor:pointer">ยกเลิก</button>
        <button type="button" data-act="confirmAdd" style="border:none;background:${addDisabled ? "#c5e9e4" : "#0d9488"};color:#fff;border-radius:999px;padding:11px 24px;font:700 13.5px 'Noto Sans Thai';cursor:${addDisabled ? "not-allowed" : "pointer"}">${state.addSaving ? "กำลังบันทึก..." : "เพิ่มห้องเรียน"}</button>
      </div>
    </div>
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
    <div>authed: <b style="color:${state.authed ? "#22c55e" : "#f87171"}">${state.authed}</b> · sub: <span style="color:#93c5fd">${esc(sub || "—")}</span></div>
    <div>profile: <span style="color:#a7f3d0">${esc(state.teacherName || "—")}</span> · ${esc(state.teacherEmail || "—")}</div>
    <div>token exp: ${auth?.token?.access_token ? esc(new Date((decodeJwt(auth.token.access_token)?.exp || 0) * 1000).toLocaleString("th-TH")) : "—"} · instituteId: ${esc(state.instituteId || "—")}</div>
    <div>classrooms mapped: <b style="color:#fbbf24">${state.classrooms.length}</b></div>
    <div>selected student API userId: <span style="color:#a7f3d0">${esc(state.studentDetail?.apiUserId || "—")}</span></div>
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
function viewSessionExpired() {
  return `<div role="alertdialog" aria-modal="true" aria-labelledby="session-expired-title" style="position:fixed;inset:0;z-index:1600;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(16,24,40,.58);backdrop-filter:blur(3px)">
    <div style="width:min(420px,100%);background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:26px;box-shadow:0 24px 64px rgba(16,24,40,.28);text-align:center">
      <div style="width:52px;height:52px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fff7ed;color:#c2410c;font:800 24px Inter">!</div>
      <div id="session-expired-title" style="font:800 20px 'Noto Sans Thai';color:#101828">เซสชันหมดอายุ</div>
      <div style="margin-top:8px;font:500 13.5px/1.65 'Noto Sans Thai';color:#667085">เพื่อความปลอดภัย ระบบได้ออกจากระบบแล้ว กรุณาเข้าสู่ระบบอีกครั้งเพื่อโหลดข้อมูลต่อ</div>
      <button data-act="relogin" style="width:100%;margin-top:22px;border:none;border-radius:999px;padding:13px 18px;background:linear-gradient(100deg,#12a594,#0d9488);color:#fff;cursor:pointer;font:700 14px 'Noto Sans Thai'">เข้าสู่ระบบอีกครั้ง</button>
    </div>
  </div>`;
}

/* ============================== ROOT RENDER ============================== */
function overlaysHtml() {
  return (state.userMenuOpen ? `<div data-act="closeUserMenu" style="position:fixed;inset:0;z-index:95"></div>` : "") +
    (state.notifOpen ? `<div data-act="closeNotif" style="position:fixed;inset:0;z-index:95"></div>` : "") +
    (state.leadoOpen ? `<div data-act="closeLeado" style="position:fixed;inset:0;z-index:94"></div>` : "") +
    (state.cardMenu ? `<div data-act="closeCardMenu" style="position:fixed;inset:0;z-index:96"></div>${viewCardMenu()}` : "");
}

/* ---- Leado attention demo + typewriter greeting ---- */
let leadoDemoT1 = null, leadoDemoT2 = null, leadoTyper = null;
function cancelLeadoDemo() {
  clearTimeout(leadoDemoT1); clearTimeout(leadoDemoT2);
  leadoDemoT1 = leadoDemoT2 = null;
  state.leadoDemo = false;
}
// Once per session, auto-expand the Leado panel from its icon, hold ~2s, then shrink back —
// a one-time hint that the AI assistant lives here.
function maybePlayLeadoDemo() {
  if (state.leadoDemoed || !state.ready || !state.authed) return;
  state.leadoDemoed = true;
  leadoDemoT1 = setTimeout(() => {
    if (!state.authed || state.leadoOpen) return;
    state.leadoDemo = true; renderTopbar();
    leadoDemoT2 = setTimeout(() => { state.leadoDemo = false; renderTopbar(); }, 2600);
  }, 1000);
}
// Type the greeting bubble out character-by-character on each Leado open.
function runLeadoTyper() {
  const el = document.getElementById("leado-greet");
  if (!el || el.dataset.done) return;
  const full = el.dataset.full || "";
  if (el.textContent.length >= full.length) { el.dataset.done = "1"; return; }
  clearInterval(leadoTyper);
  let i = el.textContent.length;
  leadoTyper = setInterval(() => {
    i++; el.textContent = full.slice(0, i);
    if (i >= full.length) { clearInterval(leadoTyper); el.dataset.done = "1"; }
  }, 34);
}

/* Lightweight update for header panels (Leado/notif/user menu) — rebuilds only the
   topbar layer so the landing map is never destroyed/recreated (no flicker). */
function renderTopbar(patch) {
  if (patch) Object.assign(state, patch);
  const layer = document.getElementById("tb-layer");
  if (!layer) { render(); return; }
  layer.innerHTML = overlaysHtml() + viewTopBar();
  const inp = document.getElementById("leadoMsg");
  if (inp && state.leadoOpen) inp.focus();
  if (state.leadoOpen || state.leadoDemo) runLeadoTyper();
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const zoom = state.fontSize === "sm" ? 0.9 : state.fontSize === "lg" ? 1.15 : 1;

  if (!state.ready) {
    app.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:#0f766e;color:#fff">
      <div style="width:96px;height:96px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.18)"><img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-adap-green-untext.1c98bf032947.png" alt="MECA" style="width:64px;height:44px;object-fit:contain"></div>
      <div style="font:700 15px 'Noto Sans Thai'">กำลังโหลดข้อมูล...</div>
    </div>`;
    if (DEBUG) updateDebugPanel();
    return;
  }

  app.innerHTML = `
    <div style="height:calc(100dvh / ${zoom});width:calc(100% / ${zoom});display:flex;flex-direction:column;padding-top:60px;overflow:hidden;zoom:${zoom}">
      ${!state.course ? viewLanding() : ""}
      <div id="tb-layer" style="display:contents">${overlaysHtml()}${viewTopBar()}</div>
      ${state.course ? viewDashboard() : ""}
      ${state.editOpen ? viewEditModal() : ""}
      ${state.addOpen ? viewAddModal() : ""}
      ${state.delTarget ? viewRemoveModal() : ""}
      ${state.student != null ? viewDrawer() : ""}
      ${state.authError ? viewErrorToast() : ""}
      ${state.loadingCourse ? viewLoadingOverlay() : ""}
      ${state.sessionExpired ? viewSessionExpired() : ""}
    </div>`;

  if (DEBUG) updateDebugPanel();
  requestAnimationFrame(mountMaps);
  if (state.leadoOpen || state.leadoDemo) runLeadoTyper();
  maybePlayLeadoDemo();
}

/* focus retention across full re-render */
function setState(patch) {
  const active = document.activeElement;
  let focus = null;
  const scrollPositions = new Map(
    [...document.querySelectorAll("[data-scroll-key]")].map((el) => [
      el.dataset.scrollKey,
      { top: el.scrollTop, left: el.scrollLeft }
    ])
  );
  if (active && active.id && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    focus = { id: active.id, start: active.selectionStart, end: active.selectionEnd };
  }
  Object.assign(state, patch);
  render();
  document.querySelectorAll("[data-scroll-key]").forEach((el) => {
    const saved = scrollPositions.get(el.dataset.scrollKey);
    if (!saved) return;
    el.scrollTop = saved.top;
    el.scrollLeft = saved.left;
  });
  if (focus) {
    const el = document.getElementById(focus.id);
    if (el) { el.focus(); try { el.setSelectionRange(focus.start, focus.end); } catch (_) {} }
  }
}

/* ------------------------------ maps ------------------------------ */
function mountMaps() {
  // clear stale instances whose container is gone
  ["usage"].forEach((k) => {
    const m = maps[k];
    if (m && !document.body.contains(m.getContainer())) { m.remove(); maps[k] = null; }
  });
  if (!window.L) return;

  const usageEl = document.getElementById("th-usage-map");
  if (usageEl && !maps.usage) {
    const map = L.map(usageEl, { zoomControl: false, scrollWheelZoom: false, attributionControl: false }).setView([14.4, 101.2], 5.5);
    maps.usage = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 12, minZoom: 4 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapPoints().forEach((p) => {
      const label = kFmt(p.n);
      const col = p.pin ? "#ef4444" : tierColor(p.n); // colour by user-count tier
      let html;
      if (p.pin) html = `<div style="position:relative;transform:translate(-50%,-100%)"><div style="width:34px;height:34px;border-radius:50%;background:${col};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font:800 13px Inter;color:#fff">${label}</div><div style="position:absolute;left:50%;top:30px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid ${col}"></div></div>`;
      else { const fs = p.big ? 15 : 12, halo = p.big ? 11 : 7; html = `<div style="width:${p.size}px;height:${p.size}px;border-radius:50%;background:${col};opacity:.9;border:2px solid rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;font:700 ${fs}px Inter;color:#fff;box-shadow:0 0 0 ${halo}px ${col}22,0 2px 6px rgba(0,0,0,.18)">${label}</div>`; }
      L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 0] }), interactive: false }).addTo(map);
    });
    setTimeout(() => maps.usage && maps.usage.invalidateSize(), 250);
    startSlideTimer(); // auto-rotate the overview topics
  }
  if (!usageEl) stopSlideTimer();

}

function startSlideTimer() {
  stopSlideTimer();
  slideTimer = setInterval(() => {
    state.mapSlide = (state.mapSlide + 1) % insightSlides().length;
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
  // map stays fixed on Thailand (no per-slide flyTo) so all province bubbles remain visible
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
      if (!state.sessionExpired) setState({ loadingCourse: false, authError: "โหลดข้อมูลห้องเรียนไม่สำเร็จ: " + err.message });
    }
  },
  switchCourse: () => setState({ course: null, student: null, userMenuOpen: false }),
  closeError: () => setState({ authError: null }),
  relogin: () => startLogin(),
  openStudent: async (id) => {
    const st = state.students.find((item) => String(item.id) === String(id));
    if (!st) return;
    setState({
      student: id,
      studentDetail: {
        studentId: id, loading: true,
        readingLoading: true, videoLoading: true,
        apiUserId: null, reading: null, video: null, readingEntries: [], videoEntries: [], errors: []
      }
    });
    const detail = await loadStudentDetailApis(st);
    if (String(state.student) === String(id)) setState({ studentDetail: detail });
  },
  closeStudent: () => setState({ student: null }),
  toggleUserMenu: () => renderTopbar({ userMenuOpen: !state.userMenuOpen, notifOpen: false, leadoOpen: false }),
  closeUserMenu: () => renderTopbar({ userMenuOpen: false }),
  openEdit: () => setState({ editOpen: true, userMenuOpen: false }),
  closeEdit: () => setState({ editOpen: false }),
  saveEdit: () => setState({ editOpen: false }),
  openAdd: () => {
    // Fresh filter state each open; role=user is pinned to their institute, staff/admin can search.
    state.addFilters = { from: "", to: "", grade: "", level: "", classRoom: "", instituteId: state.instituteId || "" };
    state.addOptions = { grades: [], levels: [], classRooms: [] };
    state.addInstQuery = state.teacherSchool || "";
    state.addInstOptions = [];
    state.addCourses = [];
    setState({ addOpen: true, addSel: null, addError: "" });
    H.loadAddCourses();
  },
  closeAdd: () => setState({ addOpen: false }),
  // Re-query the catalog when any filter changes (grade/level/classRoom/date/institute) — matches the original.
  reloadAddCourses: () => { state.addCourses = []; H.loadAddCourses(); },
  loadAddCourses: async () => {
    if (state.addCourses.length) return; // cached until a filter change clears it
    // Build the GET /course query from the modal filters. Like the original, no query → no fetch.
    const f = state.addFilters;
    const q = {};
    if (f.instituteId) q.instituteId = f.instituteId;
    if (f.grade) q.grade = f.grade;
    if (f.level) q.level = f.level;
    if (f.classRoom) q.classRoom = f.classRoom;
    if (f.from && f.to) q.createDate = `${f.from},${f.to}`;
    if (!Object.keys(q).length) { setState({ addCourses: [], addOptions: { grades: [], levels: [], classRooms: [] }, addLoading: false, addError: "" }); return; }
    setState({ addLoading: true, addError: "" });
    try {
      const courses = mapCourseRow(normalizeListPayload(await apiCourseSearch(q)));
      setState({ addCourses: courses, addOptions: deriveAddOptions(courses), addLoading: false });
    } catch (err) {
      setState({ addCourses: [], addLoading: false, addError: "โหลดรายวิชาไม่สำเร็จ: " + err.message });
    }
  },
  // institute autocomplete (staff/admin): pick a result → set instituteId → reload the catalog
  selectAddInst: (id) => {
    const opt = (state.addInstOptions || []).find((o) => o.value === id);
    state.addFilters.instituteId = id;
    state.addInstQuery = opt ? opt.label : "";
    state.addInstOptions = [];
    state.addCourses = [];
    H.loadAddCourses();
  },
  selectAddCourse: (id) => setState({ addSel: state.addSel === id ? null : id }),
  confirmAdd: async () => {
    const c = (state.addCourses || []).find((x) => x.courseId === state.addSel);
    if (!c || state.addSaving) return;
    const f = state.addFilters;
    // Create the assign, then refetch the real classroom list.
    setState({ addSaving: true, addError: "" });
    try {
      await apiCreateAssign({
        userId: state.sub, teacherId: state.sub, courseId: c.courseId, instituteId: f.instituteId || state.instituteId,
        grade: f.grade || undefined, level: Number(f.level) || undefined, classRoom: f.classRoom || undefined,
        startDate: f.from || undefined, endDate: f.to || undefined,
      });
      const resp = await apiClassrooms(state.sub, state.instituteId);
      state.classrooms = flattenClassrooms(normalizeListPayload(resp));
      setState({ addOpen: false, addSel: null, addSaving: false });
    } catch (err) {
      setState({ addSaving: false, addError: "เพิ่มห้องเรียนไม่สำเร็จ: " + err.message });
    }
  },
  // ⋮ on a classroom card. The button's rect is measured now because the menu renders fixed;
  // divide by zoom since it lives inside the zoomed app wrapper.
  toggleCardMenu: (id, el) => {
    if (state.cardMenu === id) { setState({ cardMenu: null, cardMenuPos: null }); return; }
    const z = state.fontSize === "sm" ? 0.9 : state.fontSize === "lg" ? 1.15 : 1;
    const r = el.getBoundingClientRect();
    setState({
      cardMenu: id,
      cardMenuPos: { top: (r.bottom + 6) / z, right: (window.innerWidth - r.right) / z },
    });
  },
  closeCardMenu: () => setState({ cardMenu: null, cardMenuPos: null }),
  askRemoveClass: (id) => setState({ cardMenu: null, cardMenuPos: null, delTarget: id, delError: "", delSaving: false }),
  closeRemove: () => { if (!state.delSaving) setState({ delTarget: null, delError: "" }); },
  confirmRemove: async () => {
    const cls = state.classrooms.find((c) => String(c.id) === String(state.delTarget));
    if (!cls || state.delSaving) return;
    if (!cls.assignId) { setState({ delError: "ห้องเรียนนี้ไม่มี assignId จึงนำออกไม่ได้" }); return; }
    setState({ delSaving: true, delError: "" });
    try {
      await apiDeleteAssign(cls.assignId);
      // Refetch rather than splice locally, same as confirmAdd — the server list is the truth.
      const resp = await apiClassrooms(state.sub, state.instituteId);
      state.classrooms = flattenClassrooms(normalizeListPayload(resp));
      setState({ delTarget: null, delSaving: false });
    } catch (err) {
      if (!state.sessionExpired) setState({ delSaving: false, delError: "นำห้องเรียนออกไม่สำเร็จ: " + err.message });
    }
  },
  signOut: () => oidcLogout(),
  toggleNotif: () => renderTopbar({ notifOpen: !state.notifOpen, userMenuOpen: false, leadoOpen: false }),
  closeNotif: () => renderTopbar({ notifOpen: false }),
  toggleLeado: () => { cancelLeadoDemo(); renderTopbar({ leadoOpen: !state.leadoOpen, notifOpen: false, userMenuOpen: false }); },
  closeLeado: () => { cancelLeadoDemo(); renderTopbar({ leadoOpen: false }); },
  closeAllPanels: () => { cancelLeadoDemo(); renderTopbar({ leadoOpen: false, notifOpen: false, userMenuOpen: false }); },
  noop: () => {},
  signIn: () => startLogin(),
  setFilter: (key) => setState({ filter: key }),
  setCourseTab: (key) => setState({ courseTab: key }),
  pickLang: (code) => setState({ lang: code }),
  pickFont: (size) => setState({ fontSize: size }),
  goSlide: (i) => { state.mapSlide = Number(i); stopSlideTimer(); applySlide(); startSlideTimer(); },
  downloadCsv: () => exportCsv(),
};
// debounced institute search for the add-classroom modal (staff/admin)
let instSearchTimer = null;
function scheduleInstSearch(text) {
  clearTimeout(instSearchTimer);
  const q = (text || "").trim();
  if (!q) { state.addInstOptions = []; setState({}); return; }
  instSearchTimer = setTimeout(async () => {
    try {
      const rows = normalizeListPayload(await apiInstituteSearch(q));
      state.addInstOptions = rows.map((i) => ({ value: i.instituteId || i.institute_id || "", label: `${i.instituteName || i.name || ""}${i.district ? ` (${i.district}${i.province ? ", " + i.province : ""})` : ""}` }));
    } catch (_) { state.addInstOptions = []; }
    setState({});
  }, 450);
}
const INP = {
  setSearch: (v) => setState({ search: v }),
  setLeadoMsg: (v) => { state.leadoMsg = v; },
  setTeacherName: (v) => { state.teacherName = v; },
  // type in the institute box (staff/admin): store text + debounce a search, no full re-render per keystroke
  setAddInst: (v) => { state.addFilters.instituteId = ""; state.addInstQuery = v; scheduleInstSearch(v); },
};
const CHG = {
  setSort: (v) => setState({ sort: v }),
  // every add-classroom filter re-queries GET /course (options are derived from the response)
  setAddGrade: (v) => { state.addFilters.grade = v; H.reloadAddCourses(); },
  setAddLevel: (v) => { state.addFilters.level = v; H.reloadAddCourses(); },
  setAddRoom: (v) => { state.addFilters.classRoom = v; H.reloadAddCourses(); },
  setAddFrom: (v) => { state.addFilters.from = v; H.reloadAddCourses(); },
  setAddTo: (v) => { state.addFilters.to = v; H.reloadAddCourses(); },
};
const SUB = { saveEdit: () => setState({ editOpen: false }) };

function bindEvents() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const fn = H[t.dataset.act];
    // 2nd arg is the clicked element — handlers that anchor a popover need its rect
    if (fn) { if (t.dataset.act !== "noop") e.preventDefault(); fn(t.dataset.arg, t); }
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
  // responsive: full re-render only when crossing a breakpoint; otherwise just resize maps
  window.addEventListener("resize", () => {
    // the card ⋮ menu is pinned to coordinates measured before the resize — drop it
    const hadMenu = !!state.cardMenu;
    if (hadMenu) { state.cardMenu = null; state.cardMenuPos = null; }
    const k = layoutKey();
    if (k !== lastLayout || hadMenu) { lastLayout = k; render(); }
    else ["usage"].forEach((k) => maps[k] && maps[k].invalidateSize());
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

function cleanAuthParams() {
  try {
    const url = new URL(globalThis.location.href);
    ["code", "state", "session_state", "iss"].forEach((k) => url.searchParams.delete(k));
    globalThis.history.replaceState({}, document.title, url.toString());
  } catch (_) {}
}

async function apiInit() {
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
  if (auth && authExpired(auth)) { expireSession(); return; }
  if (!auth || !sub) { state.ready = true; state.authed = false; render(); return; }
  state.authed = true; state.sub = sub;

  // ---- real profile: token claims -> user/{sub} -> teacher/{sub} ----
  const claims = decodeJwt(auth?.token?.id_token || auth?.token?.access_token || "") || {};
  const claimName = claims.name || `${claims.given_name || ""} ${claims.family_name || ""}`.trim();
  if (claimName) state.teacherName = claimName;
  if (claims.email || claims.preferred_username) state.teacherEmail = claims.email || claims.preferred_username;

  try {
    let user = null;
    try { user = await apiUser(sub); } catch (err) { if (state.sessionExpired) throw err; }
    state.debugUser = user;
    if (user) {
      const un = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : (user.name || user.displayName);
      if (un) state.teacherName = un;
      if (user.email) state.teacherEmail = user.email;
    }

    let teacher = null;
    try { teacher = await apiTeacher(sub); } catch (err) { if (state.sessionExpired) throw err; }
    state.debugTeacher = teacher;
    // Role decides the add-classroom flow: user = pinned institute, staff/admin = search institute.
    state.teacherRole = (user && user.role) || (teacher && teacher.user && teacher.user.role) || "";
    if (teacher) {
      if (!user) {
        const nm = teacher.firstName ? `${teacher.firstName} ${teacher.lastName || ""}`.trim() : (teacher.name || teacher.displayName);
        if (nm) state.teacherName = nm;
      }
      state.instituteId = teacher.institute?.instituteId || teacher.instituteId || teacher.institute_id || teacherConfig.instituteId || "";
    } else {
      state.instituteId = teacherConfig.instituteId || "";
    }
    const classroomsResp = await apiClassrooms(sub, state.instituteId);
    state.debugClassroomsRaw = classroomsResp;
    const raw = normalizeListPayload(classroomsResp);
    state.classrooms = flattenClassrooms(raw);
    // Real school label for the add-classroom modal: from teacher's institute, else first classroom.
    const instName = teacher?.institute?.instituteName || teacher?.instituteName || "";
    const instProv = teacher?.institute?.province || teacher?.province || "";
    const withSchool = state.classrooms.find((c) => c.school);
    if (instName) state.teacherSchool = instName + (instProv ? ` (${instProv})` : "");
    else if (withSchool) state.teacherSchool = withSchool.school + (withSchool.province ? ` (${withSchool.province})` : "");
    state.ready = true;
    render();
    // optional direct deep-link ?assignid=... opens a classroom immediately
    if (teacherConfig.assignId) {
      const match = state.classrooms.find((c) => String(c.assignId) === String(teacherConfig.assignId));
      if (match) H.pickCourse(match.id);
    }
  } catch (err) {
    state.ready = true;
    if (!state.sessionExpired) state.authError = "โหลดรายชื่อห้องเรียนไม่สำเร็จ: " + err.message;
    render();
  }
}

async function init() {
  bindEvents();
  render();
  loadLandingStats(); // real landing stats/bubbles from the public enroll aggregate (non-blocking)
  return apiInit();
}
init();
