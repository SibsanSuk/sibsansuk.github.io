// pages/MoodAssessment.js
const h = window.React.createElement;
const { useEffect, useMemo, useState, useCallback } = window.React;
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
        text: "ความรู้สึกกดดัน/เครียดในวันนี้",
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

  const form = (data && (data.items?.length || data.options?.length)) ? data : sampleData;

  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState("");

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

  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const total = useMemo(() => {
    return (form.items || []).reduce((sum, it) => sum + (Number(answers[it.id]) || 0), 0);
  }, [answers, form.items]);

  const completed = (form.items || []).every((it) => answers[it.id] !== undefined);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!completed) {
      alert("กรุณาตอบให้ครบทุกข้อก่อนบันทึก");
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
    alert("บันทึกแบบประเมินอารมณ์แล้ว ขอบคุณค่ะ");
    back();
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

  return h("main", { className: "page", role: "main" },
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
    )
  );
}
