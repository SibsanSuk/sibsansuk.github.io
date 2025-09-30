const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;
import { PhoneFrame } from "../../components/PhoneFrame.js";

export function NotifyAppointment() {
  return h(PhoneFrame, null,
    h(Link, { to: "/#/notify", className: "back" }, "← การแจ้งเตือนนัด"),
    h("div", { className: "list" },
      h("div", { className: "pill" }, "👨‍⚕️  การพบแพทย์"),
      h("div", { className: "pill" }, "🦷  การพบทันตแพทย์"),
      h("div", { className: "pill" }, "🕺  การนัดอบรมรุ่น"),
      h("div", { className: "center" },
        h("button", { className: "btn", onClick: () => alert("เพิ่มรายการนัด") }, "+ เพิ่ม")
      )
    )
  );
}
