(function createStudentAPI(global) {
  "use strict";

  const query = new URLSearchParams(global.location.search || "");
  const runtime = global.STUDENT_DASHBOARD_CONFIG || {};
  const getQueryParamPreservePlus = (name) => {
    const match = global.location.search.match(new RegExp(`[?&]${name}=([^&]*)`));
    if (!match) return "";
    try { return decodeURIComponent(match[1].replace(/\+/g, "%2B")); }
    catch (_) { return match[1]; }
  };

  const config = {
    baseUrl: runtime.baseUrl || "https://adaptive-profile-bn.ae.app.meca.in.th",
    bookrollUrl: runtime.bookrollUrl || "https://bookroll.thaidlt.com",
    videoUrl: runtime.videoUrl || "https://viola.thaidlt.com",
    sbsUrl: runtime.sbsUrl || "https://sbs-backend.mooc.meca.in.th",
    vkUrl: String(runtime.vkUrl || runtime.vk?.baseUrl || "https://vk-analysis.learning.app.meca.in.th").replace(/\/+$/, ""),
    clientId: runtime.clientId || "dashboard",
    courseId: getQueryParamPreservePlus("courseid")
      || getQueryParamPreservePlus("courseId")
      || runtime.courseId
      || "",
    autoLogin: runtime.autoLogin !== false && query.get("loginbtn") !== "true",
    oidc: runtime.oidc || {}
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
  const SESSION_KEY = "oidc_auth";
  const COURSE_KEY = "student_post_login_courseid";
  const SESSION_EXPIRED = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";

  const decodeJwt = (token) => {
    try {
      const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    } catch (_) {
      return null;
    }
  };
  const readAuth = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  };
  const saveAuth = (value) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  const clearAuth = () => sessionStorage.removeItem(SESSION_KEY);
  const authToken = (auth = readAuth()) => auth?.token?.access_token || auth?.access_token || "";
  const authClaims = (auth = readAuth()) => decodeJwt(authToken(auth))
    || decodeJwt(auth?.token?.id_token || auth?.id_token || "")
    || {};
  const authSub = (auth = readAuth()) => auth?.userId || auth?.sub || authClaims(auth).sub || "";
  const authProfile = (auth = readAuth()) => {
    const profile = auth?.profile || auth?.userinfo;
    return profile && typeof profile === "object" ? profile : authClaims(auth);
  };
  const authExpired = (auth = readAuth()) => {
    const exp = authClaims(auth).exp;
    return exp ? exp * 1000 <= Date.now() : false;
  };
  const authHeaders = () => {
    const token = authToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const base64Url = (buffer) => {
    let raw = "";
    new Uint8Array(buffer).forEach((byte) => { raw += String.fromCharCode(byte); });
    return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const apiManager = (() => {
    const entries = [];
    const listeners = new Set();
    let sequence = 0;

    const notify = () => listeners.forEach((listener) => {
      try { listener(entries.slice()); } catch (_) {}
    });
    const sanitize = (value, depth = 0) => {
      if (depth > 6) return "[ตัดข้อมูลที่ซ้อนลึก]";
      if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
      if (!value || typeof value !== "object") return value;
      const safe = {};
      Object.entries(value).slice(0, 150).forEach(([key, item]) => {
        safe[key] = /authorization|token|api.?key|secret|verifier/i.test(key)
          ? "[ซ่อนข้อมูลสำคัญ]"
          : sanitize(item, depth + 1);
      });
      return safe;
    };

    async function request(url, options = {}) {
      const startedAt = Date.now();
      const method = String(options.method || "GET").toUpperCase();
      const withAuth = options.auth !== false;
      const entry = {
        id: ++sequence,
        label: options.label || new URL(url, global.location.href).pathname,
        url: String(url),
        method,
        auth: withAuth,
        startedAt,
        state: "loading"
      };
      entries.push(entry);
      if (entries.length > 150) entries.shift();
      notify();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Number(options.timeoutMs) || 20000);
      try {
        const response = await fetch(url, {
          method,
          headers: {
            ...(withAuth ? authHeaders() : {}),
            ...(options.headers || {})
          },
          signal: options.signal || controller.signal,
          cache: options.cache
        });
        entry.status = response.status;
        if (response.status === 401 && withAuth) {
          clearAuth();
          const error = new Error(SESSION_EXPIRED);
          error.sessionExpired = true;
          throw error;
        }
        const raw = response.status === 204 ? "" : await response.text();
        let payload = null;
        if (raw) {
          try { payload = JSON.parse(raw); }
          catch (_) { payload = raw; }
        }
        if (!response.ok) {
          const detail = typeof payload === "string"
            ? payload
            : payload?.message || payload?.error || "";
          throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${String(detail).slice(0, 300)}` : ""}`);
        }
        Object.assign(entry, {
          state: "success",
          ok: true,
          durationMs: Date.now() - startedAt,
          sample: debug ? sanitize(payload) : undefined
        });
        notify();
        return payload;
      } catch (error) {
        const resolved = error?.name === "AbortError" ? new Error("หมดเวลารอการตอบกลับ") : error;
        Object.assign(entry, {
          state: "error",
          ok: false,
          durationMs: Date.now() - startedAt,
          error: resolved?.message || String(resolved)
        });
        notify();
        throw resolved;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return {
      request,
      entries: () => entries.slice(),
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      clear() {
        entries.splice(0, entries.length);
        notify();
      }
    };
  })();

  async function startLogin(courseId = config.courseId) {
    if (global.location.protocol === "file:") {
      throw new Error("กรุณาเปิด Dashboard ผ่าน HTTP หรือ HTTPS");
    }
    if (courseId) sessionStorage.setItem(COURSE_KEY, courseId);
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

  async function exchangeCode(code) {
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
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  const endpoints = {
    userinfo: () => apiManager.request(oidc.userinfoEndpoint, { label: "ข้อมูลผู้เรียน" }),
    courseTree: (courseId) => apiManager.request(
      `${config.sbsUrl}/lms/${encodeURIComponent(courseId)}`,
      { auth: false, label: "โครงสร้างบทเรียน" }
    ),
    bookroll: (userId, courseId) => apiManager.request(
      `${config.bookrollUrl}/meca/student/readingData?userID=${encodeURIComponent(userId)}&usageId=${encodeURIComponent(courseId)}&view=student&ts=${Date.now()}`,
      { auth: false, label: "ความคืบหน้า BookRoll" }
    ),
    video: (email, courseId) => apiManager.request(
      `${config.videoUrl}/meca/chart/bar/?userName=${encodeURIComponent(email)}&usageId=${encodeURIComponent(courseId)}`,
      { auth: false, label: "ความคืบหน้าวิดีโอ" }
    ),
    videoHeatmap: (email, courseId) => apiManager.request(
      `${config.videoUrl}/meca/chart/heatmapTime/?userName=${encodeURIComponent(email)}&usageId=${encodeURIComponent(courseId)}`,
      { auth: false, label: "ช่วงเวลาการดูวิดีโอ" }
    ),
    chatbot: (email, courseId) => apiManager.request(
      `${config.baseUrl}/api/kidbright/course/${encodeURIComponent(courseId)}/data/chatbot?email=${encodeURIComponent(email)}`,
      { label: "ผลการทำแบบฝึกหัด" }
    ),
    chatbotSpeed: (courseId, userId) => apiManager.request(
      `${config.sbsUrl}/stats/echart/chatbotSpeed/${encodeURIComponent(courseId)}/${encodeURIComponent(userId)}`,
      { auth: false, label: "เวลาแบบฝึกหัด (SBS)" }
    ),
    chatbotPerformance: (courseId, userId) => apiManager.request(
      `${config.sbsUrl}/stats/echart/chatbotPerformance/${encodeURIComponent(courseId)}/${encodeURIComponent(userId)}`,
      { auth: false, label: "ผลแบบฝึกหัด (SBS)" }
    ),
    vkOverview: (userId, courseId) => apiManager.request(
      `${config.vkUrl}/analysis/overview/${encodeURIComponent(userId)}/course/${encodeURIComponent(courseId)}`,
      { auth: false, label: "ภาพรวม Virtual KidBright" }
    ),
    vkDoneChapters: (userId, courseId) => apiManager.request(
      `${config.vkUrl}/analysis/donechapterview/${encodeURIComponent(userId)}/course/${encodeURIComponent(courseId)}`,
      { auth: false, label: "ความสำเร็จ Virtual KidBright" }
    )
  };

  async function initializeAuth() {
    const params = new URLSearchParams(global.location.search || "");
    const code = params.get("code");
    if (params.get("error")) {
      throw new Error(params.get("error_description") || params.get("error"));
    }
    if (code) {
      const token = await exchangeCode(code);
      saveAuth({
        token,
        userId: decodeJwt(token.access_token || "")?.sub
          || decodeJwt(token.id_token || "")?.sub
          || ""
      });
      sessionStorage.removeItem("pkce_verifier");
    }

    let auth = readAuth();
    if (auth && authExpired(auth)) {
      clearAuth();
      auth = null;
    }
    if (auth && !auth.profile) {
      try {
        const profile = await endpoints.userinfo();
        auth = { ...auth, profile, userId: profile?.sub || authSub(auth) };
        saveAuth(auth);
      } catch (error) {
        if (error?.sessionExpired) auth = null;
        else throw error;
      }
    }

    if (code) {
      const url = new URL(global.location.href);
      ["code", "error", "error_description", "state", "session_state", "iss"].forEach((key) => {
        url.searchParams.delete(key);
      });
      const storedCourseId = sessionStorage.getItem(COURSE_KEY);
      if (storedCourseId && !url.searchParams.get("courseid")) {
        url.searchParams.set("courseid", storedCourseId);
      }
      sessionStorage.removeItem(COURSE_KEY);
      history.replaceState({}, document.title, url);
      config.courseId = getQueryParamPreservePlus("courseid")
        || url.searchParams.get("courseid")
        || config.courseId;
    }
    return auth;
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

  const number = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, number(value, 0)));
  const average = (values) => {
    const valid = values.map(Number).filter(Number.isFinite);
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
  };
  const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const titleCore = (value) => normalizeText(value)
    .replace(/^\d+(?:[-.]\d+)*(?:\s+|$)/, "")
    .replace(/ก่อนเรียน|หลังเรียน|แบบทดสอบ|กิจกรรม|บทที่|หน่วยที่/g, "")
    .trim();
  const nodeTitle = (node, fallback = "-") => String(node?.title || node?.fields?.title || fallback).trim();
  const children = (node) => Array.isArray(node?.children) ? node.children : [];
  const compareSort = (left, right) => {
    const parts = (node) => String(node?.sort || node?.fields?.sort || "")
      .split(".")
      .map(Number)
      .filter(Number.isFinite);
    const a = parts(left), b = parts(right);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      const diff = (a[index] ?? 9999) - (b[index] ?? 9999);
      if (diff) return diff;
    }
    return 0;
  };
  const sorted = (items) => [...items].sort(compareSort);

  const toolType = (node) => {
    const fields = node?.fields || {};
    const declaredType = String(fields.aetool || fields.tool_type || fields.toolType || "").trim().toLowerCase();
    const haystack = [
      fields.aetool,
      fields.tool_type,
      fields.toolType,
      fields.iframe_url,
      fields.iframeUrl,
      node?.kind,
      nodeTitle(node, "")
    ].join(" ").toLowerCase();
    if (declaredType === "vk" || /vk-analysis|virtual\s*kidbright|vk-kbai[^\s]*\/ae\/exam|[?&]item=vk[\w-]*/.test(haystack)) return "vk";
    if (/bookroll|reading|ebook/.test(haystack)) return "bookroll";
    if (/video|viola/.test(haystack)) return "video";
    if (/chatbot|quiz|adaptive|edubot/.test(haystack)) return "chatbot";
    if (/profile|register/.test(haystack)) return "profile";
    return "other";
  };
  const toolLabel = (type) => ({
    bookroll: "BookRoll",
    video: "วิดีโอ",
    chatbot: "แบบฝึกหัด",
    vk: "Virtual KidBright",
    profile: "แบบประเมิน",
    other: "กิจกรรม"
  })[type] || "กิจกรรม";

  const collectVerticals = (node, output = []) => {
    if (!node || typeof node !== "object") return output;
    if (node.kind === "vertical") output.push(node);
    children(node).forEach((child) => collectVerticals(child, output));
    return output;
  };

  function normalizeCourse(course) {
    let chapterNodes = children(course).filter((node) => node?.kind === "chapter");
    if (!chapterNodes.length) chapterNodes = [course];
    const chapters = sorted(chapterNodes).map((chapter, chapterIndex) => {
      const verticals = sorted(collectVerticals(chapter));
      const activities = verticals.map((vertical, activityIndex) => {
        let toolNodes = children(vertical).filter((node) => {
          const type = toolType(node);
          return node?.kind === "aetool" || type !== "other";
        });
        if (!toolNodes.length && toolType(vertical) !== "other") toolNodes = [vertical];
        const tools = sorted(toolNodes).map((tool, toolIndex) => {
          const type = toolType(tool);
          return {
            id: String(tool?.id || vertical?.id || `${chapterIndex}-${activityIndex}-${toolIndex}`),
            title: nodeTitle(tool, nodeTitle(vertical, toolLabel(type))),
            type,
            label: toolLabel(type),
            url: String(tool?.fields?.iframe_url || tool?.fields?.iframeUrl || "")
          };
        }).filter((tool) => tool.type !== "other");
        return {
          id: String(vertical?.id || `${chapterIndex}-${activityIndex}`),
          title: nodeTitle(vertical, `กิจกรรม ${activityIndex + 1}`),
          sort: String(vertical?.sort || ""),
          tools
        };
      }).filter((activity) => activity.tools.length);
      const chapterSort = String(chapter?.sort || chapter?.fields?.sort || "");
      const chapterNumber = number(chapterSort.split(".")[0], chapterIndex + 1);
      return {
        id: String(chapter?.id || chapterIndex),
        title: nodeTitle(chapter, `บทที่ ${chapterIndex + 1}`),
        number: chapterNumber,
        activities
      };
    });
    const counts = { bookroll: 0, video: 0, chatbot: 0, vk: 0, profile: 0 };
    chapters.forEach((chapter) => chapter.activities.forEach((activity) => {
      activity.tools.forEach((tool) => {
        if (Object.hasOwn(counts, tool.type)) counts[tool.type] += 1;
      });
    }));
    return {
      title: nodeTitle(course, course?.courseTitle || "รายวิชา"),
      key: String(course?.courseKey || course?.courseId || config.courseId),
      chapters,
      counts
    };
  }

  function normalizeBookroll(payload) {
    const output = [];
    const seen = new Set();
    const push = (title, read, total, usageId = "") => {
      const readValue = number(read);
      const totalValue = number(total);
      if (!Number.isFinite(readValue) || !Number.isFinite(totalValue)) return;
      const progress = totalValue > 0 ? clamp(readValue / totalValue * 100) : 0;
      const key = `${normalizeText(title)}|${String(usageId).toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      output.push({
        title: String(title || "BookRoll"),
        key: normalizeText(title),
        usageId: String(usageId || "").toLowerCase(),
        read: readValue,
        total: totalValue,
        progress: Math.round(progress)
      });
    };
    const visit = (value, title = "", usageId = "") => {
      if (typeof value === "string") {
        const match = value.match(/(\d+)\s*[:/]\s*(\d+)/);
        if (match) push(title, match[1], match[2], usageId);
        return;
      }
      if (!value || typeof value !== "object") return;
      const nextUsage = value.usageId || value.usage_id || value.moduleId || value.id || usageId;
      const read = value.read ?? value.readPage ?? value.read_page ?? value.current ?? value.done;
      const total = value.total ?? value.totalPage ?? value.total_page ?? value.max ?? value.all;
      if (Number.isFinite(Number(read)) && Number.isFinite(Number(total))) {
        push(value.title || value.name || title, read, total, nextUsage);
        return;
      }
      Object.entries(value).forEach(([key, item]) => visit(item, key, nextUsage));
    };
    visit(payload);
    return output;
  }

  const chartOption = (payload) => payload?.Option || payload?.option || payload?.chart || payload || {};
  const chartValue = (value) => {
    const raw = value && typeof value === "object"
      ? (Array.isArray(value.value) ? value.value[value.value.length - 1] : value.value)
      : value;
    return number(raw);
  };

  function normalizeVideo(payload) {
    const option = chartOption(payload);
    const axes = [option.yAxis, option.xAxis].flat();
    const labels = axes.find((axis) => Array.isArray(axis?.data))?.data || [];
    const series = Array.isArray(option.series) ? option.series : [];
    const values = Array.isArray(series[0]?.data) ? series[0].data : [];
    return values.map((value, index) => {
      const title = String(labels[index] || `วิดีโอ ${index + 1}`);
      return {
        title,
        key: normalizeText(title),
        usageId: "",
        progress: Math.round(clamp(chartValue(value)))
      };
    }).filter((entry) => entry.title);
  }

  function normalizeChatbot(payload) {
    const output = [];
    const collections = Array.isArray(payload?.collections) ? payload.collections : [];
    collections.forEach((collection) => {
      const quizzes = Array.isArray(collection?.quizzes) ? collection.quizzes : [];
      quizzes.forEach((quiz) => {
        const progress = number(quiz?.best_score_pct
          ?? quiz?.latest_score_pct
          ?? quiz?.avg_score_pct);
        if (!Number.isFinite(progress)) return;
        output.push({
          id: String(quiz?.quiz_id || quiz?.share_code || ""),
          title: String(quiz?.title || "แบบฝึกหัด"),
          key: normalizeText(quiz?.title),
          usageId: String(quiz?.quiz_id || quiz?.share_code || "").toLowerCase(),
          role: String(quiz?.quiz_role || ""),
          progress: Math.round(clamp(progress)),
          score: number(quiz?.best_correct_count),
          total: number(quiz?.best_total_count ?? quiz?.max_questions),
          latest: number(quiz?.latest_score_pct),
          average: number(quiz?.avg_score_pct),
          seconds: number(quiz?.avg_time_seconds),
          attempts: number(quiz?.total_attempts, 0),
          peer: quiz?.quiz_peer_comparison || null
        });
      });
    });
    if (output.length) return output;

    const option = chartOption(payload);
    const axes = [option.yAxis, option.xAxis].flat();
    const labels = axes.find((axis) => Array.isArray(axis?.data))?.data || [];
    const series = Array.isArray(option.series) ? option.series : [];
    const values = Array.isArray(series[0]?.data) ? series[0].data : [];
    const meta = Array.isArray(option.__categoryMeta) ? option.__categoryMeta : [];
    return values.map((value, index) => {
      const rawTitle = String(labels[index] || meta[index]?.title || `แบบฝึกหัด ${index + 1}`);
      const total = number(meta[index]?.total ?? rawTitle.match(/,\s*(\d+)\s*$/)?.[1]);
      const score = chartValue(value);
      const progress = Number.isFinite(total) && total > 0 ? score / total * 100 : score;
      return {
        id: String(meta[index]?.usageId || ""),
        title: rawTitle.replace(/,\s*\d+\s*$/, ""),
        key: normalizeText(rawTitle.replace(/,\s*\d+\s*$/, "")),
        usageId: String(meta[index]?.usageId || "").toLowerCase(),
        role: "",
        progress: Math.round(clamp(progress)),
        score,
        total,
        latest: null,
        average: null,
        seconds: null,
        attempts: null,
        peer: null
      };
    });
  }

  const VK_SKILL_LABELS = {
    "Coding skill": "ทักษะการเขียนโปรแกรม",
    "AI skill": "ทักษะการแก้ปัญหาด้วย AI",
    "AI setup skill": "การเตรียม AI",
    "Capture skill": "การเก็บภาพ",
    "Annotate skill": "การกำกับข้อมูล",
    "AI training skill": "การฝึกโมเดล AI",
    "AI building skill": "การสร้างโมเดล AI",
    "VK skill": "การใช้งาน Virtual KidBright"
  };

  const vkSeries = (payload, key = "Params") => {
    const series = Array.isArray(payload?.[key]?.series) ? payload[key].series : [];
    const output = new Map();
    series.forEach((entry) => {
      const name = String(entry?.name || "").trim();
      if (name) output.set(name, Array.isArray(entry?.data) ? entry.data : []);
    });
    return output;
  };

  function normalizeVk(source) {
    const overview = source?.overview && typeof source.overview === "object" ? source.overview : null;
    const doneRows = Array.isArray(source?.done) ? source.done : [];
    if (!overview && !doneRows.length) return null;
    const params = vkSeries(overview);
    const chapterNumbers = Array.isArray(overview?.Params?.x_data) ? overview.Params.x_data : [];
    const chapterTitles = Array.isArray(overview?.x_title) ? overview.x_title : [];
    const metricValue = (name, index) => number(params.get(name)?.[index]);
    const normalizedDone = doneRows.map((row) => {
      const locate = Array.isArray(row?.locate) ? row.locate : [];
      const value = number(row?.value, 0);
      const max = number(row?.max, 0);
      return {
        title: String(row?.name || "กิจกรรม Virtual KidBright"),
        key: normalizeText(row?.name),
        chapterNo: number(locate[0]),
        locate,
        value,
        max,
        progress: max > 0 ? Math.round(clamp(value / max * 100)) : 0
      };
    });
    const chapters = chapterNumbers.map((rawChapterNo, index) => {
      const chapterNo = number(rawChapterNo, index + 1);
      const done = normalizedDone.find((entry) => entry.chapterNo === chapterNo);
      return {
        chapterNo,
        title: String(done?.title || chapterTitles[index] || `บทที่ ${chapterNo}`),
        progress: done?.progress ?? null,
        metrics: Object.fromEntries([...params].map(([name]) => [name, metricValue(name, index)]))
      };
    });
    const overviewDone = overview?.done && typeof overview.done === "object" ? overview.done : {};
    const doneValue = number(overviewDone.value, normalizedDone.filter((entry) => entry.progress >= 100).length);
    const doneMax = number(overviewDone.max, normalizedDone.length);
    const sumMetric = (name) => (params.get(name) || [])
      .map((value) => number(value))
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0);
    const averageMetric = (name) => {
      const values = (params.get(name) || []).map((value) => number(value)).filter(Number.isFinite);
      return average(values);
    };
    const asPercent = (value) => Number.isFinite(value) ? clamp(Math.abs(value) <= 1 ? value * 100 : value) : null;
    const skills = Object.entries(VK_SKILL_LABELS).map(([key, label]) => {
      const series = Array.isArray(overview?.[key]?.series) ? overview[key].series : [];
      if (!series.length) return null;
      const resultEntry = series.find((entry) => normalizeText(entry?.name) === "result");
      const insights = series.filter((entry) => entry !== resultEntry).map((entry) => ({
        label: String(entry?.name || "ข้อเสนอแนะ"),
        text: String(Array.isArray(entry?.data) ? entry.data.find((value) => value != null) || "" : "")
      })).filter((entry) => entry.text);
      return {
        key,
        label,
        result: String(Array.isArray(resultEntry?.data) ? resultEntry.data[0] || "" : ""),
        insights
      };
    }).filter(Boolean);
    return {
      name: String(overview?.name || ""),
      done: { value: doneValue, max: doneMax },
      progress: doneMax > 0 ? Math.round(clamp(doneValue / doneMax * 100)) : 0,
      metrics: {
        timeUsed: sumMetric("Time used"),
        codingTime: sumMetric("Coding time"),
        vkTime: sumMetric("VK time"),
        switchCount: sumMetric("Switch count"),
        codingMark: asPercent(averageMetric("Coding mark")),
        solutionMark: asPercent(averageMetric("Solution mark"))
      },
      chapters,
      entries: normalizedDone,
      skills
    };
  }

  async function loadVk(userId, courseId) {
    const [overviewResult, doneResult] = await Promise.allSettled([
      endpoints.vkOverview(userId, courseId),
      endpoints.vkDoneChapters(userId, courseId)
    ]);
    if (overviewResult.status === "rejected" && doneResult.status === "rejected") {
      throw new Error("เรียก VK API ไม่สำเร็จ กรุณาตรวจ CORS หรือกำหนด vkUrl เป็น reverse proxy");
    }
    return {
      overview: overviewResult.status === "fulfilled" ? overviewResult.value : null,
      done: doneResult.status === "fulfilled" ? doneResult.value : []
    };
  }

  function findEntry(activity, tool, entries) {
    const rows = Array.isArray(entries) ? entries : [];
    const ids = [tool?.id, activity?.id].map((value) => String(value || "").toLowerCase()).filter(Boolean);
    const byId = rows.find((entry) => entry.usageId && ids.includes(String(entry.usageId).toLowerCase()));
    if (byId) return byId;
    const titles = [tool?.title, activity?.title].map(normalizeText).filter(Boolean);
    const exact = rows.find((entry) => titles.includes(normalizeText(entry.title)));
    if (exact) return exact;
    const cores = [tool?.title, activity?.title].map(titleCore).filter((value) => value.length >= 4);
    return rows.find((entry) => {
      const entryCore = titleCore(entry.title);
      return entryCore.length >= 4 && cores.some((core) => entryCore.includes(core) || core.includes(entryCore));
    }) || null;
  }

  const summarize = (tools) => {
    const values = tools.map((tool) => number(tool.progress, 0));
    return {
      total: tools.length,
      done: values.filter((value) => value >= 100).length,
      doing: values.filter((value) => value > 0 && value < 100).length,
      todo: values.filter((value) => value <= 0).length,
      average: average(values) || 0
    };
  };

  function buildModel(coursePayload, sources = {}) {
    const course = normalizeCourse(coursePayload || {});
    const entries = {
      bookroll: normalizeBookroll(sources.bookroll),
      video: normalizeVideo(sources.video),
      chatbot: normalizeChatbot(sources.chatbot),
      vk: normalizeVk(sources.vk)?.entries || []
    };
    const trackedTools = [];
    const chapters = course.chapters.map((chapter) => {
      const activities = chapter.activities.map((activity) => {
        const tools = activity.tools.map((tool) => {
          const entry = tool.type === "vk"
            ? findEntry({ title: chapter.title }, tool, entries.vk) || findEntry(activity, tool, entries.vk)
            : findEntry(activity, tool, entries[tool.type]);
          const resolved = {
            ...tool,
            progress: Number.isFinite(entry?.progress) ? entry.progress : 0,
            hasData: Boolean(entry),
            detail: entry || null
          };
          if (["bookroll", "video", "chatbot", "vk"].includes(tool.type)) trackedTools.push(resolved);
          return resolved;
        });
        return {
          ...activity,
          tools,
          progress: average(tools.map((tool) => tool.progress)) || 0
        };
      });
      return {
        ...chapter,
        activities,
        progress: average(activities.map((activity) => activity.progress)) || 0
      };
    });
    const byType = (type) => trackedTools.filter((tool) => tool.type === type);
    const collection = Array.isArray(sources.chatbot?.collections)
      ? sources.chatbot.collections[0] || null
      : null;
    const vkOverview = normalizeVk(sources.vk);
    return {
      course: { ...course, chapters },
      overall: summarize(trackedTools),
      summaries: {
        bookroll: summarize(byType("bookroll")),
        video: summarize(byType("video")),
        chatbot: summarize(byType("chatbot")),
        vk: vkOverview?.done.max > 0 ? {
          total: vkOverview.done.max,
          done: vkOverview.done.value,
          doing: vkOverview.done.value > 0 && vkOverview.done.value < vkOverview.done.max ? 1 : 0,
          todo: Math.max(0, vkOverview.done.max - vkOverview.done.value),
          average: vkOverview.progress
        } : summarize(byType("vk"))
      },
      entries,
      vkOverview,
      heatmap: sources.videoHeatmap || null,
      quizOverview: collection ? {
        completion: number(collection.completion_pct, 0),
        average: number(collection.overall_avg_score_pct),
        best: number(collection.overall_best_score_pct),
        pretest: number(collection.pretest_best_score_pct),
        posttest: number(collection.posttest_best_score_pct),
        improvement: number(collection.improvement_pct),
        attempts: number(collection.total_attempts, 0),
        mastery: Array.isArray(collection.bloom_mastery) ? collection.bloom_mastery : [],
        peer: collection.peer_comparison || null
      } : null
    };
  }

  async function loadDashboard({ courseId, auth, onTask } = {}) {
    const resolvedCourseId = courseId || config.courseId;
    if (!resolvedCourseId) throw new Error("ไม่พบ courseid ใน URL");
    const profile = authProfile(auth);
    const userId = authSub(auth);
    const email = [profile?.email, profile?.preferred_username]
      .map((value) => String(value || "").trim())
      .find((value) => value.includes("@")) || "";
    const taskState = {};
    const publish = (id, state, message = "") => {
      taskState[id] = { id, state, message };
      if (typeof onTask === "function") onTask({ ...taskState[id] });
    };
    const run = async (id, callback) => {
      publish(id, "loading");
      try {
        const value = await callback();
        publish(id, "success");
        return value;
      } catch (error) {
        publish(id, "error", error?.message || String(error));
        throw error;
      }
    };

    const coursePayload = await run("course", () => endpoints.courseTree(resolvedCourseId));
    const course = normalizeCourse(coursePayload);
    const sources = {};
    const errors = [];
    const tasks = [];
    const queue = (id, enabled, reason, callback) => {
      if (!enabled) {
        publish(id, "skipped", reason);
        return;
      }
      tasks.push(run(id, callback)
        .then((value) => { sources[id] = value; })
        .catch((error) => { errors.push({ id, message: error.message }); }));
    };

    queue(
      "bookroll",
      course.counts.bookroll > 0 && Boolean(userId),
      course.counts.bookroll ? "กรุณาเข้าสู่ระบบ" : "รายวิชานี้ไม่มี BookRoll",
      () => endpoints.bookroll(userId, resolvedCourseId)
    );
    queue(
      "video",
      course.counts.video > 0 && Boolean(email),
      course.counts.video ? "ไม่พบอีเมลผู้เรียน" : "รายวิชานี้ไม่มีวิดีโอ",
      () => endpoints.video(email, resolvedCourseId)
    );
    queue(
      "videoHeatmap",
      course.counts.video > 0 && Boolean(email),
      course.counts.video ? "ไม่พบอีเมลผู้เรียน" : "รายวิชานี้ไม่มีวิดีโอ",
      () => endpoints.videoHeatmap(email, resolvedCourseId)
    );
    queue(
      "chatbot",
      course.counts.chatbot > 0 && Boolean(email) && Boolean(authToken(auth)),
      course.counts.chatbot ? "กรุณาเข้าสู่ระบบ" : "รายวิชานี้ไม่มีแบบฝึกหัด",
      () => endpoints.chatbot(email, resolvedCourseId)
    );
    queue(
      "vk",
      course.counts.vk > 0 && Boolean(userId),
      course.counts.vk ? "กรุณาเข้าสู่ระบบ" : "รายวิชานี้ไม่มี Virtual KidBright",
      () => loadVk(userId, resolvedCourseId)
    );
    await Promise.allSettled(tasks);

    return {
      courseId: resolvedCourseId,
      profile,
      userId,
      model: buildModel(coursePayload, sources),
      errors,
      tasks: Object.values(taskState)
    };
  }

  global.StudentAPI = {
    config,
    oidc,
    debug,
    SESSION_EXPIRED,
    manager: apiManager,
    endpoints,
    readAuth,
    clearAuth,
    authSub,
    authProfile,
    authExpired,
    initializeAuth,
    startLogin,
    logout,
    normalizeCourse,
    normalizeBookroll,
    normalizeVideo,
    normalizeChatbot,
    normalizeVk,
    buildModel,
    loadDashboard,
    clamp,
    average
  };
})(window);
