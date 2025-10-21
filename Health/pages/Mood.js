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
      className: `tile mood-tile ${value === m.key ? "is-active" : ""}`.trim(),
      "aria-pressed": value === m.key ? "true" : "false",
      onClick: () => setValue(m.key)
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
      .mood-grid .mood-tile {
        padding: 12px;
        background: #f4f7ff;
        border-radius: 18px;
        box-shadow: none;
        border: 1px solid transparent;
        color: #20314f;
        transition: transform .16s ease, box-shadow .16s ease, background .16s ease, border .16s ease;
      }
      .mood-grid .mood-tile .emoji { font-size: 28px; margin-bottom: 6px; }
      .mood-grid .mood-tile.is-active {
        background: #6c8cff;
        color: #fff;
        border-color: rgba(255,255,255,.45);
        box-shadow: 0 10px 20px rgba(108, 140, 255, .35);
        transform: translateY(-2px);
      }
      .mood-grid .mood-tile.is-active .emoji {
        filter: drop-shadow(0 3px 6px rgba(0,0,0,.18));
      }
      .mood-grid .mood-tile:focus-visible {
        outline: 2px solid #ffda6c;
        outline-offset: 3px;
      }
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
