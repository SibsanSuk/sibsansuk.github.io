(function () {
  "use strict";

  const API_BASE = "https://adaptive-profile-bn-dev.ae.app.meca.in.th";
  const API_PATH = "/api/kidbright/enroll/query";
  const TOP_LIMIT = 8;

  const state = {
    rows: [],
    summary: null,
    loading: false,
    lastUrl: "",
  };

  const els = {
    fromDate: document.getElementById("from-date"),
    toDate: document.getElementById("to-date"),
    reloadBtn: document.getElementById("reload-btn"),
    askForm: document.getElementById("ask-form"),
    askBtn: document.getElementById("ask-btn"),
    questionInput: document.getElementById("question-input"),
    quickActions: document.getElementById("quick-actions"),
    messages: document.getElementById("messages"),
    statusDot: document.getElementById("status-dot"),
    statusText: document.getElementById("status-text"),
    updatedText: document.getElementById("updated-text"),
    endpointLabel: document.getElementById("endpoint-label"),
    statUsers: document.getElementById("stat-users"),
    statInstitutes: document.getElementById("stat-institutes"),
    statProvinces: document.getElementById("stat-provinces"),
    statCourses: document.getElementById("stat-courses"),
    provinceCount: document.getElementById("province-count"),
    instituteCount: document.getElementById("institute-count"),
    courseCount: document.getElementById("course-count"),
    provinceList: document.getElementById("province-list"),
    instituteList: document.getElementById("institute-list"),
    courseList: document.getElementById("course-list"),
  };

  function formatNumber(value) {
    return new Intl.NumberFormat("th-TH").format(Number(value) || 0);
  }

  function compactText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizePayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.rows)) return payload.rows;
    return [];
  }

  function endpointUrl() {
    const from = els.fromDate.value || "2026-06-03";
    const to = els.toDate.value || "2026-07-03";
    const url = new URL(API_PATH, API_BASE);
    url.searchParams.set("createAt", `${from},${to}`);
    return url.toString();
  }

  function groupBy(rows, getKey, getValue, getMeta) {
    const map = new Map();
    for (const row of rows) {
      const key = getKey(row) || "-";
      const current = map.get(key) || { key, value: 0, count: 0, meta: getMeta ? getMeta(row) : "" };
      current.value += safeNumber(getValue(row));
      current.count += 1;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.value - a.value || a.key.localeCompare(b.key, "th"));
  }

  function makeSummary(rows) {
    const validRows = rows.filter((row) => row && typeof row === "object");
    const totalUsers = validRows.reduce((sum, row) => sum + safeNumber(row.instituteUserCount), 0);
    const provinceRows = groupBy(
      validRows,
      (row) => row.instituteProvince || "-",
      (row) => row.instituteUserCount,
      (row) => row.instituteDistrict || ""
    );
    const instituteRows = validRows
      .map((row) => ({
        key: row.instituteName || "-",
        value: safeNumber(row.instituteUserCount),
        meta: [row.instituteDistrict, row.instituteProvince].filter(Boolean).join(", "),
        row,
      }))
      .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key, "th"));

    const courseMap = new Map();
    for (const row of validRows) {
      for (const course of row.courses || []) {
        const key = course.courseName || course.courseId || "-";
        const current = courseMap.get(key) || {
          key,
          value: 0,
          count: 0,
          courseId: course.courseId || "",
        };
        current.value += safeNumber(course.courseUserCount);
        current.count += 1;
        courseMap.set(key, current);
      }
    }
    const courseRows = [...courseMap.values()].sort((a, b) => b.value - a.value || a.key.localeCompare(b.key, "th"));

    return {
      totalUsers,
      institutes: validRows.length,
      provinces: provinceRows.length,
      courses: courseRows.length,
      provinceRows,
      instituteRows,
      courseRows,
    };
  }

  function setStatus(kind, text) {
    els.statusDot.className = `dot ${kind === "ready" ? "ready" : kind === "error" ? "error" : ""}`;
    els.statusText.textContent = text;
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    els.reloadBtn.disabled = isLoading;
    els.askBtn.disabled = isLoading;
    els.reloadBtn.textContent = isLoading ? "กำลังโหลด..." : "โหลดข้อมูล";
  }

  function renderRows(container, rows, getSub) {
    if (!rows.length) {
      container.innerHTML = '<div class="empty">ไม่มีข้อมูล</div>';
      return;
    }
    container.innerHTML = rows.slice(0, TOP_LIMIT).map((item) => {
      const sub = getSub ? getSub(item) : item.meta || "";
      return `
        <div class="row">
          <div class="row-main">
            <div class="row-title" title="${escapeHtml(item.key)}">${escapeHtml(item.key)}</div>
            <div class="row-sub" title="${escapeHtml(sub)}">${escapeHtml(sub)}</div>
          </div>
          <div class="row-value">${formatNumber(item.value)}</div>
        </div>
      `;
    }).join("");
  }

  function renderSummary() {
    const summary = state.summary;
    if (!summary) return;
    els.statUsers.textContent = formatNumber(summary.totalUsers);
    els.statInstitutes.textContent = formatNumber(summary.institutes);
    els.statProvinces.textContent = formatNumber(summary.provinces);
    els.statCourses.textContent = formatNumber(summary.courses);
    els.provinceCount.textContent = formatNumber(summary.provinces);
    els.instituteCount.textContent = formatNumber(summary.institutes);
    els.courseCount.textContent = formatNumber(summary.courses);
    renderRows(els.provinceList, summary.provinceRows, (item) => `${formatNumber(item.count)} สถาบัน`);
    renderRows(els.instituteList, summary.instituteRows, (item) => item.meta || "-");
    renderRows(els.courseList, summary.courseRows, (item) => `${formatNumber(item.count)} สถาบัน`);
  }

  function addMessage(type, text, evidence) {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${type}`;
    bubble.textContent = text;
    if (evidence && evidence.length) {
      const evidenceWrap = document.createElement("div");
      evidenceWrap.className = "evidence";
      for (const item of evidence.slice(0, 5)) {
        const node = document.createElement("div");
        node.className = "evidence-item";
        node.textContent = item;
        evidenceWrap.appendChild(node);
      }
      bubble.appendChild(evidenceWrap);
    }
    els.messages.appendChild(bubble);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function loadData() {
    setLoading(true);
    setStatus("loading", "กำลังโหลดข้อมูลจาก API");
    els.updatedText.textContent = "-";
    try {
      const url = endpointUrl();
      state.lastUrl = url;
      els.endpointLabel.textContent = url.replace(API_BASE, "");
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      state.rows = normalizePayload(payload);
      state.summary = makeSummary(state.rows);
      renderSummary();
      setStatus("ready", `พร้อมตอบจาก ${formatNumber(state.rows.length)} สถาบัน`);
      els.updatedText.textContent = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
      addMessage(
        "answer",
        `โหลดข้อมูลแล้ว: ผู้ใช้ ${formatNumber(state.summary.totalUsers)} คน จาก ${formatNumber(state.summary.institutes)} สถาบัน ${formatNumber(state.summary.provinces)} จังหวัด`,
        [`GET ${new URL(state.lastUrl).pathname}?${new URL(state.lastUrl).searchParams.toString()}`]
      );
    } catch (error) {
      setStatus("error", "โหลดข้อมูลไม่สำเร็จ");
      addMessage("answer", `โหลดข้อมูลไม่สำเร็จ: ${error.message}`, [
        "ถ้าเปิดจาก local file แล้วติด CORS ให้รันผ่าน local server เช่น python3 -m http.server",
      ]);
    } finally {
      setLoading(false);
    }
  }

  function answerQuestion(question) {
    if (!state.summary) {
      return {
        text: "ยังไม่มีข้อมูล ให้กดโหลดข้อมูลก่อน",
        evidence: [],
      };
    }

    const q = compactText(question);
    const summary = state.summary;
    const wantsTop = /(สูงสุด|มากสุด|เยอะสุด|อันดับ|top|ยอดนิยม)/i.test(q);
    const wantsTotal = /(ทั้งหมด|รวม|กี่คน|จำนวน|เท่าไร|เท่าไหร่)/i.test(q);

    if ((q.includes("จังหวัด") || q.includes("province")) && wantsTop) {
      return rankAnswer("จังหวัดที่มีผู้ใช้มากที่สุด", summary.provinceRows, (item) => `${item.key}: ${formatNumber(item.value)} คน จาก ${formatNumber(item.count)} สถาบัน`);
    }
    if ((q.includes("โรงเรียน") || q.includes("สถาบัน") || q.includes("school")) && wantsTop) {
      return rankAnswer("สถาบันที่มีผู้ใช้มากที่สุด", summary.instituteRows, (item) => `${item.key}: ${formatNumber(item.value)} คน (${item.meta || "-"})`);
    }
    if ((q.includes("วิชา") || q.includes("คอร์ส") || q.includes("course")) && wantsTop) {
      return rankAnswer("วิชาที่มีผู้ใช้มากที่สุด", summary.courseRows, (item) => `${item.key}: ${formatNumber(item.value)} คน ใน ${formatNumber(item.count)} สถาบัน`);
    }
    if (wantsTotal || q.includes("ภาพรวม")) {
      return {
        text: `ภาพรวมช่วง ${els.fromDate.value} ถึง ${els.toDate.value}: มีผู้ใช้ ${formatNumber(summary.totalUsers)} คน จาก ${formatNumber(summary.institutes)} สถาบัน ครอบคลุม ${formatNumber(summary.provinces)} จังหวัด และ ${formatNumber(summary.courses)} วิชา`,
        evidence: [
          `รวม instituteUserCount จาก ${formatNumber(summary.institutes)} records`,
          `API: ${state.lastUrl}`,
        ],
      };
    }

    const provinceHit = findProvince(q);
    if (provinceHit) return provinceAnswer(provinceHit.key);

    const instituteHit = findInstitute(q);
    if (instituteHit) return instituteAnswer(instituteHit.row);

    const courseHits = findCourses(q);
    if (courseHits.length) {
      const top = courseHits.slice(0, 5);
      return {
        text: `พบวิชาที่เกี่ยวข้อง ${formatNumber(courseHits.length)} รายการ อันดับแรกคือ ${top[0].key} มีผู้ใช้ ${formatNumber(top[0].value)} คน`,
        evidence: top.map((item) => `${item.key}: ${formatNumber(item.value)} คน ใน ${formatNumber(item.count)} สถาบัน`),
      };
    }

    return searchAnswer(q);
  }

  function rankAnswer(title, rows, format) {
    const top = rows.slice(0, 5);
    if (!top.length) return { text: "ไม่มีข้อมูลสำหรับจัดอันดับ", evidence: [] };
    return {
      text: `${title}: ${format(top[0])}`,
      evidence: top.map(format),
    };
  }

  function findProvince(q) {
    return state.summary.provinceRows.find((item) => item.key !== "-" && q.includes(compactText(item.key)));
  }

  function findInstitute(q) {
    return state.summary.instituteRows.find((item) => item.key !== "-" && q.includes(compactText(item.key)));
  }

  function findCourses(q) {
    const terms = keywordTerms(q);
    if (!terms.length) return [];
    return state.summary.courseRows
      .map((item) => ({ ...item, score: scoreText(`${item.key} ${item.courseId}`, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.value - a.value);
  }

  function provinceAnswer(province) {
    const rows = state.rows.filter((row) => row.instituteProvince === province);
    const total = rows.reduce((sum, row) => sum + safeNumber(row.instituteUserCount), 0);
    const topInstitutes = rows
      .map((row) => ({
        key: row.instituteName || "-",
        value: safeNumber(row.instituteUserCount),
        meta: row.instituteDistrict || "",
      }))
      .sort((a, b) => b.value - a.value);
    const courses = makeSummary(rows).courseRows;
    return {
      text: `${province} มีผู้ใช้ ${formatNumber(total)} คน จาก ${formatNumber(rows.length)} สถาบัน วิชาที่พบ ${formatNumber(courses.length)} วิชา`,
      evidence: [
        ...topInstitutes.slice(0, 3).map((item) => `${item.key}: ${formatNumber(item.value)} คน (${item.meta || "-"})`),
        ...courses.slice(0, 2).map((item) => `${item.key}: ${formatNumber(item.value)} คน`),
      ],
    };
  }

  function instituteAnswer(row) {
    const courses = (row.courses || [])
      .map((course) => ({
        key: course.courseName || course.courseId || "-",
        value: safeNumber(course.courseUserCount),
      }))
      .sort((a, b) => b.value - a.value);
    return {
      text: `${row.instituteName || "-"} มีผู้ใช้ ${formatNumber(row.instituteUserCount)} คน อยู่ที่ ${[row.instituteDistrict, row.instituteProvince].filter(Boolean).join(", ") || "-"} และมีข้อมูล ${formatNumber(courses.length)} วิชา`,
      evidence: courses.slice(0, 5).map((item) => `${item.key}: ${formatNumber(item.value)} คน`),
    };
  }

  function searchAnswer(q) {
    const terms = keywordTerms(q);
    if (!terms.length) {
      return {
        text: "พิมพ์คำถามหรือเลือกคำถามตัวอย่างด้านล่าง",
        evidence: [],
      };
    }
    const matches = state.rows
      .map((row) => {
        const text = [
          row.instituteName,
          row.instituteDistrict,
          row.instituteProvince,
          ...(row.courses || []).map((course) => `${course.courseName} ${course.courseId}`),
        ].join(" ");
        return { row, score: scoreText(text, terms) };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || safeNumber(b.row.instituteUserCount) - safeNumber(a.row.instituteUserCount));

    if (!matches.length) {
      return {
        text: "ยังไม่พบข้อมูลที่ตรงกับคำถามใน payload ชุดนี้",
        evidence: [`ลองใช้ชื่อจังหวัด ชื่อโรงเรียน ชื่อวิชา หรือถามอันดับสูงสุด`],
      };
    }

    const top = matches.slice(0, 5);
    const total = top.reduce((sum, item) => sum + safeNumber(item.row.instituteUserCount), 0);
    return {
      text: `พบข้อมูลที่เกี่ยวข้อง ${formatNumber(matches.length)} สถาบัน ตัวอย่าง 5 รายการแรกรวม ${formatNumber(total)} คน`,
      evidence: top.map((item) => `${item.row.instituteName || "-"} (${item.row.instituteProvince || "-"}): ${formatNumber(item.row.instituteUserCount)} คน`),
    };
  }

  function keywordTerms(text) {
    const stopwords = new Set(["มี", "ผู้ใช้", "กี่", "คน", "ทั้งหมด", "ไหม", "หรือ", "ที่", "ใน", "ของ", "คือ", "อะไร", "เท่าไร", "เท่าไหร่"]);
    return compactText(text)
      .split(/[\s,.:;!?()"'`]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2 && !stopwords.has(term));
  }

  function scoreText(text, terms) {
    const haystack = compactText(text);
    return terms.reduce((score, term) => {
      if (!haystack.includes(term)) return score;
      return score + Math.min(4, term.length);
    }, 0);
  }

  function submitQuestion(question) {
    const trimmed = String(question || "").trim();
    if (!trimmed) return;
    addMessage("user", trimmed);
    const answer = answerQuestion(trimmed);
    addMessage("answer", answer.text, answer.evidence);
    els.questionInput.value = "";
  }

  els.reloadBtn.addEventListener("click", loadData);
  els.askForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(els.questionInput.value);
  });
  els.quickActions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-question]");
    if (!button) return;
    submitQuestion(button.dataset.question);
  });

  addMessage("answer", "พร้อมเริ่มทดลอง Leado กับข้อมูล enroll/query");
  loadData();
})();
