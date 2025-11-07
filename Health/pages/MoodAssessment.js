// pages/MoodAssessment.js
const h = window.React.createElement;
const { useEffect, useMemo, useState, useCallback, useRef } = window.React;
const { useNavigate } = window.ReactRouterDOM || {};

const FORM_DATA_URL = "./apidata/mood-assessment-form.json";
const ADVICE_DATA_URL = "./apidata/mood-advice.json";

export function MoodAssessment({ data }) {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  const hasPropData = !!(data && (data.items?.length || data.options?.length));
  const [remoteForm, setRemoteForm] = useState(null);
  const [remoteAdvice, setRemoteAdvice] = useState(null);
  const [loadState, setLoadState] = useState({ status: "idle", error: null });

  useEffect(() => {
    if (hasPropData) return;
    if (typeof fetch !== "function") {
      setLoadState({ status: "error", error: "บราวเซอร์นี้ไม่รองรับการโหลดข้อมูล" });
      return;
    }
    let cancelled = false;
    setLoadState({ status: "loading", error: null });
    Promise.all([
      fetch(FORM_DATA_URL).then((res) => {
        if (!res.ok) throw new Error("โหลดแบบประเมินไม่สำเร็จ");
        return res.json();
      }),
      fetch(ADVICE_DATA_URL).then((res) => {
        if (!res.ok) throw new Error("โหลดคำแนะนำไม่สำเร็จ");
        return res.json();
      }).catch(() => null)
    ])
      .then(([formJson, adviceJson]) => {
        if (cancelled) return;
        setRemoteForm(formJson || null);
        setRemoteAdvice(adviceJson || null);
        setLoadState({ status: "success", error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setRemoteForm(null);
        setRemoteAdvice(null);
        setLoadState({ status: "error", error: err?.message || "โหลดข้อมูลไม่สำเร็จ" });
      });
    return () => { cancelled = true; };
  }, [hasPropData]);

  const form = hasPropData ? data : remoteForm;
  const adviceGuide = (data && data.advice) ? data.advice : remoteAdvice;

  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState("");
  const [resultAdvice, setResultAdvice] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef();

  useEffect(() => {
    if (!form) return;
    if (typeof document !== "undefined") {
      document.title = form.title || "ประเมินอารมณ์";
    }
  }, [form]);

  useEffect(() => {
    setAnswers({});
    setResultAdvice(null);
  }, [form]);

  const back = useCallback((e) => {
    e?.preventDefault?.();
    if (navigate) navigate(-1);
    else history.back();
  }, [navigate]);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback((text, type = "info") => {
    clearToast();
    setToast({ text, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, [clearToast]);

  useEffect(() => () => clearToast(), [clearToast]);

  const setAnswer = useCallback((id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: Number(value) }));
    setResultAdvice(null);
  }, []);

  const total = useMemo(() => {
    return (form?.items || []).reduce((sum, it) => sum + (Number(answers[it.id]) || 0), 0);
  }, [answers, form]);

  const completed = (form?.items || []).every((it) => answers[it.id] !== undefined);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!completed) {
      showToast("กรุณาตอบให้ครบทุกข้อก่อนบันทึก", "error");
      return;
    }
    if (!form) {
      showToast("ยังไม่มีข้อมูลแบบประเมิน", "error");
      return;
    }
    const payload = {
      type: "mood-assessment",
      at: new Date().toISOString(),
      items: (form.items || []).map((it) => ({
        id: it.id,
        text: it.text,
        score: Number(answers[it.id])
      })),
      total,
      note: note?.trim() || "",
      version: "1.0-mood"
    };
    console.log("Mood assessment payload:", payload);

    const overallAdvice = (adviceGuide?.overall || []).find((rule) => {
      const min = Number(rule.min ?? 0);
      const max = Number(rule.max ?? Infinity);
      return total >= min && total <= max;
    }) || null;

    const perQuestionAdvice = (form.items || []).map((item) => {
      const opts = (item.options && item.options.length) ? item.options : (form.options || []);
      if (!opts.length) return null;
      const selected = Number(answers[item.id]);
      const minValue = Math.min(...opts.map((o) => Number(o.value)));
      if (selected !== minValue) return null;
      const suggestion = adviceGuide?.perQuestion?.[item.id] || "ลองสำรวจสิ่งที่ทำให้คะแนนข้อนี้ต่ำ และหาวิธีเพิ่มสิ่งที่ช่วยให้อารมณ์ดีขึ้น";
      return {
        id: item.id,
        text: item.text,
        suggestion
      };
    }).filter(Boolean);

    setResultAdvice({
      submittedAt: new Date().toISOString(),
      overall: overallAdvice,
      perQuestions: perQuestionAdvice
    });
    showToast("บันทึกแบบประเมินอารมณ์แล้ว ระบบได้สร้างคำแนะนำให้คุณด้านล่าง", "success");
  };

  const QuestionRow = ({ item, index }) => {
    const opts = (item.options && item.options.length) ? item.options : (form.options || []);
    const name = `mood-${item.id}`;
    const current = answers[item.id];
    const cols = Math.max(2, Math.min(5, opts.length || 5));

    return h("div", {
      className: "card",
      role: "group",
      "aria-labelledby": `${name}-label`
    },
      h("div", { id: `${name}-label`, className: "section-title", style: { display: "inline-block" } },
        `${index + 1}. ${item.text}`
      ),
      h("div", {
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "10px",
          marginTop: "8px"
        }
      },
        opts.map((opt) =>
          h("label", {
            key: String(opt.value),
            className: "pill",
            style: {
              justifyContent: "center",
              userSelect: "none",
              cursor: "pointer",
              background: current === opt.value ? "#764ba2" : undefined,
              color: current === opt.value ? "#fff" : undefined
            }
          },
            h("input", {
              type: "radio",
              name,
              value: opt.value,
              checked: current === opt.value,
              onChange: () => setAnswer(item.id, opt.value),
              style: { display: "none" },
              "aria-label": `เลือก "${opt.label}"`
            }),
            h("span", { style: { fontWeight: 800 } }, opt.label)
          )
        )
      )
    );
  };

  const Toast = () => toast ? h("div", {
    className: `toast-banner ${toast.type}`,
    role: toast.type === "error" ? "alert" : "status",
    style: {
      position: "fixed",
      bottom: "90px",
      left: "50%",
      transform: "translateX(-50%)",
      background: toast.type === "error" ? "#ff6b6b" : toast.type === "success" ? "#2b8a3e" : "#2b4b88",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "999px",
      boxShadow: "0 10px 30px rgba(25,40,75,.3)",
      fontWeight: 600,
      zIndex: 999,
      transition: "opacity .2s ease"
    }
  }, toast.text) : null;

  const answerDetails = useMemo(() => {
    if (!form) return [];
    return (form.items || []).map((item) => {
      const opts = (item.options && item.options.length) ? item.options : (form.options || []);
      const selected = opts.find((o) => Number(o.value) === Number(answers[item.id]));
      if (!selected) return null;
      return {
        id: item.id,
        text: item.text,
        label: selected.label,
        value: Number(selected.value)
      };
    }).filter(Boolean);
  }, [answers, form]);

  const pageTitle = form?.title || "ประเมินอารมณ์";

  return h(React.Fragment, null,
    h(Toast),
    h("main", { className: "page", role: "main" },
      h("div", { className: "topbar" },
        h("h1", null, pageTitle)
      ),

      form?.description ? h("div", { className: "bubble" }, form.description) : null,
      (!data && loadState.status === "loading")
        ? h("div", { className: "bubble" }, "กำลังโหลดข้อมูลแบบประเมิน…")
        : null,
      loadState.error
        ? h("div", {
            className: "bubble",
            style: { background: "#ffecec", color: "#c13515" }
          }, loadState.error)
        : null,

      form
        ? h("div", { className: "page-assessment", role: "list", "aria-label": "แบบประเมินอารมณ์" },
            (form.items || []).map((it, idx) => h(QuestionRow, { key: it.id, item: it, index: idx }))
          )
        : h("div", { className: "card empty" }, "ยังไม่มีข้อมูลแบบประเมิน"),

      h("div", { className: "card" },
        h("div", { className: "section-title" }, "บันทึกเพิ่มเติม"),
        h("div", { className: "input-row" },
          h("textarea", {
            className: "input",
            rows: 3,
            placeholder: "เช่น วันนี้มีเหตุการณ์อะไรที่ส่งผลต่ออารมณ์ของคุณ...",
            value: note,
            onChange: (e) => setNote(e.target.value)
          })
        )
      ),

      form ? h("div", { className: "card", style: { marginBottom: "80px" } },
        h("div", { className: "section-title" }, "สรุปคะแนน"),
        h("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "8px"
          }
        },
          h("div", null, `ตอบแล้ว ${Object.keys(answers).length}/${(form.items || []).length} ข้อ`),
          h("div", { style: { fontWeight: 800, color: "#764ba2" } }, `รวม ${total} คะแนน`)
        ),
        h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
          h("button", { className: "btn", type: "button", onClick: back }, "ยกเลิก"),
          h("button", {
            className: "btn",
            type: "button",
            onClick: submit,
            disabled: !completed,
            style: { background: completed ? "#764ba2" : "#c9b5e8", color: "#fff" }
          }, "บันทึกผล")
        )
      ) : null,

      resultAdvice ? h("div", { className: "card", style: { border: "2px solid #e5dafe", background: "#faf6ff" } },
        h("div", { className: "section-title" }, "คำแนะนำจากผลการประเมินอารมณ์"),
        resultAdvice.overall ? h("div", {
          style: {
            padding: "12px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1px solid #eadcff",
            marginBottom: "12px"
          }
        },
          h("div", { style: { fontWeight: 800, color: "#5b3b99" } }, `${resultAdvice.overall.rank || "ผลรวม"}`),
          h("p", { style: { marginTop: "4px", lineHeight: 1.5 } }, resultAdvice.overall.recommendation)
        ) : null,
        (resultAdvice.perQuestions && resultAdvice.perQuestions.length)
          ? h("div", null,
            h("div", { style: { fontWeight: 700, marginBottom: "6px" } }, "ข้อที่ควรให้ความสำคัญ"),
            resultAdvice.perQuestions.map((item) =>
              h("div", {
                key: item.id,
                style: {
                  borderLeft: "3px solid #f58bf1",
                  paddingLeft: "10px",
                  margin: "8px 0",
                  lineHeight: 1.5
                }
              },
                h("div", { style: { fontWeight: 700 } }, item.text),
                h("div", null, item.suggestion)
              )
            )
          )
          : h("p", { style: { margin: 0 } }, "ไม่มีข้อใดอยู่ในระดับต่ำสุด เยี่ยมมากค่ะ!")
      ) : null
    )
  );
}
