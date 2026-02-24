(() => {
  const animatedBlocks = document.querySelectorAll(".hero, .quick-card, .role-section, .site-map, .doc-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  animatedBlocks.forEach((block) => observer.observe(block));

  const phaseButtons = document.querySelectorAll(".phase-btn");
  const phasePanels = document.querySelectorAll(".phase-panel");
  const phaseStatusInputs = document.querySelectorAll(".phase-status");
  const phaseNoteInputs = document.querySelectorAll(".phase-note");
  const phaseStateBadges = document.querySelectorAll(".phase-state");
  const editorNameInput = document.getElementById("editor-name");
  const teamKeyInput = document.getElementById("team-key");
  const endpointInput = document.getElementById("sync-endpoint");
  const btnSaveTeam = document.getElementById("btn-save-team");
  const btnLoadTeam = document.getElementById("btn-load-team");
  const btnExport = document.getElementById("btn-export");
  const btnImport = document.getElementById("btn-import");
  const importFileInput = document.getElementById("import-file");
  const syncStatus = document.getElementById("sync-status");

  if (phaseButtons.length && phasePanels.length) {
    phaseButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const phase = button.getAttribute("data-phase");
        phaseButtons.forEach((btn) => {
          const isActive = btn === button;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        phasePanels.forEach((panel) => {
          const match = panel.getAttribute("data-phase-panel") === phase;
          panel.classList.toggle("is-active", match);
        });
      });
    });
  }

  let state = defaultState();
  hydrateSettingsFromState();
  renderState();
  wireStateEvents();

  function defaultState() {
    return {
      version: 1,
      editor: "",
      teamKey: "sukhothai-mvp",
      endpoint: "",
      updatedAt: "",
      phases: {
        m1: { status: "todo", note: "" },
        m2: { status: "todo", note: "" },
        m3: { status: "todo", note: "" },
        m4: { status: "todo", note: "" },
        m5: { status: "todo", note: "" },
      },
    };
  }

  function persistState(reason) {
    state.updatedAt = new Date().toISOString();
    setSyncStatus(`อัปเดตในหน้านี้แล้ว (${reason}) • ยังไม่บันทึกทีม`);
  }

  function hydrateSettingsFromState() {
    if (editorNameInput) editorNameInput.value = state.editor || "";
    if (teamKeyInput) teamKeyInput.value = state.teamKey || "sukhothai-mvp";
    if (endpointInput) endpointInput.value = state.endpoint || "";
  }

  function renderState() {
    phaseStatusInputs.forEach((input) => {
      const phase = input.getAttribute("data-phase-status");
      if (!phase || !state.phases[phase]) return;
      input.value = state.phases[phase].status || "todo";
    });

    phaseNoteInputs.forEach((input) => {
      const phase = input.getAttribute("data-phase-note");
      if (!phase || !state.phases[phase]) return;
      input.value = state.phases[phase].note || "";
    });

    phaseStateBadges.forEach((badge) => {
      const phase = badge.getAttribute("data-phase-state");
      if (!phase || !state.phases[phase]) return;
      badge.textContent = state.phases[phase].status || "todo";
    });
  }

  function wireStateEvents() {
    if (editorNameInput) {
      editorNameInput.addEventListener("input", () => {
        state.editor = editorNameInput.value.trim();
        persistState("editor");
      });
    }

    if (teamKeyInput) {
      teamKeyInput.addEventListener("input", () => {
        state.teamKey = teamKeyInput.value.trim() || "sukhothai-mvp";
        persistState("team key");
      });
    }

    if (endpointInput) {
      endpointInput.addEventListener("input", () => {
        state.endpoint = endpointInput.value.trim();
        persistState("endpoint");
      });
    }

    phaseStatusInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const phase = input.getAttribute("data-phase-status");
        if (!phase || !state.phases[phase]) return;
        state.phases[phase].status = input.value;
        renderState();
        persistState(`${phase} status`);
      });
    });

    phaseNoteInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const phase = input.getAttribute("data-phase-note");
        if (!phase || !state.phases[phase]) return;
        state.phases[phase].note = input.value.trim();
        persistState(`${phase} note`);
      });
    });

    if (btnExport) {
      btnExport.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sukhothai-mvp-progress-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (btnImport && importFileInput) {
      btnImport.addEventListener("click", () => importFileInput.click());
      importFileInput.addEventListener("change", async () => {
        const file = importFileInput.files && importFileInput.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = JSON.parse(text);
          state = {
            ...defaultState(),
            ...imported,
            phases: { ...defaultState().phases, ...(imported.phases || {}) },
          };
          hydrateSettingsFromState();
          renderState();
          setSyncStatus("นำเข้าไฟล์สำเร็จ • กด Save Team เพื่ออัปโหลดขึ้นไฟล์กลาง");
        } catch (_) {
          setSyncStatus("นำเข้าไฟล์ไม่สำเร็จ (รูปแบบ JSON ไม่ถูกต้อง)");
        } finally {
          importFileInput.value = "";
        }
      });
    }

    if (btnSaveTeam) {
      btnSaveTeam.addEventListener("click", saveToTeam);
    }

    if (btnLoadTeam) {
      btnLoadTeam.addEventListener("click", loadFromTeam);
    }
  }

  async function saveToTeam() {
    const endpoint = (state.endpoint || "").trim();
    const key = (state.teamKey || "").trim();
    if (!endpoint || !key) {
      setSyncStatus("กรอก Team Key และ Sync Endpoint ก่อน");
      return;
    }
    setSyncStatus("กำลังบันทึกขึ้น Team Sync...");
    try {
      const form = new URLSearchParams();
      form.set("action", "save");
      form.set("key", key);
      form.set("editor", state.editor || "unknown");
      form.set("data", JSON.stringify(state));

      const res = await fetch(endpoint, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await safeJsonFromText(res);
      setSyncStatus(`บันทึกทีมสำเร็จ${data && data.updatedAt ? ` • ${prettyTime(data.updatedAt)}` : ""}`);
    } catch (err) {
      setSyncStatus(`บันทึกทีมไม่สำเร็จ (${err.message})`);
    }
  }

  async function loadFromTeam() {
    const endpoint = (state.endpoint || "").trim();
    const key = (state.teamKey || "").trim();
    if (!endpoint || !key) {
      setSyncStatus("กรอก Team Key และ Sync Endpoint ก่อน");
      return;
    }
    setSyncStatus("กำลังโหลดข้อมูลจาก Team Sync...");
    try {
      const form = new URLSearchParams();
      form.set("action", "load");
      form.set("key", key);

      const res = await fetch(endpoint, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await safeJsonFromText(res);
      if (!payload || !payload.data) {
        setSyncStatus("ยังไม่มีข้อมูลบน Team Sync สำหรับ key นี้");
        return;
      }
      const remote = payload.data;
      state = {
        ...defaultState(),
        ...remote,
        endpoint: state.endpoint,
        teamKey: state.teamKey,
        editor: state.editor || remote.editor || "",
        phases: { ...defaultState().phases, ...(remote.phases || {}) },
      };
      hydrateSettingsFromState();
      renderState();
      setSyncStatus(`โหลดข้อมูลทีมสำเร็จ${payload.updatedAt ? ` • ${prettyTime(payload.updatedAt)}` : ""}`);
    } catch (err) {
      setSyncStatus(`โหลดข้อมูลทีมไม่สำเร็จ (${err.message})`);
    }
  }

  async function safeJsonFromText(response) {
    try {
      const text = await response.text();
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  function setSyncStatus(text) {
    if (syncStatus) syncStatus.textContent = text;
  }

  function prettyTime(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch (_) {
      return iso;
    }
  }
})();
