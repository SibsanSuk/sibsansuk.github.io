// pages/Home.js
const h = window.React.createElement;
import { PhoneFrame } from "../components/PhoneFrame.js";
import { Activities } from "../components/Activities.js";

export function Home() {
  return h(PhoneFrame, {
      // ⬇️ ส่งกล่องกิจกรรมไปเป็น dock ลอยเหนือ nav
      dock: h(Activities, null)
    },
    // เนื้อหาในหน้า (ไม่ต้องใส่ Activities อีก)
    h("h1", null, "Personalised Wellness"),
    h("div", { className: "bubble" }, h("span", null, "📝"), h("div", null, "วันนี้บันทึกความดันด้วยนะครับ")),
    h("div", { className: "bubble" }, h("span", null, "💧"), h("div", null, "วันนี้ดื่มน้ำอีกอย่างน้อย 3 แก้วนะครับ")),
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "ข้อมูลล่าสุด"),
      h("div", null, "…ใส่สรุปสั้น ๆ ของผู้ใช้ หรือ widget อื่น ๆ …")
    )
  );
}
