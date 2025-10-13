// pages/Mood.js
const h = window.React.createElement;
const { useState, useEffect } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

export function Mood() {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  useEffect(() => { if (typeof document !== "undefined") document.title = "ประเมินอารมณ์"; }, []);

  // ตัวเลือกอารมณ์ 5 ระดับ (ซ้าย = แย่ → ขวา = ดี)
  const moods = [
    { key: 1, emoji: "😢", label: "แย่มาก" },
    { key: 2, emoji: "☹️", label: "ไม่ค่อยดี" },
    { key: 3, emoji: "😐", label: "ปกติ" },
    { key: 4, emoji: "🙂", label: "ดี" },
    { key: 5, emoji: "😄", label: "ดีมาก" },
  ];

  const [value, setValue] = useState(null);
  const [note, setNote]   = useState("");

  const back = (e) => { e?.preventDefault?.(); if (navigate) navigate(-1); else history.back(); };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!value) { alert("กรุณาเลือกอารมณ์อย่างน้อย 1 รายการ"); return; }
    const payload = { mood: value, note: note?.trim() || "", at: new Date().toISOString() };
    console.log("Save mood payload:", payload);
    alert("บันทึกสำเร็จ");
    back();
  };

  const MoodButton = ({ m }) =>
    h("button", {
      type: "button",
      className: "tile",
      "aria-pressed": value === m.key ? "true" : "false",
      onClick: () => setValue(m.key),
      style: value === m.key ? { outline: "3px solid #6c8cff" } : null
    },
      h("span", { className: "emoji", "aria-hidden": "true" }, m.emoji),
      h("span", null, m.label)
    );

  return h(React.Fragment, null,
    // สไตล์เฉพาะหน้า (ทำกริดให้ไม่ต้องเลื่อน)
    h("style", { dangerouslySetInnerHTML: { __html: `
      .mood-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
        margin-top: 8px;
        overflow: visible;           /* ไม่ให้เกิดแถบเลื่อนในกริด */
      }
      @media (max-width: 360px) {
        .mood-grid { grid-template-columns: repeat(3, 1fr); }
      }
      .mood-grid .tile { padding: 10px; }
      .mood-grid .tile .emoji { font-size: 28px; margin-bottom: 6px; }
    `}}),

    // TopBar + Back
    h("div", { className: "topbar" },
      h("a", { href: "#", className: "back", onClick: back, "aria-label": "ย้อนกลับ" }, "‹"),
      h("h1", null, "ประเมินอารมณ์")
    ),

    // การ์ดเลือกอารมณ์ — เปลี่ยนจาก carousel เป็นกริดคงที่
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "เลือกอารมณ์ของคุณตอนนี้"),
      h("div", { className: "mood-grid", role: "listbox", "aria-label": "ตัวเลือกอารมณ์ 5 ระดับ" },
        moods.map((m) => h(MoodButton, { key: m.key, m }))
      )
    ),

    // การ์ดหมายเหตุเพิ่มเติม
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "หมายเหตุ (ถ้ามี)"),
      h("div", { className: "input-row" },
        h("textarea", {
          className: "input",
          rows: 3,
          placeholder: "อยากเล่าอะไรเพิ่มเติมเกี่ยวกับความรู้สึกของคุณตอนนี้...",
          value: note,
          onChange: (e) => setNote(e.target.value)
        })
      ),
      h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } },
        h("button", { className: "btn", type: "button", onClick: back }, "ยกเลิก"),
        h("button", { className: "btn", type: "button", onClick: save, style: { background: "#2b4b88", color: "#fff" } }, "บันทึก")
      )
    )
  );
}
