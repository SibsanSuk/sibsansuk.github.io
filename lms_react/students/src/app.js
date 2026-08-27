(function createStudentDashboard(global) {
  "use strict";

  const React = global.React;
  const ReactDOM = global.ReactDOM;
  const API = global.StudentAPI;
  if (!React || !ReactDOM || !API) {
    throw new Error("Student Dashboard dependencies are not ready");
  }

  const h = React.createElement;
  const { useCallback, useEffect, useMemo, useRef, useState } = React;
  const TASK_LABELS = {
    course: "โครงสร้างบทเรียน",
    bookroll: "ความคืบหน้า BookRoll",
    video: "ความคืบหน้าวิดีโอ",
    videoHeatmap: "ช่วงเวลาการดูวิดีโอ",
    chatbot: "ผลการทำแบบฝึกหัด",
    vk: "ผลการใช้งาน Virtual KidBright"
  };
  const TOOL_META = {
    bookroll: { label: "การอ่าน", color: "#f59e0b", soft: "#fef3c7", icon: "▤" },
    video: { label: "วิดีโอ", color: "#ef4444", soft: "#fee2e2", icon: "▶" },
    chatbot: { label: "แบบฝึกหัด", color: "#4f46e5", soft: "#e0e7ff", icon: "✓" },
    vk: { label: "Virtual KidBright", color: "#7c3aed", soft: "#ede9fe", icon: "VK" },
    profile: { label: "แบบประเมิน", color: "#0d9488", soft: "#ccfbf1", icon: "●" }
  };
  const TOOL_SUMMARY_COPY = {
    bookroll: {
      unit: "เรื่อง",
      done: "อ่านจบ",
      doing: "กำลังอ่าน",
      todo: "ยังไม่ได้อ่าน"
    },
    video: {
      unit: "วิดีโอ",
      done: "ดูจบ",
      doing: "กำลังดู",
      todo: "ยังไม่ได้ดู"
    },
    chatbot: {
      unit: "แบบฝึกหัด",
      done: "ทำครบ",
      doing: "กำลังทำ",
      todo: "ยังไม่ได้ทำ"
    },
    vk: {
      unit: "บท",
      done: "ทำสำเร็จ",
      doing: "กำลังทำ",
      todo: "ยังไม่ได้ทำ"
    }
  };

  const formatNumber = (value, digits = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(number);
  };
  const formatDuration = (seconds) => {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return "—";
    const total = Math.max(0, Math.round(value));
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return minutes ? `${minutes}:${String(remainder).padStart(2, "0")} นาที` : `${remainder} วินาที`;
  };
  const learnerName = (profile) => {
    const resolved = profile && typeof profile === "object" ? profile : {};
    return resolved.name
      || [resolved.given_name, resolved.family_name].filter(Boolean).join(" ")
      || resolved.preferred_username
      || resolved.email
      || "ผู้เรียน";
  };
  const statusFor = (progress, hasData = true) => {
    if (!hasData) return { label: "ยังไม่มีข้อมูล", tone: "muted" };
    if (progress >= 100) return { label: "สำเร็จแล้ว", tone: "success" };
    if (progress > 0) return { label: "กำลังเรียน", tone: "progress" };
    return { label: "ยังไม่เริ่ม", tone: "muted" };
  };

  function ProgressRing({ value, size = "large" }) {
    const progress = Math.round(API.clamp(value));
    return h("div", {
      className: `progress-ring ${size}`,
      style: { "--progress": `${progress * 3.6}deg` },
      role: "img",
      "aria-label": `ความคืบหน้า ${progress}%`
    }, h("div", { className: "progress-ring-inner" },
      h("strong", null, `${progress}%`),
      size === "large" ? h("span", null, "ความคืบหน้า") : null
    ));
  }

  function DonutChart({ summary, color, labels }) {
    const chartRef = useRef(null);
    useEffect(() => {
      if (!chartRef.current || !global.echarts) return undefined;
      const chart = global.echarts.init(chartRef.current);
      const total = Math.max(1, Number(summary?.total) || 0);
      chart.setOption({
        animationDuration: 500,
        tooltip: { trigger: "item" },
        series: [{
          type: "pie",
          radius: ["65%", "88%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          label: { show: false },
          data: [
            { name: labels.done, value: summary?.done || 0, itemStyle: { color } },
            { name: labels.doing, value: summary?.doing || 0, itemStyle: { color: "#f59e0b" } },
            { name: labels.todo, value: summary?.todo || (summary?.total ? 0 : total), itemStyle: { color: "#e2e8f0" } }
          ]
        }],
        graphic: [{
          type: "text",
          left: "center",
          top: "43%",
          style: {
            text: `${Math.round(summary?.average || 0)}%`,
            fill: "#0f172a",
            font: "700 18px Inter, sans-serif",
            textAlign: "center"
          }
        }]
      });
      const resize = () => chart.resize();
      global.addEventListener("resize", resize);
      return () => {
        global.removeEventListener("resize", resize);
        chart.dispose();
      };
    }, [summary, color, labels]);
    return h("div", { className: "donut-chart", ref: chartRef });
  }

  function Header({ auth, profile, courseTitle, loading, onLogin, onLogout, onReload }) {
    const loggedIn = Boolean(API.authSub(auth));
    return h("header", { className: "dashboard-header" },
      h("div", { className: "header-copy" },
        h("span", { className: "eyebrow" }, "STUDENT DASHBOARD"),
        h("h1", null, "วิเคราะห์การเรียนรู้"),
        h("div", { className: "header-meta" },
          h("span", null, "รายวิชา: ", h("strong", null, courseTitle || "—")),
          h("span", null, "ผู้เรียน: ", h("strong", null, loggedIn ? learnerName(profile) : "ยังไม่ได้เข้าสู่ระบบ"))
        )
      ),
      h("div", { className: "header-actions" },
        loggedIn
          ? h(React.Fragment, null,
              h("button", {
                className: "button secondary",
                type: "button",
                disabled: loading,
                onClick: onReload
              }, "โหลดใหม่"),
              h("button", { className: "button danger", type: "button", onClick: onLogout }, "ออกจากระบบ")
            )
          : h("button", { className: "button primary", type: "button", onClick: onLogin }, "เข้าสู่ระบบ")
      )
    );
  }

  function OverallCard({ model }) {
    const overall = model?.overall || {};
    return h("section", { className: "overall-card" },
      h("div", { className: "overall-copy" },
        h("span", { className: "section-kicker" }, "ภาพรวมรายวิชา"),
        h("h2", null, "ความคืบหน้าทั้งหมด"),
        h("p", null, overall.total
          ? `ติดตาม ${overall.total} กิจกรรม จากเครื่องมือการเรียนรู้ทั้งหมด`
          : "ยังไม่พบกิจกรรมที่ติดตามความคืบหน้าในรายวิชานี้"),
        h("div", { className: "overall-stats" },
          h("div", null, h("strong", null, formatNumber(overall.done)), h("span", null, "สำเร็จแล้ว")),
          h("div", null, h("strong", null, formatNumber(overall.doing)), h("span", null, "กำลังเรียน")),
          h("div", null, h("strong", null, formatNumber(overall.todo)), h("span", null, "ยังไม่เริ่ม"))
        )
      ),
      h(ProgressRing, { value: overall.average })
    );
  }

  function ToolSummaryCard({ type, summary }) {
    const meta = TOOL_META[type];
    const copy = TOOL_SUMMARY_COPY[type];
    return h("article", { className: "summary-card" },
      h("div", { className: "summary-head" },
        h("span", {
          className: "tool-icon",
          style: { background: meta.soft, color: meta.color }
        }, meta.icon),
        h("div", null,
          h("h3", null, meta.label),
          h("p", null, `ใช้งานเฉลี่ย ${Math.round(summary.average)}% จาก ${summary.total} ${copy.unit}`)
        )
      ),
      h(DonutChart, { summary, color: meta.color, labels: copy }),
      h("div", { className: "summary-legend" },
        h("span", null, h("i", { style: { background: meta.color } }), `${copy.done} ${summary.done}`),
        h("span", null, h("i", { className: "doing" }), `${copy.doing} ${summary.doing}`),
        h("span", null, h("i", { className: "todo" }), `${copy.todo} ${summary.todo}`)
      )
    );
  }

  function DashboardSummary({ model, summaryCards }) {
    return h("section", { className: "dashboard-summary", "aria-label": "สรุปผลการเรียนรู้" },
      h(OverallCard, { model }),
      summaryCards.length ? h(React.Fragment, null,
        h("div", { className: "tool-summary-heading" },
          h("div", null,
            h("h2", null, "สรุปการใช้เครื่องมือ"),
            h("p", null, "ภาพรวมการอ่าน วิดีโอ แบบฝึกหัด และ Virtual KidBright")
          )
        ),
        h("section", { className: "summary-grid" },
          summaryCards.map(([type, summary]) => h(ToolSummaryCard, {
            type,
            summary,
            key: type
          }))
        )
      ) : null,
      h(QuizOverview, { overview: model.quizOverview, entries: model.entries.chatbot }),
      h(VkOverview, { overview: model.vkOverview })
    );
  }

  function QuizOverview({ overview, entries }) {
    if (!overview && !entries?.length) return null;
    const metrics = [
      ["คะแนนเฉลี่ย", overview?.average, "%"],
      ["คะแนนดีที่สุด", overview?.best, "%"],
      ["ก่อนเรียน", overview?.pretest, "%"],
      ["หลังเรียน", overview?.posttest, "%"],
      ["พัฒนาการ", overview?.improvement, "%"],
      ["จำนวนครั้งที่ทำ", overview?.attempts, " ครั้ง"]
    ];
    return h("section", { className: "panel quiz-overview" },
      h("div", { className: "section-heading" },
        h("div", null,
          h("h2", null, "ผลการทำแบบฝึกหัด")
        ),
        overview ? h("span", { className: "completion-badge" }, `ทำครบ ${formatNumber(overview.completion)}%`) : null
      ),
      h("div", { className: "metric-grid" },
        metrics.map(([label, value, suffix]) => h("div", { className: "metric", key: label },
          h("span", null, label),
          h("strong", null, Number.isFinite(Number(value)) ? `${formatNumber(value, label === "พัฒนาการ" ? 1 : 0)}${suffix}` : "—")
        ))
      ),
      entries?.length ? h("div", { className: "quiz-list" },
        entries.map((quiz) => h("article", { className: "quiz-card", key: quiz.id || quiz.title },
          h("div", { className: "quiz-card-head" },
            h("div", null,
              h("span", null, quiz.role === "pretest" ? "ก่อนเรียน" : quiz.role === "posttest" ? "หลังเรียน" : "แบบฝึกหัด"),
              h("h3", null, quiz.title)
            ),
            h("strong", null, `${formatNumber(quiz.progress)}%`)
          ),
          h("div", { className: "quiz-card-stats" },
            h("span", null, `คะแนนดีที่สุด ${Number.isFinite(quiz.score) && Number.isFinite(quiz.total) ? `${formatNumber(quiz.score)}/${formatNumber(quiz.total)}` : `${formatNumber(quiz.progress)}%`}`),
            Number.isFinite(quiz.latest) ? h("span", null, `ล่าสุด ${formatNumber(quiz.latest)}%`) : null,
            Number.isFinite(quiz.attempts) ? h("span", null, `ทำ ${formatNumber(quiz.attempts)} ครั้ง`) : null,
            Number.isFinite(quiz.seconds) ? h("span", null, `เฉลี่ย ${formatDuration(quiz.seconds)}`) : null
          ),
          quiz.peer ? h("small", null, `เปอร์เซ็นไทล์ ${formatNumber(quiz.peer.learner_percentile, 1)} • ค่าเฉลี่ยกลุ่ม ${formatNumber(quiz.peer.cohort_avg_score_pct, 1)}%`) : null
        ))
      ) : null,
      overview?.peer ? h("div", { className: "peer-card" },
        h("span", null, "เทียบกับผู้เรียนในกลุ่ม"),
        h("strong", null, `เปอร์เซ็นไทล์ ${formatNumber(overview.peer.learner_percentile, 1)}`),
        h("small", null, `ค่าเฉลี่ยของคุณ ${formatNumber(overview.peer.learner_avg_score_pct, 1)}% • ค่าเฉลี่ยกลุ่ม ${formatNumber(overview.peer.cohort_avg_score_pct, 1)}%`)
      ) : null,
      overview?.mastery?.length ? h("div", { className: "mastery-list" },
        overview.mastery.map((item) => h("div", { className: "mastery-item", key: item.skill },
          h("span", null, item.skill_label || item.skill),
          h("div", { className: "mastery-track" },
            h("i", { style: { width: `${API.clamp((Number(item.p_mastery) || 0) * 100)}%` } })
          ),
          h("strong", null, item.mastery_level || `${formatNumber((Number(item.p_mastery) || 0) * 100)}%`)
        ))
      ) : null
    );
  }

  function VkTimeChart({ overview }) {
    const chartRef = useRef(null);
    useEffect(() => {
      if (!chartRef.current || !global.echarts || !overview?.chapters?.length) return undefined;
      const chart = global.echarts.init(chartRef.current);
      const metric = (chapter, name) => Number(chapter?.metrics?.[name]) || 0;
      chart.setOption({
        animationDuration: 500,
        color: ["#7c3aed", "#14b8a6", "#f59e0b"],
        tooltip: { trigger: "axis" },
        legend: {
          bottom: 0,
          textStyle: { color: "#64748b", fontSize: 10 }
        },
        grid: { left: 42, right: 18, top: 20, bottom: 55 },
        xAxis: {
          type: "category",
          data: overview.chapters.map((chapter) => `บท ${chapter.chapterNo}`),
          axisLabel: { color: "#64748b" },
          axisLine: { lineStyle: { color: "#cbd5e1" } }
        },
        yAxis: {
          type: "value",
          name: "นาที",
          nameTextStyle: { color: "#94a3b8" },
          axisLabel: { color: "#64748b" },
          splitLine: { lineStyle: { color: "#eef2f7" } }
        },
        series: [
          { name: "เวลารวม", type: "bar", barMaxWidth: 30, data: overview.chapters.map((chapter) => metric(chapter, "Time used")) },
          { name: "เขียนโปรแกรม", type: "bar", barMaxWidth: 30, data: overview.chapters.map((chapter) => metric(chapter, "Coding time")) },
          { name: "ใช้งาน VK", type: "bar", barMaxWidth: 30, data: overview.chapters.map((chapter) => metric(chapter, "VK time")) }
        ]
      });
      const resize = () => chart.resize();
      global.addEventListener("resize", resize);
      return () => {
        global.removeEventListener("resize", resize);
        chart.dispose();
      };
    }, [overview]);
    return h("div", {
      className: "vk-time-chart",
      ref: chartRef,
      role: "img",
      "aria-label": "กราฟเวลาใช้งาน Virtual KidBright แยกตามบท"
    });
  }

  const vkResultTone = (result) => {
    const value = String(result || "").trim().toLowerCase();
    if (["ok", "good", "excellent", "pass"].includes(value)) return "success";
    if (["revise", "improve", "warning"].includes(value)) return "warning";
    return "neutral";
  };

  function VkOverview({ overview }) {
    if (!overview) return null;
    const metrics = [
      ["ความสำเร็จ", overview.progress, "%"],
      ["เวลารวม", overview.metrics.timeUsed, " นาที"],
      ["เวลาเขียนโปรแกรม", overview.metrics.codingTime, " นาที"],
      ["เวลาใช้ VK", overview.metrics.vkTime, " นาที"],
      ["สลับ IDE/VK", overview.metrics.switchCount, " ครั้ง"],
      ["คะแนน Coding", overview.metrics.codingMark, "%"]
    ];
    return h("section", { className: "panel vk-overview" },
      h("div", { className: "section-heading" },
        h("div", null,
          h("span", { className: "section-kicker" }, "VIRTUAL KIDBRIGHT"),
          h("h2", null, "ผลการใช้งาน Virtual KidBright")
        ),
        overview.done.max > 0
          ? h("span", { className: "completion-badge vk" }, `สำเร็จ ${formatNumber(overview.done.value)} / ${formatNumber(overview.done.max)} บท`)
          : null
      ),
      h("div", { className: "vk-metric-grid" },
        metrics.map(([label, value, suffix]) => h("div", { className: "vk-metric", key: label },
          h("span", null, label),
          h("strong", null, Number.isFinite(Number(value)) ? `${formatNumber(value, label.includes("คะแนน") ? 1 : 0)}${suffix}` : "—")
        ))
      ),
      overview.chapters.length ? h("div", { className: "vk-analysis-grid" },
        h("div", { className: "vk-chart-card" },
          h("h3", null, "เวลาใช้งานแยกตามบท"),
          h(VkTimeChart, { overview })
        ),
        h("div", { className: "vk-chapter-list" },
          overview.chapters.map((chapter) => h("article", { className: "vk-chapter", key: chapter.chapterNo },
            h("div", null,
              h("span", null, `บท ${formatNumber(chapter.chapterNo)}`),
              h("h3", null, chapter.title)
            ),
            Number.isFinite(chapter.progress)
              ? h("strong", { className: chapter.progress >= 100 ? "done" : "" }, `${formatNumber(chapter.progress)}%`)
              : h("strong", null, "มีข้อมูล"),
            h("small", null,
              `เวลารวม ${formatNumber(chapter.metrics["Time used"])} นาที`,
              " • ",
              `เวลา VK ${formatNumber(chapter.metrics["VK time"])} นาที`
            )
          ))
        )
      ) : null,
      overview.skills.length ? h("div", { className: "vk-skills" },
        h("div", { className: "vk-skills-heading" },
          h("h3", null, "คำวิเคราะห์ทักษะ"),
          h("p", null, "เลือกแต่ละหัวข้อเพื่อดูคำแนะนำจากระบบ VK")
        ),
        h("div", { className: "vk-skill-grid" },
          overview.skills.map((skill) => h("details", { className: "vk-skill", key: skill.key },
            h("summary", null,
              h("span", null, skill.label),
              skill.result ? h("strong", { className: `vk-result ${vkResultTone(skill.result)}` }, skill.result) : null
            ),
            h("div", { className: "vk-insights" },
              skill.insights.map((insight) => h("div", { key: `${skill.key}-${insight.label}` },
                h("strong", null, insight.label),
                h("p", null, insight.text)
              ))
            )
          ))
        )
      ) : null
    );
  }

  function ToolRow({ tool }) {
    const meta = TOOL_META[tool.type] || TOOL_META.profile;
    const status = tool.type === "profile"
      ? { label: "กิจกรรมประกอบ", tone: "muted" }
      : statusFor(tool.progress, tool.hasData);
    let detail = "";
    if (tool.type === "bookroll" && tool.detail) {
      detail = `อ่าน ${formatNumber(tool.detail.read)} / ${formatNumber(tool.detail.total)} หน้า`;
    } else if (tool.type === "chatbot" && tool.detail) {
      const score = Number.isFinite(tool.detail.score) && Number.isFinite(tool.detail.total)
        ? `${formatNumber(tool.detail.score)} / ${formatNumber(tool.detail.total)} คะแนน`
        : `คะแนนดีที่สุด ${formatNumber(tool.detail.progress)}%`;
      const time = Number.isFinite(tool.detail.seconds) ? ` • ${formatDuration(tool.detail.seconds)}` : "";
      detail = `${score}${time}`;
    } else if (tool.type === "video" && tool.hasData) {
      detail = `ดูแล้ว ${formatNumber(tool.progress)}%`;
    } else if (tool.type === "vk" && tool.detail) {
      detail = `ทำสำเร็จ ${formatNumber(tool.detail.value)} / ${formatNumber(tool.detail.max)} กิจกรรม`;
    } else if (tool.type === "profile") {
      detail = "กิจกรรมประกอบการเรียนรู้";
    }
    return h("div", { className: "tool-row" },
      h("span", {
        className: "tool-icon small",
        style: { background: meta.soft, color: meta.color }
      }, meta.icon),
      h("div", { className: "tool-main" },
        h("div", { className: "tool-title-line" },
          h("strong", null, tool.title || meta.label),
          h("span", { className: `status ${status.tone}` }, status.label)
        ),
        detail ? h("small", null, detail) : null,
        ["bookroll", "video", "chatbot", "vk"].includes(tool.type)
          ? h("div", { className: "progress-track" },
              h("i", {
                style: {
                  width: `${tool.progress}%`,
                  background: tool.hasData ? meta.color : "#cbd5e1"
                }
              })
            )
          : null
      ),
      ["bookroll", "video", "chatbot", "vk"].includes(tool.type)
        ? h("strong", { className: "tool-progress" }, `${Math.round(tool.progress)}%`)
        : null
    );
  }

  function ChapterCard({ chapter, open, onToggle }) {
    return h("article", { className: `chapter-card${open ? " open" : ""}` },
      h("button", {
        type: "button",
        className: "chapter-toggle",
        onClick: onToggle,
        "aria-expanded": open
      },
      h("div", { className: "chapter-copy" },
        h("span", { className: "chapter-index" }, chapter.title),
        h("small", null, `${chapter.activities.length} หัวข้อการเรียนรู้`)
      ),
      h("div", { className: "chapter-progress" },
        h("strong", null, `${Math.round(chapter.progress)}%`),
        h("span", { "aria-hidden": "true" }, open ? "−" : "+")
      )),
      open ? h("div", { className: "chapter-body" },
        chapter.activities.length
          ? chapter.activities.map((activity) => h("section", { className: "activity", key: activity.id },
              h("div", { className: "activity-heading" },
                h("div", null,
                  h("h4", null, activity.title),
                  h("span", null, `${activity.tools.length} เครื่องมือ`)
                ),
                h("strong", null, `${Math.round(activity.progress)}%`)
              ),
              h("div", { className: "activity-tools" },
                activity.tools.map((tool) => h(ToolRow, { tool, key: `${activity.id}-${tool.id}-${tool.type}` }))
              )
            ))
          : h("p", { className: "empty-copy" }, "ไม่พบกิจกรรมที่ติดตามผลในบทนี้")
      ) : null
    );
  }

  function LearningTopics({ chapters }) {
    const [openIds, setOpenIds] = useState(() => new Set(chapters?.[0]?.id ? [chapters[0].id] : []));
    useEffect(() => {
      if (!openIds.size && chapters?.[0]?.id) setOpenIds(new Set([chapters[0].id]));
    }, [chapters, openIds.size]);
    const toggle = (id) => {
      setOpenIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };
    return h("section", { className: "topics-section" },
      h("div", { className: "section-heading" },
        h("div", null,
          h("h2", null, "หัวข้อการเรียนรู้")
        ),
        h("span", { className: "section-count" }, `${chapters.length} บท`)
      ),
      h("div", { className: "chapter-list" },
        chapters.map((chapter) => h(ChapterCard, {
          chapter,
          open: openIds.has(chapter.id),
          onToggle: () => toggle(chapter.id),
          key: chapter.id
        }))
      )
    );
  }

  function TaskOverlay({ visible, tasks, onClose }) {
    if (!visible) return null;
    const resolved = tasks.length && tasks.every((task) => ["success", "error", "skipped"].includes(task.state));
    return h("div", { className: "overlay", role: "status", "aria-live": "polite" },
      h("div", { className: "overlay-card" },
        h("div", { className: "overlay-head" },
          h("div", null,
            h("h2", null, resolved ? "อัปเดตข้อมูลเสร็จแล้ว" : "กำลังอัปเดตข้อมูล"),
            h("p", null, "กำลังตรวจสอบข้อมูลการเรียนรู้จากแต่ละบริการ")
          ),
          resolved ? h("button", { type: "button", className: "icon-button", onClick: onClose }, "×") : h("span", { className: "spinner" })
        ),
        h("div", { className: "task-list" },
          tasks.map((task) => h("div", { className: `task ${task.state}`, key: task.id },
            h("span", { className: "task-dot" }),
            h("div", null,
              h("strong", null, TASK_LABELS[task.id] || task.id),
              task.message ? h("small", null, task.message) : null
            ),
            h("span", { className: "task-state" }, ({
              loading: "กำลังโหลด",
              success: "พร้อม",
              error: "มีปัญหา",
              skipped: "ข้าม"
            })[task.state] || "รอ")
          ))
        )
      )
    );
  }

  function DebugPanel({ logs }) {
    if (!API.debug) return null;
    return h("details", { className: "debug-panel" },
      h("summary", null, `API requests (${logs.length})`),
      h("div", { className: "debug-list" },
        logs.map((entry) => h("details", { className: `debug-entry ${entry.state}`, key: entry.id },
          h("summary", null,
            h("span", null, entry.label),
            h("span", null, `${entry.status || "—"} • ${entry.durationMs ?? 0} ms`)
          ),
          h("code", null, `${entry.method} ${entry.url}`),
          entry.error ? h("p", { className: "error-text" }, entry.error) : null,
          entry.sample !== undefined ? h("pre", null, JSON.stringify(entry.sample, null, 2)) : null
        ))
      )
    );
  }

  function MissingCourse() {
    const [value, setValue] = useState("");
    const submit = (event) => {
      event.preventDefault();
      const courseId = value.trim();
      if (!courseId) return;
      const url = new URL(global.location.href);
      url.searchParams.set("courseid", courseId);
      global.location.href = url.toString();
    };
    return h("main", { className: "center-screen" },
      h("form", { className: "message-card", onSubmit: submit },
        h("span", { className: "eyebrow" }, "STUDENT DASHBOARD"),
        h("h1", null, "ระบุรายวิชาที่ต้องการดู"),
        h("p", null, "ใส่ Course ID เพื่อเปิด Dashboard ของผู้เรียน"),
        h("input", {
          value,
          onChange: (event) => setValue(event.target.value),
          placeholder: "course-v1:ORG+COURSE+RUN",
          "aria-label": "Course ID"
        }),
        h("button", { className: "button primary", type: "submit" }, "เปิด Dashboard")
      )
    );
  }

  function App() {
    const [auth, setAuth] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [overlayOpen, setOverlayOpen] = useState(true);
    const courseId = API.config.courseId;

    useEffect(() => API.manager.subscribe(setLogs), []);
    useEffect(() => {
      const finished = tasks.length
        && tasks.every((task) => ["success", "skipped"].includes(task.state));
      if (!loading && finished) setOverlayOpen(false);
    }, [loading, tasks]);

    const updateTask = useCallback((nextTask) => {
      setTasks((current) => {
        const exists = current.some((task) => task.id === nextTask.id);
        return exists
          ? current.map((task) => task.id === nextTask.id ? nextTask : task)
          : [...current, nextTask];
      });
    }, []);

    const load = useCallback(async (currentAuth) => {
      if (!courseId) {
        setLoading(false);
        setOverlayOpen(false);
        return;
      }
      setError("");
      setTasks([]);
      setLoading(true);
      setOverlayOpen(true);
      API.manager.clear();
      try {
        const result = await API.loadDashboard({
          courseId,
          auth: currentAuth,
          onTask: updateTask
        });
        setDashboard(result);
        if (result.errors.length) {
          setError(result.errors.map((item) => `${TASK_LABELS[item.id] || item.id}: ${item.message}`).join(" • "));
        }
      } catch (loadError) {
        setError(loadError?.message || String(loadError));
        if (loadError?.sessionExpired) setAuth(null);
      } finally {
        setLoading(false);
      }
    }, [courseId, updateTask]);

    useEffect(() => {
      let active = true;
      (async () => {
        try {
          const currentAuth = await API.initializeAuth();
          if (!active) return;
          setAuth(currentAuth);
          if (!currentAuth && API.config.autoLogin && courseId) {
            await API.startLogin(courseId);
            return;
          }
          await load(currentAuth);
        } catch (initError) {
          if (!active) return;
          setError(initError?.message || String(initError));
          setLoading(false);
          setOverlayOpen(false);
        }
      })();
      return () => { active = false; };
    }, [courseId, load]);

    const profile = dashboard?.profile || API.authProfile(auth);
    const model = dashboard?.model;
    const summaryCards = useMemo(() => model ? [
      ["bookroll", model.summaries.bookroll],
      ["video", model.summaries.video],
      ["chatbot", model.summaries.chatbot],
      ["vk", model.summaries.vk]
    ].filter(([, summary]) => summary.total > 0) : [], [model]);

    if (!courseId) return h(MissingCourse);

    return h(React.Fragment, null,
      h("div", { className: "app-shell" },
        h(Header, {
          auth,
          profile,
          courseTitle: model?.course?.title,
          loading,
          onLogin: () => API.startLogin(courseId).catch((loginError) => setError(loginError.message)),
          onLogout: API.logout,
          onReload: () => load(auth)
        }),
        h("main", { className: "dashboard-main" },
          error ? h("div", { className: "error-banner", role: "alert" },
            h("strong", null, "โหลดข้อมูลบางส่วนไม่สำเร็จ"),
            h("span", null, error),
            h("button", { type: "button", onClick: () => load(auth) }, "ลองใหม่")
          ) : null,
          model ? h(React.Fragment, null,
            h(DashboardSummary, { model, summaryCards }),
            h(LearningTopics, { chapters: model.course.chapters })
          ) : !loading ? h("div", { className: "empty-state" }, "ยังไม่มีข้อมูลสำหรับแสดงผล") : null,
          h(DebugPanel, { logs })
        )
      ),
      h(TaskOverlay, {
        visible: overlayOpen && (loading || tasks.length > 0),
        tasks,
        onClose: () => setOverlayOpen(false)
      })
    );
  }

  ReactDOM.createRoot(document.getElementById("app")).render(h(App));
})(window);
