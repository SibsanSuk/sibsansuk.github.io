const TEACHER_LOCAL_DATA_PATHS = {
  course: "./teacher_dashboard_data/course.json",
  progress: "./teacher_dashboard_data/progress.json",
  score: "./teacher_dashboard_data/score.json",
};

const teacherQuery = new URLSearchParams(globalThis.location?.search || "");

const readTeacherDashboardConfig = () => {
  const runtime = globalThis.TEACHER_DASHBOARD_CONFIG || {};
  return {
    source: teacherQuery.get("source") || runtime.source || "local",
    courseId: teacherQuery.get("courseid") || teacherQuery.get("courseId") || runtime.courseId || "",
    teacherId: teacherQuery.get("teacherid") || teacherQuery.get("teacherId") || runtime.teacherId || "",
    instituteId: teacherQuery.get("instituteid") || teacherQuery.get("instituteId") || runtime.instituteId || "",
    apiBaseUrl: runtime.apiBaseUrl || "",
    localPaths: { ...TEACHER_LOCAL_DATA_PATHS, ...(runtime.localPaths || {}) },
    endpoints: {
      course: null,
      progress: null,
      score: null,
      ...(runtime.endpoints || {}),
    },
  };
};

const teacherConfig = readTeacherDashboardConfig();

const teacherState = {
  course: null,
  progress: [],
  score: [],
  students: [],
  activities: [],
  filter: "all",
  query: "",
  sortMode: "risk",
  charts: {
    progress: null,
    score: null,
  },
};

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const avg = (values) => {
  const nums = values.map((v) => Number(v)).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
};

const percentText = (value, digits = 0) =>
  Number.isFinite(value) ? `${value.toFixed(digits)}%` : "-";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const sortValue = (raw) => {
  const parts = String(raw || "")
    .split(".")
    .map((part) => Number(part))
    .filter(Number.isFinite);
  return parts.length ? parts : [9999];
};

const compareSortPath = (a, b) => {
  const aa = sortValue(a);
  const bb = sortValue(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i += 1) {
    const av = aa[i] ?? 0;
    const bv = bb[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
};

const fetchJson = async (url) => {
  const fullUrl = new URL(url, globalThis.location?.href || "http://localhost/");
  fullUrl.searchParams.set("v", String(Date.now()));
  const res = await fetch(fullUrl.toString());
  if (!res.ok) throw new Error(`โหลด ${url} ไม่สำเร็จ (${res.status})`);
  return res.json();
};

const buildUrl = (endpoint, params = {}) => {
  if (!endpoint) return "";
  if (typeof endpoint === "function") return endpoint(params);
  const base = globalThis.location?.href || "http://localhost/";
  const url = new URL(endpoint, teacherConfig.apiBaseUrl || base);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== "") url.searchParams.set(key, value);
  });
  return url.toString();
};

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;
  return [];
};

const loadTeacherDataFromLocal = async () => {
  const { localPaths } = teacherConfig;
  const [course, progress, score] = await Promise.all([
    fetchJson(localPaths.course),
    fetchJson(localPaths.progress),
    fetchJson(localPaths.score),
  ]);
  return {
    source: "local",
    course,
    progress: normalizeListPayload(progress),
    score: normalizeListPayload(score),
  };
};

const loadTeacherDataFromApi = async () => {
  const params = {
    courseId: teacherConfig.courseId,
    course_id: teacherConfig.courseId,
    teacherId: teacherConfig.teacherId,
    teacher_id: teacherConfig.teacherId,
    instituteId: teacherConfig.instituteId,
    institute_id: teacherConfig.instituteId,
  };
  const urls = {
    course: buildUrl(teacherConfig.endpoints.course, params),
    progress: buildUrl(teacherConfig.endpoints.progress, params),
    score: buildUrl(teacherConfig.endpoints.score, params),
  };
  const missing = Object.entries(urls).filter(([, url]) => !url).map(([key]) => key);
  if (missing.length) {
    throw new Error(`ยังไม่ได้ตั้งค่า teacher API endpoint: ${missing.join(", ")}`);
  }
  const [course, progress, score] = await Promise.all([
    fetchJson(urls.course),
    fetchJson(urls.progress),
    fetchJson(urls.score),
  ]);
  return {
    source: "api",
    course,
    progress: normalizeListPayload(progress),
    score: normalizeListPayload(score),
  };
};

const loadTeacherData = async () => {
  if (teacherConfig.source === "api") return loadTeacherDataFromApi();
  return loadTeacherDataFromLocal();
};

const fullName = (row) =>
  `${row?.firstName || ""} ${row?.lastName || ""}`.replace(/\s+/g, " ").trim() || row?.email || "-";

const scoreRate = (score) =>
  score && score.max > 0 ? clamp((score.score / score.max) * 100, 0, 100) : null;

