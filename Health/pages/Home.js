// pages/Home.js
const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;

import { PhoneFrame } from "../components/PhoneFrame.js";
import { Activities } from "../components/Activities.js";
import { useAuth } from "../auth.js";

export function Home() {
  const { user } = useAuth();
  const displayName = (user && (user.name || user.username)) || "ผู้ใช้";
  const initials = (displayName || "U").trim().split(/\s+/).map(s => s[0]).join("").slice(0, 2).toUpperCase();

  // --- ข้อมูลจำลอง (JSON ในไฟล์เดียว) ---
  const data = {
    pinnedAppointments: [
      { id: "ap1", title: "พบแพทย์อายุรกรรม", time: "วันนี้ 14:30",  to: "/notify/appointment" },
      { id: "ap2", title: "ตรวจเลือด",         time: "พรุ่งนี้ 07:00", to: "/notify/appointment" },
      { id: "ap3", title: "กินโต๊ะแชร์ ม.ปลาย", time: "พรุ่งนี้ 11:30", to: "/notify/appointment" },
      { id: "ap4", title: "กายภาพ",             time: "พรุ่งนี้ 09:00", to: "/notify/appointment" },
    ],
    tips: [
      { id: "m1", author: "doctor", text: "วันนี้ดื่มน้ำไปแล้ว 4 แก้ว ดื่มให้ครบ 8 แก้วนะครับ 💧" },
      { id: "m2", author: "doctor", text: "เช้านี้เรายืนแกว่งแขนกันสัก 30 รอบนะครับ 🏃‍♂️" },
    ],
  };

  // ★ CHANGED: ใช้ state สำหรับ pinned appointments
  const [pins, setPins] = React.useState(() => data.pinnedAppointments);
  const tips = data.tips;

  // ===== Fade edges controller (ซ้าย/ขวา) =====
  const wrapRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  const updateShadow = React.useCallback(() => {
    const wrap = wrapRef.current;
    const sc = scrollRef.current;
    if (!wrap || !sc) return;

    const EPS = 2; // เผื่อค่าเศษจาก iOS/มือถือ
    const left  = sc.scrollLeft > EPS;
    const right = (sc.scrollWidth - sc.clientWidth - sc.scrollLeft) > EPS;

    wrap.classList.toggle("shadow-left", left);
    wrap.classList.toggle("shadow-right", right);
  }, []);

  React.useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    if (sc.scrollLeft !== 0) sc.scrollTo({ left: 0, top: 0, behavior: "auto" });

    sc.addEventListener("scroll", updateShadow, { passive: true });
    window.addEventListener("resize", updateShadow);
    updateShadow();
    return () => {
      sc.removeEventListener("scroll", updateShadow);
      window.removeEventListener("resize", updateShadow);
    };
    // ★ CHANGED: ผูกกับจำนวน pins ปัจจุบัน
  }, [updateShadow, pins.length]);

  // ===== Dialog ประเมินกิจกรรม =====
  const [activePin, setActivePin] = React.useState(null);
  const [done, setDone] = React.useState(false);
  const [rate, setRate] = React.useState(0);
  const [note, setNote] = React.useState("");

  // ล็อก scroll เมื่อเปิด dialog
  React.useEffect(() => {
    const html = document.documentElement;
    if (activePin) html.classList.add("html-lock");
    else html.classList.remove("html-lock");
    return () => html.classList.remove("html-lock");
  }, [activePin]);

  const openPinDialog = (pin) => {
    setActivePin(pin);
    setDone(false);
    setRate(0);
    setNote("");
  };
  const closePinDialog = () => setActivePin(null);

  const submitPinDialog = () => {
    // ตัวอย่าง: เก็บผลไว้ log (ภายหลังจะยิง API ตรงนี้ได้เลย)
    console.log("PIN_FEEDBACK", {
      id: activePin?.id, title: activePin?.title, time: activePin?.time,
      done, rate, note
    });

    // ★ CHANGED: ถ้าเลือกทำกิจกรรมแล้ว ให้ลบ item ออกจาก state
    if (done && activePin) {
      setPins(prev => prev.filter(p => p.id !== activePin.id));
    }

    // ปิด dialog
    setActivePin(null);

    // (เสริม) แสดง bubble แจ้งสั้น ๆ ก็ได้
    // alert("บันทึกการประเมินเรียบร้อยครับ");
  };

  // อีโมจิ 1–5
  const faces = ["😞","🙁","😐","🙂","😄"];

  return h(
    PhoneFrame,
    { dock: h(Activities, null) },

    // แถบผู้ใช้ด้านบน
    h("div", { className: "userbar" },
      h("div", { className: "userbar-name" }, "สวัสดี, ", displayName),
      h(Link, { to: "/profile", className: "avatar", "aria-label": "โปรไฟล์ผู้ใช้" }, initials)
    ),

    h("h1", null, "Personalised Wellness"),

    // ====== บล็อก: เตือนการนัด (Post-it แถวแนวนอน + เงาเฟด) ======
    pins.length > 0 &&
      h("section", { ref: wrapRef, className: "pin-hwrap", "aria-label":"การนัดที่ปักหมุด" },
        h("div", { ref: scrollRef, className: "pin-hscroll", role: "list" },
          pins.map((ap, idx) =>
            h("button", {
                key: ap.id,
                type: "button",
                onClick: () => openPinDialog(ap),
                className: `pin-card pin-color-${(idx % 3) + 1}`,
                role: "listitem",
                "aria-label": `${ap.title} เวลา ${ap.time}`
              },
              h("div", { className: "pin-ico", "aria-hidden":"true" }, "📌"),
              h("div", { className: "pin-title" }, ap.title),
              h("div", { className: "pin-time"  }, ap.time)
            )
          )
        )
      ),

    // ====== บล็อก: คำแนะนำจากผู้เชี่ยวชาญ (บอลลูนแชต) ======
    h("section", { className: "chat", "aria-label": "คำแนะนำจากผู้เชี่ยวชาญ" },
      tips.map(msg => {
        const isDoctor = msg.author === "doctor";
        return h("div", {
          key: msg.id,
          className: `msg ${isDoctor ? "msg--doctor" : "msg--me"}`
        },
          isDoctor
            ? h("div", { className: "msg-avatar" },
                h("img", { src: "./images/doctor.png", alt: "หมอ", width: 40, height: 40 })
              )
            : h("div", { className: "msg-avatar" }, initials),
          h("div", { className: "msg-bubble" }, msg.text)
        );
      })
    ),

    // ====== Dialog: ประเมินกิจกรรมจากโพสต์อิท ======
    activePin && h("div", { className: "pin-dialog", role:"dialog", "aria-modal":"true", "aria-labelledby":"pinDlgTitle" },
      h("div", { className: "pin-dialog-box" },
        h("div", { className: "pin-dialog-head" },
          h("div", { id: "pinDlgTitle", className: "pin-dialog-title" }, "บันทึกผลกิจกรรม"),
          h("div", { className: "pin-dialog-sub" }, `${activePin.title} • ${activePin.time}`)
        ),

        h("label", { className: "pin-row pin-check" },
          h("input", {
            type: "checkbox",
            checked: done,
            onChange: (e) => setDone(e.target.checked)
          }),
          h("span", null, "ทำเรียบร้อยแล้ว")
        ),

        h("div", { className: "pin-row" },
          h("div", { className: "pin-label" }, "ให้คะแนนความรู้สึก"),
          h("div", { className: "pin-rate" },
            faces.map((f, i) =>
              h("button", {
                key: i,
                type: "button",
                className: `pin-face ${rate === (i+1) ? "active" : ""}`,
                onClick: () => setRate(i+1),
                "aria-label": `ให้คะแนน ${i+1}`
              }, f)
            )
          )
        ),

        h("div", { className: "pin-row" },
          h("label", { className: "pin-label", htmlFor: "pinNote" }, "ความเห็น/ความรู้สึกเพิ่มเติม"),
          h("textarea", {
            id: "pinNote",
            className: "pin-note",
            rows: 3,
            placeholder: "พิมพ์ประเมินความรู้สึกของกิจกรรม…",
            value: note,
            onChange: (e) => setNote(e.target.value)
          })
        ),

        h("div", { className: "pin-dialog-actions" },
          h("button", { className: "btn pin-cancel", type:"button", onClick: closePinDialog }, "ยกเลิก"),
          h("button", {
              className: "btn pin-save",
              type:"button",
              onClick: submitPinDialog,
              disabled: rate === 0 && !done && note.trim() === ""
            }, "บันทึก")
        )
      )
    )
  );
}
