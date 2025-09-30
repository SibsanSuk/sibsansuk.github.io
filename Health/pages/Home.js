const h = window.React.createElement;
import { PhoneFrame } from "../components/PhoneFrame.js";
import { Activities } from "../components/Activities.js";

export function Home() {
  return h(PhoneFrame, null,
    h("h1", null, "Personalised Wellness"),
    h("div", { className: "bubble" }, h("span", null, "📝"), h("div", null, "วันนี้บันทึกความดันด้วยนะครับ")),
    h("div", { className: "bubble" }, h("span", null, "💧"), h("div", null, "วันนี้ดื่มน้ำอีกอย่างน้อย 3 แก้วนะครับ")),
    h(Activities, null)
  );
}
