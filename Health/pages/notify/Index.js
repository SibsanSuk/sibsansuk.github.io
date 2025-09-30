// pages/notify/Index.js
const h = window.React.createElement;
import { PhoneFrame } from "../../components/PhoneFrame.js";
import { TopBar } from "../../components/TopBar.js";
const { Link } = window.ReactRouterDOM;

export function NotifyIndex() {
  return h(PhoneFrame, null,
    h(TopBar, { title: "การแจ้งเตือน" }),

    h("div", { className: "notify-list" },
      h(Link, { to: "/notify/appointment", className: "notify-item" },
        h("span", { className: "notify-emoji" }, "🏃‍♂️"),
        h("span", { className: "notify-chip" }, "การแจ้งเตือนนัด")
      ),
      h(Link, { to: "/notify/general", className: "notify-item" },
        h("span", { className: "notify-emoji" }, "📝"),
        h("span", { className: "notify-chip" }, "การแจ้งเตือนทั่วไป")
      )
    )
  );
}
