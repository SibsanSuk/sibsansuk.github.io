const qs = new URLSearchParams(window.location.search);
const SHOW_DEBUG_CARD = qs.get("debug") === "1";
const SHOW_LOGIN_BUTTONS = qs.get("loginbtn") === "true";
const getCurrentPageUrl = () => {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
};
const STUDENT_CONFIG = window.STUDENT_DASHBOARD_CONFIG || {};
const OIDC = {
  authorizationEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/auth",
  tokenEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/token",
  userinfoEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/userinfo",
  logoutEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/logout",
  clientId: "dashboard",
  redirectUri: getCurrentPageUrl(),
  scope: "openid profile email",
  ...(STUDENT_CONFIG.oidc || {}),
};

const base64Url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.length; i += 1) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const sha256 = (plain) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));

const createVerifier = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64Url(arr);
};

const buildAuthUrl = async () => {
  const verifier = createVerifier();
  const challenge = base64Url(await sha256(verifier));
  sessionStorage.setItem("pkce_verifier", verifier);
  const params = new URLSearchParams({
    client_id: OIDC.clientId,
    redirect_uri: OIDC.redirectUri,
    response_type: "code",
    scope: OIDC.scope,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${OIDC.authorizationEndpoint}?${params.toString()}`;
};

const startLogin = async () => {
  if (OIDC.clientId === "YOUR_CLIENT_ID") {
    alert("กรุณาตั้งค่า client_id ก่อนใช้งานการเข้าสู่ระบบ");
    return;
  }
  if (courseId) {
    sessionStorage.setItem("post_login_courseid", courseId);
  }
  const url = await buildAuthUrl();
  window.location.href = url;
};

const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch (e) {
    return null;
  }
};

const storeAuth = (auth) => sessionStorage.setItem("oidc_auth", JSON.stringify(auth));
const readAuth = () => {
  const raw = sessionStorage.getItem("oidc_auth");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};
const clearAuth = () => sessionStorage.removeItem("oidc_auth");

const logout = (auth) => {
  clearAuth();
  const idToken = auth?.token?.id_token;
  if (!idToken) return;
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: OIDC.redirectUri,
    client_id: OIDC.clientId,
  });
  window.location.href = `${OIDC.logoutEndpoint}?${params.toString()}`;
};

const exchangeCodeForToken = async (code) => {
  const verifier = sessionStorage.getItem("pkce_verifier");
  if (!verifier) throw new Error("missing PKCE verifier");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: OIDC.clientId,
    redirect_uri: OIDC.redirectUri,
    code,
    code_verifier: verifier,
  });
  const res = await fetch(OIDC.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "token exchange failed");
  }
  return res.json();
};

const fetchUserInfo = async (accessToken) => {
  const res = await fetch(OIDC.userinfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
};

const params = new URLSearchParams(window.location.search);
const getQueryParamPreservePlus = (name) => {
  const pattern = new RegExp(`[?&]${name}=([^&]*)`);
  const match = window.location.search.match(pattern);
  if (!match) return null;
  try {
    // Keep '+' as literal plus (not space) for ids like course-v1:ORG+COURSE+RUN
    return decodeURIComponent(match[1].replace(/\+/g, "%2B"));
  } catch {
    return match[1].replace(/\+/g, "+");
  }
};
let bookrollOverallChartInstance = null;
let videoOverallChartInstance = null;
let chatbotQuizOverallChartInstance = null;
let userId = null;
let courseId = getQueryParamPreservePlus("courseid") || params.get("courseid");
if (courseId) {
  const courseEl = document.getElementById("course-id");
  if (courseEl) courseEl.textContent = courseId;
}
const currentUserEl = document.getElementById("current-userid");
if (currentUserEl) currentUserEl.textContent = userId || "-";
const currentCourseEl = document.getElementById("current-courseid");
if (currentCourseEl) currentCourseEl.textContent = courseId || "-";

const inputUserEl = document.getElementById("input-userid");
const inputCourseEl = document.getElementById("input-courseid");
const loginDebugStatusEl = document.getElementById("login-debug-status");
const loginDebugTabSummaryEl = document.getElementById("login-debug-tab-summary");
const loginDebugTabDerivedEl = document.getElementById("login-debug-tab-derived");
const loginDebugTabRawEl = document.getElementById("login-debug-tab-raw");
if (inputUserEl) inputUserEl.value = userId || "";
if (inputCourseEl) inputCourseEl.value = courseId || "";

const applyParams = (nextCourseId) => {
  const url = new URL(window.location.href);
  if (nextCourseId) url.searchParams.set("courseid", nextCourseId);
  else url.searchParams.delete("courseid");
  window.history.replaceState({}, document.title, url.toString());
};

const restoreCourseIdAfterLogin = () => {
  if (courseId) return;
  const savedCourseId = sessionStorage.getItem("post_login_courseid");
  if (!savedCourseId) return;
  courseId = savedCourseId;
  sessionStorage.removeItem("post_login_courseid");
  applyParams(courseId);
  syncHeader();
};

const syncHeader = () => {
  if (currentUserEl) currentUserEl.textContent = userId || "-";
  if (currentCourseEl) currentCourseEl.textContent = courseId || "-";
  const headerCourseNameEl = document.getElementById("header-course-name");
  if (headerCourseNameEl) {
    headerCourseNameEl.textContent = decodeIfMojibake(window.courseDetailData?.courseTitle || window.courseDetailData?.title) || "-";
  }
  const headerLearnerNameEl = document.getElementById("header-learner-name");
  if (headerLearnerNameEl) {
    const profile = auth?.profile && typeof auth.profile === "object" ? auth.profile : {};
    const name = typeof profile.name === "string" && profile.name.trim()
      ? profile.name.trim()
      : (typeof profile.given_name === "string" && profile.given_name.trim()
        ? profile.given_name.trim()
        : (typeof profile.preferred_username === "string" && profile.preferred_username.trim()
          ? profile.preferred_username.trim()
          : (typeof profile.email === "string" && profile.email.trim()
            ? profile.email.trim()
            : "-")));
    headerLearnerNameEl.textContent = name;
  }
  const courseEl = document.getElementById("course-id");
  if (courseEl) courseEl.textContent = courseId || "-";
  updateLoginDebugPanel();
};

const topicTabsEl = document.getElementById("topic-tabs");
if (topicTabsEl) {
  topicTabsEl.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-topic-idx]");
    if (!btn) return;
    const idx = Number(btn.getAttribute("data-topic-idx"));
    if (!Number.isFinite(idx)) return;
    window.topicIndex = idx;
    renderTopicTabsAndDetail();
  });
}


const bookrollUrl = (uid, cid) =>
  `https://bookroll.thaidlt.com/meca/student/BR_activity?userID=${encodeURIComponent(uid)}&usageId=${encodeURIComponent(cid)}`;

const bookrollReadingDataUrl = (uid, cid) =>
  `https://bookroll.thaidlt.com/meca/student/readingData?userID=${encodeURIComponent(uid)}&usageId=${encodeURIComponent(cid)}&view=student&ts=${Date.now()}`;

const videoBarUrl = (userName, cid) =>
  `https://viola.thaidlt.com/meca/chart/bar/?userName=${encodeURIComponent(userName)}&usageId=${encodeURIComponent(cid)}`;

const videoHeatmapUrl = (userName, cid) =>
  `https://viola.thaidlt.com/meca/chart/heatmapTime/?userName=${encodeURIComponent(userName)}&usageId=${encodeURIComponent(cid)}`;

const courseUrl = (cid) =>
  `https://sbs-backend.mooc.meca.in.th/lms/${encodeURIComponent(cid)}`;

const chatbotSpeedUrl = (cid, uid) =>
  `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotSpeed/${encodeURIComponent(cid)}/${encodeURIComponent(uid)}`;

const chatbotPerformanceUrl = (cid, uid) =>
  `https://sbs-backend.mooc.meca.in.th/stats/echart/chatbotPerformance/${encodeURIComponent(cid)}/${encodeURIComponent(uid)}`;

const chatbotScoreV2Url = (cid) =>
  `https://sbs-backend.mooc.meca.in.th/me/data/chatbot/${encodeURIComponent(cid)}`;

const adaptiveQuizSharedDashboardUrl = (learnerEmail, leadLabel, refCode) =>
  `https://edubot.abdul.in.th/adaptive-quiz/api/v1/shared-dashboard/learner/${encodeURIComponent(learnerEmail)}/by-lead-label/${encodeURIComponent(leadLabel)}?ref_code=${encodeURIComponent(refCode)}`;

const normalizeAdaptiveQuizLeadLabel = (cid) =>
  String(cid || "").replace(/^course-v1:/, "");

const ADAPTIVE_QUIZ_READONLY_API_KEY = "MvljPE_NrchnS7tJLU5pWck444BtpYC6d1V0GeuWucI";

const getAdaptiveQuizApiKey = () => ADAPTIVE_QUIZ_READONLY_API_KEY;

const getAdaptiveQuizRefCode = () =>
  STUDENT_CONFIG.adaptiveQuiz?.refCode ||
  qs.get("ref_code") ||
  qs.get("refCode") ||
  qs.get("adaptive_ref_code") ||
  getAdaptiveQuizBlockIdFromCourse(window.courseDetailData) ||
  "";

const extractBlockRefFromId = (id) => {
  const match = String(id || "").match(/(?:^|[+])block@([^+@/?#&]+)/);
  return match?.[1] || "";
};

const extractAdaptiveQuizRefFromIframeUrl = (url) => {
  const raw = String(url || "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw, window.location.href);
    const msg = parsed.searchParams.get("msg") || "";
    const parts = decodeURIComponent(msg).split(",");
    return String(parts[1] || "").trim();
  } catch {
    const match = raw.match(/[?&]msg=([^&#]+)/);
    if (!match) return "";
    try {
      const parts = decodeURIComponent(match[1]).split(",");
      return String(parts[1] || "").trim();
    } catch {
      return "";
    }
  }
};

const getAdaptiveQuizBlockIdFromCourse = (course) => {
  const stack = course && typeof course === "object" ? [course] : [];
  const candidates = [];
  while (stack.length) {
    const node = stack.shift();
    if (!node || typeof node !== "object") continue;
    const id = String(node.id || "");
    const fields = node.fields && typeof node.fields === "object" ? node.fields : {};
    const data = fields.data && typeof fields.data === "object" ? fields.data : {};
    const aetool = String(fields.aetool || fields.tool_type || fields.toolType || data.aetool || "").toLowerCase();
    const iframeUrl = String(fields.iframe_url || fields.iframeUrl || fields.launch_url || fields.launchUrl || fields.url || fields.href || fields.src || data.iframe_url || "");
    const isSharedDashboardLead = iframeUrl.includes("/adaptive-quiz/lead");
    const isAdaptiveQuiz = isSharedDashboardLead || aetool === "chatbot" || iframeUrl.includes("/chat/adaptive/");
    if (isAdaptiveQuiz) {
      const refCode = extractBlockRefFromId(id) || extractAdaptiveQuizRefFromIframeUrl(iframeUrl);
      if (refCode) {
        candidates.push({
          refCode,
          priority: isSharedDashboardLead ? 0 : (iframeUrl.includes("/chat/adaptive/") ? 1 : 2)
        });
      }
    }
    const kids = Array.isArray(node.children) ? node.children : [];
    if (kids.length) stack.push(...kids);
  }
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0]?.refCode || "";
};

const getAdaptiveQuizLearnerEmail = () => {
  const profile = auth?.profile && typeof auth.profile === "object" ? auth.profile : {};
  const candidates = [
    STUDENT_CONFIG.adaptiveQuiz?.learnerEmail,
    qs.get("learner_email"),
    qs.get("learnerEmail"),
    profile.email,
    auth?.userinfo?.email,
    auth?.claims?.email,
    userId
  ];
  return String(candidates.find((value) => typeof value === "string" && value.includes("@")) || "").trim();
};

const isLikelyCourseId = (cid) =>
  typeof cid === "string" && cid.includes("course-v1:");

const pickNumber = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
};


const normalizeTopicKey = (s) =>
  decodeIfMojibake(String(s || ""))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeUsageId = (s) => {
  const v = decodeIfMojibake(String(s || "")).trim();
  return v ? v.toLowerCase() : "";
};

const parseReadTotal = (v) => {
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d+)\s*:\s*(\d+)$/);
    if (m) {
      const read = Number(m[1]);
      const total = Number(m[2]);
      const progress = total > 0 ? clamp(Math.round((read / total) * 100), 0, 100) : 0;
      return { read, total, progress };
    }
  }
  if (v && typeof v === "object") {
    const read = pickNumber(v, ["read", "readPage", "read_page", "current", "done"]);
    const total = pickNumber(v, ["total", "totalPage", "total_page", "max", "all"]);
    if (read != null && total != null) {
      const progress = total > 0 ? clamp(Math.round((read / total) * 100), 0, 100) : 0;
      return { read, total, progress };
    }
    const progress = pickNumber(v, ["progress", "progressRate", "rate", "percent", "percentage"]);
    if (progress != null) {
      return { read: null, total: null, progress: clamp(Math.round(progress), 0, 100) };
    }
  }
  return null;
};

const buildReadingProgressMap = (payload, opts = {}) => {
  const usageHint = normalizeUsageId(opts?.usageId || opts?.usageID || "");
  const titleHint = decodeIfMojibake(String(opts?.titleHint || "")).trim();
  const out = [];
  const seen = new Set();
  const pushEntry = (titleRaw, parsed, usageIdRaw) => {
    if (!parsed) return;
    const title = decodeIfMojibake(String(titleRaw || titleHint || "")).trim();
    const key = normalizeTopicKey(title);
    const usageId = normalizeUsageId(usageIdRaw || usageHint || "");
    const dedupeKey = `${usageId}|${key}|${parsed.progress ?? "-"}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    out.push({
      title: title || (usageId ? `usageId:${usageId}` : "-"),
      key,
      usageId,
      read: parsed.read,
      total: parsed.total,
      progress: parsed.progress
    });
  };
  const tryArrayRows = (rows) => {
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const parsed = parseReadTotal(row) || parseReadTotal(row.value) || parseReadTotal(row.stats) || parseReadTotal(row.data);
      const title =
        row.title ||
        row.topic ||
        row.label ||
        row.name ||
        row.display_name ||
        row.displayName ||
        row.book_title ||
        row.bookTitle;
      const usageId = row.usageId || row.usage_id || row.courseId || row.course_id || row.id;
      pushEntry(title, parsed, usageId);
    });
  };
  const tryObjectMap = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    Object.entries(obj).forEach(([k, raw]) => {
      const parsed = parseReadTotal(raw);
      if (parsed) pushEntry(k, parsed, null);
    });
  };

  if (Array.isArray(payload)) {
    tryArrayRows(payload);
  } else if (payload && typeof payload === "object") {
    tryArrayRows(payload.results);
    tryArrayRows(payload.result);
    tryArrayRows(payload.data);
    tryObjectMap(payload.results);
    tryObjectMap(payload.result);
    tryObjectMap(payload.data);
    tryObjectMap(payload);
    const parsedRoot = parseReadTotal(payload);
    if (parsedRoot) pushEntry(payload.title || payload.name || null, parsedRoot, payload.usageId || payload.usage_id || payload.id || null);
  }
  return out.filter((x) => Number.isFinite(x.progress));
};

const getReadingProgressForTitle = (title, sourceEntries = null) => {
  const entries = Array.isArray(sourceEntries) ? sourceEntries : (Array.isArray(window.bookrollReadingProgress) ? window.bookrollReadingProgress : []);
  if (!entries.length) return null;
  const key = normalizeTopicKey(title);
  if (!key) return null;
  const exact = entries.find((x) => x.key === key);
  if (exact) return exact;
  const loose = entries
    .filter((x) => x.key.includes(key) || key.includes(x.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return loose || null;
};

const normalizeTitleHints = (titleHints) => {
  const values = Array.isArray(titleHints) ? titleHints : [titleHints];
  const out = [];
  const seen = new Set();
  values.forEach((value) => {
    const title = decodeIfMojibake(String(value || "")).trim();
    const key = normalizeTopicKey(title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(title);
  });
  return out;
};

const getBookrollReadingDisplayCount = (sourceEntries = null) => {
  const entries = Array.isArray(sourceEntries) ? sourceEntries : (Array.isArray(window.bookrollReadingProgress) ? window.bookrollReadingProgress : []);
  if (!entries.length) return 0;
  const seen = new Set();
  entries.forEach((entry) => {
    const titleKey = normalizeTopicKey(entry?.title || entry?.key || "");
    const usageKey = normalizeUsageId(entry?.usageId || "");
    const dedupeKey = titleKey || usageKey;
    if (dedupeKey) seen.add(dedupeKey);
  });
  return seen.size;
};

const isGenericAeSubtoolTitle = (title) => {
  const key = normalizeTopicKey(title);
  return key === "ae tool" || key === "bookroll" || key === "video" || key === "chatbot";
};

const getBookrollUsageIdsFromVertical = (vertical) => {
  const out = [];
  const seen = new Set();
  const pushUsageId = (id) => {
    const key = normalizeUsageId(id);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };
  const stack = [vertical];
  while (stack.length) {
    const n = stack.shift();
    if (!n || typeof n !== "object") continue;
    const id = String(n.id || "");
    const isAeNode = n.kind === "aetool" || id.includes("type@aetool");
    if (isAeNode && id.includes("block-v1:")) pushUsageId(id);
    const f = n.fields && typeof n.fields === "object" ? n.fields : {};
    const data = f.data && typeof f.data === "object" ? f.data : {};
    [
      f.usageId, f.usage_id, f.courseid, f.courseId, f.block_id, f.blockId, f.id,
      data.usageId, data.usage_id, data.courseid, data.courseId, data.block_id, data.blockId, data.id
    ].forEach((v) => pushUsageId(v));
    const kids = Array.isArray(n.children) ? n.children : [];
    if (kids.length) stack.push(...kids);
  }
  return out;
};

const getReadingProgressForVertical = (vertical, title) => {
  const byTitle = getReadingProgressForTitle(title);
  if (byTitle?.progress != null) return byTitle;
  const usageIds = getBookrollUsageIdsFromVertical(vertical);
  if (!usageIds.length) return null;
  const entries = Array.isArray(window.bookrollReadingProgress) ? window.bookrollReadingProgress : [];
  if (!entries.length) return null;
  const byUsage = entries.find((x) => x?.usageId && usageIds.includes(normalizeUsageId(x.usageId)));
  return byUsage || null;
};

const getReadingProgressForUsageId = (usageId, titleHint = "") => {
  const entries = Array.isArray(window.bookrollReadingProgress) ? window.bookrollReadingProgress : [];
  if (!entries.length) return null;
  const titleHints = normalizeTitleHints(titleHint);
  const key = normalizeUsageId(usageId);
  if (key) {
    const candidates = entries.filter((x) => normalizeUsageId(x?.usageId || "") === key);
    if (candidates.length) {
      for (const hint of titleHints) {
        const match = getReadingProgressForTitle(hint, candidates);
        if (match?.progress != null) return match;
      }
      if (candidates.length === 1 && candidates[0]?.progress != null) return candidates[0];
    }
  }
  for (const hint of titleHints) {
    const match = getReadingProgressForTitle(hint, entries);
    if (match?.progress != null) return match;
  }
  return null;
};

const getChartCategoryAxis = (axis) => {
  if (Array.isArray(axis)) return axis.find((a) => a?.type === "category") || axis[0];
  return axis;
};

const parseChartValue = (v) => {
  if (Number.isFinite(v)) return Number(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  if (v && typeof v === "object") {
    const n = pickNumber(v, ["value", "y", "x", "percent", "percentage"]);
    if (n != null) return n;
  }
  return null;
};

const buildVideoProgressMap = (payload) => {
  const option = payload?.Option || payload?.option || payload || {};
  const yAxis = getChartCategoryAxis(option?.yAxis);
  const labels = Array.isArray(yAxis?.data) ? yAxis.data : [];
  const series = Array.isArray(option?.series) ? option.series : [];
  const seriesData = Array.isArray(series[0]?.data) ? series[0].data : [];
  const out = [];
  for (let i = 0; i < Math.max(labels.length, seriesData.length); i += 1) {
    const title = decodeIfMojibake(String(labels[i] ?? ""));
    if (!title) continue;
    const progress = parseChartValue(seriesData[i]);
    if (progress == null) continue;
    out.push({
      title,
      key: normalizeTopicKey(title),
      progress: clamp(Math.round(progress), 0, 100)
    });
  }
  return out;
};

const buildVideoHeatmapMap = (payload) => {
  const option = payload?.Option || payload?.option || payload || {};
  const xAxis = getChartCategoryAxis(option?.xAxis);
  const yAxis = getChartCategoryAxis(option?.yAxis);
  const bucketLabels = Array.isArray(xAxis?.data) ? xAxis.data.map((label) => decodeIfMojibake(String(label ?? ""))) : [];
  const topicLabels = Array.isArray(yAxis?.data) ? yAxis.data.map((label) => decodeIfMojibake(String(label ?? ""))) : [];
  const series = Array.isArray(option?.series) ? option.series : [];
  const points = Array.isArray(series[0]?.data) ? series[0].data : [];
  const rows = topicLabels.map((title) => ({
    title,
    key: normalizeTopicKey(title),
    buckets: bucketLabels.map((label) => ({ label, value: 0 })),
    activeBuckets: 0,
    totalEvents: 0,
    maxCount: 0,
    firstActiveLabel: "",
    lastActiveLabel: "",
    timelineEndLabel: bucketLabels[bucketLabels.length - 1] || ""
  }));

  points.forEach((point) => {
    let xIdx = null;
    let yIdx = null;
    let value = null;
    if (Array.isArray(point)) {
      xIdx = Number(point[0]);
      yIdx = Number(point[1]);
      value = Number(point[2]);
    } else if (point && typeof point === "object") {
      const triple = Array.isArray(point.value) ? point.value : null;
      xIdx = Number(triple?.[0] ?? point.x ?? point.xIndex ?? point.xAxisIndex);
      yIdx = Number(triple?.[1] ?? point.y ?? point.yIndex ?? point.yAxisIndex);
      value = Number(triple?.[2] ?? point.count ?? point.valueCount ?? point.value);
    }
    if (!Number.isFinite(xIdx) || !Number.isFinite(yIdx) || !Number.isFinite(value)) return;
    const row = rows[yIdx];
    if (!row || !row.buckets[xIdx]) return;
    row.buckets[xIdx].value = value;
  });

  rows.forEach((row) => {
    const active = row.buckets.filter((bucket) => Number(bucket.value) > 0);
    row.activeBuckets = active.length;
    row.totalEvents = row.buckets.reduce((sum, bucket) => sum + (Number(bucket.value) || 0), 0);
    row.maxCount = row.buckets.reduce((max, bucket) => Math.max(max, Number(bucket.value) || 0), 0);
    row.firstActiveLabel = active[0]?.label || "";
    row.lastActiveLabel = active[active.length - 1]?.label || "";
  });

  return rows;
};

const getVideoProgressForTitle = (title) => {
  const entries = Array.isArray(window.videoProgressData) ? window.videoProgressData : [];
  if (!entries.length) return null;
  const key = normalizeTopicKey(title);
  if (!key) return null;
  const exact = entries.find((x) => x.key === key);
  if (exact) return exact;
  const loose = entries
    .filter((x) => x.key.includes(key) || key.includes(x.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return loose || null;
};

const getVideoHeatmapForTitle = (title) => {
  const entries = Array.isArray(window.videoHeatmapData) ? window.videoHeatmapData : [];
  if (!entries.length) return null;
  const key = normalizeTopicKey(title);
  if (!key) return null;
  const exact = entries.find((x) => x.key === key);
  if (exact) return exact;
  const loose = entries
    .filter((x) => x.key.includes(key) || key.includes(x.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return loose || null;
};

const isAeVideoTool = (tool) => {
  const label = String(tool?.label || "").toLowerCase();
  const sub = String(tool?.sublabel || "").toLowerCase();
  return label.includes("ae tool") && sub.includes("video");
};

const collectCourseVideoVerticals = (course) => {
  const out = [];
  const chapters = getSortedChapters(course);
  chapters.forEach((ch) => {
    const sequentials = (ch?.children || []).filter((c) => c?.kind === "sequential");
    sequentials.forEach((seq) => {
      const verticals = (seq?.children || []).filter((c) => c?.kind === "vertical");
      verticals.forEach((v) => {
        const tool = inferVerticalTool(v);
        if (!isAeVideoTool(tool)) return;
        out.push({
          id: String(v?.id || ""),
          title: pickTitle(v, "")
        });
      });
    });
  });
  return out;
};

const getVideoProgressForVertical = (vertical, tool) => {
  if (!isAeVideoTool(tool)) return null;
  const title = pickTitle(vertical, "");
  const byTitle = getVideoProgressForTitle(title);
  if (byTitle) return byTitle;

  const entries = Array.isArray(window.videoProgressData) ? window.videoProgressData : [];
  if (!entries.length) return null;
  const course = window.courseDetailData;
  if (!course) return null;

  const cacheKey = String(course?.id || course?.courseKey || "course");
  if (!window.videoVerticalOrderCache || window.videoVerticalOrderCache.key !== cacheKey) {
    window.videoVerticalOrderCache = {
      key: cacheKey,
      list: collectCourseVideoVerticals(course)
    };
  }
  const ordered = window.videoVerticalOrderCache.list || [];
  if (!ordered.length) return null;

  const vId = String(vertical?.id || "");
  const idx = ordered.findIndex((x) => (vId && x.id === vId) || normalizeTopicKey(x.title) === normalizeTopicKey(title));
  if (idx < 0 || idx >= entries.length) return null;
  return entries[idx];
};

const getVideoHeatmapForVertical = (vertical, tool) => {
  if (!isAeVideoTool(tool)) return null;
  const title = pickTitle(vertical, "");
  const byTitle = getVideoHeatmapForTitle(title);
  if (byTitle) return byTitle;

  const entries = Array.isArray(window.videoHeatmapData) ? window.videoHeatmapData : [];
  if (!entries.length) return null;
  const course = window.courseDetailData;
  if (!course) return null;

  const cacheKey = String(course?.id || course?.courseKey || "course");
  if (!window.videoVerticalOrderCache || window.videoVerticalOrderCache.key !== cacheKey) {
    window.videoVerticalOrderCache = {
      key: cacheKey,
      list: collectCourseVideoVerticals(course)
    };
  }
  const ordered = window.videoVerticalOrderCache.list || [];
  if (!ordered.length) return null;

  const vId = String(vertical?.id || "");
  const idx = ordered.findIndex((x) => (vId && x.id === vId) || normalizeTopicKey(x.title) === normalizeTopicKey(title));
  if (idx < 0 || idx >= entries.length) return null;
  return entries[idx];
};

const renderVideoHeatmapStrip = (entry) => {
  if (!entry || !Array.isArray(entry.buckets) || !entry.buckets.length) return "";
  const buckets = entry.buckets;
  const width = Math.max(buckets.length * 18, 132);
  const height = 14;
  const padX = 0;
  const padY = 0;
  const innerW = Math.max(width - (padX * 2), 1);
  const innerH = Math.max(height - (padY * 2), 1);
  const segmentWidth = Math.max(innerW / Math.max(buckets.length, 1), 4);
  const transitionSeed = Math.random().toString(36).slice(2, 10);
  const clipId = `video-heatmap-clip-${transitionSeed}`;
  const addSecondsToClockLabel = (label, deltaSeconds = 30) => {
    const match = String(label || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(label || "");
    const totalSeconds = (Number(match[1]) * 60) + Number(match[2]) + deltaSeconds;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  const toYoutubeTimeLabel = (label) => {
    const match = String(label || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(label || "");
    return `${Number(match[1])}:${match[2]}`;
  };
  const formatBucketRange = (startLabel, nextLabel = "") => {
    const start = String(startLabel || "");
    if (!start) return "";
    const end = String(nextLabel || addSecondsToClockLabel(start, 30) || "");
    const youtubeStart = toYoutubeTimeLabel(start);
    const youtubeEnd = toYoutubeTimeLabel(end);
    return youtubeEnd && youtubeEnd !== youtubeStart ? `${youtubeStart}-${youtubeEnd}` : youtubeStart;
  };
  const toneFromCount = (count) => {
    const value = Math.max(0, Number(count) || 0);
    const asRgba = (rgb, alpha = 0.98) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    if (value <= 0) {
      return {
        fill: "rgba(226,232,240,0.92)",
        stroke: "rgba(203,213,225,0.92)"
      };
    }
    if (value === 1) {
      return {
        fill: asRgba([79, 208, 200]),
        stroke: asRgba([79, 208, 200])
      };
    }
    if (value === 2) {
      return {
        fill: asRgba([31, 185, 183]),
        stroke: asRgba([31, 185, 183])
      };
    }
    if (value === 3) {
      return {
        fill: asRgba([24, 164, 170]),
        stroke: asRgba([24, 164, 170])
      };
    }
    if (value === 4) {
      return {
        fill: asRgba([19, 138, 146]),
        stroke: asRgba([19, 138, 146])
      };
    }
    return {
      fill: asRgba([19, 138, 146]),
      stroke: asRgba([19, 138, 146])
    };
  };
  const cornerRadius = innerH / 2;
  const capRadius = innerH / 2;
  const transitionSize = Math.max(4, innerH * 0.42);
  const capSize = innerH;
  const segments = buckets.map((bucket, idx) => {
    const count = Number(bucket.value) || 0;
    const x = padX + (idx * segmentWidth);
    const tone = toneFromCount(count);
    return { x, count, tone, label: bucket.label };
  });
  const segmentRects = segments.map((segment) => {
    return `<rect x="${segment.x.toFixed(2)}" y="${padY.toFixed(2)}" width="${segmentWidth.toFixed(2)}" height="${innerH.toFixed(2)}" fill="${segment.tone.fill}" stroke="none"></rect>`;
  }).join("");
  const transitionDefs = segments.slice(0, -1).map((segment, idx) => {
    const next = segments[idx + 1];
    const boundaryX = next.x;
    const gradId = `video-heatmap-trans-${transitionSeed}-${idx}`;
    const startX = boundaryX - (transitionSize / 2);
    const endX = startX + transitionSize;
    return `<linearGradient id="${gradId}" x1="${startX.toFixed(2)}" y1="0" x2="${endX.toFixed(2)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${segment.tone.fill}"></stop><stop offset="100%" stop-color="${next.tone.fill}"></stop></linearGradient>`;
  }).join("");
  const transitionRects = segments.slice(0, -1).map((segment, idx) => {
    const next = segments[idx + 1];
    const rectX = next.x - (transitionSize / 2);
    const gradId = `video-heatmap-trans-${transitionSeed}-${idx}`;
    return `<rect x="${rectX.toFixed(2)}" y="${padY.toFixed(2)}" width="${transitionSize.toFixed(2)}" height="${innerH.toFixed(2)}" fill="url(#${gradId})" stroke="none"></rect>`;
  }).join("");
  const firstTone = segments[0]?.tone?.fill || "rgba(226,232,240,0.92)";
  const lastTone = segments[segments.length - 1]?.tone?.fill || "rgba(226,232,240,0.92)";
  const startCapX = padX - (capSize / 2);
  const endCapX = (padX + innerW) - (capSize / 2);
  const startCap = `<rect x="${startCapX.toFixed(2)}" y="${padY.toFixed(2)}" width="${capSize.toFixed(2)}" height="${innerH.toFixed(2)}" rx="${capRadius.toFixed(2)}" ry="${capRadius.toFixed(2)}" fill="${firstTone}" stroke="none"></rect>`;
  const endCap = `<rect x="${endCapX.toFixed(2)}" y="${padY.toFixed(2)}" width="${capSize.toFixed(2)}" height="${innerH.toFixed(2)}" rx="${capRadius.toFixed(2)}" ry="${capRadius.toFixed(2)}" fill="${lastTone}" stroke="none"></rect>`;
  const hitRects = segments.map((segment, idx) => {
    const timeRange = formatBucketRange(segment.label, segments[idx + 1]?.label || "");
    const title = `ดู ${segment.count} ครั้ง`;
    return `<rect class="video-heatmap-hit" x="${segment.x.toFixed(2)}" y="0" width="${segmentWidth.toFixed(2)}" height="${height}" fill="rgba(0,0,0,0.001)" pointer-events="all" data-tooltip-top="${escapeHtml(title)}" data-tooltip-bottom="${escapeHtml(timeRange)}" data-center-x="${(segment.x + (segmentWidth / 2)).toFixed(2)}"></rect>`;
  }).join("");
  return `
    <div class="video-heatmap-block">
      <svg class="video-heatmap-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="video heatmap">
        <defs>
          <clipPath id="${clipId}">
            <rect x="${padX.toFixed(2)}" y="${padY.toFixed(2)}" width="${innerW.toFixed(2)}" height="${innerH.toFixed(2)}" rx="${cornerRadius.toFixed(2)}" ry="${cornerRadius.toFixed(2)}"></rect>
          </clipPath>
          ${transitionDefs}
        </defs>
        <rect x="${padX.toFixed(2)}" y="${padY.toFixed(2)}" width="${innerW.toFixed(2)}" height="${innerH.toFixed(2)}" rx="${cornerRadius.toFixed(2)}" ry="${cornerRadius.toFixed(2)}" fill="rgba(226,232,240,0.48)" stroke="rgba(203,213,225,0.75)" stroke-width="0.8"></rect>
        <g clip-path="url(#${clipId})">
          ${segmentRects}
          ${transitionRects}
          ${startCap}
          ${endCap}
        </g>
        <rect class="video-heatmap-focus-band" x="0" y="0" width="0" height="${height}" rx="${cornerRadius.toFixed(2)}" ry="${cornerRadius.toFixed(2)}"></rect>
        ${hitRects}
      </svg>
    </div>
  `;
};

const resolveVideoUserNameCandidates = () => {
  const profile = auth?.profile && typeof auth.profile === "object" ? auth.profile : {};
  const raw = [
    { value: (params.get("userName") || params.get("username") || params.get("email") || "").trim(), source: "querystring" },
    { value: (typeof profile.email === "string" ? profile.email : "").trim(), source: "auth.profile.email" },
    { value: (typeof profile.preferred_username === "string" ? profile.preferred_username : "").trim(), source: "auth.profile.preferred_username" },
    { value: String(userId || "").trim(), source: "userId" }
  ];
  const out = [];
  const seen = new Set();
  raw.forEach((x) => {
    if (!x.value) return;
    const key = x.value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(x);
  });
  return out;
};

const resolveVideoUserNameInfo = () => {
  if (window.videoUserNameResolved?.value) return window.videoUserNameResolved;
  const first = resolveVideoUserNameCandidates()[0];
  return first || { value: "", source: "-" };
};

const countKinds = (node, acc) => {
  if (!node) return;
  const kind = node.kind;
  if (kind === "chapter") acc.chapter += 1;
  else if (kind === "sequential") acc.sequential += 1;
  else if (kind === "vertical") acc.vertical += 1;
  else if (kind === "html") acc.html += 1;
  const kids = node.children || [];
  for (const k of kids) countKinds(k, acc);
};

const countKindsIn = (node) => {
  const acc = { chapter: 0, sequential: 0, vertical: 0, html: 0 };
  countKinds(node, acc);
  return acc;
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const debugApiState = {};

const formatDebugPayload = (value, maxLen = 12000) => {
  if (value == null) return "-";
  let text = "";
  try {
    text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  if (text.length > maxLen) return `${text.slice(0, maxLen)}\n...`;
  return text;
};

const renderDebugApiCard = () => {
  if (!SHOW_DEBUG_CARD) return;
  const cardEl = document.getElementById("debug-api-card");
  const contentEl = document.getElementById("debug-api-content");
  if (!cardEl || !contentEl) return;
  cardEl.classList.remove("hidden");
  const order = [
    "login-auth",
    "course-detail",
    "bookroll-reading",
    "bookroll-activity",
    "video-progress",
    "chatbot-speed",
    "chatbot-performance",
    "chatbot-score-v2",
    "adaptive-quiz-shared-dashboard"
  ];
  const items = order
    .map((id) => ({ id, ...debugApiState[id] }))
    .filter((item) => item && item.label);
  if (!items.length) {
    contentEl.innerHTML = `<div class="text-sm text-slate-600">ยังไม่มีข้อมูลสำหรับการตรวจสอบ</div>`;
    return;
  }
  contentEl.innerHTML = items.map((item) => {
    const badgeTone = item.state === "success"
      ? "success"
      : item.state === "error"
        ? "error"
        : item.state === "skipped"
          ? "skipped"
          : "pending";
    const requests = Array.isArray(item.requests) ? item.requests : [];
    const requestsHtml = requests.length
      ? requests.map((req, idx) => {
          const reqTone = req.state === "success"
            ? "success"
            : req.state === "error"
              ? "error"
              : req.state === "skipped"
                ? "skipped"
                : "pending";
          const payload = formatDebugPayload(req.payload);
          return `
            <details class="mt-3">
              <summary class="cursor-pointer text-sm font-semibold text-slate-700">
                <span class="debug-api-request-summary">
                  <span class="debug-api-request-summary-copy">คำขอ ${idx + 1}${req.label ? ` • ${escapeHtml(req.label)}` : ""}</span>
                  <span class="debug-api-request-summary-icon" aria-hidden="true">▾</span>
                </span>
              </summary>
              <div class="debug-api-url mono">${escapeHtml(req.url || "-")}</div>
              <div class="mt-2"><span class="debug-api-badge ${reqTone}">${escapeHtml(req.message || req.state || "-")}</span></div>
              <pre class="debug-api-pre">${escapeHtml(payload)}</pre>
            </details>
          `;
        }).join("")
      : `<div class="mt-3 text-sm text-slate-500">ยังไม่มีคำขอที่บันทึกไว้</div>`;
    return `
      <div class="debug-api-entry">
        <div class="debug-api-entry-head">
          <div>
            <div class="debug-api-entry-title">${escapeHtml(item.label)}</div>
            <div class="mt-1 text-sm text-slate-600">${escapeHtml(item.message || "-")}</div>
          </div>
          <span class="debug-api-badge ${badgeTone}">${escapeHtml(item.badge || item.state || "-")}</span>
        </div>
        ${requestsHtml}
      </div>
    `;
  }).join("");
};

const setDebugApiEntry = (id, patch) => {
  if (!SHOW_DEBUG_CARD || !id || !patch || typeof patch !== "object") return;
  const prev = debugApiState[id] && typeof debugApiState[id] === "object" ? debugApiState[id] : {};
  debugApiState[id] = {
    ...prev,
    ...patch,
    requests: Array.isArray(patch.requests) ? patch.requests : (Array.isArray(prev.requests) ? prev.requests : [])
  };
  renderDebugApiCard();
};

const resetDebugApiState = () => {
  if (!SHOW_DEBUG_CARD) return;
  const loginAuthEntry = debugApiState["login-auth"] || null;
  Object.keys(debugApiState).forEach((key) => delete debugApiState[key]);
  if (loginAuthEntry) debugApiState["login-auth"] = loginAuthEntry;
  renderDebugApiCard();
};


const updateLoginDebugPanel = () => {
  const profile = auth?.profile && typeof auth.profile === "object" ? auth.profile : {};
  const token = auth?.token && typeof auth.token === "object" ? auth.token : {};
  const videoUser = resolveVideoUserNameInfo();
  const loggedIn = !!auth?.userId;
  const sessionUser = auth?.userId || "-";
  const profileEmail = typeof profile.email === "string" ? profile.email : "-";
  const profilePreferred = typeof profile.preferred_username === "string" ? profile.preferred_username : "-";
  const expiresIn = Number.isFinite(Number(token.expires_in)) ? `${Number(token.expires_in)}s` : "-";

  if (loginDebugStatusEl) {
    loginDebugStatusEl.textContent = loggedIn ? "ล็อกอินแล้ว" : "ยังไม่ล็อกอิน";
  }

  if (loginDebugTabSummaryEl) {
    loginDebugTabSummaryEl.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div>session userId: <span class="mono">${escapeHtml(sessionUser)}</span></div>
        <div>query userId: <span class="mono">${escapeHtml(userId || "-")}</span></div>
        <div>profile email: <span class="mono">${escapeHtml(profileEmail)}</span></div>
        <div>preferred_username: <span class="mono">${escapeHtml(profilePreferred)}</span></div>
        <div>query courseId: <span class="mono break-all">${escapeHtml(courseId || "-")}</span></div>
        <div>video userName: <span class="mono">${escapeHtml(videoUser.value || "-")}</span> <span class="text-slate-400">(${escapeHtml(videoUser.source)})</span></div>
        <div>token expires_in: <span class="mono">${escapeHtml(expiresIn)}</span></div>
        <div>token access_token: <span class="mono">${token.access_token ? "present" : "-"}</span></div>
      </div>
    `;
  }

  if (loginDebugTabDerivedEl) {
    const rows = [
      { name: "BookRoll", param: `userID=${userId || "-"}&usageId=${courseId || "-"}` },
      { name: "Video Bar", param: `userName=${videoUser.value || "-"}&usageId=${courseId || "-"}` }
    ];
    loginDebugTabDerivedEl.innerHTML = rows.map((r) => `
      <div class="mb-2 last:mb-0">
        <div class="font-semibold">${escapeHtml(r.name)}</div>
        <div class="mono break-all text-[11px] text-slate-500">${escapeHtml(r.param)}</div>
      </div>
    `).join("");
  }

  if (loginDebugTabRawEl) {
    const raw = {
      auth: auth || null,
      derived: {
        userId: userId || null,
        courseId: courseId || null,
        videoUserName: videoUser.value || null,
        videoUserNameSource: videoUser.source
      }
    };
    loginDebugTabRawEl.textContent = JSON.stringify(raw, null, 2);
  }

  setDebugApiEntry("login-auth", {
    label: "ข้อมูลจากการเข้าสู่ระบบ",
    state: loggedIn ? "success" : "skipped",
    badge: loggedIn ? "ล็อกอินแล้ว" : "ยังไม่ล็อกอิน",
    message: loggedIn
      ? `userId: ${sessionUser}`
      : "ยังไม่มีข้อมูล login ใน sessionStorage",
    requests: [{
      label: "ข้อมูล login ทั้งหมด",
      url: OIDC.redirectUri,
      state: loggedIn ? "success" : "skipped",
      message: loggedIn ? "พบข้อมูลจาก OIDC" : "ยังไม่มีข้อมูล",
      payload: {
        auth: auth || null,
        oidc: {
          authorizationEndpoint: OIDC.authorizationEndpoint,
          tokenEndpoint: OIDC.tokenEndpoint,
          userinfoEndpoint: OIDC.userinfoEndpoint,
          logoutEndpoint: OIDC.logoutEndpoint,
          clientId: OIDC.clientId,
          redirectUri: OIDC.redirectUri,
          scope: OIDC.scope,
        },
        decoded: {
          idToken: token.id_token ? decodeJwt(token.id_token) : null,
          accessToken: token.access_token ? decodeJwt(token.access_token) : null,
        },
        derived: {
          loggedIn,
          userId: userId || null,
          courseId: courseId || null,
          profileEmail: profile.email || null,
          preferredUsername: profile.preferred_username || null,
          videoUserName: videoUser.value || null,
          videoUserNameSource: videoUser.source,
        },
      },
    }],
  });
};

const compareIndexParts = (aParts, bParts) => {
  const a = Array.isArray(aParts) ? aParts : [];
  const b = Array.isArray(bParts) ? bParts : [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = Number.isFinite(a[i]) ? a[i] : -1;
    const bv = Number.isFinite(b[i]) ? b[i] : -1;
    if (av !== bv) return av - bv;
  }
  return 0;
};

const normalizeNumericText = (raw) =>
  String(raw || "")
    .replace(/[๐-๙]/g, (d) => "๐๑๒๓๔๕๖๗๘๙".indexOf(d))
    .trim();

const sortKeyFromNodeSort = (node) => {
  const raw = node?.sort ?? node?.fields?.sort ?? "";
  const text = normalizeNumericText(raw);
  if (!text) return null;
  const parts = text
    .split(".")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
  if (!parts.length) return null;
  return { text, parts };
};

const compareNodeSort = (aNode, bNode) => {
  const a = sortKeyFromNodeSort(aNode);
  const b = sortKeyFromNodeSort(bNode);
  if (!a && !b) return null;
  if (!a) return 1;
  if (!b) return -1;
  const partCmp = compareIndexParts(a.parts, b.parts);
  if (partCmp !== 0) return partCmp;
  if (a.parts.length !== b.parts.length) return a.parts.length - b.parts.length;
  if (a.text < b.text) return -1;
  if (a.text > b.text) return 1;
  return 0;
};

const chapterSortKey = (rawTitle) => {
  const title = normalizeNumericText(rawTitle);

  // Try to pick the intended sequence from the human-readable prefix.
  // Supports "1-10 ...", "1.10 ...", "กิจกรรมที่ 2", "บทที่ 3", "ใบความรู้ที่ 2.2", etc.
  const m = title.match(
    /^(?:\s*(\d+(?:[.-]\d+)*))|(?:.*?(?:กิจกรรมที่|บทที่|หน่วยที่|ใบกิจกรรมที่|ใบความรู้ที่)\s*(\d+(?:[.-]\d+)*))/
  );
  const seqText = String(m?.[1] || m?.[2] || "").trim();
  const parts = seqText
    ? seqText
        .split(/[.-]/)
        .map((part) => Number(part))
        .filter((part) => Number.isFinite(part))
    : [];
  const hasIndex = parts.length > 0;

  // group: lower first
  // 0: pre-test/numbered lessons
  // 1: other items
  // 2: post-test
  if (/ก่อนเรียน/.test(title)) return { group: 0, parts: [0], title };
  if (hasIndex) return { group: 0, parts, title };
  if (/หลังเรียน|ปลายหน่วย|ปลายบท/.test(title)) return { group: 2, parts: [9999], title };
  return { group: 1, parts: [9999], title };
};

const compareChapterSortKey = (a, b) => {
  if (a.group !== b.group) return a.group - b.group;
  const partCmp = compareIndexParts(a.parts, b.parts);
  if (partCmp !== 0) return partCmp;
  if (a.title < b.title) return -1;
  if (a.title > b.title) return 1;
  return 0;
};

const getSortedChapterEntries = (data) => {
  const chapters = Array.isArray(data?.children) ? data.children : [];
  return chapters
    .filter((c) => !c.kind || c.kind === "chapter")
    .map((c, idx) => {
      const title = decodeIfMojibake(c.title || c.fields?.title || `บทที่ ${idx + 1}`);
      return {
        c,
        idx,
        title,
        k: chapterSortKey(title)
      };
    })
    .sort((a, b) => {
      const sortCmp = compareNodeSort(a.c, b.c);
      if (sortCmp != null) return sortCmp || (a.idx - b.idx);
      const cmp = compareChapterSortKey(a.k, b.k);
      if (cmp !== 0) return cmp;
      return a.idx - b.idx;
    });
};

const getSortedChapters = (data) => getSortedChapterEntries(data).map((x) => x.c);

const getCourseChapterTitles = (data) => {
  const chapters = getSortedChapters(data);
  return chapters.map((c, idx) => decodeIfMojibake(c.title || c.fields?.title || `บทที่ ${idx + 1}`));
};

const getChartConfig = (cfg) => {
  if (!cfg || typeof cfg !== "object") return cfg;
  if (!cfg.chart || typeof cfg.chart !== "object") return cfg;
  const chart = cfg.chart;
  if (Array.isArray(cfg.__categoryMeta) && !Array.isArray(chart.__categoryMeta)) {
    chart.__categoryMeta = cfg.__categoryMeta;
  }
  return chart;
};

const getCategoryAxisData = (cfg) => {
  const chartCfg = getChartConfig(cfg);
  const xAxis = Array.isArray(chartCfg?.xAxis) ? chartCfg.xAxis[0] : chartCfg?.xAxis;
  const yAxis = Array.isArray(chartCfg?.yAxis) ? chartCfg.yAxis[0] : chartCfg?.yAxis;
  if (xAxis?.type === "category" && Array.isArray(xAxis?.data)) return xAxis.data;
  if (yAxis?.type === "category" && Array.isArray(yAxis?.data)) return yAxis.data;
  return [];
};

const parseChatbotCategoryMeta = (rawLabel) => {
  const raw = decodeIfMojibake(String(rawLabel || "")).trim();
  if (!raw) return null;
  const m = raw.match(/^(.*?)(?:,\s*(\d+))$/);
  if (!m) return { raw, key: raw, total: null };
  const key = String(m[1] || "").trim() || raw;
  const total = Number(m[2]);
  return { raw, key, total: Number.isFinite(total) ? total : null };
};

const getSeriesAt = (cfg, idx, preferNameIncludes) => {
  const chartCfg = getChartConfig(cfg);
  const series = Array.isArray(chartCfg?.series) ? chartCfg.series : [];
  if (!series.length) return null;
  let s = series[0];
  if (preferNameIncludes) {
    const found = series.find((x) => (x?.name || "").toLowerCase().includes(preferNameIncludes.toLowerCase()));
    if (found) s = found;
  }
  const arr = Array.isArray(s?.data) ? s.data : [];
  const v = arr[idx];
  return Number.isFinite(v) ? v : (typeof v === "string" ? Number(v) : null);
};

const getCategoryMetaAt = (cfg, idx) => {
  const chartCfg = getChartConfig(cfg);
  const arr = Array.isArray(chartCfg?.__categoryMeta) ? chartCfg.__categoryMeta : [];
  return arr[idx] || null;
};

const getChatbotScoreAt = (cfg, idx, preferNameIncludes) => {
  const score = getSeriesAt(cfg, idx, preferNameIncludes);
  const meta = getCategoryMetaAt(cfg, idx);
  const total = Number(meta?.total);
  const hasTotal = Number.isFinite(total) && total > 0;
  return {
    score: Number.isFinite(score) ? score : null,
    total: hasTotal ? total : null
  };
};

const getChatbotTimeAt = (cfg, idx, preferNameIncludes) => {
  const seconds = getSeriesAt(cfg, idx, preferNameIncludes);
  return Number.isFinite(seconds) ? Math.max(0, Number(seconds)) : null;
};

const formatChatbotScore = (info) => {
  if (!info || !Number.isFinite(info.score)) return "-";
  const scoreText = String(Math.round(Number(info.score)));
  if (!Number.isFinite(info.total) || info.total <= 0) return scoreText;
  return `${scoreText}/${info.total}`;
};

const hasChatbotAttemptStarted = (item) => {
  const time = Number(item?.chatbotTime);
  if (Number.isFinite(time)) return time > 0;
  const score = Number(item?.chatbotScore?.score);
  const total = Number(item?.chatbotScore?.total ?? item?.chatbotScoreAvg?.total);
  return Number.isFinite(score) && Number.isFinite(total) && total > 0 && score > 0;
};

const formatBookrollReadingDetail = (reading) => {
  if (!reading) return "";
  const read = Number(reading.read);
  const total = Number(reading.total);
  const hasRead = Number.isFinite(read);
  const hasTotal = Number.isFinite(total);
  if (!hasRead && !hasTotal) return "";
  if ((read || 0) <= 0 && (total || 0) <= 0) return "";
  return `อ่าน ${hasRead ? read : "-"} / ${hasTotal ? total : "-"} หน้า`;
};

const formatChapterMetric = (chapter) => {
  const pct = Number.isFinite(chapter?.chapterPct) ? Number(chapter.chapterPct) : null;
  return pct != null ? `${clamp(pct, 0, 100)}%` : "";
};

const formatChapterProgressText = (chapter) => {
  const pct = Number.isFinite(chapter?.chapterPct) ? Number(chapter.chapterPct) : null;
  return pct != null ? `ความคืบหน้า ${clamp(pct, 0, 100)}%` : "";
};

const formatDurationShort = (seconds) => {
  const n = Number(seconds);
  if (!Number.isFinite(n)) return "-";
  const totalSec = Math.max(0, Math.round(n));
  if (totalSec < 60) return `${totalSec} วินาที`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")} นาที`;
};

const shortenChartLabel = (label, max = 18) => {
  const text = String(label || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
};

const inferQuizTotalHint = (...candidates) => {
  for (const raw of candidates) {
    const text = decodeIfMojibake(String(raw || "")).trim();
    if (!text) continue;
    const patterns = [
      /\b(\d+)\s*(?:questions?|question)\b/i,
      /(?:แบบ|จำนวน)\s*(\d+)\s*ข้อ/i,
      /\((\d+)\s*ข้อ\)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const total = Number(match?.[1]);
      if (Number.isFinite(total) && total > 0) return total;
    }
  }
  return null;
};

const applyChatbotTotalHint = (scoreInfo, totalHint) => {
  if (!scoreInfo || typeof scoreInfo !== "object") return scoreInfo;
  const total = Number(scoreInfo.total);
  if (Number.isFinite(total) && total > 0) return scoreInfo;
  const hint = Number(totalHint);
  return Number.isFinite(hint) && hint > 0 ? { ...scoreInfo, total: hint } : scoreInfo;
};

const collectChapterChatbotSlots = (chapterNode) => {
  const out = [];
  const sequentials = (chapterNode?.children || []).filter((c) => c?.kind === "sequential");
  sequentials.forEach((seq) => {
    const verticals = (seq?.children || []).filter((c) => c?.kind === "vertical");
    verticals.forEach((v) => {
      const entries = collectVerticalAeSubtools(v).filter((entry) => entry?.subtype === "Chatbot");
      entries.forEach((entry, entryIdx) => {
        const title = entry?.title || decodeIfMojibake(String(v?.title || `Chatbot ${entryIdx + 1}`));
        const verticalTitle = decodeIfMojibake(String(v?.title || ""));
        out.push({
          id: entry?.id || "",
          title,
          verticalTitle,
          totalHint: inferQuizTotalHint(title, verticalTitle)
        });
      });
    });
  });
  return out;
};

const buildChatbotOrderMap = (course, perfCfg, speedCfg) => {
  const chapters = getSortedChapters(course);
  const perfSeries = Array.isArray(getChartConfig(perfCfg)?.series) ? getChartConfig(perfCfg).series : [];
  const speedSeries = Array.isArray(getChartConfig(speedCfg)?.series) ? getChartConfig(speedCfg).series : [];
  const perfMeta = Array.isArray(getChartConfig(perfCfg)?.__categoryMeta) ? getChartConfig(perfCfg).__categoryMeta : [];
  const speedMeta = Array.isArray(getChartConfig(speedCfg)?.__categoryMeta) ? getChartConfig(speedCfg).__categoryMeta : [];
  const maxLen = Math.max(
    perfMeta.length,
    speedMeta.length,
    ...perfSeries.map((s) => (Array.isArray(s?.data) ? s.data.length : 0)),
    ...speedSeries.map((s) => (Array.isArray(s?.data) ? s.data.length : 0))
  );
  let apiCursor = 0;
  return {
    chapters: chapters.map((chapterNode, chapterIdx) => {
      const slots = collectChapterChatbotSlots(chapterNode);
      const items = slots.map((slot, slotIdx) => {
        const apiIdx = apiCursor < maxLen ? apiCursor : null;
        if (apiIdx != null) apiCursor += 1;
        const scoreYou = apiIdx != null ? applyChatbotTotalHint(getChatbotScoreAt(perfCfg, apiIdx, "your"), slot.totalHint) : null;
        const scoreAvg = apiIdx != null ? applyChatbotTotalHint(getChatbotScoreAt(perfCfg, apiIdx, "average"), slot.totalHint) : null;
        return {
          chapterIdx,
          slotIdx,
          apiIdx,
          id: slot.id,
          title: slot.title,
          verticalTitle: slot.verticalTitle,
          totalHint: slot.totalHint,
          scoreYou,
          scoreAvg,
          timeYou: apiIdx != null ? getChatbotTimeAt(speedCfg, apiIdx, "your") : null,
          timeAvg: apiIdx != null ? getChatbotTimeAt(speedCfg, apiIdx, "average") : null
        };
      });
      return { chapterIdx, items };
    })
  };
};

const rebuildChatbotOrderMap = () => {
  if (!window.courseDetailData) {
    window.chatbotOrderMap = null;
    return;
  }
  window.chatbotOrderMap = buildChatbotOrderMap(window.courseDetailData, window.chatbotPerfData, window.chatbotSpeedRawData);
};

const pickTitle = (node, fallback) => decodeIfMojibake(node?.title || node?.fields?.title || fallback || "-");

const isRegistrationOrProfileAeTool = (vertical, tool = null) => {
  const resolvedTool = tool || inferVerticalTool(vertical);
  const labelLc = String(resolvedTool?.label || "").toLowerCase();
  const subLc = String(resolvedTool?.sublabel || "").toLowerCase();
  const meta = findAeToolMeta(vertical);
  const raw = [
    pickTitle(vertical, ""),
    meta?.aetool || "",
    meta?.hint || "",
    meta?.iframeUrl || ""
  ].join("\n").toLowerCase();
  const isAeTool = labelLc.includes("ae tool") || labelLc.includes("aetool") || subLc.includes("aetool");
  if (!isAeTool && !meta) return false;
  return (
    raw.includes("ลงทะเบียน") ||
    raw.includes("registration") ||
    raw.includes("register") ||
    raw.includes("profile") ||
    raw.includes("โปรไฟล์")
  );
};

const sortVerticalItemsHeuristic = (items) =>
  (items || []).slice().sort((a, b) => {
    const sortCmp = compareNodeSort(a?.node || a, b?.node || b);
    if (sortCmp != null) return sortCmp || ((a?.idx ?? 0) - (b?.idx ?? 0));
    const aPinned = isRegistrationOrProfileAeTool(a?.node || a, a?.tool) ? 0 : 1;
    const bPinned = isRegistrationOrProfileAeTool(b?.node || b, b?.tool) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return (a?.idx ?? 0) - (b?.idx ?? 0);
  });

const sortSequentialItemsHeuristic = (items) =>
  (items || []).slice().sort((a, b) => {
    const sortCmp = compareNodeSort(a?.node || a, b?.node || b);
    if (sortCmp != null) return sortCmp || ((a?.idx ?? 0) - (b?.idx ?? 0));
    const aPinned = (a?.verticals || []).some((v) => isRegistrationOrProfileAeTool(v?.node || v, v?.tool)) ? 0 : 1;
    const bPinned = (b?.verticals || []).some((v) => isRegistrationOrProfileAeTool(v?.node || v, v?.tool)) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return (a?.idx ?? 0) - (b?.idx ?? 0);
  });

const collectKindsDeep = (node, set) => {
  if (!node) return;
  const kind = node.kind;
  if (kind) set.add(kind);
  const kids = node.children || [];
  for (const k of kids) collectKindsDeep(k, set);
};

const collectTextDeep = (node, out, maxLen = 16000) => {
  if (!node || out.text.length >= maxLen) return;
  if (typeof node === "string") {
    out.text += "\n" + node;
    return;
  }
  if (typeof node !== "object") return;
  const tryPush = (v) => {
    if (typeof v === "string" && v) {
      out.text += "\n" + v;
      return;
    }
    if (v && typeof v === "object") {
      try {
        out.text += "\n" + JSON.stringify(v);
      } catch {}
    }
  };
  tryPush(node.kind);
  tryPush(node.id);
  tryPush(node.title);
  if (node.fields && typeof node.fields === "object") {
    // Common places where tool identifiers/URLs exist.
    ["display_name", "displayName", "title", "data", "url", "href", "src", "launch_url", "launchUrl"].forEach((k) => {
      tryPush(node.fields?.[k]);
    });
    ["iframe_url", "iframeUrl", "iframe", "iframeURL", "aetool", "tool", "tool_type", "toolType"].forEach((k) => {
      tryPush(node.fields?.[k]);
    });
  }
  const kids = node.children || [];
  for (const k of kids) collectTextDeep(k, out, maxLen);
};

const detectAeSubtypeFromText = (raw, kinds = new Set()) => {
  const t = decodeIfMojibake(String(raw || "")).toLowerCase();
  if (!t) return null;
  if (t.includes("bookroll") || t.includes("br_") || t.includes("thaidlt.com")) return "BookRoll";
  if (t.includes("chatbot") || t.includes("chat bot") || t.includes("แชตบอต") || t.includes("แชทบอท") || t.includes("/chat/")) return "Chatbot";
  if (
    kinds.has("video") ||
    t.includes("video") ||
    t.includes("youtube.com") ||
    t.includes("youtu.be") ||
    t.includes("vimeo.com") ||
    t.includes("viola.thaidlt.com/player") ||
    t.includes("mp4") ||
    t.includes("m3u8")
  ) return "Video";
  if (t.includes("วิดีโอ") || t.includes("คลิป")) return "Video";
  if (t.includes("ใบความรู้") || t.includes("book roll")) return "BookRoll";
  if (
    t.includes("kidbright simulator") ||
    (t.includes("kidbright") && t.includes("simulator")) ||
    t.includes("simulator")
  ) return "KidBright Simulator";
  if (t.includes("mqtt")) return "MQTT Tool";
  if (t.includes("/question/")) return "Iframe";
  return null;
};

const findAeToolMeta = (vertical) => {
  const stack = Array.isArray(vertical?.children) ? vertical.children.slice() : [];
  while (stack.length) {
    const n = stack.shift();
    if (!n || typeof n !== "object") continue;
    const f = n.fields && typeof n.fields === "object" ? n.fields : {};
    const data = f.data && typeof f.data === "object" ? f.data : {};
    const id = typeof n.id === "string" ? n.id : "";
    const aetool =
      (typeof f.aetool === "string" ? f.aetool : "") ||
      (typeof f.tool_type === "string" ? f.tool_type : "") ||
      (typeof f.toolType === "string" ? f.toolType : "") ||
      (typeof data.aetool === "string" ? data.aetool : "");
    const iframeUrl =
      (typeof f.iframe_url === "string" ? f.iframe_url : "") ||
      (typeof f.iframeUrl === "string" ? f.iframeUrl : "") ||
      (typeof f.launch_url === "string" ? f.launch_url : "") ||
      (typeof f.launchUrl === "string" ? f.launchUrl : "") ||
      (typeof f.url === "string" ? f.url : "") ||
      (typeof f.href === "string" ? f.href : "") ||
      (typeof f.src === "string" ? f.src : "") ||
      (typeof data.iframe_url === "string" ? data.iframe_url : "");
    const hint = detectAeSubtypeFromText(`${aetool}\n${iframeUrl}\n${JSON.stringify(data || {})}`);
    if (n.kind === "aetool" || id.includes("type@aetool") || aetool || iframeUrl || hint) {
      return { id, aetool, iframeUrl, hint };
    }
    const kids = n.children || [];
    if (Array.isArray(kids)) stack.push(...kids);
  }
  return null;
};

const resolveLearningItemId = (vertical, tool) => {
  const verticalId = String(vertical?.id || "");
  const aeId = String(findAeToolMeta(vertical)?.id || "");
  const label = String(tool?.label || "").toLowerCase();
  const isAeTool = label.includes("ae tool") || label.includes("aetool");
  if (isAeTool && aeId) return aeId;
  return verticalId || aeId || "";
};

const inferAeToolSubtype = (vertical, kinds = new Set()) => {
  const bag = { text: "" };
  collectTextDeep(vertical, bag);
  (vertical?.children || []).forEach((c) => collectTextDeep(c, bag));
  const t = decodeIfMojibake(bag.text).toLowerCase();
  const meta = findAeToolMeta(vertical);
  const aet = (meta?.aetool || "").toLowerCase();

  if (aet === "bookroll") return "BookRoll";
  if (aet === "video") return "Video";
  if (aet === "chatbot") return "Chatbot";
  if (aet === "simulator") return "KidBright Simulator";
  if (aet === "iframe") return "Iframe";
  if (meta?.hint) return meta.hint;
  return detectAeSubtypeFromText(t, kinds);
};

const inferVerticalTool = (vertical) => {
  const kinds = new Set();
  (vertical?.children || []).forEach((c) => collectKindsDeep(c, kinds));
  // remove container kinds if present
  kinds.delete("vertical");
  kinds.delete("sequential");
  kinds.delete("chapter");

  const title = pickTitle(vertical, "");
  const titleLc = title.toLowerCase();
  const isAeTool = kinds.has("aetool") || kinds.has("lti") || titleLc.includes("ae tool") || titleLc.includes("aetool") || titleLc.includes("ae-tool");

  const subtype = inferAeToolSubtype(vertical, kinds);
  if (isAeTool) return { label: "AE Tool", sublabel: subtype, tone: "badge kind-sequential" };
  if (kinds.has("lti")) return { label: "AE Tool (LTI)", sublabel: subtype, tone: "badge kind-sequential" };
  if (kinds.has("problem")) return { label: "แบบทดสอบ (problem)", tone: "badge kind-vertical" };
  if (kinds.has("video")) return { label: "วิดีโอ", tone: "badge kind-vertical" };
  if (kinds.has("openassessment")) return { label: "ประเมินผล (OA)", tone: "badge kind-vertical" };
  if (kinds.has("discussion")) return { label: "อภิปราย", tone: "badge kind-vertical" };
  if (kinds.has("html") && kinds.size === 1) return { label: "อ่านเนื้อหา (HTML)", tone: "badge kind-html" };
  if (kinds.size) return { label: `Mixed: ${Array.from(kinds).join("+")}`, tone: "badge" };
  return { label: "ไม่ทราบประเภท", tone: "badge" };
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const computeVerticalProgress = ({ vertical, tool }) => {
  const vTitle = pickTitle(vertical, "");

  const subtype = tool?.sublabel || "";
  const isBookroll = subtype.toLowerCase().includes("bookroll") || (tool?.label || "").toLowerCase().includes("bookroll");
  if (isBookroll) {
    const reading = getReadingProgressForVertical(vertical, vTitle);
    if (reading?.progress != null) return reading.progress;
    return null;
  }

  const isAeVideo =
    isAeVideoTool(tool);
  if (isAeVideo) {
    const video = getVideoProgressForVertical(vertical, tool);
    if (video?.progress != null) return video.progress;
    return null;
  }
  return null;
};

const inferAeSubtypeFromNode = (node) => {
  const f = node?.fields && typeof node.fields === "object" ? node.fields : {};
  const data = f.data && typeof f.data === "object" ? f.data : {};
  const aet = String(
    f.aetool || f.tool_type || f.toolType || data.aetool || ""
  ).toLowerCase();
  if (aet === "bookroll") return "BookRoll";
  if (aet === "video") return "Video";
  if (aet === "chatbot") return "Chatbot";
  const raw = [
    aet,
    f.iframe_url, f.iframeUrl, f.launch_url, f.launchUrl, f.url, f.href, f.src,
    data.iframe_url, data.iframeUrl, JSON.stringify(data || {})
  ].filter(Boolean).join("\n");
  return detectAeSubtypeFromText(raw);
};

const collectVerticalAeSubtools = (vertical) => {
  const out = [];
  const seen = new Set();
  const stack = [vertical];
  while (stack.length) {
    const n = stack.shift();
    if (!n || typeof n !== "object") continue;
    const id = String(n.id || "");
    const isAe = n.kind === "aetool" || id.includes("type@aetool");
    if (isAe) {
      const subtype = inferAeSubtypeFromNode(n);
      if (subtype === "BookRoll" || subtype === "Video" || subtype === "Chatbot") {
        const key = `${subtype}|${id || "-"}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            id: id || "",
            subtype,
            title: decodeIfMojibake(String(n?.title || n?.fields?.display_name || ""))
          });
        }
      }
    }
    const kids = Array.isArray(n.children) ? n.children : [];
    if (kids.length) stack.push(...kids);
  }
  return out;
};

const normalizeTrackedToolKey = (rawSubtype) => {
  const t = String(rawSubtype || "").toLowerCase();
  if (t.includes("bookroll")) return "bookroll";
  if (t.includes("video")) return "video";
  if (t.includes("chatbot")) return "chatbot";
  return "";
};

const collectCourseToolInventory = (course) => {
  const counts = { bookroll: 0, video: 0, chatbot: 0 };
  const addTool = (rawSubtype) => {
    const key = normalizeTrackedToolKey(rawSubtype);
    if (key) counts[key] += 1;
  };
  const chapters = getSortedChapters(course);
  chapters.forEach((chapterNode) => {
    const sequentials = (chapterNode?.children || []).filter((c) => c?.kind === "sequential");
    sequentials.forEach((seq) => {
      const verticals = (seq?.children || []).filter((c) => c?.kind === "vertical");
      verticals.forEach((v) => {
        const subtools = collectVerticalAeSubtools(v);
        if (subtools.length) {
          subtools.forEach((entry) => addTool(entry?.subtype));
          return;
        }
        const tool = inferVerticalTool(v);
        addTool(tool?.sublabel || tool?.label || "");
      });
    });
  });
  return {
    counts,
    hasBookroll: counts.bookroll > 0,
    hasVideo: counts.video > 0,
    hasChatbot: counts.chatbot > 0
  };
};

const syncOverallToolCards = () => {
  const containerEl = document.getElementById("overall-tool-cards");
  const bookrollEl = document.getElementById("overall-card-bookroll");
  const videoEl = document.getElementById("overall-card-video");
  const chatbotEl = document.getElementById("overall-card-chatbot");
  if (!containerEl) return;

  const counts = window.courseToolInventory?.counts || {};
  const visibility = {
    bookroll: Number(counts.bookroll) > 0,
    video: Number(counts.video) > 0,
    chatbot: Number(counts.chatbot) > 0
  };

  if (bookrollEl) bookrollEl.classList.toggle("hidden", !visibility.bookroll);
  if (videoEl) videoEl.classList.toggle("hidden", !visibility.video);
  if (chatbotEl) chatbotEl.classList.toggle("hidden", !visibility.chatbot);

  const visibleCount = Object.values(visibility).filter(Boolean).length;
  containerEl.classList.toggle("hidden", visibleCount === 0);
  containerEl.classList.remove("lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3");
  if (visibleCount >= 3) containerEl.classList.add("lg:grid-cols-3");
  else if (visibleCount === 2) containerEl.classList.add("lg:grid-cols-2");
  else if (visibleCount === 1) containerEl.classList.add("lg:grid-cols-1");
};

const buildProgressModel = () => {
  const course = window.courseDetailData;
  const chapters = getSortedChapters(course);
  const user = userId;
  const courseKey = courseId;
  const chatbotOrderMap = window.chatbotOrderMap;

  const out = chapters.map((chapterNode, chapterIdx) => {
    const chapterChatbot = Array.isArray(chatbotOrderMap?.chapters) ? chatbotOrderMap.chapters[chapterIdx] : null;
    let chatbotSlotIdx = 0;
    const sequentials = (chapterNode?.children || []).filter((c) => c?.kind === "sequential");
    const seqItems = sortSequentialItemsHeuristic(sequentials.map((seq, sIdx) => {
      const verticals = (seq?.children || []).filter((c) => c?.kind === "vertical");
      const verts = sortVerticalItemsHeuristic(verticals.map((v, vIdx) => {
        const baseTool = inferVerticalTool(v);
        const subtools = collectVerticalAeSubtools(v)
          .map((entry) => {
            const tool = { label: "AE Tool", sublabel: entry.subtype, tone: "badge kind-sequential" };
            const verticalTitle = pickTitle(v, `Vertical ${vIdx + 1}`);
            const rawEntryTitle = entry.title || verticalTitle;
            const entryTitle = isGenericAeSubtoolTitle(rawEntryTitle) ? verticalTitle : rawEntryTitle;
            const reading = entry.subtype === "BookRoll"
              ? getReadingProgressForUsageId(entry.id, [rawEntryTitle, verticalTitle])
              : null;
            const video = entry.subtype === "Video"
              ? (getVideoProgressForTitle(entryTitle) || getVideoProgressForVertical(v, tool))
              : null;
            const videoHeatmap = entry.subtype === "Video"
              ? (getVideoHeatmapForTitle(entryTitle) || getVideoHeatmapForVertical(v, tool))
              : null;
            const chatbotItem = entry.subtype === "Chatbot"
              ? (Array.isArray(chapterChatbot?.items) ? (chapterChatbot.items[chatbotSlotIdx] || null) : null)
              : null;
            if (entry.subtype === "Chatbot") chatbotSlotIdx += 1;
            const pct = isRegistrationOrProfileAeTool(v, tool)
              ? null
              : (reading?.progress ?? video?.progress ?? null);
            return {
              id: entry.id || resolveLearningItemId(v, tool),
              title: entryTitle,
              tool,
              pct,
              reading,
              video,
              videoHeatmap,
              chatbotScore: chatbotItem?.scoreYou || null,
              chatbotScoreAvg: chatbotItem?.scoreAvg || null,
              chatbotTime: chatbotItem?.timeYou ?? null,
              chatbotTimeAvg: chatbotItem?.timeAvg ?? null
            };
          });
        const fallbackVideo = isAeVideoTool(baseTool) ? getVideoProgressForVertical(v, baseTool) : null;
        const fallbackVideoHeatmap = isAeVideoTool(baseTool) ? getVideoHeatmapForVertical(v, baseTool) : null;
        const effectiveSubtools = subtools.length
          ? subtools
          : [{
            id: resolveLearningItemId(v, baseTool),
            title: pickTitle(v, `Vertical ${vIdx + 1}`),
            tool: baseTool,
            video: fallbackVideo,
            videoHeatmap: fallbackVideoHeatmap,
            pct: computeVerticalProgress({
              vertical: v,
              tool: baseTool
            })
          }];
        const subPcts = effectiveSubtools.map((x) => x.pct).filter((x) => Number.isFinite(x));
        const pct = subPcts.length ? Math.round(subPcts.reduce((a, b) => a + b, 0) / subPcts.length) : null;
        return {
          idx: vIdx,
          id: resolveLearningItemId(v, baseTool),
          node: v,
          title: pickTitle(v, `Vertical ${vIdx + 1}`),
          tool: effectiveSubtools[0]?.tool || baseTool,
          pct,
          subtools: effectiveSubtools
        };
      }));
      return {
        idx: sIdx,
        id: seq?.id || "",
        node: seq,
        title: pickTitle(seq, `Sequential ${sIdx + 1}`),
        verticals: verts
      };
    }));

    const allPcts = seqItems
      .flatMap((s) => s.verticals.map((v) => v.pct))
      .filter((v) => Number.isFinite(v));
    const chapterPct = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;
    const chapterSubtools = seqItems
      .flatMap((s) => s.verticals)
      .flatMap((v) => Array.isArray(v?.subtools) && v.subtools.length ? v.subtools : [v]);
    const chapterHasQuiz = chapterSubtools.some((item) => String(item?.tool?.sublabel || "").toLowerCase() === "chatbot");
    const chatbotScores = chapterSubtools
      .map((item) => ({
        score: Number(item?.chatbotScore?.score),
        total: Number(item?.chatbotScore?.total ?? item?.chatbotScoreAvg?.total)
      }))
      .filter((item) => Number.isFinite(item.score) && Number.isFinite(item.total) && item.total > 0);
    const chapterQuizScore = chatbotScores.length
      ? {
        score: chatbotScores.reduce((sum, item) => sum + item.score, 0),
        total: chatbotScores.reduce((sum, item) => sum + item.total, 0),
        count: chatbotScores.length
      }
      : null;
    return {
      idx: chapterIdx,
      id: chapterNode?.id || "",
      title: pickTitle(chapterNode, `บทที่ ${chapterIdx + 1}`),
      chapterPct,
      chapterHasQuiz,
      chapterQuizScore,
      sequentials: seqItems
    };
  });

  const all = out
    .flatMap((c) => c.sequentials.flatMap((s) => s.verticals.map((v) => v.pct)))
    .filter((v) => Number.isFinite(v));
  const overallPct = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
  return { chapters: out, overallPct };
};

const updateOverviewFromModel = (model) => {
  if (!model) return;
  const hasOverall = Number.isFinite(model.overallPct);
  const overall = hasOverall ? clamp(model.overallPct, 0, 100) : null;
  const overallValueWideEl = document.getElementById("overall-value-wide");
  const overallBarWideEl = document.getElementById("overall-bar-wide");
  if (overallValueWideEl) overallValueWideEl.textContent = hasOverall ? `${overall}%` : "-";
  if (overallBarWideEl) overallBarWideEl.style.width = hasOverall ? `${overall}%` : "0%";

  updateStatusFromModel(model);
};

const classifyPctStatus = (pct) => {
  if (!Number.isFinite(pct)) return "na";
  const n = clamp(Number(pct), 0, 100);
  if (n >= 100) return "done";
  if (n > 0) return "doing";
  return "todo";
};

const updateStatusFromModel = (model) => {
  const stats = {
    book: { done: 0, doing: 0, todo: 0, na: 0, sumPct: 0, cntPct: 0 },
    video: { done: 0, doing: 0, todo: 0, na: 0, sumPct: 0, cntPct: 0 }
  };
  const chapters = Array.isArray(model?.chapters) ? model.chapters : [];
  chapters.forEach((ch) => {
    (ch?.sequentials || []).forEach((seq) => {
      (seq?.verticals || []).forEach((v) => {
        const subs = Array.isArray(v?.subtools) && v.subtools.length ? v.subtools : [v];
        subs.forEach((sub) => {
          const sublabel = String(sub?.tool?.sublabel || "").toLowerCase();
          const target = sublabel.includes("bookroll")
            ? stats.book
            : sublabel.includes("video")
              ? stats.video
              : null;
          if (!target) return;
          const k = classifyPctStatus(sub?.pct);
          target[k] += 1;
          if (Number.isFinite(sub?.pct)) {
            target.sumPct += clamp(Number(sub.pct), 0, 100);
            target.cntPct += 1;
          }
        });
      });
    });
  });

  const setText = (id, n) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(n);
  };

  setText("bookroll-donut-done", stats.book.done);
  setText("bookroll-donut-doing", stats.book.doing);
  setText("bookroll-donut-todo", stats.book.todo);
  setText("video-donut-done", stats.video.done);
  setText("video-donut-doing", stats.video.doing);
  setText("video-donut-remain", stats.video.todo);
  renderBookrollStatusDonut(stats.book);
  renderVideoStatusDonut(stats.video);
  renderChatbotQuizOverview(window.chatbotOrderMap);
};

const renderBookrollStatusDonut = (book) => {
  const ctx = document.getElementById("bookrollOverallChart");
  if (!ctx) return;
  if (bookrollOverallChartInstance) bookrollOverallChartInstance.destroy();
  bookrollOverallChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["อ่านจบ", "กำลังอ่าน", "ยังไม่ได้อ่าน"],
      datasets: [{
        data: [book?.done || 0, book?.doing || 0, book?.todo || 0],
        backgroundColor: ["#18b879", "#4f8cff", "#94a3b8"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: { legend: { position: "bottom" } }
    }
  });
};

const renderVideoStatusDonut = (video) => {
  const ctx = document.getElementById("videoOverallChart");
  if (!ctx) return;
  if (videoOverallChartInstance) videoOverallChartInstance.destroy();
  videoOverallChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["ดูจบ", "กำลังดู", "เหลือ"],
      datasets: [{
        data: [video?.done || 0, video?.doing || 0, video?.todo || 0],
        backgroundColor: ["#18b879", "#4f8cff", "#94a3b8"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: { legend: { position: "bottom" } }
    }
  });
};

const renderChatbotQuizOverview = (chatbotMap) => {
  const ctx = document.getElementById("chatbotQuizOverallChart");
  const summaryEl = document.getElementById("chatbot-quiz-summary");
  if (!ctx) return;
  if (chatbotQuizOverallChartInstance) chatbotQuizOverallChartInstance.destroy();

  const items = (chatbotMap?.chapters || []).flatMap((chapter) => chapter?.items || []);
  const rows = items
    .map((item, idx) => {
      const total = Number(item?.scoreYou?.total ?? item?.scoreAvg?.total ?? item?.totalHint);
      const scoreYou = Number(item?.scoreYou?.score);
      const scoreAvg = Number(item?.scoreAvg?.score);
      const label = String(item?.title || "").trim() || `Quiz ${idx + 1}`;
      return {
        label,
        total: Number.isFinite(total) && total > 0 ? total : null,
        scoreYou: Number.isFinite(scoreYou) ? scoreYou : 0,
        scoreAvg: Number.isFinite(scoreAvg) ? scoreAvg : 0
      };
    })
    .filter((row) => row.label);

  if (!rows.length) {
    chatbotQuizOverallChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["ยังไม่มีข้อมูล"],
        datasets: [{
          label: "คะแนน",
          data: [0],
          backgroundColor: "#cbd5e1",
          borderRadius: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
    if (summaryEl) summaryEl.textContent = "ยังไม่มีข้อมูลคะแนน";
    return;
  }

  const chartLabels = rows.map((row, idx) => {
    const label = String(row.label || "").trim() || `Quiz ${idx + 1}`;
    return shortenChartLabel(label, 20);
  });
  const suggestedMax = Math.max(
    ...rows.map((row) => Math.max(Number(row.total) || 0, Number(row.scoreYou) || 0, Number(row.scoreAvg) || 0)),
    1
  );
  const hasAllTotals = rows.every((row) => Number.isFinite(row.total) && row.total > 0);
  const hasAnyTotals = rows.some((row) => Number.isFinite(row.total) && row.total > 0);
  const totalScore = hasAllTotals ? rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0) : null;
  const totalYou = rows.reduce((sum, row) => sum + (Number(row.scoreYou) || 0), 0);
  const totalAvg = rows.reduce((sum, row) => sum + (Number(row.scoreAvg) || 0), 0);

  chatbotQuizOverallChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "คะแนนของคุณ",
          data: rows.map((row) => row.scoreYou),
          backgroundColor: "#0f766e",
          borderRadius: 10,
        },
        {
          label: "ค่าเฉลี่ย",
          data: rows.map((row) => row.scoreAvg),
          backgroundColor: "#38bdf8",
          borderRadius: 10,
        },
        {
          label: "คะแนนเต็ม",
          data: rows.map((row) => Number.isFinite(row.total) && row.total > 0 ? row.total : null),
          backgroundColor: "#cbd5e1",
          borderRadius: 10,
          hidden: !hasAnyTotals
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = Number(items?.[0]?.dataIndex);
              const label = rows[idx]?.label;
              return label || "";
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, suggestedMax }
      }
    }
  });

  if (summaryEl) {
    summaryEl.textContent = hasAllTotals && Number.isFinite(totalScore) && totalScore > 0
      ? `มี ${rows.length} แบบทดสอบ • คะแนนรวมของคุณ ${Math.round(totalYou)}/${Math.round(totalScore)} • ค่าเฉลี่ยรวม ${Math.round(totalAvg)}/${Math.round(totalScore)}`
      : `มี ${rows.length} แบบทดสอบ • แสดงคะแนนของคุณ ค่าเฉลี่ย และคะแนนเต็มรายแบบทดสอบ`;
  }
};

const renderChapterTools = (chapterNode, chapterIdx) => {
  if (!chapterNode) return `<div class="text-sm text-slate-600">ยังไม่พบข้อมูลบท</div>`;
  const model = window.progressModel;
  const chapter = (Number.isFinite(chapterIdx) ? model?.chapters?.[chapterIdx] : null) || null;
  const sequentials = chapter
    ? chapter.sequentials
    : sortSequentialItemsHeuristic(((chapterNode.children || []).filter((c) => c?.kind === "sequential")).map((seq, sIdx) => ({
      idx: sIdx,
      id: seq?.id || "",
      node: seq,
      title: pickTitle(seq, `Sequential ${sIdx + 1}`),
      verticals: sortVerticalItemsHeuristic(((seq?.children || []).filter((c) => c?.kind === "vertical")).map((v, vIdx) => {
        const tool = inferVerticalTool(v);
        return {
          idx: vIdx,
          id: resolveLearningItemId(v, tool),
          node: v,
          title: pickTitle(v, `Vertical ${vIdx + 1}`),
          tool,
          pct: null
        };
      }))
    })));
  if (!sequentials.length) return "";

  const blocks = sequentials.map((seq) => {
    const vHtml = (seq.verticals || []).map((v) => {
      const subtoolList = Array.isArray(v.subtools) && v.subtools.length ? v.subtools : [v];
      const hasPct = Number.isFinite(v.pct);
      const pct = hasPct ? clamp(Number(v.pct), 0, 100) : null;
      const hasChatbotTool = subtoolList.some((item) => String(item?.tool?.sublabel || "").toLowerCase() === "chatbot");
      const hasChatbotMetrics = subtoolList.some((item) =>
        Number.isFinite(item?.chatbotScore?.score) ||
        Number.isFinite(item?.chatbotScoreAvg?.score) ||
        Number.isFinite(item?.chatbotTime) ||
        Number.isFinite(item?.chatbotTimeAvg)
      );
      const hasChatbotStarted = subtoolList.some((item) => hasChatbotAttemptStarted(item));
        const badge = !hasPct
        ? (
          hasChatbotTool
            ? (
              hasChatbotStarted ? `<span class="badge badge-done">ทำแบบทดสอบแล้ว</span>` :
                hasChatbotMetrics ? `<span class="badge badge-locked">ยังไม่ได้เริ่ม</span>` :
                  `<span class="badge badge-locked">ยังไม่มีข้อมูลคะแนน</span>`
            )
            : `<span class="badge badge-locked">ไม่มีข้อมูล API</span>`
        )
        : pct >= 100 ? `<span class="badge badge-done">ผ่านแล้ว</span>` :
          pct > 0 ? `<span class="badge badge-doing">กำลังทำ</span>` :
          `<span class="badge badge-locked">ยังไม่เริ่ม</span>`;
      const renderToolIcon = (tool) => {
        const subLc = String(tool?.sublabel || "").toLowerCase();
        if (subLc.includes("bookroll")) {
          return `<span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 border border-amber-200" aria-label="book">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 5.2c-1.1-1-2.6-1.6-4.3-1.6H4.8A1.8 1.8 0 0 0 3 5.4v12.9c0 1 .8 1.8 1.8 1.8h2.9c1.7 0 3.2.6 4.3 1.7"/>
              <path d="M12 5.2c1.1-1 2.6-1.6 4.3-1.6h2.9A1.8 1.8 0 0 1 21 5.4v12.9c0 1-.8 1.8-1.8 1.8h-2.9c-1.7 0-3.2.6-4.3 1.7"/>
              <path d="M12 5.2v16.6"/>
            </svg>
          </span>`;
        }
        if (subLc.includes("video")) {
          return `<span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600 border border-red-200" aria-label="video">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M8 6.8a1 1 0 0 1 1.53-.85l7.1 4.6a1.72 1.72 0 0 1 0 2.9l-7.1 4.6A1 1 0 0 1 8 17.2V6.8z"/>
            </svg>
          </span>`;
        }
        if (subLc.includes("chatbot")) {
          return `<span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700 border border-sky-200" aria-label="chatbot">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v2"/>
              <path d="M8 5h8a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-3l-3 3v-3H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z"/>
              <path d="M9 11h.01"/>
              <path d="M12 11h.01"/>
              <path d="M15 11h.01"/>
            </svg>
          </span>`;
        }
        return "";
      };
      const visibleToolItems = subtoolList.filter((item) => {
        const itemTool = item.tool || v.tool || inferVerticalTool(v.node || v);
        const itemHasPct = Number.isFinite(item?.pct);
        const isChatbot = String(itemTool?.sublabel || "").toLowerCase() === "chatbot";
        const hasChatbotData =
          Number.isFinite(item?.chatbotScore?.score) ||
          Number.isFinite(item?.chatbotScoreAvg?.score) ||
          Number.isFinite(item?.chatbotTime) ||
          Number.isFinite(item?.chatbotTimeAvg);
        const hasApiData = itemHasPct || !!item?.reading || !!item?.video || hasChatbotData;
        const labelLc = String(itemTool?.label || "").toLowerCase();
        const subLc = String(itemTool?.sublabel || "").toLowerCase();
        const isHtmlTool = labelLc.includes("html") || labelLc.includes("อ่านเนื้อหา");
        const isAeTool = labelLc.includes("ae tool") || labelLc.includes("aetool");
        const isTrackedAeTool =
          subLc.includes("bookroll") ||
          subLc.includes("video") ||
          subLc.includes("chatbot");
        if (isHtmlTool && !hasApiData && !isChatbot) return false;
        if (isAeTool && !isTrackedAeTool && !hasApiData) return false;
        return true;
      });
      const toolItems = visibleToolItems.map((item) => {
        const itemTool = item.tool || v.tool || inferVerticalTool(v.node || v);
        const isProfileTool = isRegistrationOrProfileAeTool(v.node || v, itemTool);
        const itemHasPct = !isProfileTool && Number.isFinite(item?.pct);
        const itemPct = itemHasPct ? clamp(Number(item.pct), 0, 100) : null;
        const itemPctText = itemHasPct ? `${itemPct}%` : "-";
        const isChatbot = String(itemTool?.sublabel || "").toLowerCase() === "chatbot";
        const chatbotStarted = isChatbot && hasChatbotAttemptStarted(item);
        const reading = item.reading || null;
        const video = item.video || null;
        const videoHeatmap = item.videoHeatmap || null;
        const chatbotScoreMain = chatbotStarted && item.chatbotScore ? formatChatbotScore(item.chatbotScore) : "";
        const chatbotScoreAvg = item.chatbotScoreAvg ? formatChatbotScore(item.chatbotScoreAvg) : "";
        const chatbotTimeText = chatbotStarted && (Number.isFinite(item.chatbotTime) || Number.isFinite(item.chatbotTimeAvg))
          ? `ใช้เวลา ${formatDurationShort(item.chatbotTime)} • เฉลี่ย ${formatDurationShort(item.chatbotTimeAvg)}`
          : "";
        const itemDetail = isChatbot
          ? (chatbotStarted ? chatbotTimeText : "ยังไม่ได้เริ่ม")
          : (reading
            ? formatBookrollReadingDetail(reading)
            : (video ? `รับชม ${video.progress}%` : ""));
        const pctToneClass = !itemHasPct
          ? "text-slate-400"
          : itemPct >= 100 ? "text-emerald-600"
            : itemPct > 0 ? "text-blue-600"
              : "text-slate-400";
        const chatbotScoreHero = isChatbot && chatbotStarted
          ? `<div class="shrink-0 text-right">
              <div class="text-[11px] uppercase tracking-wide text-slate-400">คะแนนของคุณ</div>
              <div class="text-xl font-extrabold text-sky-700 mono leading-none">${escapeHtml(chatbotScoreMain)}</div>
              ${chatbotScoreAvg ? `<div class="mt-1 text-xs text-slate-500">เฉลี่ย ${escapeHtml(chatbotScoreAvg)}</div>` : ""}
            </div>`
          : "";
        const isVideoTool = String(itemTool?.sublabel || "").toLowerCase().includes("video");
        const itemProgressHtml = (!isChatbot && itemHasPct && !isVideoTool)
          ? `
            <div class="video-progress-stack">
              <div class="video-progress-track">
                <div class="video-progress-fill grad-brand" style="width:${itemPct}%"></div>
              </div>
            </div>
          `
          : "";
        const itemHeatmapHtml = isVideoTool
          ? renderVideoHeatmapStrip(videoHeatmap)
          : "";
        return `
          <div class="rounded-xl bg-white/70 px-3 py-2 border border-slate-200">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                ${renderToolIcon(itemTool)}
                <div class="min-w-0">
                  <div class="text-sm font-medium text-slate-700">
                    <span>${escapeHtml(item.title || v.title || "-")}</span>
                  </div>
                  ${itemDetail ? `<div class="text-xs text-slate-500">${escapeHtml(itemDetail)}</div>` : ""}
                </div>
              </div>
              ${chatbotScoreHero}
              ${(!isChatbot && itemHasPct) ? `<div class="text-xs font-bold mono shrink-0 ${pctToneClass}">${escapeHtml(itemPctText)}</div>` : ""}
            </div>
            ${itemHeatmapHtml}
            ${itemProgressHtml}
          </div>
        `;
      }).join("");
      if (!visibleToolItems.length && !hasPct) return "";
      return `
        <div class="panel p-3">
          <div class="flex items-start justify-between gap-2">
            <div class="font-medium min-w-0">${escapeHtml(v.title || "-")}</div>
            <div class="flex items-center gap-2 justify-end">
              ${badge}
            </div>
          </div>
          <div class="mt-3 grid gap-2">
            ${toolItems}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="panel p-4">
        <div class="flex items-center justify-between gap-2">
          <div class="font-bold">${escapeHtml(seq.title || "-")}</div>
        <div class="text-xs text-slate-500">${(seq.verticals || []).length} รายการ</div>
        </div>
        <div class="mt-3 grid gap-2">
          ${vHtml}
        </div>
      </div>
    `;
  }).join("");

  return `<div class="grid gap-3">${blocks}</div>`;
};

const renderTopicTabsAndDetail = () => {
  const statusEl = document.getElementById("topic-status");
  const tabsEl = document.getElementById("topic-tabs");
  const detailEl = document.getElementById("topic-detail");
  const unitsEl = document.getElementById("topic-units");
  if (!unitsEl && (!tabsEl || !detailEl)) return;

  const titles = getCourseChapterTitles(window.courseDetailData);
  const chapters = getSortedChapters(window.courseDetailData);
  if (!titles.length) {
    if (statusEl) statusEl.textContent = "ไม่มีบท";
    if (tabsEl) tabsEl.innerHTML = "";
    if (detailEl) detailEl.innerHTML = `<div class="text-sm text-slate-600">ยังไม่มีข้อมูลบทเรียน</div>`;
    if (unitsEl) unitsEl.innerHTML = `<div class="text-sm text-slate-600">ยังไม่มีข้อมูลบทเรียน</div>`;
    return;
  }

  if (statusEl) statusEl.textContent = `มี ${titles.length} บท`;
  window.topicIndex = Math.min(Math.max(Number(window.topicIndex || 0), 0), titles.length - 1);

  window.progressModel = buildProgressModel();
  updateOverviewFromModel(window.progressModel);

  // New UI: Unit accordion list (preferred)
  if (unitsEl && window.progressModel) {
    const model = window.progressModel;
    const palette = [
      { strip: "bg-rose-400", pill: "bg-rose-50 text-rose-800 border border-rose-100" },
      { strip: "bg-amber-400", pill: "bg-amber-50 text-amber-800 border border-amber-100" },
      { strip: "bg-emerald-400", pill: "bg-emerald-50 text-emerald-800 border border-emerald-100" },
      { strip: "bg-sky-400", pill: "bg-sky-50 text-sky-800 border border-sky-100" },
      { strip: "bg-violet-400", pill: "bg-violet-50 text-violet-800 border border-violet-100" },
      { strip: "bg-pink-400", pill: "bg-pink-50 text-pink-800 border border-pink-100" },
    ];

    const displayKind = (tool) => {
      const label = String(tool?.label || "").trim();
      const sub = String(tool?.sublabel || "").trim();
      if (/แบบทดสอบ/i.test(label) || /problem/i.test(label)) return "QUIZ";
      if (/อ่านเนื้อหา/i.test(label) || /html/i.test(label)) return "HTML";
      if (/วิดีโอ/i.test(label) || /video/i.test(label)) return "VIDEO";
      if (/ae tool/i.test(label) || /aetool/i.test(label)) return sub ? `AETOOL (${sub.toLowerCase()})` : "AETOOL (unknown)";
      if (!label) return "UNKNOWN";
      return label.toUpperCase();
    };

    const collectNodeIdLines = (node, depth = 0, out = []) => {
      if (!node || typeof node !== "object") return out;
      const id = typeof node.id === "string" ? node.id : "";
      const kind = String(node.kind || (depth === 0 ? "vertical" : "node"));
      if (id) out.push({ depth, kind, id });
      const kids = Array.isArray(node.children) ? node.children : [];
      kids.forEach((k) => collectNodeIdLines(k, depth + 1, out));
      return out;
    };

    const renderIdLines = (node, fallbackId) => {
      const lines = collectNodeIdLines(node);
      if (!lines.length && fallbackId) lines.push({ depth: 0, kind: "vertical", id: String(fallbackId) });
      if (!lines.length) return `<div>VERTICAL • ID: -</div>`;
      return lines.map((line) => {
        const pad = Math.min(Number(line.depth || 0) * 14, 84);
        const kind = String(line.kind || "node").toUpperCase();
        return `<div style="padding-left:${pad}px">${escapeHtml(`${kind} • ID: ${line.id}`)}</div>`;
      }).join("");
    };

    const pushParamLine = (out, depth, key, rawVal) => {
      if (rawVal == null) return;
      let val = "";
      if (typeof rawVal === "string") val = rawVal;
      else {
        try { val = JSON.stringify(rawVal); } catch { val = String(rawVal); }
      }
      if (!val) return;
      if (/^data:image\//i.test(val) && val.length > 80) val = `${val.slice(0, 80)}...[omitted]`;
      if (val.length > 220) val = `${val.slice(0, 220)}...`;
      out.push({ depth, key, val });
    };

    const collectAeToolParamLines = (node, depth = 0, out = []) => {
      if (!node || typeof node !== "object") return out;
      const kind = String(node.kind || "");
      if (kind === "aetool") {
        const fields = (node.fields && typeof node.fields === "object") ? node.fields : {};
        Object.entries(fields).forEach(([k, v]) => {
          if (k === "data" && v && typeof v === "object" && !Array.isArray(v)) {
            Object.entries(v).forEach(([dk, dv]) => pushParamLine(out, depth + 1, `data.${dk}`, dv));
          } else {
            pushParamLine(out, depth + 1, k, v);
          }
        });
      }
      const kids = Array.isArray(node.children) ? node.children : [];
      kids.forEach((k) => collectAeToolParamLines(k, depth + 1, out));
      return out;
    };

    const renderAeToolParamLines = (node) => {
      const lines = collectAeToolParamLines(node);
      if (!lines.length) return "";
      const header = `<div class="mt-1">AETOOL PARAMS</div>`;
      const body = lines.map((line) => {
        const pad = Math.min(Number(line.depth || 0) * 14, 98);
        return `<div style="padding-left:${pad}px">${escapeHtml(`${line.key}: ${line.val}`)}</div>`;
      }).join("");
      return `${header}${body}`;
    };

    const statusFromPct = (pct) => {
      if (!Number.isFinite(pct)) return { dot: "bg-slate-300", badge: "bg-slate-100 text-slate-500 border border-slate-200", text: "ไม่มีข้อมูล API" };
      const n = clamp(Number(pct), 0, 100);
      if (n >= 100) return { dot: "bg-emerald-500", badge: "grad-success text-white", text: "ผ่านแล้ว" };
      if (n > 0) return { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700 border border-blue-200", text: "กำลังทำ" };
      return { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border border-slate-200", text: "ยังไม่เริ่ม" };
    };

    const unitHtml = model.chapters.map((ch, i) => {
      const accent = palette[i % palette.length];
      const sequentialCount = Array.isArray(ch.sequentials) ? ch.sequentials.length : 0;
      const verticalCount = (ch.sequentials || []).reduce((sum, seq) => {
        return sum + ((seq?.verticals || []).length);
      }, 0);
      const chapterNode = chapters[i] || null;
      const countText = sequentialCount > 1
        ? `แบ่งเป็น ${sequentialCount} หมวด • ${verticalCount} รายการ`
        : `${verticalCount} รายการ`;
      const hasChapterPct = Number.isFinite(ch.chapterPct);
      const pct = hasChapterPct ? clamp(Number(ch.chapterPct), 0, 100) : null;
      const chapterMetricText = formatChapterMetric(ch);
      const itemsHtml = renderChapterTools(chapterNode, i);

      return `
        <div class="panel p-0 overflow-hidden">
          <div class="flex">
            <div class="w-2 ${accent.strip}"></div>
            <details class="unit-details flex-1 p-4">
              <summary class="cursor-pointer select-none flex items-center justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="panel p-3 relative overflow-hidden">
                    <div class="absolute inset-y-0 left-0 grad-brand opacity-25" style="width:${hasChapterPct ? pct : 0}%"></div>
                    <div class="relative z-10 flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="text-lg font-extrabold text-slate-800 truncate">${escapeHtml(ch.title || `บทที่ ${i + 1}`)}</div>
                        <div class="text-slate-500 font-semibold text-sm">${escapeHtml(countText)}</div>
                      </div>
                      <div class="mono font-bold text-slate-700">${escapeHtml(chapterMetricText)}</div>
                    </div>
                  </div>
                </div>
                <div class="unit-caret text-slate-400 transition-transform">▼</div>
              </summary>

              <div class="mt-4 grid gap-3">
                ${itemsHtml}
              </div>
            </details>
          </div>
        </div>
      `;
    }).join("");

    unitsEl.innerHTML = unitHtml;
    return;
  }

  const tabHtml = titles.map((t, i) => {
    const active = i === window.topicIndex;
    const cls = active
      ? "pill px-3 py-2 text-sm font-semibold text-white grad-brand"
      : "ghost px-3 py-2 text-sm text-slate-700";
    const chapter = window.progressModel?.chapters?.[i] || null;
    const chapterMetric = formatChapterMetric(chapter);
    const suffix = chapterMetric ? ` • ${chapterMetric}` : "";
    return `<button class="${cls}" data-topic-idx="${i}">${escapeHtml(`บท ${i + 1}: ${t}${suffix}`)}</button>`;
  }).join("");
  if (tabsEl) tabsEl.innerHTML = tabHtml;

  const idx = window.topicIndex;
  const chapterTitle = titles[idx];
  const chapterNode = chapters[idx] || null;

  const chapterModel = window.progressModel?.chapters?.[idx] || null;
  const chapterPct = chapterModel?.chapterPct;
  const progressText = formatChapterProgressText(chapterModel);
  const progressTone = Number.isFinite(chapterPct) && chapterPct >= 100 ? "grad-success text-white" : "btn-soft";

  if (!detailEl) return;
  detailEl.innerHTML = `
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
      <div>
        <div class="text-xs text-slate-500">รายละเอียดบทที่ ${idx + 1}</div>
        <div class="text-lg font-extrabold">${escapeHtml(chapterTitle)}</div>
      </div>
      ${progressText ? `<div class="info-pill px-4 py-2 text-sm font-semibold tracking-wide ${progressTone}">${escapeHtml(progressText)}</div>` : ""}
    </div>

      <div class="mt-4 panel p-4">
      <div class="text-sm font-bold">รายการเรียนรู้ในบทนี้</div>
      <div class="mt-2 text-sm text-slate-600">แสดงรายการกิจกรรมและเครื่องมือที่มีอยู่ในบทนี้</div>
      <div class="mt-3">
        ${renderChapterTools(chapterNode, idx)}
      </div>
    </div>
  `;
};

const createHttpError = async (res) => {
  const code = Number(res?.status);
  let detail = "";
  try {
    detail = String(await res.text()).replace(/\s+/g, " ").trim();
  } catch {
    detail = "";
  }
  const short = detail ? detail.slice(0, 180) : "";
  return new Error(short ? `HTTP ${code}: ${short}` : `HTTP ${code}`);
};

const fetchCourseDetail = async () => {
  const statusEl = document.getElementById("course-status");
  const titleEl = document.getElementById("course-title");
  const keyEl = document.getElementById("course-key");
  const chapEl = document.getElementById("course-chapter");
  const seqEl = document.getElementById("course-seq");
  const vertEl = document.getElementById("course-vert");
  const htmlEl = document.getElementById("course-html");
  if (!courseId) {
    window.courseToolInventory = null;
    syncOverallToolCards();
    if (statusEl) statusEl.textContent = "ยังไม่พร้อมแสดงข้อมูลรายวิชา";
    setDebugApiEntry("course-detail", {
      label: "โครงสร้างบทเรียน",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมแสดงข้อมูลรายวิชา",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมแสดงข้อมูลรายวิชา" };
  }
  if (!isLikelyCourseId(courseId)) {
    window.courseToolInventory = null;
    syncOverallToolCards();
    if (statusEl) statusEl.textContent = "ยังไม่พร้อมแสดงข้อมูลรายวิชา";
    setDebugApiEntry("course-detail", {
      label: "โครงสร้างบทเรียน",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมแสดงข้อมูลรายวิชา",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมแสดงข้อมูลรายวิชา" };
  }
  if (statusEl) statusEl.textContent = "กำลังอัปเดตข้อมูลรายวิชา";
  try {
    const srcUrl = courseUrl(courseId);
    const res = await fetch(srcUrl);
    if (!res.ok) throw await createHttpError(res);
    const data = await res.json();
    const title = decodeIfMojibake(data.courseTitle || data.title || "-");
    const key = data.courseKey || data.course_key || courseId;
    if (titleEl) titleEl.textContent = title;
    if (keyEl) keyEl.textContent = key;
    const headerCourseNameEl = document.getElementById("header-course-name");
    if (headerCourseNameEl) headerCourseNameEl.textContent = title;
    window.courseDetailData = data;
    window.courseToolInventory = collectCourseToolInventory(data);
    syncOverallToolCards();
    const acc = { chapter: 0, sequential: 0, vertical: 0, html: 0 };
    countKinds(data, acc);
    if (chapEl) chapEl.textContent = acc.chapter;
    if (seqEl) seqEl.textContent = acc.sequential;
    if (vertEl) vertEl.textContent = acc.vertical;
    if (htmlEl) htmlEl.textContent = acc.html;
    rebuildChatbotOrderMap();

    requestDashboardRender();

    if (statusEl) statusEl.textContent = "ข้อมูลรายวิชาพร้อมแสดงผล";
    setDebugApiEntry("course-detail", {
      label: "โครงสร้างบทเรียน",
      state: "success",
      badge: "พร้อมแสดงผล",
      message: "ข้อมูลรายวิชาพร้อมแสดงผล",
      requests: [
        { label: "ข้อมูลรายวิชา", url: srcUrl, state: "success", message: "พร้อมแสดงผล", payload: data }
      ]
    });
    return { state: "success", message: "ข้อมูลรายวิชาพร้อมแสดงผล" };
  } catch (err) {
    window.courseToolInventory = null;
    syncOverallToolCards();
    if (statusEl) statusEl.textContent = "ไม่สามารถแสดงข้อมูลรายวิชาได้ในขณะนี้";
    console.warn("Course API error:", err);
    setDebugApiEntry("course-detail", {
      label: "โครงสร้างบทเรียน",
      state: "error",
      badge: "มีปัญหา",
      message: "ไม่สามารถแสดงข้อมูลรายวิชาได้ในขณะนี้",
      requests: [
        { label: "ข้อมูลรายวิชา", url: courseUrl(courseId), state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" }
      ]
    });
    return { state: "error", message: "ไม่สามารถแสดงข้อมูลรายวิชาได้ในขณะนี้" };
  }
};

const decodeIfMojibake = (text) => {
  if (typeof text !== "string") return text;
  if (!/[ÃÂà-ÿ]/.test(text)) return text;
  try {
    const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0)));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded || text;
  } catch {
    return text;
  }
};

const fetchBookrollReadingData = async () => {
  if (!userId || !courseId || !isLikelyCourseId(courseId)) {
    window.bookrollReadingData = null;
    window.bookrollReadingProgress = [];
    requestDashboardRender();
    setDebugApiEntry("bookroll-reading", {
      label: "ความคืบหน้าการอ่าน",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมแสดงความคืบหน้าการอ่าน",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมแสดงความคืบหน้าการอ่าน" };
  }
  const mergeReadingEntries = (list) => {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((item) => {
      if (!item || !Number.isFinite(item.progress)) return;
      const usageId = normalizeUsageId(item.usageId || "");
      const key = normalizeTopicKey(item.key || item.title || "");
      const dedupeKey = `${usageId}|${key || "-"}`;
      const prev = map.get(dedupeKey);
      if (!prev || Number(item.progress) > Number(prev.progress)) {
        map.set(dedupeKey, {
          ...item,
          usageId
        });
      }
    });
    return Array.from(map.values());
  };
  const fetchReadingEntriesByUsageId = async (usageId, titleHint = "") => {
    const srcUrl = bookrollReadingDataUrl(userId, usageId);
    const res = await fetch(srcUrl);
    if (!res.ok) throw await createHttpError(res);
    const data = await res.json();
    return {
      title: titleHint,
      sourceUrl: srcUrl,
      data,
      entries: buildReadingProgressMap(data, { usageId, titleHint })
    };
  };
  const collectBookrollUsageTargets = () => {
    const course = window.courseDetailData;
    if (!course) return [];
    const out = [];
    const seen = new Set();
    const chapters = getSortedChapters(course);
    chapters.forEach((ch) => {
      const sequentials = (ch?.children || []).filter((c) => c?.kind === "sequential");
      sequentials.forEach((seq) => {
        const verticals = (seq?.children || []).filter((c) => c?.kind === "vertical");
        verticals.forEach((v) => {
          const tool = inferVerticalTool(v);
          const subtype = String(tool?.sublabel || "").toLowerCase();
          const isBookroll = subtype.includes("bookroll") || String(tool?.label || "").toLowerCase().includes("bookroll");
          if (!isBookroll) return;
          const title = pickTitle(v, "");
          getBookrollUsageIdsFromVertical(v).forEach((usageId) => {
            const key = normalizeUsageId(usageId);
            if (!key || seen.has(key)) return;
            seen.add(key);
            out.push({ usageId, title });
          });
        });
      });
    });
    return out;
  };
  try {
    const aggregate = [];
    const debugSources = [];
    const debugRequests = [];
    let hasCourseLevelReading = false;

    try {
      const srcUrl = bookrollReadingDataUrl(userId, courseId);
      const res = await fetch(srcUrl);
      if (res.ok) {
        const data = await res.json();
        const courseEntries = buildReadingProgressMap(data, { usageId: courseId });
        debugSources.push({ url: srcUrl, data });
        debugRequests.push({ label: "ระดับรายวิชา", url: srcUrl, state: "success", message: "พร้อมแสดงผล", payload: data });
        aggregate.push(...courseEntries);
        hasCourseLevelReading = courseEntries.length > 0;
      } else {
        const err = await createHttpError(res);
        debugRequests.push({ label: "ระดับรายวิชา", url: srcUrl, state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" });
        console.warn("Bookroll readingData API error:", err);
      }
    } catch (err) {
      debugRequests.push({ label: "ระดับรายวิชา", url: bookrollReadingDataUrl(userId, courseId), state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" });
      console.warn("Bookroll readingData API error:", err);
    }

    const targets = collectBookrollUsageTargets();
    if (!hasCourseLevelReading && targets.length) {
      const responses = await Promise.all(
        targets.map(async (target) => {
          try {
            return await fetchReadingEntriesByUsageId(target.usageId, target.title);
          } catch {
            return null;
          }
        })
      );
      responses.filter(Boolean).forEach((hit) => {
        debugSources.push({ url: hit.sourceUrl, data: hit.data });
        debugRequests.push({ label: hit.title || "ระดับบทเรียน", url: hit.sourceUrl, state: "success", message: "พร้อมแสดงผล", payload: hit.data });
        aggregate.push(...hit.entries);
      });
    }

    window.bookrollReadingData = debugSources.length ? debugSources[0].data : null;
    window.bookrollReadingProgress = mergeReadingEntries(aggregate);
    const displayCount = getBookrollReadingDisplayCount(window.bookrollReadingProgress);
    const hasData = window.bookrollReadingProgress.length > 0 || !!window.bookrollReadingData;
    setDebugApiEntry("bookroll-reading", {
      label: "ความคืบหน้าการอ่าน",
      state: hasData ? "success" : "error",
      badge: hasData ? "พร้อมแสดงผล" : "มีปัญหา",
      message: hasData ? `พบข้อมูลการอ่าน ${displayCount} รายการ` : "ไม่พบข้อมูลการอ่าน",
      requests: debugRequests
    });
    return {
      state: hasData ? "success" : "error",
      message: hasData ? `พบข้อมูลการอ่าน ${displayCount} รายการ` : "ไม่พบข้อมูลการอ่าน"
    };
  } catch (err) {
    window.bookrollReadingData = null;
    window.bookrollReadingProgress = [];
    console.warn("Bookroll reading progress error:", err);
    setDebugApiEntry("bookroll-reading", {
      label: "ความคืบหน้าการอ่าน",
      state: "error",
      badge: "มีปัญหา",
      message: "ไม่สามารถแสดงข้อมูลการอ่านได้ในขณะนี้",
      requests: []
    });
    return { state: "error", message: "ไม่สามารถแสดงข้อมูลการอ่านได้ในขณะนี้" };
  } finally {
    requestDashboardRender();
  }
};

const fetchVideoLearningProgress = async () => {
  if (!courseId || !isLikelyCourseId(courseId)) {
    window.videoLearningRaw = null;
    window.videoProgressData = [];
    window.videoHeatmapRaw = null;
    window.videoHeatmapData = [];
    window.videoUserNameResolved = null;
    window.videoApiStatus = "invalid-course";
    requestDashboardRender();
    updateLoginDebugPanel();
    setDebugApiEntry("video-progress", {
      label: "ความคืบหน้าวิดีโอ",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมแสดงความคืบหน้าวิดีโอ",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมแสดงความคืบหน้าวิดีโอ" };
  }
  const candidates = resolveVideoUserNameCandidates();
  if (!candidates.length) {
    window.videoLearningRaw = null;
    window.videoProgressData = [];
    window.videoHeatmapRaw = null;
    window.videoHeatmapData = [];
    window.videoUserNameResolved = null;
    window.videoApiStatus = "missing-username";
    requestDashboardRender();
    updateLoginDebugPanel();
    setDebugApiEntry("video-progress", {
      label: "ความคืบหน้าวิดีโอ",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมแสดงความคืบหน้าวิดีโอ",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมแสดงความคืบหน้าวิดีโอ" };
  }
  try {
    let best = { entries: [], data: null, heatmapEntries: [], heatmapData: null, info: null };
    let okResponseCount = 0;
    const debugRequests = [];
    for (const info of candidates) {
      const srcUrl = videoBarUrl(info.value, courseId);
      const heatmapSrcUrl = videoHeatmapUrl(info.value, courseId);
      const res = await fetch(srcUrl);
      if (!res.ok) {
        debugRequests.push({ label: info.source, url: srcUrl, state: "error", message: "มีปัญหา", payload: `HTTP ${res.status}` });
        continue;
      }
      okResponseCount += 1;
      const data = await res.json();
      const entries = buildVideoProgressMap(data);
      debugRequests.push({ label: info.source, url: srcUrl, state: "success", message: "พร้อมแสดงผล", payload: data });
      let heatmapData = null;
      let heatmapEntries = [];
      try {
        const heatmapRes = await fetch(heatmapSrcUrl);
        if (!heatmapRes.ok) throw await createHttpError(heatmapRes);
        heatmapData = await heatmapRes.json();
        heatmapEntries = buildVideoHeatmapMap(heatmapData);
        debugRequests.push({ label: `${info.source} • ช่วงเวลาการรับชม`, url: heatmapSrcUrl, state: "success", message: "พร้อมแสดงผล", payload: heatmapData });
      } catch (err) {
        debugRequests.push({ label: `${info.source} • ช่วงเวลาการรับชม`, url: heatmapSrcUrl, state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" });
      }
      if (entries.length) {
        best = { entries, data, heatmapEntries, heatmapData, info };
        break;
      }
      if (!best.data) best = { entries, data, heatmapEntries, heatmapData, info };
    }
    window.videoLearningRaw = best.data;
    window.videoProgressData = best.entries;
    window.videoHeatmapRaw = best.heatmapData;
    window.videoHeatmapData = best.heatmapEntries;
    window.videoUserNameResolved = best.info || candidates[0] || null;
    window.videoApiStatus = okResponseCount > 0 ? "ok" : "error";
    const activeHeatmapCount = Array.isArray(best.heatmapEntries)
      ? best.heatmapEntries.filter((entry) => Number(entry?.activeBuckets) > 0).length
      : 0;
    setDebugApiEntry("video-progress", {
      label: "ความคืบหน้าวิดีโอ",
      state: okResponseCount > 0 ? "success" : "error",
      badge: okResponseCount > 0 ? "พร้อมแสดงผล" : "มีปัญหา",
      message: okResponseCount > 0
        ? `พบข้อมูลวิดีโอ ${best.entries.length} รายการ • ช่วงเวลาการรับชม ${activeHeatmapCount} รายการ`
        : "ไม่พบข้อมูลวิดีโอ",
      requests: debugRequests
    });
    return {
      state: okResponseCount > 0 ? "success" : "error",
      message: okResponseCount > 0
        ? `พบข้อมูลวิดีโอ ${best.entries.length} รายการ • ช่วงเวลาการรับชม ${activeHeatmapCount} รายการ`
        : "ไม่พบข้อมูลวิดีโอ"
    };
  } catch (err) {
    window.videoLearningRaw = null;
    window.videoProgressData = [];
    window.videoHeatmapRaw = null;
    window.videoHeatmapData = [];
    window.videoUserNameResolved = null;
    window.videoApiStatus = "error";
    console.warn("Video learning API error:", err);
    setDebugApiEntry("video-progress", {
      label: "ความคืบหน้าวิดีโอ",
      state: "error",
      badge: "มีปัญหา",
      message: "ไม่สามารถแสดงข้อมูลวิดีโอได้ในขณะนี้",
      requests: []
    });
    return { state: "error", message: "ไม่สามารถแสดงข้อมูลวิดีโอได้ในขณะนี้" };
  } finally {
    updateLoginDebugPanel();
    requestDashboardRender();
  }
};

const fetchChatbotSpeed = async () => {
  if (!userId || !courseId || !isLikelyCourseId(courseId)) {
    window.chatbotSpeedRawData = null;
    rebuildChatbotOrderMap();
    requestDashboardRender();
    setDebugApiEntry("chatbot-speed", {
      label: "ระยะเวลาการทำแบบฝึกหัด",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมแสดงระยะเวลาการทำแบบฝึกหัด",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมแสดงระยะเวลาการทำแบบฝึกหัด" };
  }
  try {
    const srcUrl = chatbotSpeedUrl(courseId, userId);
    const res = await fetch(srcUrl);
    if (!res.ok) throw await createHttpError(res);
    const data = await res.json();
    window.chatbotSpeedRawData = getChartConfig(data);
    const rawCategories = getCategoryAxisData(window.chatbotSpeedRawData);
    window.chatbotSpeedRawData.__categoryMeta = rawCategories.map((label) => parseChatbotCategoryMeta(label));
    setDebugApiEntry("chatbot-speed", {
      label: "ระยะเวลาการทำแบบฝึกหัด",
      state: "success",
      badge: "พร้อมแสดงผล",
      message: "ข้อมูลระยะเวลาการทำแบบฝึกหัดพร้อมแสดงผล",
      requests: [
        { label: "ระยะเวลาการทำแบบฝึกหัด", url: srcUrl, state: "success", message: "พร้อมแสดงผล", payload: data }
      ]
    });
    return { state: "success", message: "ข้อมูลระยะเวลาการทำแบบฝึกหัดพร้อมแสดงผล" };
  } catch (err) {
    window.chatbotSpeedRawData = null;
    console.warn("Chatbot Speed API error:", err);
    setDebugApiEntry("chatbot-speed", {
      label: "ระยะเวลาการทำแบบฝึกหัด",
      state: "error",
      badge: "มีปัญหา",
      message: "ไม่สามารถแสดงข้อมูลระยะเวลาการทำแบบฝึกหัดได้ในขณะนี้",
      requests: [
        { label: "ระยะเวลาการทำแบบฝึกหัด", url: chatbotSpeedUrl(courseId, userId), state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" }
      ]
    });
    return { state: "error", message: "ไม่สามารถแสดงข้อมูลระยะเวลาการทำแบบฝึกหัดได้ในขณะนี้" };
  } finally {
    rebuildChatbotOrderMap();
    requestDashboardRender();
  }
};

const fetchChatbotPerformance = async () => {
  if (!userId || !courseId || !isLikelyCourseId(courseId)) {
    window.chatbotPerfData = null;
    rebuildChatbotOrderMap();
    requestDashboardRender();
    setDebugApiEntry("chatbot-performance", {
      label: "ผลการทำแบบฝึกหัด",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมแสดงผลการทำแบบฝึกหัด",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมแสดงผลการทำแบบฝึกหัด" };
  }
  try {
    const srcUrl = chatbotPerformanceUrl(courseId, userId);
    const res = await fetch(srcUrl);
    if (!res.ok) throw await createHttpError(res);
    const data = await res.json();
    window.chatbotPerfData = getChartConfig(data);
    const rawCategories = getCategoryAxisData(window.chatbotPerfData);
    window.chatbotPerfData.__categoryMeta = rawCategories.map((label) => parseChatbotCategoryMeta(label));
    setDebugApiEntry("chatbot-performance", {
      label: "ผลการทำแบบฝึกหัด",
      state: "success",
      badge: "พร้อมแสดงผล",
      message: "ผลการทำแบบฝึกหัดพร้อมแสดงผล",
      requests: [
        { label: "ผลการทำแบบฝึกหัด", url: srcUrl, state: "success", message: "พร้อมแสดงผล", payload: data }
      ]
    });
    return { state: "success", message: "ผลการทำแบบฝึกหัดพร้อมแสดงผล" };
  } catch (err) {
    window.chatbotPerfData = null;
    console.warn("Chatbot Performance API error:", err);
    setDebugApiEntry("chatbot-performance", {
      label: "ผลการทำแบบฝึกหัด",
      state: "error",
      badge: "มีปัญหา",
      message: "ไม่สามารถแสดงผลการทำแบบฝึกหัดได้ในขณะนี้",
      requests: [
        { label: "ผลการทำแบบฝึกหัด", url: chatbotPerformanceUrl(courseId, userId), state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" }
      ]
    });
    return { state: "error", message: "ไม่สามารถแสดงผลการทำแบบฝึกหัดได้ในขณะนี้" };
  } finally {
    rebuildChatbotOrderMap();
    requestDashboardRender();
  }
};

const fetchChatbotScoreV2Debug = async () => {
  const srcUrl = chatbotScoreV2Url(courseId);
  const accessToken = auth?.token?.access_token;
  if (!courseId || !isLikelyCourseId(courseId)) {
    setDebugApiEntry("chatbot-score-v2", {
      label: "คะแนน Quiz (endpoint ใหม่)",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมเรียก endpoint ใหม่ เพราะไม่มี courseid",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมเรียก endpoint ใหม่ เพราะไม่มี courseid" };
  }
  if (!accessToken) {
    setDebugApiEntry("chatbot-score-v2", {
      label: "คะแนน Quiz (endpoint ใหม่)",
      state: "skipped",
      badge: "ต้องเข้าสู่ระบบ",
      message: "ไม่พบ access token สำหรับเรียก endpoint ใหม่",
      requests: [
        { label: "GET /me/data/chatbot/{courseId}", url: srcUrl, state: "skipped", message: "ไม่พบ access token", payload: "-" }
      ]
    });
    return { state: "skipped", message: "ไม่พบ access token สำหรับเรียก endpoint ใหม่" };
  }

  try {
    const res = await fetch(srcUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const raw = await res.text();
    let payload = raw;
    try { payload = raw ? JSON.parse(raw) : null; } catch (_) {}
    if (!res.ok) {
      const message = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
      setDebugApiEntry("chatbot-score-v2", {
        label: "คะแนน Quiz (endpoint ใหม่)",
        state: "error",
        badge: "มีปัญหา",
        message,
        requests: [
          { label: "GET /me/data/chatbot/{courseId}", url: srcUrl, state: "error", message, payload }
        ]
      });
      return { state: "error", message };
    }
    setDebugApiEntry("chatbot-score-v2", {
      label: "คะแนน Quiz (endpoint ใหม่)",
      state: "success",
      badge: "พร้อมตรวจสอบ",
      message: `โหลดข้อมูลสำเร็จ • HTTP ${res.status}`,
      requests: [
        { label: "GET /me/data/chatbot/{courseId}", url: srcUrl, state: "success", message: `HTTP ${res.status}`, payload }
      ]
    });
    return { state: "success", message: `โหลดข้อมูล endpoint ใหม่สำเร็จ • HTTP ${res.status}` };
  } catch (err) {
    setDebugApiEntry("chatbot-score-v2", {
      label: "คะแนน Quiz (endpoint ใหม่)",
      state: "error",
      badge: "มีปัญหา",
      message: "ไม่สามารถเรียก endpoint ใหม่ได้",
      requests: [
        { label: "GET /me/data/chatbot/{courseId}", url: srcUrl, state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" }
      ]
    });
    return { state: "error", message: "ไม่สามารถเรียก endpoint ใหม่ได้" };
  }
};

const fetchAdaptiveQuizSharedDashboard = async () => {
  window.adaptiveQuizSharedDashboardRaw = null;
  const apiKey = getAdaptiveQuizApiKey();
  const refCode = getAdaptiveQuizRefCode();
  const learnerEmail = getAdaptiveQuizLearnerEmail();
  const leadLabel = normalizeAdaptiveQuizLeadLabel(courseId);
  const srcUrl = learnerEmail && leadLabel && refCode
    ? adaptiveQuizSharedDashboardUrl(learnerEmail, leadLabel, refCode)
    : "";

  if (!courseId || !isLikelyCourseId(courseId)) {
    setDebugApiEntry("adaptive-quiz-shared-dashboard", {
      label: "Adaptive Quiz shared dashboard",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่มี courseid",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่มี courseid" };
  }
  if (!learnerEmail) {
    setDebugApiEntry("adaptive-quiz-shared-dashboard", {
      label: "Adaptive Quiz shared dashboard",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่พบ learner email",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่พบ learner email" };
  }
  if (!refCode) {
    setDebugApiEntry("adaptive-quiz-shared-dashboard", {
      label: "Adaptive Quiz shared dashboard",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่พบ ref_code",
      requests: []
    });
    return { state: "skipped", message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่พบ ref_code" };
  }
  if (!apiKey) {
    setDebugApiEntry("adaptive-quiz-shared-dashboard", {
      label: "Adaptive Quiz shared dashboard",
      state: "skipped",
      badge: "ไม่มีข้อมูล",
      message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่พบ x-api-key",
      requests: [
        { label: "shared learner dashboard", url: srcUrl, state: "skipped", message: "ไม่มี x-api-key", payload: "ตั้งค่า key ผ่าน STUDENT_DASHBOARD_CONFIG.adaptiveQuiz.apiKey, sessionStorage.adaptive_quiz_api_key, หรือ query adaptive_api_key" }
      ]
    });
    return { state: "skipped", message: "ยังไม่พร้อมเรียก Adaptive Quiz เพราะไม่พบ x-api-key" };
  }

  try {
    const res = await fetch(srcUrl, {
      headers: { "x-api-key": apiKey }
    });
    if (!res.ok) throw await createHttpError(res);
    const data = await res.json();
    window.adaptiveQuizSharedDashboardRaw = data;
    const collectionCount = Number(data?.total_collections) || (Array.isArray(data?.collections) ? data.collections.length : 0);
    const quizCount = Array.isArray(data?.collections)
      ? data.collections.reduce((sum, collection) => sum + (Number(collection?.total_quizzes) || (Array.isArray(collection?.quizzes) ? collection.quizzes.length : 0)), 0)
      : 0;
    const message = `โหลด Adaptive Quiz สำเร็จ ${collectionCount} collection • ${quizCount} quiz`;
    setDebugApiEntry("adaptive-quiz-shared-dashboard", {
      label: "Adaptive Quiz shared dashboard",
      state: "success",
      badge: "พร้อมตรวจสอบ",
      message,
      requests: [
        { label: "shared learner dashboard", url: srcUrl, state: "success", message: "พร้อมตรวจสอบ", payload: data }
      ]
    });
    return { state: "success", message };
  } catch (err) {
    window.adaptiveQuizSharedDashboardRaw = null;
    console.warn("Adaptive Quiz shared dashboard API error:", err);
    setDebugApiEntry("adaptive-quiz-shared-dashboard", {
      label: "Adaptive Quiz shared dashboard",
      state: "error",
      badge: "มีปัญหา",
      message: "ไม่สามารถโหลด Adaptive Quiz shared dashboard ได้",
      requests: [
        { label: "shared learner dashboard", url: srcUrl, state: "error", message: "มีปัญหา", payload: err?.message || "เกิดข้อผิดพลาด" }
      ]
    });
    return { state: "error", message: "ไม่สามารถโหลด Adaptive Quiz shared dashboard ได้" };
  }
};

document.getElementById("overall-value-wide").textContent = "0%";
document.getElementById("overall-bar-wide").style.width = "0%";
document.getElementById("bookroll-donut-done").textContent = "0";
document.getElementById("bookroll-donut-doing").textContent = "0";
document.getElementById("bookroll-donut-todo").textContent = "0";
document.getElementById("video-donut-done").textContent = "0";
document.getElementById("video-donut-doing").textContent = "0";
document.getElementById("video-donut-remain").textContent = "0";
const loginBtn = document.getElementById("btn-login");
const logoutBtn = document.getElementById("btn-logout");
const globalLoadingOverlayEl = document.getElementById("global-loading-overlay");
const globalLoadingSpinnerEl = document.getElementById("global-loading-spinner");
const globalLoadingTextEl = document.getElementById("global-loading-text");
const globalLoadingListEl = document.getElementById("global-loading-list");
const globalLoadingCloseEl = document.getElementById("global-loading-close");
const globalLoadingRetryFailedEl = document.getElementById("global-loading-retry-failed");
const globalLoadingToggleEl = document.getElementById("global-loading-toggle");
const videoHoverTooltipEl = document.getElementById("video-hover-tooltip");
if (SHOW_DEBUG_CARD) renderDebugApiCard();
let auth = readAuth();

const updateAuthUi = () => {
  const loggedIn = !!auth?.userId;
  if (!SHOW_LOGIN_BUTTONS) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
    return;
  }
  if (loginBtn) loginBtn.style.display = loggedIn ? "none" : "inline-flex";
  if (logoutBtn) logoutBtn.style.display = loggedIn ? "inline-flex" : "none";
};

const setAuthState = (nextAuth) => {
  auth = nextAuth;
  updateAuthUi();
  userId = auth?.userId || null;
  if (inputUserEl) inputUserEl.value = userId || "";
  applyParams(courseId);
  syncHeader();
  updateLoginDebugPanel();
};

const dashboardTaskStateMeta = {
  pending: { label: "กำลังเตรียม", tone: "pending" },
  requesting: { label: "กำลังอัปเดต", tone: "requesting" },
  success: { label: "พร้อมแสดงผล", tone: "success" },
  error: { label: "มีปัญหา", tone: "error" },
  skipped: { label: "ไม่มีข้อมูล", tone: "skipped" }
};
const dashboardTaskFinishedStates = new Set(["success", "error", "skipped"]);
const dashboardTaskProgressFinishedStates = new Set(["success", "error"]);
const dashboardTaskToolLabels = {
  bookroll: "BookRoll",
  video: "วิดีโอ",
  chatbot: "แบบฝึกหัด"
};

const getDashboardTaskDefs = () => {
  const tasks = [
    { id: "course-detail", label: "โครงสร้างบทเรียน", run: fetchCourseDetail },
    { id: "bookroll-reading", label: "ความคืบหน้าการอ่าน", run: fetchBookrollReadingData, requiresTool: "bookroll" },
    { id: "video-progress", label: "ความคืบหน้าวิดีโอ", run: fetchVideoLearningProgress, requiresTool: "video" },
    { id: "chatbot-speed", label: "ระยะเวลาการทำแบบฝึกหัด", run: fetchChatbotSpeed, requiresTool: "chatbot" },
    { id: "chatbot-performance", label: "ผลการทำแบบฝึกหัด", run: fetchChatbotPerformance, requiresTool: "chatbot" },
    { id: "adaptive-quiz-shared-dashboard", label: "Adaptive Quiz shared dashboard", run: fetchAdaptiveQuizSharedDashboard }
  ];
  if (SHOW_DEBUG_CARD) {
    tasks.splice(tasks.length - 1, 0, {
      id: "chatbot-score-v2",
      label: "คะแนน Quiz (endpoint ใหม่)",
      run: fetchChatbotScoreV2Debug,
      requiresTool: "chatbot"
    });
  }
  return tasks;
};

const getDashboardTaskPrecondition = (taskDef, courseTaskResult) => {
  if (!taskDef || taskDef.id === "course-detail") return { run: true };
  if (courseTaskResult?.state !== "success") {
    return { run: false, state: "skipped", message: "ยังไม่พร้อมแสดงผล เพราะข้อมูลรายวิชายังไม่สมบูรณ์" };
  }
  if (!taskDef.requiresTool) return { run: true };
  const inventory = window.courseToolInventory?.counts || {};
  const count = Number(inventory[taskDef.requiresTool]) || 0;
  if (count > 0) return { run: true };
  const label = dashboardTaskToolLabels[taskDef.requiresTool] || taskDef.requiresTool;
  return { run: false, state: "skipped", message: `วิชานี้ไม่มีข้อมูล ${label} ในบทเรียน` };
};

const dashboardLoadState = {
  cycle: 0,
  deferRender: false,
  pendingRender: false,
  total: 0,
  done: 0,
  tasks: [],
  overlayOpen: false
};

const recalcDashboardLoadProgress = () => {
  const tasks = Array.isArray(dashboardLoadState.tasks) ? dashboardLoadState.tasks : [];
  const activeTasks = tasks.filter((task) => task.state !== "skipped");
  dashboardLoadState.total = activeTasks.length;
  dashboardLoadState.done = activeTasks.filter((task) => dashboardTaskProgressFinishedStates.has(task.state)).length;
};

const getDashboardTaskById = (taskId) =>
  (Array.isArray(dashboardLoadState.tasks) ? dashboardLoadState.tasks : []).find((task) => task.id === taskId) || null;

const hasDashboardRunningTasks = () =>
  (Array.isArray(dashboardLoadState.tasks) ? dashboardLoadState.tasks : []).some((task) => task.state === "requesting");

const hasDashboardErrorTasks = () =>
  (Array.isArray(dashboardLoadState.tasks) ? dashboardLoadState.tasks : []).some((task) => task.state === "error");

const closeGlobalLoadingOverlayIfResolved = () => {
  if (hasDashboardRunningTasks()) return;
  if (hasDashboardErrorTasks()) return;
  setGlobalLoadingOverlay(false);
};

const normalizeDashboardTaskResult = (result) => {
  if (!result || typeof result !== "object") return { state: "success", message: "" };
  const state = typeof result.state === "string" ? result.state : "success";
  const message = typeof result.message === "string" ? result.message : "";
  return { state, message };
};

const renderGlobalLoadingOverlay = () => {
  recalcDashboardLoadProgress();
  const tasks = Array.isArray(dashboardLoadState.tasks) ? dashboardLoadState.tasks : [];
  const running = tasks.filter((task) => task.state === "requesting").length;
  const success = tasks.filter((task) => task.state === "success").length;
  const errors = tasks.filter((task) => task.state === "error").length;
  const skipped = tasks.filter((task) => task.state === "skipped").length;
  const total = dashboardLoadState.total;
  const done = dashboardLoadState.done;
  const resolved = tasks.filter((task) => dashboardTaskFinishedStates.has(task.state)).length;
  const allFinished = total > 0
    ? running === 0 && done >= total
    : tasks.length > 0 && running === 0 && resolved >= tasks.length;

  if (globalLoadingOverlayEl) globalLoadingOverlayEl.classList.toggle("active", !!dashboardLoadState.overlayOpen);
  if (globalLoadingSpinnerEl) globalLoadingSpinnerEl.style.display = running > 0 ? "" : "none";
  if (globalLoadingTextEl) {
    const summary = [
      success ? `พร้อมแสดงผล ${success}` : "",
      errors ? `มีปัญหา ${errors}` : "",
      skipped ? `ไม่มีข้อมูล ${skipped}` : ""
    ].filter(Boolean).join(" • ");
    if (running > 0) {
      globalLoadingTextEl.textContent = `กำลังอัปเดตข้อมูล ${done}/${total} รายการ${summary ? ` • ${summary}` : ""}`;
    } else if (total > 0) {
      globalLoadingTextEl.textContent = `อัปเดตข้อมูลครบ ${done}/${total} รายการ${summary ? ` • ${summary}` : ""}`;
    } else if (tasks.length > 0) {
      globalLoadingTextEl.textContent = `ไม่มีข้อมูลที่ต้องอัปเดต${summary ? ` • ${summary}` : ""}`;
    } else {
      globalLoadingTextEl.textContent = "โปรดรอสักครู่...";
    }
  }
  if (globalLoadingListEl) {
    globalLoadingListEl.innerHTML = tasks.length
      ? tasks.map((task) => {
          const meta = dashboardTaskStateMeta[task.state] || dashboardTaskStateMeta.pending;
          const message = task.message || meta.label;
          const retryBtn = task.state === "error"
            ? `<button type="button" class="global-loading-btn" data-dashboard-task-retry="${escapeHtml(task.id)}">ลองอีกครั้ง</button>`
            : "";
          return `
            <div class="global-loading-item ${meta.tone}">
              <div class="global-loading-item-main">
                <div class="global-loading-item-title">${escapeHtml(task.label)}</div>
                <div class="global-loading-item-msg">${escapeHtml(message)}</div>
              </div>
              <div class="global-loading-item-side">
                <span class="global-loading-badge ${meta.tone}">${escapeHtml(meta.label)}</span>
                ${retryBtn}
              </div>
            </div>
          `;
        }).join("")
      : `<div class="text-sm text-slate-500">ยังไม่มีรายการ API</div>`;
  }
  if (globalLoadingCloseEl) globalLoadingCloseEl.style.display = allFinished ? "inline-flex" : "none";
  if (globalLoadingRetryFailedEl) globalLoadingRetryFailedEl.style.display = errors > 0 ? "inline-flex" : "none";
  if (globalLoadingToggleEl) {
    const shouldShowToggle = !dashboardLoadState.overlayOpen && tasks.length > 0 && (errors > 0 || running > 0);
    globalLoadingToggleEl.classList.toggle("active", shouldShowToggle);
    globalLoadingToggleEl.classList.toggle("error", shouldShowToggle && errors > 0);
    globalLoadingToggleEl.classList.toggle("success", shouldShowToggle && errors === 0 && allFinished);
    if (shouldShowToggle) {
      globalLoadingToggleEl.textContent = errors > 0
        ? `มีปัญหา ${errors}`
        : (total > 0 ? `กำลังอัปเดต ${done}/${total}` : `ไม่มีข้อมูล ${skipped}`);
    }
  }
};

const setGlobalLoadingOverlay = (visible) => {
  dashboardLoadState.overlayOpen = !!visible;
  renderGlobalLoadingOverlay();
};

const setDashboardTaskState = (taskId, next, cycleId = dashboardLoadState.cycle) => {
  if (cycleId !== dashboardLoadState.cycle) return;
  const task = getDashboardTaskById(taskId);
  if (!task) return;
  if (next && typeof next === "object") {
    if (typeof next.state === "string") task.state = next.state;
    if (typeof next.message === "string") task.message = next.message;
  }
  renderGlobalLoadingOverlay();
};

const requestDashboardRender = () => {
  if (dashboardLoadState.deferRender) {
    dashboardLoadState.pendingRender = true;
    return;
  }
  syncOverallToolCards();
  renderTopicTabsAndDetail();
};

const beginDashboardLoadCycle = (taskDefs) => {
  dashboardLoadState.cycle += 1;
  dashboardLoadState.deferRender = true;
  dashboardLoadState.pendingRender = false;
  resetDebugApiState();
  dashboardLoadState.tasks = (Array.isArray(taskDefs) ? taskDefs : []).map((task) => ({
    id: task.id,
    label: task.label,
    state: "pending",
    message: "กำลังเตรียม"
  }));
  recalcDashboardLoadProgress();
  const cycleId = dashboardLoadState.cycle;
  setGlobalLoadingOverlay(true);
  return cycleId;
};

const runDashboardTask = async (taskDef, cycleId = dashboardLoadState.cycle) => {
  if (!taskDef?.id || typeof taskDef.run !== "function") return null;
  setDashboardTaskState(taskDef.id, { state: "requesting", message: "กำลังอัปเดตข้อมูล..." }, cycleId);
  let result = { state: "success", message: "" };
  try {
    result = normalizeDashboardTaskResult(await taskDef.run());
  } catch (err) {
    result = { state: "error", message: err?.message || "เกิดข้อผิดพลาด" };
    console.warn(`Dashboard task error [${taskDef.id}]:`, err);
  }
  setDashboardTaskState(taskDef.id, result, cycleId);
  if (!dashboardLoadState.deferRender) {
    closeGlobalLoadingOverlayIfResolved();
  }
  return result;
};

const endDashboardLoadCycle = (cycleId) => {
  if (cycleId !== dashboardLoadState.cycle) return;
  dashboardLoadState.deferRender = false;
  renderTopicTabsAndDetail();
  dashboardLoadState.pendingRender = false;
  recalcDashboardLoadProgress();
  closeGlobalLoadingOverlayIfResolved();
};

const retryDashboardTask = async (taskId) => {
  if (taskId === "course-detail") {
    await loadDashboardData();
    return;
  }
  const taskDef = getDashboardTaskDefs().find((task) => task.id === taskId);
  if (!taskDef) return;
  const prereq = getDashboardTaskPrecondition(taskDef, getDashboardTaskById("course-detail"));
  if (!prereq.run) {
    setDashboardTaskState(taskDef.id, prereq, dashboardLoadState.cycle);
    return;
  }
  setGlobalLoadingOverlay(true);
  await runDashboardTask(taskDef, dashboardLoadState.cycle);
};

const retryFailedDashboardTasks = async () => {
  const failedTaskIds = (dashboardLoadState.tasks || [])
    .filter((task) => task.state === "error")
    .map((task) => task.id);
  if (!failedTaskIds.length) return;
  if (failedTaskIds.includes("course-detail")) {
    await loadDashboardData();
    return;
  }
  setGlobalLoadingOverlay(true);
  await Promise.all(failedTaskIds.map((taskId) => retryDashboardTask(taskId)));
};

const loadDashboardData = async () => {
  const tasks = getDashboardTaskDefs();
  const cycleId = beginDashboardLoadCycle(tasks);
  const courseTask = tasks.find((task) => task.id === "course-detail") || null;
  const courseTaskResult = courseTask
    ? await runDashboardTask(courseTask, cycleId)
    : { state: "success", message: "" };
  const nextTasks = tasks.filter((task) => task.id !== "course-detail");
  const wrapped = nextTasks.map((task) => {
    const prereq = getDashboardTaskPrecondition(task, courseTaskResult);
    if (!prereq.run) {
      setDashboardTaskState(task.id, prereq, cycleId);
      return Promise.resolve(prereq);
    }
    return runDashboardTask(task, cycleId);
  });
  await Promise.allSettled(wrapped);
  endDashboardLoadCycle(cycleId);
};

if (globalLoadingCloseEl) {
  globalLoadingCloseEl.addEventListener("click", () => setGlobalLoadingOverlay(false));
}
if (globalLoadingToggleEl) {
  globalLoadingToggleEl.addEventListener("click", () => setGlobalLoadingOverlay(true));
}
if (globalLoadingRetryFailedEl) {
  globalLoadingRetryFailedEl.addEventListener("click", () => {
    retryFailedDashboardTasks();
  });
}
if (globalLoadingListEl) {
  globalLoadingListEl.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-dashboard-task-retry]");
    if (!btn) return;
    const taskId = btn.getAttribute("data-dashboard-task-retry");
    if (!taskId) return;
    retryDashboardTask(taskId);
  });
}
const hideVideoHoverTooltip = () => {
  if (!videoHoverTooltipEl) return;
  videoHoverTooltipEl.classList.remove("active");
  videoHoverTooltipEl.setAttribute("aria-hidden", "true");
};
const hideVideoHeatmapFocusBands = () => {
  document.querySelectorAll(".video-heatmap-focus-band").forEach((band) => {
    band.style.opacity = "0";
  });
};
const showVideoHoverTooltip = (topText, bottomText, x, y) => {
  if (!videoHoverTooltipEl || !topText) return;
  videoHoverTooltipEl.innerHTML = `<div class="video-hover-tooltip-top">${escapeHtml(topText)}</div>${bottomText ? `<div class="video-hover-tooltip-bottom">${escapeHtml(bottomText)}</div>` : ""}`;
  videoHoverTooltipEl.classList.add("active");
  videoHoverTooltipEl.setAttribute("aria-hidden", "false");
  const width = videoHoverTooltipEl.offsetWidth;
  const height = videoHoverTooltipEl.offsetHeight;
  const left = Math.min(Math.max(8, x - (width / 2)), Math.max(8, window.innerWidth - width - 8));
  const top = Math.min(Math.max(8, y - height - 14), Math.max(8, window.innerHeight - height - 8));
  videoHoverTooltipEl.style.left = `${left}px`;
  videoHoverTooltipEl.style.top = `${top}px`;
};
document.addEventListener("pointermove", (e) => {
  const hit = e.target?.closest?.(".video-heatmap-hit");
  if (!hit) {
    hideVideoHoverTooltip();
    hideVideoHeatmapFocusBands();
    return;
  }
  const svg = hit.closest?.("svg");
  const focusBand = svg?.querySelector?.(".video-heatmap-focus-band");
  if (focusBand) {
    const rectX = Number(hit.getAttribute("x"));
    const rectWidth = Number(hit.getAttribute("width"));
    if (Number.isFinite(rectX) && Number.isFinite(rectWidth)) {
      focusBand.setAttribute("x", String(rectX));
      focusBand.setAttribute("width", String(rectWidth));
      focusBand.style.opacity = "1";
    }
  }
  showVideoHoverTooltip(
    hit.getAttribute("data-tooltip-top") || "",
    hit.getAttribute("data-tooltip-bottom") || "",
    e.clientX,
    e.clientY
  );
});
document.addEventListener("pointerleave", () => {
  hideVideoHoverTooltip();
  hideVideoHeatmapFocusBands();
});
document.addEventListener("scroll", () => {
  hideVideoHoverTooltip();
  hideVideoHeatmapFocusBands();
}, true);

if (loginBtn) loginBtn.addEventListener("click", startLogin);
if (logoutBtn) logoutBtn.addEventListener("click", () => logout(auth));

const code = params.get("code");
const error = params.get("error");
if (error) {
  console.warn("Login error:", error);
  restoreCourseIdAfterLogin();
  setAuthState(auth);
  if (!SHOW_LOGIN_BUTTONS && !auth?.userId) startLogin();
  else loadDashboardData();
} else if (code) {
  (async () => {
    try {
      const token = await exchangeCodeForToken(code);
      const claims = token.id_token ? decodeJwt(token.id_token) : null;
      const userinfo = token.access_token ? await fetchUserInfo(token.access_token) : null;
      const resolvedUserId =
        (userinfo && (userinfo.sub || userinfo.preferred_username || userinfo.email)) ||
        (claims && (claims.sub || claims.preferred_username || claims.email)) ||
        "-";
      const authPayload = {
        userId: resolvedUserId,
        profile: userinfo || claims || {},
        claims,
        userinfo,
        token: {
          access_token: token.access_token,
          id_token: token.id_token,
          expires_in: token.expires_in,
          raw: token,
        },
      };
      storeAuth(authPayload);
      restoreCourseIdAfterLogin();
      setAuthState(authPayload);
      loadDashboardData();
    } catch (e) {
      console.warn("Login failed:", e);
    } finally {
      sessionStorage.removeItem("pkce_verifier");
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("error");
      url.searchParams.delete("state");
      url.searchParams.delete("session_state");
      url.searchParams.delete("iss");
      url.searchParams.delete("stateid");
      window.history.replaceState({}, document.title, url.toString());
    }
  })();
} else {
  setAuthState(auth);
  if (!SHOW_LOGIN_BUTTONS && !auth?.userId) startLogin();
  else loadDashboardData();
}
