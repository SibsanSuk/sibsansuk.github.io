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
      { id: "ap1", title: "พบแพทย์อายุรกรรม", time: "วันนี้ 14:30", to: "/notify/appointment" },
      { id: "ap2", title: "ตรวจเลือด", time: "พรุ่งนี้ 09:00", to: "/notify/appointment" },
    ],
    tips: [
      { id: "m1", author: "doctor", text: "วันนี้ดื่มน้ำไปแล้ว 4 แก้ว ดื่มให้ครบ 8 แก้วนะครับ 💧" },
      { id: "m2", author: "doctor", text: "เช้านี้เรายืนแกว่งแขนกันสัก 30 รอบนะครับ 🏃‍♂️" },
    ],
  };

  const { pinnedAppointments, tips } = data;

  return h(
    PhoneFrame,
    { dock: h(Activities, null) },

    // แถบผู้ใช้ด้านบน
    h("div", { className: "userbar" },
      h("div", { className: "userbar-name" }, "สวัสดี, ", displayName),
      h(Link, { to: "/profile", className: "avatar", "aria-label": "โปรไฟล์ผู้ใช้" }, initials)
    ),

    h("h1", null, "Personalised Wellness"),

    // ====== บล็อก: เตือนการนัด (ปักหมุด) ======
    pinnedAppointments.length > 0 &&
      h("section", { className: "pin-wrap", "aria-label": "การนัดที่ปักหมุด" },
        pinnedAppointments.map(ap =>
          h(Link, {
            key: ap.id,
            to: ap.to,
            className: "pin-item",
            "aria-label": `${ap.title} เวลา ${ap.time}`
          },
            h("div", { className: "pin-ico", "aria-hidden": "true" }, "📌"),
            h("div", { className: "pin-body" },
              h("div", { className: "pin-title" }, ap.title),
              h("div", { className: "pin-time" }, ap.time)
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
          // avatar ของหมอ (ใช้ภาพ doctor.png)
          isDoctor
            ? h("div", { className: "msg-avatar" },
                h("img", {
                  src: "./images/doctor.png",
                  alt: "หมอ",
                  width: 40,
                  height: 40
                })
              )
            : h("div", { className: "msg-avatar" }, initials),
          h("div", { className: "msg-bubble" }, msg.text)
        );
      })
    )
  );
}
