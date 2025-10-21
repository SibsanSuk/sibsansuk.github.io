// components/NavBarActivity.js
const h = window.React.createElement;
const { useEffect } = window.React;
const { Link, useLocation } = window.ReactRouterDOM || {};

const DEFAULT_ITEMS = [
  { path: "/", label: "หน้าหลัก", icon: "ico_home.png" },
  { path: "/notify", label: "การนัด", icon: "ico_calenda.png" },
  { path: "/exercise", label: "ออกกำลังกาย", icon: "ico_exercise.png" },
  { path: "/mood", label: "อารมณ์", icon: "ico_mood.png" },
  { path: "/assessment", label: "ประเมินตนเอง", icon: "ico_assessment.png" },
  { path: "/sos", label: "ช่วยเหลือ", icon: "ico_sos.png" }
];

const isImage = (icon) =>
  typeof icon === "string" &&
  (/\.(png|jpe?g|gif|svg|webp)$/i.test(icon) || icon.startsWith("data:"));

export function NavBarActivity({
  items,
  iconBase = "./images/icons",
  ariaLabel = "เมนูหลัก",
  className = ""
} = {}) {
  useEffect(() => {
    const root = document.documentElement;
    root?.classList.add("has-nav-activity");
    return () => root?.classList.remove("has-nav-activity");
  }, []);

  if (!Link || !useLocation) {
    console.warn("NavBarActivity: React Router DOM not detected");
    return null;
  }

  const location = useLocation();
  const pathname = location?.pathname || "/";
  const data = (Array.isArray(items) && items.length ? items : DEFAULT_ITEMS).map((item) => {
    if (!item?.icon) return item;

    // Emoji or plain string (ไม่ใช่รูปภาพ) → ส่งกลับตามเดิม
    if (!isImage(item.icon)) {
      return item;
    }

    const isAbsolute = /^([a-z]+:|\/\/|\/)/i.test(item.icon);
    if (isAbsolute) {
      return item;
    }

    const normalized = item.icon.replace(/^\.\//, "");
    return {
      ...item,
      icon: `${iconBase.replace(/\/$/, "")}/${normalized}`
    };
  });

  const isActive = (path) =>
    pathname === path ||
    (path !== "/" && pathname?.startsWith(path + "/"));

  const classes = ["navbar-activity", className].filter(Boolean).join(" ");

  return h(
    "nav",
    {
      className: classes,
      role: "navigation",
      "aria-label": ariaLabel
    },
    h(
      "div",
      { className: "navbar-activity-inner" },
      h(
        "div",
        { className: "navbar-activity-scroll", role: "tablist" },
        data.map((item) =>
          h(
            Link,
            {
              key: item.path || item.label,
              to: item.path || "/",
              className: `nav-act-item ${isActive(item.path) ? "active" : ""}`,
              role: "tab",
              "aria-current": isActive(item.path) ? "page" : undefined,
              "aria-label": item.label
            },
            item.icon && isImage(item.icon)
              ? h("img", {
                  src: item.icon,
                  alt: "",
                  className: "icon",
                  "aria-hidden": "true"
                })
              : item.icon
              ? h("span", { className: "emoji" }, item.icon)
              : null,
            h("span", { className: "label" }, item.label)
          )
        )
      )
    )
  );
}