const statusForStudent = (student) => {
  const progress = toNumber(student.progress, 0);
  const rate = scoreRate(student.score);
  if (progress >= 100) return { key: "done", label: "เรียนครบ", tone: "success" };
  if (progress < 50 || (rate != null && rate < 50)) return { key: "risk", label: "ต้องติดตาม", tone: "danger" };
  return { key: "active", label: "กำลังเรียน", tone: "info" };
};

const buildScoreByEmail = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const email = String(row?.email || "").trim().toLowerCase();
    if (!email) return;
    const prev = map.get(email) || { score: 0, max: 0, count: 0, modules: new Set() };
    prev.score += toNumber(row.score, 0);
    prev.max += toNumber(row.maxScore, 0);
    prev.count += 1;
    if (row.moduleId) prev.modules.add(row.moduleId);
    map.set(email, prev);
  });
  return map;
};

const mergeStudents = (progressRows, scoreRows) => {
  const scores = buildScoreByEmail(scoreRows);
  return progressRows.map((row) => {
    const email = String(row?.email || "").trim().toLowerCase();
    const score = scores.get(email) || null;
    const student = {
      id: row.id,
      email,
      name: fullName(row),
      level: row.levelOfEducation || "-",
      instituteId: row.instituteId || "-",
      province: row.province || "-",
      progress: clamp(toNumber(row.progress, 0), 0, 100),
      lastUpdate: row.lastUpdate || null,
      score: score
        ? {
            score: score.score,
            max: score.max,
            count: score.count,
            moduleCount: score.modules.size,
          }
        : null,
    };
    student.status = statusForStudent(student);
    return student;
  });
};

const walkCourse = (node, out = []) => {
  if (!node || typeof node !== "object") return out;
  out.push(node);
  (Array.isArray(node.children) ? node.children : []).forEach((child) => walkCourse(child, out));
  return out;
};

const collectActivities = (course) => {
  const nodes = walkCourse(course);
  const verticals = nodes
    .filter((node) => node.kind === "vertical")
    .sort((a, b) => compareSortPath(a.sort, b.sort));

  return verticals
    .map((vertical) => {
      const tools = (Array.isArray(vertical.children) ? vertical.children : [])
        .filter((child) => child.kind === "aetool")
        .map((tool) => ({
          type: String(tool.fields?.aetool || "tool").toLowerCase(),
          title: tool.title || tool.fields?.title || vertical.title || "-",
          url: tool.fields?.iframe_url || "",
          id: tool.id || "",
          sort: tool.sort || "",
        }))
        .sort((a, b) => compareSortPath(a.sort, b.sort));
      return {
        id: vertical.id,
        title: vertical.title || vertical.fields?.title || "-",
        sort: vertical.sort || "",
        tools,
      };
    })
    .filter((activity) => activity.tools.length);
};

const toolMeta = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("video")) return { label: "Video", cls: "tool-video" };
  if (t.includes("bookroll")) return { label: "BookRoll", cls: "tool-bookroll" };
  if (t.includes("chatbot")) return { label: "Quiz", cls: "tool-chatbot" };
  if (t.includes("profile")) return { label: "Profile", cls: "tool-ae" };
  return { label: t || "Tool", cls: "tool-mixed" };
};

const progressBuckets = (students) => {
  const buckets = [
    { key: "done", label: "100%", min: 100, count: 0, color: "#18b879" },
    { key: "high", label: "75-99%", min: 75, max: 99.999, count: 0, color: "#1fb9b7" },
    { key: "mid", label: "50-74%", min: 50, max: 74.999, count: 0, color: "#f6b86a" },
    { key: "low", label: "1-49%", min: 1, max: 49.999, count: 0, color: "#f97316" },
    { key: "zero", label: "0%", min: 0, max: 0.999, count: 0, color: "#f56a6a" },
  ];
  students.forEach((student) => {
    const progress = toNumber(student.progress, 0);
    const bucket = buckets.find((item) => progress >= item.min && progress <= (item.max ?? 100));
    if (bucket) bucket.count += 1;
  });
  return buckets;
};

const scoreBuckets = (students) => {
  const buckets = [
    { label: "80-100%", min: 80, max: 100, count: 0, color: "#18b879" },
    { label: "60-79%", min: 60, max: 79.999, count: 0, color: "#1fb9b7" },
    { label: "40-59%", min: 40, max: 59.999, count: 0, color: "#f6b86a" },
    { label: "0-39%", min: 0, max: 39.999, count: 0, color: "#f56a6a" },
    { label: "ไม่มีคะแนน", noScore: true, count: 0, color: "#94a3b8" },
  ];
  students.forEach((student) => {
    const rate = scoreRate(student.score);
    if (rate == null) {
      buckets.find((bucket) => bucket.noScore).count += 1;
      return;
    }
    const bucket = buckets.find((item) => !item.noScore && rate >= item.min && rate <= item.max);
    if (bucket) bucket.count += 1;
  });
  return buckets;
};

