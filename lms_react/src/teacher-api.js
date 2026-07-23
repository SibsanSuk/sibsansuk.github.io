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
  const apiLog = [];
  const debug = query.get("debug") === "1";
  const SESSION_EXPIRED = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  const KEYCLOAK_ID = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

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
    const response = await fetch(oidc.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    if (!response.ok) throw new Error((await response.text()) || "แลก token ไม่สำเร็จ");
    const token = await response.json();
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

  async function request(url, options = {}) {
    const method = options.method || "GET";
    const withAuth = options.auth !== false;
    const entry = { url, method, at: new Date().toLocaleTimeString("th-TH") };
    apiLog.push(entry);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...(withAuth ? authHeaders() : {}),
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal
      });
      entry.status = response.status;
      if (response.status === 401 && withAuth && (!readAuth() || isExpired(readAuth()))) {
        clearAuth();
        const error = new Error(SESSION_EXPIRED);
        error.sessionExpired = true;
        throw error;
      }
      if (!response.ok) {
        const raw = String(await response.text().catch(() => "")).trim();
        let detail = raw;
        try {
          const json = raw ? JSON.parse(raw) : null;
          detail = Array.isArray(json?.message) ? json.message.join(", ") : json?.message || json?.error || raw;
        } catch (_) {}
        throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${String(detail).slice(0, 400)}` : ""}`);
      }
      const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
      entry.ok = true;
      entry.count = list(payload).length || undefined;
      if (debug) entry.sample = payload;
      return payload;
    } catch (error) {
      entry.ok = false;
      entry.error = error.message;
      throw error;
    }
  }

  const endpoints = {
    user: (sub) => request(`${config.baseUrl}/api/kidbright/user/${encodeURIComponent(sub)}`),
    teacher: (sub) => request(`${config.baseUrl}/api/kidbright/teacher/${encodeURIComponent(sub)}`),
    classrooms: (sub, instituteId) => request(`${config.baseUrl}/api/kidbright/course/teacher/${encodeURIComponent(sub)}${instituteId ? `?instituteId=${encodeURIComponent(instituteId)}` : ""}`),
    courseTree: (courseId) => request(`${config.sbsUrl}/lms/${encodeURIComponent(courseId)}`, { auth: false }),
    progress: (assignId) => request(`${config.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/progress`),
    grades: (assignId) => request(`${config.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}/grades`),
    institutes: (name) => request(`${config.baseUrl}/api/kidbright/institute?instituteName=${encodeURIComponent(name)}`),
    createAssignment: (body) => request(`${config.baseUrl}/api/kidbright/assign`, { method: "POST", body }),
    deleteAssignment: (assignId) => request(`${config.baseUrl}/api/kidbright/assign/${encodeURIComponent(assignId)}`, { method: "DELETE" }),
    courses(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value != null) params.set(key, value);
      });
      return request(`${config.baseUrl}/api/kidbright/course${params.size ? `?${params}` : ""}`);
    },
    bookroll: (email, courseId) => request(`${config.bookrollBaseUrl}/api/kidbright/course/${encodeURIComponent(courseId)}/data/bookroll?email=${encodeURIComponent(email)}`),
    video: (email, courseId) => request(`https://viola.thaidlt.com/meca/chart/bar/?userName=${encodeURIComponent(email)}&usageId=${encodeURIComponent(courseId)}`, { auth: false }),
    chatbot: (courseId, userId) => request(`${config.sbsUrl}/stats/echart/chatbotSpeed/${encodeURIComponent(courseId)}/${encodeURIComponent(userId)}`, { auth: false })
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
  const summarize = (values, expected = 0) => {
    const valid = values.map(Number).filter(Number.isFinite).map(clamp);
    return {
      done: valid.filter((value) => value >= 100).length,
      doing: valid.filter((value) => value > 0 && value < 100).length,
      todo: valid.filter((value) => value <= 0).length + Math.max(0, expected - valid.length)
    };
  };
  function readingEntries(payload) {
    const output = [];
    const visit = (value, title = "") => {
      if (typeof value === "string") {
        const match = value.trim().match(/^(\d+)\s*:\s*(\d+)$/);
        if (match) output.push({ title, progress: Number(match[2]) > 0 ? clamp(Number(match[1]) / Number(match[2]) * 100) : 0 });
        return;
      }
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) value.forEach((item, index) => visit(item, title || String(index)));
      else Object.entries(value).forEach(([key, item]) => visit(item, key));
    };
    visit(payload);
    return output;
  }
  function videoEntries(payload) {
    const option = chartOption(payload);
    const axis = [option.yAxis, option.xAxis].flat().find((item) => Array.isArray(item?.data));
    const data = Array.isArray(option.series?.[0]?.data) ? option.series[0].data : [];
    return data.map((value, index) => ({
      title: String(axis?.data?.[index] || ""),
      progress: clamp(chartNumber(value))
    })).filter((entry) => entry.title);
  }
  function chatbotSeconds(payload) {
    const series = chartOption(payload)?.series || [];
    const own = series.find((item) => /your|คุณ/i.test(String(item.name || ""))) || series[0];
    const values = (own?.data || []).map(chartNumber).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + Math.max(0, value), 0) : null;
  }
  async function studentDetails(student, classroom, activities) {
    const errors = [];
    const expectedReading = activities.filter((activity) => activity.tools.some((tool) => tool.label === "BookRoll")).length;
    const expectedVideo = activities.filter((activity) => activity.tools.some((tool) => tool.label === "Video")).length;
    let userId = [student.apiUserId, student.userId, student.sub, student.uuid, student.id]
      .map((value) => String(value || "").trim())
      .find((value) => KEYCLOAK_ID.test(value)) || "";
    const settle = (promise) => promise.then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason })
    );
    const readingPromise = settle(endpoints.bookroll(student.email, classroom.courseId));
    const videoPromise = settle(endpoints.video(student.email, classroom.courseId));
    if (!userId) {
      try {
        const rosterPayload = await endpoints.courses({
          instituteId: classroom.instituteId || "",
          grade: classroom.grade || "",
          level: classroom.level ?? "",
          classRoom: classroom.classRoom ?? ""
        });
        const course = list(rosterPayload).find((item) => String(item.courseId || item.course_id || "") === String(classroom.courseId));
        const enrollments = course?.enrolls || course?.enroll || course?.students || course?.learners || [];
        const email = String(student.email || "").trim().toLowerCase();
        const match = enrollments.find((item) => String(item.email || item.user?.email || item.profile?.email || "").trim().toLowerCase() === email);
        userId = [
          match?.userId, match?.user_id, match?.sub, match?.uuid,
          match?.keycloakId, match?.keycloak_id, match?.keycloakUserId,
          match?.user?.id
        ].map((value) => String(value || "").trim()).find((value) => KEYCLOAK_ID.test(value)) || "";
      } catch (error) {
        errors.push(`Student ID: ${error.message}`);
      }
    }
    const [readingResult, videoResult, chatbotResult] = await Promise.all([
      readingPromise,
      videoPromise,
      settle(userId ? endpoints.chatbot(classroom.courseId, userId) : Promise.resolve(null))
    ]);
    const readings = readingResult.status === "fulfilled" ? readingEntries(readingResult.value) : [];
    const videos = videoResult.status === "fulfilled" ? videoEntries(videoResult.value) : [];
    if (readingResult.status === "rejected") errors.push(`BookRoll: ${readingResult.reason.message}`);
    if (videoResult.status === "rejected") errors.push(`Video: ${videoResult.reason.message}`);
    if (chatbotResult.status === "rejected") errors.push(`Chatbot: ${chatbotResult.reason.message}`);
    return {
      reading: summarize(readings.map((entry) => entry.progress), expectedReading),
      video: summarize(videos.map((entry) => entry.progress), expectedVideo),
      readingEntries: readings,
      videoEntries: videos,
      chatbotSeconds: chatbotResult.status === "fulfilled" && chatbotResult.value ? chatbotSeconds(chatbotResult.value) : null,
      apiUserId: userId || null,
      errors
    };
  }

  async function overview() {
    if (global.location.protocol === "file:") {
      throw new Error("โหมด Preview — เปิดผ่าน HTTP เพื่อโหลดข้อมูลภาพรวมจริง");
    }
    const url = new URL("./References/overview.json", global.location.href);
    url.searchParams.set("v", Date.now());
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`โหลด overview.json ไม่สำเร็จ (${response.status})`);
    return response.json();
  }

  global.TeacherAPI = {
    config,
    oidc,
    debug,
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
    statusFor
  };
})(window);
