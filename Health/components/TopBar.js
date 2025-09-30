// components/TopBar.js
const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;

export function TopBar({ title, backTo }) {
  return h("div", { className: "topbar" },
    backTo ? h(Link, { to: backTo, className: "back", "aria-label": "ย้อนกลับ" }, "‹") : null,
    h("h1", null, title)
  );
}
