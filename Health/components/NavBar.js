// components/NavBar.js
const h = window.React.createElement;
const { Link, useLocation } = window.ReactRouterDOM;

export function NavBar() {
  const loc = useLocation();
  const path = loc.pathname || "/";
  const isActive = (p) => path === p || path.startsWith(p + "/");

  const iconBase = "./images/icons"; // เส้นทางไปยังโฟลเดอร์ icon

  return h(
    "nav",
    { className: "navbar", role: "navigation", "aria-label": "Main" },
    h(
      "div",
      { className: "navbar-inner" },

      // หน้าแรก
      h(
        Link,
        {
          to: "/",
          className: `nav-item ${isActive("/") ? "active" : ""}`,
          role: "tab",
          "aria-current": isActive("/") ? "page" : undefined,
          "aria-label": "หน้าหลัก",
        },
        h("img", {
          src: `${iconBase}/ico_home.png`,
          alt: "",
          className: "icon",
          "aria-hidden": "true",
        }),
        h("span", null, "หน้าหลัก")
      ),

      // SOS
      h(
        Link,
        {
          to: "/sos",
          className: `nav-item ${isActive("/sos") ? "active" : ""}`,
          role: "tab",
          "aria-current": isActive("/sos") ? "page" : undefined,
          "aria-label": "ช่วยเหลือ (SOS)",
        },
        h("img", {
          src: `${iconBase}/ico_sos.png`,
          alt: "",
          className: "icon",
          "aria-hidden": "true",
        }),
        h("span", null, "ช่วยเหลือ")
      )
    )
  );
}
