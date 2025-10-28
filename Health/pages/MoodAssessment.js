// pages/MoodAssessment.js
const h = window.React.createElement;
const { useEffect, useMemo, useState, useCallback, useRef } = window.React;
const { useNavigate } = window.ReactRouterDOM || {};

export function MoodAssessment({ data }) {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  const sampleData = {
    title: "แบบประเมินอารมณ์รายวัน",
    description: "ประเมินภาพรวมความรู้สึกของคุณในวันนี้เพื่อดูแนวโน้มด้านอารมณ์",
    options: [
      { value: 1, label: "น้อยมาก" },
      { value: 2, label: "น้อย" },
      { value: 3, label: "ปานกลาง" },
      { value: 4, label: "มาก" },
      { value: 5, label: "มากที่สุด" }
    ],
    items: [
      { id: "m1", text: "วันนี้คุณรู้สึกมีพลังและกระฉับกระเฉงเพียงใด" },
      { id: "m2", text: "ระดับความสุขหรือพึงพอใจในวันนี้" },
      {
        id: "m3",
        text: "ระดับความวิตกกังวลหรือกังวลใจ",
        options: [
          { value: 1, label: "สูงมาก" },
          { value: 2, label: "สูง" },
          { value: 3, label: "ปานกลาง" },
          { value: 4, label: "ต่ำ" },
          { value: 5, label: "ต่ำมาก" }
        ]
      },
      { id: "m4", text: "วันนี้คุณสามารถควบคุมอารมณ์ได้ดีเพียงใด" },
      {
        id: "m5",
        text: "ความรู้สึกเครียดในวันนี้",
        options: [
          { value: 1, label: "สูงมาก" },
          { value: 2, label: "สูง" },
          { value: 3, label: "ปานกลาง" },
          { value: 4, label: "ต่ำ" },
          { value: 5, label: "ต่ำมาก" }
        ]
      },
      { id: "m6", text: "การพักผ่อนหรือการฟื้นฟูอารมณ์ของคุณ" },
      { id: "m7", text: "คุณรู้สึกผ่อนคลายแค่ไหนหลังจากทำกิจกรรมต่าง ๆ" },
      { id: "m8", text: "ความมั่นใจในตัวเองวันนี้อยู่ในระดับใด" },
      {
        id: "m9",
        text: "ความรู้สึกมีคนสนับสนุน/พร้อมรับฟังในวันนี้",
        options: [
          { value: 1, label: "ไม่ได้รับเลย" },
          { value: 2, label: "ได้รับน้อย" },
          { value: 3, label: "ได้รับบ้าง" },
          { value: 4, label: "ได้รับมาก" },
          { value: 5, label: "ได้รับมากที่สุด" }
        ]
      },
      { id: "m10", text: "โดยรวมวันนี้คุณพึงพอใจกับตัวเองมากน้อยเพียงใด" }
    ]
  };

  const adviceSample = {
    overall: [
      { min: 0, max: 15, rank: "ต้องดูแลอารมณ์", recommendation: "คะแนนค่อนข้างต่ำ แนะนำหากิจกรรมผ่อนคลายและพูดคุยกับคนที่คุณไว้ใจ" },
      { min: 16, max: 30, rank: "ควรปรับสมดุล", recommendation: "ยังมีอารมณ์บางด้านที่ต้องดูแล ลองฝึกหายใจลึก ๆ หรือทำบันทึกอารมณ์" },
      { min: 31, max: 45, rank: "อารมณ์ค่อนข้างดี", recommendation: "รักษากิจวัตรที่ช่วยให้อารมณ์ดีไว้ และสำรวจด้านที่คะแนนต่ำเพื่อปรับเพิ่ม" },
      { min: 46, max: 60, rank: "สดใสยอดเยี่ยม", recommendation: "ยอดเยี่ยม! แบ่งปันพลังบวกกับคนรอบข้าง และรักษานิสัยที่ดีนี้" }
    ],
    perQuestion: {
      m1: "ลองเริ่มวันด้วยการยืดเหยียดหรือออกกำลังสั้น ๆ เพื่อเพิ่มพลัง",
      m2: "จดบันทึกเรื่องดี ๆ 3 อย่างในวันนี้เพื่อเติมความสุข",
      m3: "ฝึกหายใจ 4-7-8 หรือฝึกสมาธิสั้น ๆ เมื่อตื่นเต้นกังวล",
      m4: "สร้างพื้นที่สงบ เช่น ฟังเพลงเบา ๆ หรือพักสายตาเพื่อตั้งหลัก",
      m5: "หยุดพักระหว่างงานเป็นช่วงสั้น ๆ เพื่อคลายความกดดัน",
      m6: "หาเวลาพักผ่อนด้วยกิจกรรมที่ผ่อนคลาย เช่น อาบน้ำอุ่น หรืออ่านหนังสือ",
      m7: "ผสานกิจกรรมที่ช่วยให้ผ่อนคลาย เช่น เดินเล่นหรือฟังเพลง",
      m8: "ทบทวนความสำเร็จเล็ก ๆ ของตนเองเพื่อเสริมความมั่นใจ",
      m9: "ทักทายหรือพูดคุยกับคนใกล้ชิดเพื่อรับพลังบวก",
      m10: "ตั้งใจทำสิ่งเล็ก ๆ ที่ทำให้ภูมิใจ เพื่อเพิ่มความพอใจในตัวเอง"
    }
  };

  const form = (data && (data.items?.length || data.options?.length)) ? data : sampleData;
  const adviceGuide = (data && data.advice) ? data.advice : adviceSample;

  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState("");
  const [resultAdvice, setResultAdvice] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = form.title || "ประเมินอารมณ์";
    }
  }, [form.title]);

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
    return (form.items || []).reduce((sum, it) => sum + (Number(answers[it.id]) || 0), 0);
  }, [answers, form.items]);

  const completed = (form.items || []).every((it) => answers[it.id] !== undefined);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!completed) {
      showToast("กรุณาตอบให้ครบทุกข้อก่อนบันทึก", "error");
      return;
    }
    const payload = {
      type: "mood-assessment",
      at: new Date().toISOString(),
      items: form.items.map((it) => ({
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

  const BackButton = () =>
    h("a", {
      href: "#",
      className: "back",
      role: "button",
      onClick: back,
      onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); back(e); } },
      "aria-label": "ย้อนกลับ",
      tabIndex: 0
    }, "‹");

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
  }, [answers, form.items, form.options]);

  return h(React.Fragment, null,
    h(Toast),
    h("main", { className: "page", role: "main" },
      h("div", { className: "topbar" },
        h(BackButton),
        h("h1", null, form.title || "ประเมินอารมณ์")
      ),

      form.description ? h("div", { className: "bubble" }, form.description) : null,

      h("div", { className: "page-assessment", role: "list", "aria-label": "แบบประเมินอารมณ์" },
        (form.items || []).map((it, idx) => h(QuestionRow, { key: it.id, item: it, index: idx }))
      ),

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

      h("div", { className: "card", style: { marginBottom: "80px" } },
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
      ),

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
