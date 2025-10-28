// pages/Assessment.js
const h = window.React.createElement;
const { useEffect, useMemo, useState, useCallback, useRef } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

export function Assessment({ data }) {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  // ===== ตัวอย่างข้อมูล: แต่ละข้อกำหนด options เอง (2/3/4/5 ตัวเลือกปนกัน) =====
  const sampleData = {
    title: "แบบประเมินตนเองประจำวัน",
    description: "ตอบตามความเป็นจริงในช่วงวันนี้",
    // (optional) global options — จะใช้ถ้าข้อไหนไม่ได้กำหนด options ของตัวเอง
    options: [
      { value: 1, label: "1" },
      { value: 2, label: "2" },
      { value: 3, label: "3" },
      { value: 4, label: "4" }
    ],
    items: [
      {
        id: "q1",
        text: "วันนี้คุณออกกำลังกายเพียงพอ",
        options: [
          { value: 1, label: "น้อยมาก" },
          { value: 2, label: "น้อย" },
          { value: 3, label: "มาก" },
          { value: 4, label: "มากที่สุด" },
        ]
      },
      {
        id: "q2",
        text: "วันนี้คุณทานยาตามที่แพทย์สั่งครบหรือไม่",
        options: [
          { value: 1, label: "ไม่ครบ" },
          { value: 2, label: "ครบ" }
        ]
      },
      {
        id: "q3",
        text: "อารมณ์โดยรวมของคุณวันนี้เป็นอย่างไร?",
        options: [
          { value: 1, label: "แย่มาก" },
          { value: 2, label: "แย่" },
          { value: 3, label: "ปกติ" },
          { value: 4, label: "ดี" },
          { value: 5, label: "ดีมาก" }
        ]
      },
      {
        id: "q4",
        text: "นอนหลับเพียงพอหรือไม่?",
        options: [
          { value: 1, label: "น้อยมาก" },
          { value: 2, label: "น้อย" },
          { value: 3, label: "พอใช้" },
          { value: 4, label: "เพียงพอ" }
        ]
      },
      {
        id: "q5",
        text: "ระดับความเครียดของวันนี้?",
        options: [
          { value: 1, label: "สูง" },
          { value: 2, label: "ปานกลาง" },
          { value: 3, label: "ต่ำ" }
        ]
      },
      {
        id: "q6",
        text: "รับประทานอาหารครบถ้วน? (คุณภาพ/ปริมาณ)",
        options: [
          { value: 1, label: "ไม่ครบ" },
          { value: 2, label: "ค่อนข้างครบ" },
          { value: 3, label: "ครบดี" },
          { value: 4, label: "ครบดีมาก" }
        ]
      },
      {
        id: "q7",
        text: "เวลาอยู่หน้าจอ (มือถือ/คอม) อยู่ในระดับเหมาะสม?",
        options: [
          { value: 1, label: "ไม่เหมาะสม" },
          { value: 2, label: "พอใช้" },
          { value: 3, label: "เหมาะสม" }
        ]
      },
      {
        id: "q8",
        text: "ปฏิสัมพันธ์ทางสังคม/การสื่อสารกับผู้อื่น?",
        options: [
          { value: 1, label: "น้อยมาก" },
          { value: 2, label: "น้อย" },
          { value: 3, label: "ปานกลาง" },
          { value: 4, label: "มาก" },
          { value: 5, label: "มากที่สุด" }
        ]
      },
      {
        id: "q9",
        text: "การดื่มน้ำเพียงพอ?",
        options: [
          { value: 1, label: "ไม่พอ" },
          { value: 2, label: "พอใช้" },
          { value: 3, label: "พอ" },
          { value: 4, label: "เพียงพอ" }
        ]
      },
      {
        id: "q10",
        text: "วันนี้คุณได้ทำกิจกรรมผ่อนคลาย/งานอดิเรกหรือไม่",
        options: [
          { value: 1, label: "ไม่ได้ทำ" },
          { value: 2, label: "ได้ทำ" }
        ]
      },
      {
        id: "q11",
        text: "อ่านหนังสือแล้วหรือยัง",
        options: [
          { value: 1, label: "ไม่ได้ทำ" },
          { value: 2, label: "ได้ทำ" }
        ]
      }
    ]
  };

  const adviceSample = {
    overall: [
      { min: 0, max: 15, rank: "ต้องดูแลด่วน", recommendation: "คะแนนค่อนข้างต่ำ ลองจัดการเวลาพักผ่อนและฝึกผ่อนคลายมากขึ้น รวมถึงปรึกษาแพทย์หากรู้สึกไม่ดีต่อเนื่อง" },
      { min: 16, max: 30, rank: "ควรปรับพฤติกรรม", recommendation: "ยังมีบางด้านที่ควรเสริม เช่น การออกกำลังกายหรือการนอน ลองตั้งเป้าหมายเล็ก ๆ ในแต่ละวัน" },
      { min: 31, max: 44, rank: "ค่อนข้างดี", recommendation: "คุณดูแลตัวเองได้ดี ควรรักษาไว้และสำรวจด้านที่ยังมีคะแนนต่ำเพื่อปรับเล็กน้อย" },
      { min: 45, max: 60, rank: "ดีเยี่ยม", recommendation: "ยอดเยี่ยม! รักษาพฤติกรรมเหล่านี้ไว้ และแบ่งปันเคล็ดลับกับคนรอบข้างได้เลย" }
    ],
    perQuestion: {
      q1: "ลองเพิ่มกิจกรรมที่ทำให้หัวใจเต้นแรง อย่างเดินเร็ว 20 นาที",
      q2: "จัดตารางเตือนทานยาในมือถือเพื่อไม่ให้พลาด",
      q3: "หายใจลึก ๆ หรือบันทึกความคิดเพื่อระบายความรู้สึก",
      q4: "สร้างกิจวัตรก่อนนอน เช่น ปิดจออย่างน้อย 30 นาที",
      q5: "พักสายตาและยืดเส้นทุก ๆ 1 ชั่วโมง ลดความเครียดสะสม",
      q6: "เตรียมมื้ออาหารง่าย ๆ ล่วงหน้าเพื่อให้ครบ 3 มื้อ",
      q7: "ตั้งเวลากำหนดการใช้อุปกรณ์ และออกไปเดินเล่นบ้าง",
      q8: "ลองทักทายเพื่อน/ครอบครัวหรือเข้าร่วมกิจกรรมกลุ่ม",
      q9: "ตั้งขวดน้ำไว้ใกล้ตัว เพื่อจิบให้ครบอย่างน้อย 6-8 แก้ว",
      q10: "หาเวลาสั้น ๆ ทำกิจกรรมที่สนุก เช่น ฟังเพลง อ่านหนังสือ",
      q11: "แบ่งเวลาอ่านวันละ 10 นาทีเพื่อเพิ่มสมาธิและผ่อนคลาย"
    }
  };

  const form = (data && (data.items?.length || data.options?.length)) ? data : sampleData;
  const adviceGuide = (data && data.advice) ? data.advice : adviceSample;

  // ===== state =====
  const [answers, setAnswers] = useState({});
  const [resultAdvice, setResultAdvice] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef();

  useEffect(() => {
    if (typeof document !== "undefined") document.title = form.title || "ประเมินตนเอง";
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

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!completed) {
      showToast("กรุณาตอบให้ครบทุกข้อก่อนบันทึก", "error");
      return;
    }
    const payload = {
      type: "assessment",
      at: new Date().toISOString(),
      items: form.items.map((it) => ({
        id: it.id,
        text: it.text,
        score: Number(answers[it.id])
      })),
      total,
      note: "",
      version: "1.1-per-item-options"
    };
    console.log("Assessment payload:", payload);
    // TODO: POST ไป API จริง

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
      const suggestion = adviceGuide?.perQuestion?.[item.id] ||
        `พยายามปรับปรุง "${item.text}" ให้ดีขึ้นทีละน้อย เช่น เพิ่มกิจกรรมที่เกี่ยวข้อง`;
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
    showToast("บันทึกแบบประเมินแล้ว ระบบได้สร้างคำแนะนำให้คุณด้านล่าง", "success");
  };

  // ===== คอมโพเนนต์แถวคำถาม =====
  const QuestionRow = ({ item, index }) => {
    const opts = (item.options && item.options.length) ? item.options : (form.options || []);
    const name = `q-${item.id}`;
    const current = answers[item.id];
    const cols = Math.max(2, Math.min(5, opts.length || 4));

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
              background: current === opt.value ? "#2b4b88" : undefined,
              color: current === opt.value ? "#fff" : undefined
            }
          },
            h("input", {
              type: "radio",
              name,
              value: opt.value,
              checked: Number(current) === Number(opt.value),
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

  // ===== ปุ่มย้อนกลับ รองรับคีย์บอร์ด =====
  // ===== RETURN: ห่อทั้งหมดใน .page เพื่อให้เลื่อน =====
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

  return h(React.Fragment, null,
    h(Toast),
    h("main", { className: "page", role: "main" },
    // TopBar
    h("div", { className: "topbar" },
      h("h1", null, form.title || "ประเมินตนเอง")
    ),

    // คำอธิบาย (ถ้ามี)
    form.description ? h("div", { className: "bubble" }, form.description) : null,

    // รายการคำถาม
    h("div", { className: "page-assessment", role: "list", "aria-label": "แบบประเมินตนเอง" },
      (form.items || []).map((it, idx) => h(QuestionRow, { key: it.id, item: it, index: idx }))
    ),

    // สรุปคะแนน + ปุ่มบันทึก
    h("div", { className: "card", style: { marginBottom: "80px" } },
      h("div", { className: "section-title" }, "สรุปคะแนน"),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" } },
        h("div", null, `ตอบแล้ว ${Object.keys(answers).length}/${(form.items || []).length} ข้อ`),
        h("div", { style: { fontWeight: 800, color: "#2b4b88" } }, `รวม ${total} คะแนน`)

      ),
      h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
        h("button", { className: "btn", type: "button", onClick: back }, "ยกเลิก"),
        h("button", {
          className: "btn",
          type: "button",
          onClick: submit,
          disabled: !completed,
          style: { background: completed ? "#2b4b88" : "#a0b3dd", color: "#fff" }
        }, "บันทึกแบบประเมิน")
      )
    ),

    resultAdvice ? h("div", { className: "card", style: { border: "2px solid #d7dff7", background: "#f6f7ff" } },
      h("div", { className: "section-title" }, "คำแนะนำจากผลการประเมิน"),
      resultAdvice.overall ? h("div", {
        style: {
          padding: "12px",
          borderRadius: "12px",
          background: "#ffffff",
          border: "1px solid #dee3ff",
          marginBottom: "12px"
        }
      },
        h("div", { style: { fontWeight: 800, color: "#2b4b88" } }, `${resultAdvice.overall.rank || "ผลรวม"}`),
        h("p", { style: { marginTop: "4px", lineHeight: 1.5 } }, resultAdvice.overall.recommendation)
      ) : null,
      (resultAdvice.perQuestions && resultAdvice.perQuestions.length)
        ? h("div", null,
          h("div", { style: { fontWeight: 700, marginBottom: "6px" } }, "ข้อที่ควรให้ความสำคัญ"),
          resultAdvice.perQuestions.map((item) =>
            h("div", {
              key: item.id,
              style: {
                borderLeft: "3px solid #fc9d6d",
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
        : h("p", { style: { margin: 0 } }, "ไม่มีข้อใดอยู่ในระดับต่ำสุดในรอบนี้ เยี่ยมมาก!")
    ) : null
  )
  );
}
