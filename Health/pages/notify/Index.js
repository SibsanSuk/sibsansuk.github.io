const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;
import { PhoneFrame } from "../../components/PhoneFrame.js";

export function NotifyIndex() {
  return h(PhoneFrame, null,
    h(Link, { to: "/notify", className: "back" }, "← การแจ้งเตือน"),
    h("div", { className: "list" },
      h(Link, { to: "/notify/appointment", className: "pill" }, "🏃‍♂️  การแจ้งเตือนนัด"),
      h(Link, { to: "/notify/general", className: "pill" }, "🗒️  การแจ้งเตือนทั่วไป")
    )
  );
}
