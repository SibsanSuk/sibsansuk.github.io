// pages/notify/Appointment.js
const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;

import { TopBar } from "../../components/TopBar.js";

export function NotifyAppointment() {
  return h(
    React.Fragment,
    null,
    h(
      "div",
      { className: "page", role: "main", "aria-label": "การแจ้งเตือนนัด" },

      h(TopBar, { title: "การแจ้งเตือนนัด", backTo: "/notify" }),

      h(
        "div",
        { className: "notify-list", role: "list" },

        h(
          "div",
          { className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "👨‍⚕️"),
          h("span", { className: "notify-chip" }, "การพบแพทย์")
        ),

        h(
          "div",
          { className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "🦷"),
          h("span", { className: "notify-chip" }, "การพบทันตแพทย์")
        ),

        h(
          "div",
          { className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "🕺"),
          h("span", { className: "notify-chip" }, "การนัดรวมรุ่น")
        ),

        h(
          "div",
          { className: "center" },
          h(
            "button",
            { className: "btn btn-sm", type: "button", onClick: () => alert("เพิ่มรายการนัด") },
            "+ เพิ่ม"
          )
        )
      )
    )
  );
}
