// pages/notify/Appointment.js
const h = window.React.createElement;
import { PhoneFrame } from "../../components/PhoneFrame.js";
import { TopBar } from "../../components/TopBar.js";
const { Link } = window.ReactRouterDOM;

export function NotifyAppointment() {
  return h(PhoneFrame, null,
    h(TopBar, { title: "การแจ้งเตือนนัด", backTo: "/notify" }),

    h("div", { className: "notify-list" },
      h("div", { className: "notify-item" },
        h("span", { className: "notify-emoji" }, "👨‍⚕️"),
        h("span", { className: "notify-chip" }, "การพบแพทย์")
      ),
      h("div", { className: "notify-item" },
        h("span", { className: "notify-emoji" }, "🦷"),
        h("span", { className: "notify-chip" }, "การพบทันตแพทย์")
      ),
      h("div", { className: "notify-item" },
        h("span", { className: "notify-emoji" }, "🕺"),
        h("span", { className: "notify-chip" }, "การนัดรวมรุ่น")
      ),
      h("div", { className: "center" },
        h("button", { className: "btn btn-sm", onClick: () => alert("เพิ่มรายการนัด") }, "+ เพิ่ม")
      )
    )
  );
}
