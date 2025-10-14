// pages/notify/General.js
const h = window.React.createElement;

import { TopBar } from "../../components/TopBar.js";

export function NotifyGeneral() {
  return h(
    React.Fragment,
    null,
    h(
      "div",
      { className: "page", role: "main", "aria-label": "การแจ้งเตือนทั่วไป" },

      h(TopBar, { title: "การแจ้งเตือนทั่วไป", backTo: "/notify" }),

      h(
        "div",
        { className: "notify-list", role: "list" },

        h(
          "div",
          { className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "🎈"),
          h("span", { className: "notify-chip" }, "การทานยา")
        ),

        h(
          "div",
          { className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "🏃‍♀️"),
          h("span", { className: "notify-chip" }, "การออกกำลังกาย")
        ),

        h(
          "div",
          { className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "🍱"),
          h("span", { className: "notify-chip" }, "การทำอาหารเย็น")
        ),

        h(
          "div",
          { className: "center" },
          h(
            "button",
            { className: "btn btn-sm", type: "button", onClick: () => alert("เพิ่มรายการทั่วไป") },
            "+ เพิ่ม"
          )
        )
      )
    )
  );
}