const renderMetrics = () => {
  const students = teacherState.students;
  const completed = students.filter((student) => student.progress >= 100).length;
  const avgProgress = avg(students.map((student) => student.progress)) ?? 0;
  const rates = students.map((student) => scoreRate(student.score)).filter(Number.isFinite);
  const avgScoreRate = avg(rates);

  setText("metric-students", students.length.toLocaleString("th-TH"));
  setText("metric-progress", percentText(avgProgress, 1));
  setText("metric-completed", completed.toLocaleString("th-TH"));
  setText("metric-score", avgScoreRate == null ? "-" : percentText(avgScoreRate, 1));
};

const renderCharts = () => {
  if (typeof Chart !== "function") return;
  const pBuckets = progressBuckets(teacherState.students);
  const sBuckets = scoreBuckets(teacherState.students);

  setText("progress-bucket-summary", `${teacherState.students.length} คน`);
  setText("score-summary", `${teacherState.score.length} records`);

  const progressCtx = document.getElementById("teacherProgressChart");
  if (progressCtx) {
    if (teacherState.charts.progress) teacherState.charts.progress.destroy();
    teacherState.charts.progress = new Chart(progressCtx, {
      type: "bar",
      data: {
        labels: pBuckets.map((bucket) => bucket.label),
        datasets: [{
          label: "จำนวนผู้เรียน",
          data: pBuckets.map((bucket) => bucket.count),
          backgroundColor: pBuckets.map((bucket) => bucket.color),
          borderRadius: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  const scoreCtx = document.getElementById("teacherScoreChart");
  if (scoreCtx) {
    if (teacherState.charts.score) teacherState.charts.score.destroy();
    teacherState.charts.score = new Chart(scoreCtx, {
      type: "doughnut",
      data: {
        labels: sBuckets.map((bucket) => bucket.label),
        datasets: [{
          data: sBuckets.map((bucket) => bucket.count),
          backgroundColor: sBuckets.map((bucket) => bucket.color),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        plugins: { legend: { position: "bottom" } },
      },
    });
  }
};

const matchesFilter = (student) => {
  if (teacherState.filter === "done") return student.progress >= 100;
  if (teacherState.filter === "active") return student.progress > 0 && student.progress < 100;
  if (teacherState.filter === "risk") return student.status.key === "risk";
  if (teacherState.filter === "noscore") return !student.score;
  return true;
};

const filteredStudents = () => {
  const query = teacherState.query.trim().toLowerCase();
  const rows = teacherState.students.filter((student) => {
    if (!matchesFilter(student)) return false;
    if (!query) return true;
    return (
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.province.toLowerCase().includes(query)
    );
  });

  return rows.sort((a, b) => {
    if (teacherState.sortMode === "name") return a.name.localeCompare(b.name, "th");
    const ar = scoreRate(a.score);
    const br = scoreRate(b.score);
    const aRisk = a.status.key === "risk" ? 0 : 1;
    const bRisk = b.status.key === "risk" ? 0 : 1;
    if (aRisk !== bRisk) return aRisk - bRisk;
    if (a.progress !== b.progress) return a.progress - b.progress;
    return (ar ?? -1) - (br ?? -1);
  });
};

const progressBarHtml = (value) => {
  const pct = clamp(toNumber(value, 0), 0, 100);
  const tone = pct >= 100 ? "grad-success" : pct >= 50 ? "grad-brand" : "grad-danger";
  return `
    <div class="teacher-progress-cell">
      <div class="teacher-progress-track">
        <div class="teacher-progress-fill ${tone}" style="width:${pct}%"></div>
      </div>
      <span class="mono font-bold">${pct}%</span>
    </div>
  `;
};

const scoreHtml = (score) => {
  if (!score || score.max <= 0) return `<span class="text-slate-400">-</span>`;
  const rate = scoreRate(score);
  return `
    <div class="grid gap-1">
      <div class="mono font-bold">${escapeHtml(score.score)} / ${escapeHtml(score.max)}</div>
      <div class="text-xs text-slate-500">${percentText(rate, 1)}</div>
    </div>
  `;
};

const renderStudentTable = () => {
  const tbody = document.getElementById("teacher-student-rows");
  if (!tbody) return;
  const rows = filteredStudents();
  setText("teacher-table-summary", `แสดง ${rows.length.toLocaleString("th-TH")} จาก ${teacherState.students.length.toLocaleString("th-TH")} คน`);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-500">ไม่พบผู้เรียนตามเงื่อนไข</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((student) => `
    <tr>
      <td>
        <div class="font-semibold text-slate-800">${escapeHtml(student.name)}</div>
        <div class="mt-1 text-xs text-slate-500">${escapeHtml(student.email)}</div>
        <div class="mt-1 text-xs text-slate-400">${escapeHtml(student.level)} • ${escapeHtml(student.province)}</div>
      </td>
      <td>${progressBarHtml(student.progress)}</td>
      <td>${scoreHtml(student.score)}</td>
      <td class="text-sm text-slate-600">${escapeHtml(formatDateTime(student.lastUpdate))}</td>
      <td><span class="teacher-status-pill ${student.status.tone}">${escapeHtml(student.status.label)}</span></td>
    </tr>
  `).join("");
};

const renderActivities = () => {
  const listEl = document.getElementById("teacher-activity-list");
  if (!listEl) return;
  const activities = teacherState.activities;
  const toolCounts = activities.flatMap((activity) => activity.tools).reduce((acc, tool) => {
    const key = tool.type || "tool";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  setText(
    "teacher-activity-summary",
    Object.entries(toolCounts).map(([key, count]) => `${key}: ${count}`).join(" • ") || "-"
  );

  listEl.innerHTML = activities.map((activity) => `
    <div class="teacher-activity-row panel">
      <div class="min-w-0">
        <div class="font-semibold text-slate-800">${escapeHtml(activity.title)}</div>
        <div class="mt-1 text-xs text-slate-500 mono">${escapeHtml(activity.sort || "-")}</div>
      </div>
      <div class="flex flex-wrap gap-2 justify-start sm:justify-end">
        ${activity.tools.map((tool) => {
          const meta = toolMeta(tool.type);
          const label = escapeHtml(meta.label);
          if (!tool.url) return `<span class="badge ${meta.cls}">${label}</span>`;
          return `<a class="badge ${meta.cls}" href="${escapeHtml(tool.url)}" target="_blank" rel="noreferrer">${label}</a>`;
        }).join("")}
      </div>
    </div>
  `).join("");
};

const renderAll = () => {
  renderMetrics();
  renderCharts();
  renderStudentTable();
  renderActivities();
};

const showTeacherView = (view) => {
  document.querySelectorAll("[data-teacher-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.teacherPanel !== view;
  });

  document.querySelectorAll("[data-teacher-view]").forEach((button) => {
    const active = button.dataset.teacherView === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  document.querySelector(".page-scroll")?.scrollTo({ top: 0, behavior: "smooth" });

  if (view === "overview") {
    requestAnimationFrame(() => {
      teacherState.charts.progress?.resize();
      teacherState.charts.score?.resize();
    });
  }
};

const bindControls = () => {
  document.querySelectorAll("[data-teacher-view]").forEach((button) => {
    button.addEventListener("click", () => showTeacherView(button.dataset.teacherView));
  });

  const searchEl = document.getElementById("teacher-search");
  if (searchEl) {
    searchEl.addEventListener("input", (event) => {
      teacherState.query = event.target.value || "";
      renderStudentTable();
    });
  }

  const filterEl = document.getElementById("teacher-filter");
  if (filterEl) {
    filterEl.addEventListener("change", (event) => {
      teacherState.filter = event.target.value || "all";
      renderStudentTable();
    });
  }

  const sortEl = document.getElementById("teacher-sort-toggle");
  if (sortEl) {
    sortEl.addEventListener("click", () => {
      teacherState.sortMode = teacherState.sortMode === "risk" ? "name" : "risk";
      sortEl.textContent = teacherState.sortMode === "risk" ? "เรียง: ต้องติดตามก่อน" : "เรียง: ชื่อผู้เรียน";
      renderStudentTable();
    });
  }
};

const initTeacherDashboard = async () => {
  bindControls();
  try {
    const loaded = await loadTeacherData();
    const { course, progress, score } = loaded;

    teacherState.course = course;
    teacherState.progress = progress;
    teacherState.score = score;
    teacherState.students = mergeStudents(teacherState.progress, teacherState.score);
    teacherState.activities = collectActivities(course);

    setText("teacher-course-name", course.courseTitle || course.title || "-");
    setText("teacher-course-id", course.courseKey || "-");
    setText("teacher-status", `โหลดข้อมูลแล้ว (${loaded.source}): progress ${teacherState.progress.length} รายการ • score ${teacherState.score.length} รายการ • activity ${teacherState.activities.length} รายการ`);
    renderAll();
  } catch (err) {
    console.warn("Teacher dashboard load failed:", err);
    setText("teacher-status", err?.message || "โหลดข้อมูลไม่สำเร็จ");
    const tbody = document.getElementById("teacher-student-rows");
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-red-600">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
  }
};

initTeacherDashboard();
