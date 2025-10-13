// pages/Assessment.js
const h = window.React.createElement;
const { useEffect, useMemo, useState, useCallback } = window.React;
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
        text: "อารมณ์โดยรวมของคุณวันนี้เป็นอย่างไร",
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
        text: "คุณนอนหลับเพียงพอ",
        options: [
          { value: 1, label: "น้อยมาก" },
          { value: 2, label: "น้อย" },
          { value: 3, label: "พอใช้" },
          { value: 4, label: "เพียงพอ" }
        ]
      },
      {
        id: "q5",
        text: "ระดับความเครียดของวันนี้",
        options: [
          { value: 1, label: "สูง" },
          { value: 2, label: "ปานกลาง" },
          { value: 3, label: "ต่ำ" }
        ]
      },
      {
        id: "q6",
        text: "คุณรับประทานอาหารครบถ้วน (คุณภาพ/ปริมาณ)",
        options: [
          { value: 1, label: "ไม่ครบ" },
          { value: 2, label: "ค่อนข้างครบ" },
          { value: 3, label: "ครบดี" },
          { value: 4, label: "ครบดีมาก" }
        ]
      },
      {
        id: "q7",
        text: "เวลาอยู่หน้าจอ (มือถือ/คอม) อยู่ในระดับเหมาะสม",
        options: [
          { value: 1, label: "ไม่เหมาะสม" },
          { value: 2, label: "พอใช้" },
          { value: 3, label: "เหมาะสม" }
        ]
      },
      {
        id: "q8",
        text: "ปฏิสัมพันธ์ทางสังคม/การสื่อสารกับผู้อื่น",
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
        text: "การดื่มน้ำเพียงพอ",
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
      }
    ]
  };

  const form = (data && (data.items?.length || data.options?.length)) ? data : sampleData;

  // ===== state =====
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (typeof document !== "undefined") document.title = form.title || "ประเมินตนเอง";
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
      type: "assessment",
      at: new Date().toISOString(),
      items: form.items.map((it) => ({
        id: it.id,
        text: it.text,
        score: Number(answers[it.id])
      })),
      total,
      note: note?.trim() || "",
      version: "1.1-per-item-options"
    };
    console.log("Assessment payload:", payload);
    // TODO: POST ไป API จริง
    alert("บันทึกแบบประเมินแล้ว ขอบคุณครับ");
    back();
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

  // ===== ปุ่มย้อนกลับ รองรับคีย์บอร์ด =====
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

  // ===== RETURN: ห่อทั้งหมดใน .page เพื่อให้เลื่อน =====
  return h("main", { className: "page", role: "main" },
    // TopBar + Back
    h("div", { className: "topbar" },
      h(BackButton),
      h("h1", null, form.title || "ประเมินตนเอง")
    ),

    // คำอธิบาย (ถ้ามี)
    form.description ? h("div", { className: "bubble" }, form.description) : null,

    // รายการคำถาม
    h("div", { className: "page-assessment", role: "list", "aria-label": "แบบประเมินตนเอง" },
      (form.items || []).map((it, idx) => h(QuestionRow, { key: it.id, item: it, index: idx }))
    ),

    // หมายเหตุเพิ่มเติม
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "หมายเหตุ (ถ้ามี)"),
      h("div", { className: "input-row" },
        h("textarea", {
          className: "input",
          rows: 3,
          placeholder: "เขียนเพิ่มเติมเกี่ยวกับสภาพวันนี้...",
          value: note,
          onChange: (e) => setNote(e.target.value)
        })
      )
    ),

    // สรุปคะแนน + ปุ่มบันทึก
    h("div", { className: "card", style: { marginBottom: "80px" } },
      h("div", { className: "section-title" }, "สรุปคะแนน"),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" } },
        h("div", null, `ตอบแล้ว ${Object.keys(answers).length}/${(form.items || []).length} ข้อ`)

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
    )
  );
}
