// pages/notify/Index.js
const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;

import { TopBar } from "../../components/TopBar.js";

export function NotifyIndex() {
  return h(
    React.Fragment,
    null,
    h(
      "div",
      { className: "page", role: "main", "aria-label": "การแจ้งเตือน" },

      h(TopBar, { title: "การแจ้งเตือน" }),

      h(
        "div",
        { className: "notify-list", role: "list" },

        h(
          Link,
          { to: "/notify/appointment", className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "🏃‍♂️"),
          h("span", { className: "notify-chip" }, "การแจ้งเตือนนัด")
        ),

        h(
          Link,
          { to: "/notify/general", className: "notify-item", role: "listitem" },
          h("span", { className: "notify-emoji", "aria-hidden": "true" }, "📝"),
          h("span", { className: "notify-chip" }, "การแจ้งเตือนทั่วไป")
        )
      )
    )
  );
}
