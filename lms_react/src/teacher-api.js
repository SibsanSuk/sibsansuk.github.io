/* MECA Teacher Dashboard: authentication, API calls, and data normalization.
 * This file intentionally contains no UI code so endpoints can be maintained
 * without touching the React components.
 */
(function createTeacherAPI(global) {
  "use strict";

  const query = new URLSearchParams(global.location.search || "");
  const runtime = global.TEACHER_DASHBOARD_CONFIG || {};
  const config = {
    oidc: runtime.oidc || {},
    instituteId: query.get("instituteid") || query.get("instituteId") || runtime.instituteId || "",
    assignId: query.get("assignid") || query.get("assignId") || runtime.assignId || "",
    baseUrl: runtime.baseUrl || "https://adaptive-profile-bn.ae.app.meca.in.th",
    bookrollBaseUrl: runtime.bookrollBaseUrl || "https://adaptive-profile-bn.ae.app.meca.in.th",
    sbsUrl: runtime.sbsUrl || "https://sbs-backend.mooc.meca.in.th",
    clientId: runtime.clientId || "dashboard"
  };
  const oidc = {
    authorizationEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/auth",
    tokenEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/token",
    userinfoEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/userinfo",
    logoutEndpoint: "https://id.meca.in.th/auth/realms/kidbright/protocol/openid-connect/logout",
    clientId: config.clientId,
    redirectUri: global.location.origin + global.location.pathname,
    scope: "openid profile email",
    ...config.oidc
  };
  const debug = query.get("debug") === "1";
  const SESSION_EXPIRED = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";

  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const average = (values) => {
    const valid = values.map(Number).filter(Number.isFinite);
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
  };
  const list = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    return payload.data || payload.results || payload.items || payload.rows || [];
  };
  const decodeJwt = (token) => {
    try {
      const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    } catch (_) {
      return null;
    }
  };
  const readAuth = () => {
    try { return JSON.parse(sessionStorage.getItem("oidc_auth")); }
    catch (_) { return null; }
  };
  const saveAuth = (auth) => sessionStorage.setItem("oidc_auth", JSON.stringify(auth));
  const clearAuth = () => sessionStorage.removeItem("oidc_auth");
  const authSub = (auth) => auth?.sub
    || decodeJwt(auth?.token?.access_token || "")?.sub
    || decodeJwt(auth?.token?.id_token || "")?.sub
    || "";
  const isExpired = (auth) => {
    const exp = decodeJwt(auth?.token?.access_token || "")?.exp;
    return exp ? exp * 1000 < Date.now() : false;
  };
  const authHeaders = () => {
    const token = readAuth()?.token?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const base64Url = (buffer) => {
    let raw = "";
    new Uint8Array(buffer).forEach((byte) => { raw += String.fromCharCode(byte); });
    return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  /*
   * API Manager
   * ทุก Business API ต้องผ่านจุดนี้ เพื่อให้ติดตามสถานะจากที่เดียว และสามารถ
   * เพิ่มนโยบาย cache/retry ในอนาคตได้โดยไม่ต้องแก้ React component
   */
  const apiManager = (() => {
    const entries = [];
    const listeners = new Set();
    const cacheStore = new Map();
    const MAX_ENTRIES = 200;
    let sequence = 0;

    const notify = () => {
      listeners.forEach((listener) => {
        try { listener(entries.slice()); } catch (_) {}
      });
    };
    const countRows = (payload) => {
      if (Array.isArray(payload)) return payload.length;
      if (!payload || typeof payload !== "object") return null;
      const rows = payload.data || payload.results || payload.items || payload.rows;
      return Array.isArray(rows) ? rows.length : null;
    };
    const labelFromUrl = (url) => {
      try {
        const parsed = new URL(url, global.location.href);
        return parsed.pathname.split("/").filter(Boolean).slice(-2).join("/") || parsed.hostname;
      } catch (_) {
        return String(url);
      }
    };
    const sanitize = (value, depth = 0) => {
      if (depth > 7) return "[ตัดข้อมูลที่ซ้อนลึก]";
      if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
      if (!value || typeof value !== "object") return value;
      const safe = {};
      Object.entries(value).slice(0, 150).forEach(([key, item]) => {
        if (/authorization|api.?key|access.?token|refresh.?token|id.?token|client.?secret|code.?verifier/i.test(key)) {
          safe[key] = "[ซ่อนข้อมูลสำคัญ]";
        } else {
          safe[key] = sanitize(item, depth + 1);
        }
      });
      return safe;
    };
    const addEntry = (entry) => {
      entries.push(entry);
      if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
      notify();
      return entry;
    };
    const complete = (entry, patch) => {
      Object.assign(entry, patch, {
        completedAt: Date.now(),
        durationMs: Math.max(0, Date.now() - entry.startedAt)
      });
      notify();
    };
    const reportIssue = (label, error, details = {}) => {
      const startedAt = Date.now();
      const message = error?.message || String(error || "Unknown issue");
      return addEntry({
        id: ++sequence,
        label: label || "Client issue",
        url: String(details.url || "client://teacher-dashboard"),
        method: String(details.method || "LOCAL").toUpperCase(),
        auth: false,
        authSent: false,
        at: new Date(startedAt).toLocaleTimeString("th-TH"),
        startedAt,
        completedAt: startedAt,
        durationMs: 0,
        state: "error",
        ok: false,
        error: message,
        sample: debug && details.context !== undefined ? sanitize(details.context) : undefined
      });
    };

    async function request(url, options = {}) {
      const method = String(options.method || "GET").toUpperCase();
      const withAuth = options.auth !== false;
      const authorizationHeaders = withAuth ? authHeaders() : {};
      const authSent = Boolean(authorizationHeaders.Authorization);
      const startedAt = Date.now();
      const cacheTtlMs = Math.max(0, Number(options.cacheTtlMs) || 0);
      const cacheKey = options.cacheKey || (method === "GET" && cacheTtlMs ? `${method}:${url}` : "");
      const cached = cacheKey ? cacheStore.get(cacheKey) : null;
      const common = {
        id: ++sequence,
        label: options.label || labelFromUrl(url),
        url: String(url),
        method,
        auth: withAuth,
        authSent,
        at: new Date(startedAt).toLocaleTimeString("th-TH"),
        startedAt
      };

      if (cached && cached.expiresAt > startedAt) {
        addEntry({
          ...common,
          state: "cached",
          ok: true,
          status: cached.status,
          count: countRows(cached.payload),
          sample: debug && options.logResponse !== false ? sanitize(cached.payload) : undefined,
          completedAt: startedAt,
          durationMs: 0,
          fromCache: true
        });
        return cached.payload;
      }
      if (cached) cacheStore.delete(cacheKey);

      const entry = addEntry({
        ...common,
        state: "loading",
        ok: null,
        requestBody: debug && options.logBody !== false && options.body
          ? sanitize(options.body)
          : undefined
      });

      try {
        const fetchOptions = {
          method,
          headers: {
            ...authorizationHeaders,
            ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
          },
          body: options.rawBody !== undefined
            ? options.rawBody
            : options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: options.signal
        };
        if (options.cache) fetchOptions.cache = options.cache;
        const response = await fetch(url, fetchOptions);
        entry.status = response.status;

        if (response.status === 401 && withAuth && (!readAuth() || isExpired(readAuth()))) {
          clearAuth();
          const error = new Error(SESSION_EXPIRED);
          error.sessionExpired = true;
          error.status = response.status;
          throw error;
        }

        if (!response.ok) {
          const raw = String(await response.text().catch(() => "")).trim();
          let detail = raw;
          try {
            const json = raw ? JSON.parse(raw) : null;
            detail = Array.isArray(json?.message) ? json.message.join(", ") : json?.message || json?.error || raw;
          } catch (_) {}
          const error = new Error(`${response.status} ${response.statusText}${detail ? ` — ${String(detail).slice(0, 400)}` : ""}`);
          error.status = response.status;
          throw error;
        }

        let payload = {};
        if (response.status !== 204) {
          const raw = await response.text();
          if (raw) {
            try { payload = JSON.parse(raw); }
            catch (_) { payload = raw; }
          }
        }
        const count = countRows(payload);
        complete(entry, {
          state: "success",
          ok: true,
          count: count == null ? undefined : count,
          sample: debug && options.logResponse !== false ? sanitize(payload) : undefined
        });
        if (cacheKey && cacheTtlMs) {
          cacheStore.set(cacheKey, {
            payload,
            status: response.status,
            expiresAt: Date.now() + cacheTtlMs
          });
        }
        return payload;
      } catch (error) {
        complete(entry, {
          state: "error",
          ok: false,
          status: entry.status || error.status,
          error: error.message || String(error)
        });
        throw error;
      }
    }

    return {
      entries,
      request,
      reportIssue,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getEntries: () => entries.slice(),
      clearLog() {
        entries.splice(0, entries.length);
        notify();
      },
      clearCache(key) {
        if (key) cacheStore.delete(key);
        else cacheStore.clear();
      },
      getCacheSize: () => cacheStore.size
    };
  })();
  const apiLog = apiManager.entries;
  const request = (url, options) => apiManager.request(url, options);

  async function startLogin() {
    if (global.location.protocol === "file:") {
      global.alert("หน้า Preview เปิดสำเร็จแล้ว แต่การเข้าสู่ระบบและ API ต้องเปิดผ่าน HTTP/HTTPS กรุณารัน: python3 -m http.server 3000");
      return;
    }
    const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    sessionStorage.setItem("pkce_verifier", verifier);
    const params = new URLSearchParams({
      client_id: oidc.clientId,
      redirect_uri: oidc.redirectUri,
      response_type: "code",
      scope: oidc.scope,
      code_challenge: base64Url(digest),
      code_challenge_method: "S256"
    });
    global.location.href = `${oidc.authorizationEndpoint}?${params}`;
  }

  async function finishLogin(code) {
    const verifier = sessionStorage.getItem("pkce_verifier");
    if (!verifier) throw new Error("ไม่พบ PKCE verifier");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: oidc.clientId,
      redirect_uri: oidc.redirectUri,
      code,
      code_verifier: verifier
    });
    const token = await request(oidc.tokenEndpoint, {
      label: "OIDC: แลก Token",
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      rawBody: body,
      logBody: false,
      logResponse: false
    });
    saveAuth({ token, sub: decodeJwt(token.access_token)?.sub || decodeJwt(token.id_token)?.sub || "" });
    const url = new URL(global.location.href);
    ["code", "state", "session_state", "iss"].forEach((key) => url.searchParams.delete(key));
    history.replaceState({}, document.title, url);
    return readAuth();
  }

  function logout() {
    const auth = readAuth();
    clearAuth();
    const idToken = auth?.token?.id_token;
    if (!idToken) {
      global.location.href = oidc.redirectUri;
      return;
    }
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: oidc.redirectUri,
      client_id: oidc.clientId
    });
    global.location.href = `${oidc.logoutEndpoint}?${params}`;
  }

  const endpoints = {
    user: (sub) => request(`${config.baseUrl}/api/kidbright/user/${encodeURIComponent(sub)}`, { label: "ข้อมูลผู้ใช้" }),
    teacher: (sub) => request(`${config.baseUrl}/api/kidbright/teacher/${encodeURIComponent(sub)}`, { label: "ข้อมูลครู" }),
    classrooms: (sub, instituteId) => request(`${config.baseUrl}/api/kidbright/course/teacher/${encodeURIComponent(sub)}${instituteId ? `?instituteId=${encodeURIComponent(instituteId)}` : ""}`, { label: "รายการห้องเรียน" }),
    courseTree: (courseId) => request(`${config.sbsUrl}/lms/${encodeURIComponent(courseId)}`, { auth: false, label: "โครงสร้างรายวิชา" }),
    progress: (assignId) => request(`${config.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/progress`, { label: "ความคืบหน้าห้องเรียน" }),
    grades: (assignId) => request(`${config.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/grades`, { label: "คะแนน Quiz ห้องเรียน" }),
    institutes: (name) => request(`${config.baseUrl}/api/kidbright/institute?instituteName=${encodeURIComponent(name)}`, { label: "ค้นหาโรงเรียน" }),
    createAssignment: (body) => request(`${config.baseUrl}/api/kidbright/assign`, { method: "POST", body, label: "เพิ่มห้องเรียน" }),
    deleteAssignment: (assignId) => request(`${config.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}`, { method: "DELETE", label: "นำห้องเรียนออก" }),
    courses(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value != null) params.set(key, value);
      });
      return request(`${config.baseUrl}/api/kidbright/course${params.size ? `?${params}` : ""}`, { label: "ค้นหารายวิชา" });
    },
    bookroll: (email, courseId) => request(`${config.bookrollBaseUrl}/api/kidbright/course/${encodeURIComponent(courseId)}/data/bookroll?email=${encodeURIComponent(email)}`, { label: "BookRoll ผู้เรียน" }),
    video: (email, courseId) => request(`https://viola.thaidlt.com/meca/chart/bar/?userName=${encodeURIComponent(email)}&usageId=${encodeURIComponent(courseId)}`, { auth: false, label: "Video ผู้เรียน" }),
    chatbot: (email, courseId) => request(`${config.baseUrl}/api/kidbright/course/${encodeURIComponent(courseId)}/data/chatbot?email=${encodeURIComponent(email)}`, {
      label: "Chatbot Quiz ผู้เรียน"
    })
  };

  const COLORS = ["#f43f7e", "#f5b301", "#22c55e", "#0f766e", "#6366f1", "#0ea5e9", "#ef4444", "#8b5cf6"];
  const statusFor = (progress) => {
    if (progress >= 100) return { key: "done", label: "เรียนจบ", text: "#0f766e", bg: "#d1fae5" };
    if (progress >= 60) return { key: "learning", label: "กำลังเรียน", text: "#3730a3", bg: "#e0e7ff" };
    return { key: "followup", label: "ต้องติดตาม", text: "#c2410c", bg: "#ffedd5" };
  };
  const initials = (name) => {
    const value = String(name || "").trim();
    return value ? (/[a-z]/i.test(value[0]) ? value.slice(0, 2).toUpperCase() : value.slice(0, 1)) : "?";
  };
  const fullName = (row) => `${row?.firstName || ""} ${row?.lastName || ""}`.replace(/\s+/g, " ").trim() || row?.email || "-";
  const formatDate = (value) => {
    if (!value || Number.isNaN(new Date(value).getTime())) return "-";
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(new Date(value));
  };
  const gradeLabels = {
    primary: "ประถมศึกษา",
    secondary: "มัธยมศึกษา",
    vocational: "ปวช.",
    associate: "ปวส.",
    bachelor: "ปริญญาตรี",
    master: "ปริญญาโท",
    doctoral: "ปริญญาเอก"
  };

  function flattenClassrooms(courses) {
    const output = [];
    list(courses).forEach((course) => {
      const assignments = Array.isArray(course.assigns) && course.assigns.length
        ? course.assigns
        : Array.isArray(course.assign) && course.assign.length ? course.assign : [course];
      assignments.forEach((assignment) => {
        const institute = assignment.institute || {};
        const progressValue = assignment.progress ?? assignment.avgProgress ?? assignment.averageProgress;
        output.push({
          id: String(assignment.assignId || assignment.assign_id || assignment.id || `class-${output.length}`),
          assignId: assignment.assignId || assignment.assign_id || assignment.id || "",
          courseId: course.courseId || course.course_id || "",
          color: COLORS[output.length % COLORS.length],
          title: course.courseName || course.courseTitle || course.title || course.courseId || "ห้องเรียน",
          grade: assignment.grade || "",
          level: assignment.level ?? "",
          classRoom: assignment.classRoom ?? "",
          instituteId: assignment.instituteId || assignment.institute_id || institute.instituteId || "",
          school: institute.instituteName || assignment.instituteName || "",
          province: institute.province || assignment.province || "",
          students: assignment.studentCount ?? assignment.students ?? assignment.enrollCount ?? assignment.total ?? null,
          progress: progressValue == null ? null : Math.round(number(progressValue)),
          startDate: assignment.startDate || assignment.createAt || assignment.createdAt || null,
          endDate: assignment.endDate || null
        });
      });
    });
    return output;
  }

  function mergeStudents(progressPayload, gradePayload) {
    const progressRows = list(progressPayload);
    const gradeRows = list(gradePayload);
    const scores = new Map();
    gradeRows.forEach((row) => {
      const email = String(row.email || "").trim().toLowerCase();
      if (!email) return;
      const current = scores.get(email) || { score: 0, max: 0, records: 0, modules: new Set() };
      current.score += number(row.score);
      current.max += number(row.maxScore);
      current.records += 1;
      if (row.moduleId) current.modules.add(row.moduleId);
      scores.set(email, current);
    });
    const students = progressRows.map((row) => {
      const email = String(row.email || "").trim().toLowerCase();
      const score = scores.get(email) || null;
      const progress = clamp(row.progress);
      const rate = score?.max > 0 ? clamp((score.score / score.max) * 100) : null;
      const name = fullName(row);
      return {
        id: row.id ?? email,
        apiUserId: row.userId || row.user_id || row.sub || row.uuid || "",
        email,
        name,
        initials: initials(name),
        province: row.province || "-",
        room: (/\d/.test(row.levelOfEducation || "") ? String(row.levelOfEducation).trim() : "") || row.province || "-",
        progress,
        updated: formatDate(row.lastUpdate),
        lastUpdate: row.lastUpdate || null,
        score,
        rate,
        quizText: score?.max > 0 ? `${score.score} / ${score.max}` : "—",
        status: statusFor(progress)
      };
    });
    return { students, gradeRows };
  }

  const comparePath = (left, right) => {
    const parts = (value) => String(value || "").split(".").map(Number).filter(Number.isFinite);
    const a = parts(left), b = parts(right);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const delta = (a[i] ?? 0) - (b[i] ?? 0);
      if (delta) return delta;
    }
    return 0;
  };
  const walk = (node, output = []) => {
    if (!node || typeof node !== "object") return output;
    output.push(node);
    (Array.isArray(node.children) ? node.children : []).forEach((child) => walk(child, output));
    return output;
  };
  const toolLabel = (kind) => {
    const value = String(kind || "").toLowerCase();
    if (value.includes("video")) return "Video";
    if (value.includes("bookroll")) return "BookRoll";
    if (value.includes("chatbot") || value.includes("quiz")) return "Quiz";
    if (value.includes("profile")) return "Profile";
    return kind || "Tool";
  };

  function collectActivities(course, gradeRows) {
    const usersByModule = new Map();
    gradeRows.forEach((row) => {
      if (!row.moduleId) return;
      if (!usersByModule.has(row.moduleId)) usersByModule.set(row.moduleId, new Set());
      usersByModule.get(row.moduleId).add(String(row.email || "").toLowerCase());
    });
    return walk(course)
      .filter((node) => node.kind === "vertical")
      .sort((a, b) => comparePath(a.sort, b.sort))
      .map((node) => {
        const tools = (node.children || [])
          .filter((child) => child.kind === "aetool")
          .map((child) => ({
            id: child.id || "",
            label: toolLabel(child.fields?.aetool),
            type: String(child.fields?.aetool || "tool").toLowerCase(),
            url: child.fields?.iframe_url || "",
            sort: child.sort || ""
          }))
          .sort((a, b) => comparePath(a.sort, b.sort));
        const reached = new Set();
        tools.forEach((tool) => usersByModule.get(tool.id)?.forEach((email) => reached.add(email)));
        return {
          id: node.id,
          name: node.title || node.fields?.title || "-",
          code: node.sort || "-",
          tools,
          reach: tools.some((tool) => usersByModule.has(tool.id)) ? reached.size : null
        };
      })
      .filter((activity) => activity.tools.length);
  }

  function buildDataset(course, progress, grades, title, key) {
    const { students, gradeRows } = mergeStudents(progress, grades);
    const activities = collectActivities(course, gradeRows);
    const rates = students.map((student) => student.rate).filter((rate) => rate != null);
    const toolCounts = { Video: 0, BookRoll: 0, Quiz: 0, Profile: 0 };
    activities.forEach((activity) => activity.tools.forEach((tool) => {
      toolCounts[tool.label] = (toolCounts[tool.label] || 0) + 1;
    }));
    return {
      students,
      activities,
      course,
      title: title || course?.courseTitle || course?.title || "-",
      key: key || course?.courseKey || "-",
      metrics: {
        completed: students.filter((student) => student.progress >= 100).length,
        avgProgress: average(students.map((student) => student.progress)) || 0,
        avgRate: average(rates),
        records: gradeRows.length
      },
      toolCounts
    };
  }

  const chartOption = (payload) => payload?.Option || payload?.option || payload?.chart || payload || {};
  const chartNumber = (value) => {
    const raw = value && typeof value === "object"
      ? (Array.isArray(value.value) ? value.value[value.value.length - 1] : value.value)
      : value;
    return Number.isFinite(Number(raw)) ? Number(raw) : null;
  };
  const normalizeProgressTitle = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const progressTitleCore = (value) => normalizeProgressTitle(value).replace(/^\d+(?:[-.]\d+)*(?:\s+|$)/, "").trim();
  const normalizeUsageId = (value) => String(value || "").trim().toLowerCase();
  function findActivityProgress(activity, entries, toolLabelValue) {
    const safeActivity = activity && typeof activity === "object" ? activity : {};
    const rows = Array.isArray(entries)
      ? entries.filter((entry) => entry && typeof entry === "object")
      : [];
    if (!rows.length) return null;
    const tools = Array.isArray(safeActivity.tools)
      ? safeActivity.tools.filter((tool) => tool && typeof tool === "object")
      : [];
    const toolIds = tools
      .filter((tool) => String(tool.label || "").toLowerCase() === toolLabelValue)
      .map((tool) => normalizeUsageId(tool.id))
      .filter(Boolean);
    const usageMatch = rows.find((entry) => entry.usageId && toolIds.includes(normalizeUsageId(entry.usageId)));
    if (usageMatch) return usageMatch;
    const title = normalizeProgressTitle(safeActivity.name);
    const exact = rows.find((entry) => normalizeProgressTitle(entry.key || entry.title) === title);
    if (exact) return exact;
    const core = progressTitleCore(safeActivity.name);
    if (!core) return null;
    const exactCore = rows.find((entry) => progressTitleCore(entry.key || entry.title) === core);
    if (exactCore) return exactCore;
    return rows
      .filter((entry) => {
        const entryCore = progressTitleCore(entry.key || entry.title);
        return entryCore.length >= 4 && (entryCore.includes(core) || core.includes(entryCore));
      })
      .sort((left, right) => progressTitleCore(right.key || right.title).length - progressTitleCore(left.key || left.title).length)[0] || null;
  }
  const summarize = (values, expected = 0) => {
    const valid = values.map(Number).filter(Number.isFinite).map(clamp);
    return {
      done: valid.filter((value) => value >= 100).length,
      doing: valid.filter((value) => value > 0 && value < 100).length,
      todo: valid.filter((value) => value <= 0).length + Math.max(0, expected - valid.length)
    };
  };
  function readingEntries(payload, usageHint = "") {
    const output = [];
    const seen = new Set();
    const push = (titleValue, progressValue, usageIdValue = "") => {
      if (!Number.isFinite(progressValue)) return;
      const title = String(titleValue || "").trim();
      const progress = clamp(Math.round(progressValue));
      const usageId = normalizeUsageId(usageIdValue || usageHint);
      const signature = `${usageId}|${normalizeProgressTitle(title)}|${progress}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      output.push({ title, key: normalizeProgressTitle(title), usageId, progress });
    };
    const directProgress = (value) => {
      if (!value || typeof value !== "object") return null;
      const read = Number(value.read ?? value.readPage ?? value.read_page ?? value.current ?? value.done);
      const total = Number(value.total ?? value.totalPage ?? value.total_page ?? value.max ?? value.all);
      if (Number.isFinite(read) && Number.isFinite(total)) return total > 0 ? read / total * 100 : 0;
      const direct = Number(value.progress ?? value.progressRate ?? value.rate ?? value.percent ?? value.percentage);
      return Number.isFinite(direct) ? direct : null;
    };
    const visit = (value, title = "", inheritedUsageId = "") => {
      if (typeof value === "string") {
        const match = value.trim().match(/^(\d+)\s*:\s*(\d+)$/);
        if (match) push(title, Number(match[2]) > 0 ? Number(match[1]) / Number(match[2]) * 100 : 0, inheritedUsageId);
        return;
      }
      if (!value || typeof value !== "object") return;
      const progress = directProgress(value)
        ?? directProgress(value.value)
        ?? directProgress(value.stats)
        ?? directProgress(value.data);
      const nextUsageId = value.usageId || value.usage_id || value.courseId || value.course_id || inheritedUsageId;
      if (Number.isFinite(progress)) {
        push(value.title || value.topic || value.label || value.name || value.display_name || value.displayName || title, progress, nextUsageId);
        return;
      }
      if (Array.isArray(value)) value.forEach((item, index) => visit(item, title || String(index), nextUsageId));
      else Object.entries(value).forEach(([key, item]) => visit(item, key, nextUsageId));
    };
    visit(payload, "", usageHint);
    return output;
  }
  function videoEntries(payload) {
    const option = chartOption(payload);
    const axis = [option.yAxis, option.xAxis].flat().find((item) => Array.isArray(item?.data));
    const data = Array.isArray(option.series?.[0]?.data) ? option.series[0].data : [];
    return data.map((value, index) => ({
      title: String(axis?.data?.[index] || ""),
      key: normalizeProgressTitle(axis?.data?.[index] || ""),
      usageId: "",
      progress: clamp(chartNumber(value))
    })).filter((entry) => entry.title);
  }
  function chatbotEntries(payload, usageHint = "") {
    const output = [];
    const seen = new Set();
    const push = (titleValue, scoreValue, totalValue, progressValue, usageIdValue = "") => {
      const score = Number(scoreValue);
      const total = Number(totalValue);
      const directProgress = progressValue !== "" && progressValue != null
        ? Number(progressValue)
        : NaN;
      const progress = Number.isFinite(directProgress)
        ? clamp(Math.round(directProgress))
        : Number.isFinite(score) && Number.isFinite(total) && total > 0
          ? clamp(Math.round(score / total * 100))
          : null;
      if (!Number.isFinite(progress)) return;
      const title = String(titleValue || "").replace(/,\s*\d+\s*$/, "").trim();
      const usageId = normalizeUsageId(usageIdValue || usageHint);
      const signature = `${usageId}|${normalizeProgressTitle(title)}|${progress}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      output.push({
        title,
        key: normalizeProgressTitle(title),
        usageId,
        score: Number.isFinite(score) ? score : null,
        total: Number.isFinite(total) && total > 0 ? total : null,
        progress
      });
    };
    const option = chartOption(payload);
    const axes = [option.yAxis, option.xAxis].flat();
    const labels = axes.find((axis) => Array.isArray(axis?.data))?.data || [];
    const series = Array.isArray(option.series) ? option.series : [];
    const ownSeries = series.find((item) => /your|คุณ|score|คะแนน/i.test(String(item?.name || ""))) || series[0];
    const chartData = Array.isArray(ownSeries?.data) ? ownSeries.data : [];
    const categoryMeta = Array.isArray(option.__categoryMeta) ? option.__categoryMeta : [];
    chartData.forEach((value, index) => {
      const label = String(labels[index] || categoryMeta[index]?.title || categoryMeta[index]?.key || categoryMeta[index]?.raw || "");
      const labelTotal = Number(label.match(/,\s*(\d+)\s*$/)?.[1]);
      const total = Number(categoryMeta[index]?.total);
      push(label, chartNumber(value), Number.isFinite(total) ? total : labelTotal, null, categoryMeta[index]?.usageId);
    });
    const visit = (value, title = "", inheritedUsageId = "") => {
      if (typeof value === "string") {
        const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
        if (match) push(title, Number(match[1]), Number(match[2]), null, inheritedUsageId);
        return;
      }
      if (!value || typeof value !== "object") return;
      const nextUsageId = value.usageId || value.usage_id || value.usageKey || value.usage_key
        || value.moduleId || value.module_id || value.blockId || value.block_id
        || value.courseId || value.course_id || value.id || inheritedUsageId;
      const directProgress = Number(value.progress ?? value.progressRate ?? value.quizProgress
        ?? value.quiz_progress ?? value.rate ?? value.percent ?? value.percentage);
      const scoreValue = value.score ?? value.chatbotScore ?? value.chatbot_score
        ?? value.correct ?? value.correctCount ?? value.correct_count
        ?? value.earned ?? value.points ?? value.result?.score;
      const totalValue = value.total ?? value.chatbotTotal ?? value.chatbot_total
        ?? value.max ?? value.maxScore ?? value.max_score
        ?? value.questions ?? value.questionCount ?? value.question_count
        ?? value.totalQuestions ?? value.total_questions ?? value.result?.total;
      const ratio = typeof scoreValue === "string"
        ? scoreValue.trim().match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/)
        : null;
      const score = ratio ? Number(ratio[1]) : Number(scoreValue);
      const total = ratio ? Number(ratio[2]) : Number(totalValue);
      if (Number.isFinite(directProgress) || Number.isFinite(score) && Number.isFinite(total) && total > 0) {
        push(
          value.title || value.topic || value.label || value.name
            || value.verticalTitle || value.vertical_title
            || value.display_name || value.displayName || title,
          score,
          total,
          directProgress,
          nextUsageId
        );
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, title || String(index), nextUsageId));
      } else {
        Object.entries(value).forEach(([key, item]) => visit(item, key, nextUsageId));
      }
    };
    visit(payload, "", usageHint);
    return output;
  }
  function chatbotSeconds(payload) {
    const series = chartOption(payload)?.series || [];
    const timeSeries = series.find((item) => /time|speed|duration|elapsed|เวลา/i.test(String(item?.name || "")));
    const chartValues = (Array.isArray(timeSeries?.data) ? timeSeries.data : []).map(chartNumber).filter(Number.isFinite);
    if (chartValues.length) {
      return chartValues.reduce((sum, value) => sum + Math.max(0, value), 0);
    }
    const toSeconds = (value) => {
      if (Number.isFinite(Number(value))) return Math.max(0, Number(value));
      if (typeof value !== "string") return null;
      const parts = value.trim().split(":").map(Number);
      if (!parts.length || parts.some((part) => !Number.isFinite(part))) return null;
      if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
      if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
      return null;
    };
    const timeKeys = [
      "chatbotSeconds", "chatbot_seconds", "chatbotTime", "chatbot_time",
      "totalSeconds", "total_seconds",
      "durationSeconds", "duration_seconds", "elapsedSeconds", "elapsed_seconds",
      "timeSpent", "time_spent", "totalTime", "total_time",
      "duration", "elapsed", "seconds", "time"
    ];
    const collect = (value) => {
      if (!value || typeof value !== "object") return [];
      if (Array.isArray(value)) return value.flatMap(collect);
      for (const key of timeKeys) {
        const seconds = toSeconds(value[key]);
        if (Number.isFinite(seconds)) return [seconds];
      }
      return Object.values(value).flatMap(collect);
    };
    const values = collect(payload);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  }
  async function studentDetails(student, classroom, activities, onUpdate) {
    const errors = [];
    const safeStudent = student && typeof student === "object" ? student : {};
    const safeClassroom = classroom && typeof classroom === "object" ? classroom : {};
    const safeActivities = Array.isArray(activities)
      ? activities.filter((activity) => activity && typeof activity === "object")
      : [];
    const countTools = (label) => safeActivities
      .flatMap((activity) => Array.isArray(activity.tools) ? activity.tools : [])
      .filter((tool) => String(tool?.label || "").toLowerCase() === label).length;
    const expectedReading = countTools("bookroll");
    const expectedVideo = countTools("video");
    const expectedChatbot = countTools("quiz");
    const result = {
      studentId: safeStudent.id,
      loading: true,
      readingLoading: true,
      videoLoading: true,
      chatbotLoading: true,
      readingError: null,
      videoError: null,
      chatbotError: null,
      reading: null,
      video: null,
      readingEntries: [],
      videoEntries: [],
      chatbotEntries: [],
      chatbotSeconds: null,
      errors
    };
    const publish = (patch) => {
      Object.assign(result, patch);
      result.errors = [...errors];
      if (typeof onUpdate === "function") {
        onUpdate({
          ...patch,
          studentId: safeStudent.id,
          errors: [...errors]
        });
      }
    };
    const courseId = safeClassroom.courseId;
    const email = String(safeStudent.email || "").trim();
    if (!courseId || !email) {
      const message = "ไม่พบ courseId หรืออีเมลนักเรียน";
      errors.push(message);
      apiManager.reportIssue("Student detail input", message, {
        url: "client://student-details/input",
        context: {
          studentId: safeStudent.id || "",
          hasEmail: Boolean(email),
          hasCourseId: Boolean(courseId)
        }
      });
      publish({
        loading: false,
        readingLoading: false,
        videoLoading: false,
        chatbotLoading: false,
        readingError: message,
        videoError: message,
        chatbotError: message
      });
      return result;
    }

    const readingTask = (async () => {
      let readings = [];
      let readingError = null;
      try {
        readings = readingEntries(await endpoints.bookroll(email, courseId), courseId);
        if (expectedReading > 0 && !readings.length) {
          const message = "BookRoll: ตอบกลับสำเร็จแต่อ่านค่าความคืบหน้าไม่ได้";
          readingError = message;
          errors.push(message);
          apiManager.reportIssue("BookRoll data normalization", message, {
            url: "client://student-details/bookroll",
            context: { courseId, email }
          });
        }
      } catch (error) {
        readingError = `BookRoll: ${error.message}`;
        errors.push(readingError);
      }
      publish({
        reading: summarize(readings.map((entry) => entry.progress), expectedReading),
        readingEntries: readings,
        readingLoading: false,
        readingError
      });
    })();
    const videoTask = (async () => {
      let videos = [];
      let videoError = null;
      try {
        videos = videoEntries(await endpoints.video(email, courseId));
        if (expectedVideo > 0 && !videos.length) {
          const message = "Video: ตอบกลับสำเร็จแต่อ่านค่าความคืบหน้าไม่ได้";
          videoError = message;
          errors.push(message);
          apiManager.reportIssue("Video data normalization", message, {
            url: "client://student-details/video",
            context: { courseId, email }
          });
        }
      } catch (error) {
        videoError = `Video: ${error.message}`;
        errors.push(videoError);
      }
      publish({
        video: summarize(videos.map((entry) => entry.progress), expectedVideo),
        videoEntries: videos,
        videoLoading: false,
        videoError
      });
    })();
    const chatbotTask = (async () => {
      let seconds = null;
      let chatbots = [];
      let chatbotError = null;
      try {
        const payload = await endpoints.chatbot(email, courseId);
        chatbots = chatbotEntries(payload, courseId);
        seconds = payload ? chatbotSeconds(payload) : null;
        if (expectedChatbot > 0 && !chatbots.length && !Number.isFinite(seconds)) {
          const message = "Chatbot: ตอบกลับสำเร็จแต่อ่านข้อมูล Quiz ไม่ได้";
          chatbotError = message;
          errors.push(message);
          apiManager.reportIssue("Chatbot data normalization", message, {
            url: "client://student-details/chatbot",
            context: { courseId, email }
          });
        }
      } catch (error) {
        chatbotError = `Chatbot: ${error.message}`;
        errors.push(chatbotError);
      }
      publish({
        chatbot: summarize(chatbots.map((entry) => entry.progress), expectedChatbot),
        chatbotEntries: chatbots,
        chatbotSeconds: seconds,
        chatbotLoading: false,
        chatbotError
      });
    })();

    await Promise.allSettled([readingTask, videoTask, chatbotTask]);
    publish({
      loading: false,
      readingLoading: false,
      videoLoading: false,
      chatbotLoading: false
    });
    return result;
  }

  async function overview() {
    if (global.location.protocol === "file:") {
      throw new Error("โหมด Preview — เปิดผ่าน HTTP เพื่อโหลดข้อมูลภาพรวมจริง");
    }
    const url = new URL("./References/overview.json", global.location.href);
    url.searchParams.set("v", Date.now());
    return request(url, {
      auth: false,
      cache: "no-store",
      label: "ข้อมูลภาพรวม Dashboard"
    });
  }

  global.TeacherAPI = {
    config,
    oidc,
    debug,
    manager: apiManager,
    apiLog,
    SESSION_EXPIRED,
    readAuth,
    authSub,
    isExpired,
    decodeJwt,
    startLogin,
    finishLogin,
    logout,
    clearAuth,
    endpoints,
    overview,
    list,
    clamp,
    average,
    initials,
    formatDate,
    gradeLabels,
    flattenClassrooms,
    buildDataset,
    studentDetails,
    findActivityProgress,
    statusFor
  };
})(window);
