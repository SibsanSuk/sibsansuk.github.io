// pages/Home.js
const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;

import { PhoneFrame } from "../components/PhoneFrame.js";
import { Activities } from "../components/Activities.js";
import { useAuth } from "../auth.js";

export function Home() {
  const { user } = useAuth();
  const displayName = (user && (user.name || user.username)) || "ผู้ใช้";
  const initials = (displayName || "U").trim().split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase();

  return h(PhoneFrame, { dock: h(Activities, null) },

    // แถบผู้ใช้ด้านบน
    h("div", { className:"userbar" },
      h("div", { className:"userbar-name" }, "สวัสดี, ", displayName),
      h(Link, { to:"/profile", className:"avatar", "aria-label":"โปรไฟล์ผู้ใช้" }, initials)
    ),

    h("h1", null, "Personalised Wellness"),
    h("div", { className: "bubble" }, h("span", null, "📝"), h("div", null, "วันนี้บันทึกความดันด้วยนะครับ")),
    h("div", { className: "bubble" }, h("span", null, "💧"), h("div", null, "วันนี้ดื่มน้ำอีกอย่างน้อย 3 แก้วนะครับ")),
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "ข้อมูลล่าสุด"),
      h("div", null, "…ใส่สรุปหรือวิดเจ็ตอื่น ๆ…")
    )
  );
}
