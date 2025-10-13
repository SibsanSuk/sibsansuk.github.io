// pages/Mood.js
const h = window.React.createElement;
const { useState, useEffect } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

export function Mood() {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  // ตั้งชื่อหน้า
  useEffect(() => {
    if (typeof document !== "undefined") document.title = "ประเมินอารมณ์";
  }, []);

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

  const back = (e) => {
    e?.preventDefault?.();
    if (navigate) navigate(-1);
    else history.back();
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!value) {
      alert("กรุณาเลือกอารมณ์อย่างน้อย 1 รายการ");
      return;
    }
    // TODO: เชื่อม API จริงที่นี่
    // ตัวอย่าง payload
    const payload = {
      mood: value,              // 1..5
      note: note?.trim() || "",
      at: new Date().toISOString(),
    };
    console.log("Save mood payload:", payload);

    // ตัวอย่าง: แสดงผลลัพธ์ แล้วกลับหน้าเดิม
    alert("บันทึกสำเร็จ");
    back();
  };

  // ปุ่มอีโมจิ (ใช้สไตล์ tile/btn เดิม)
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
    // TopBar + Back
    h("div", { className: "topbar" },
      h("a", { href: "#", className: "back", onClick: back, "aria-label": "ย้อนกลับ" }, "‹"),
      h("h1", null, "ประเมินอารมณ์")
    ),

    // การ์ดเลือกอารมณ์
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "เลือกอารมณ์ของคุณตอนนี้"),
      // ใช้แถวเลื่อนแนวนอนแบบ carousel เดิม เพื่อให้กดง่ายบนมือถือ
      h("div", { className: "carousel-wrap shadow-left shadow-right" },
        h("div", { className: "carousel", role: "listbox", "aria-label": "ตัวเลือกอารมณ์ 5 ระดับ" },
          moods.map((m) => h(MoodButton, { key: m.key, m }))
        )
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
