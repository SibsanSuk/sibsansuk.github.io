// components/NavBar.js
const h = window.React.createElement;
const { Link, useLocation } = window.ReactRouterDOM;

export function NavBar() {
  const loc = useLocation();
  const path = loc.pathname || "/";
  const isActive = (p) => path === p || path.startsWith(p + "/");

  return h(
    "nav",
    { className: "navbar", role: "navigation", "aria-label": "Main" },
    h(
      "div",
      { className: "navbar-inner" },
      h(
        Link,
        {
          to: "/",
          className: `nav-item ${isActive("/") ? "active" : ""}`,
          role: "tab",
          "aria-current": isActive("/") ? "page" : undefined,
          "aria-label": "หน้าหลัก",
        },
        h("div", { className: "icon", "aria-hidden": "true" }, "🏠"),
        h("span", null, "หน้าหลัก")
      ),
      h(
        Link,
        {
          to: "/notify",
          className: `nav-item ${isActive("/notify") ? "active" : ""}`,
          role: "tab",
          "aria-current": isActive("/notify") ? "page" : undefined,
          "aria-label": "การนัด",
        },
        h("div", { className: "icon", "aria-hidden": "true" }, "📅"),
        h("span", null, "การนัด")
      ),
      h(
        Link,
        {
          to: "/sos",
          className: `nav-item ${isActive("/sos") ? "active" : ""}`,
          role: "tab",
          "aria-current": isActive("/sos") ? "page" : undefined,
          "aria-label": "ช่วยเหลือ (SOS)",
        },
        h("div", { className: "icon", "aria-hidden": "true" }, "🆘"),
        h("span", null, "ช่วยเหลือ")
      )
    )
  );
}
